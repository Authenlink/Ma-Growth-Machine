import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collections, leads, companies, leadCollections, scrapers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import {
  fetchPageSpeedFull,
  normalizeWebsiteUrl,
} from "@/lib/pagespeed-seo-service";
import { recordEntityScraperUsage } from "@/lib/entity-scraper-usages";

const DELAY_BETWEEN_REQUESTS_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/seo-insights/analyze
 * Analyse le SEO d'un lead, d'une entreprise ou de tous les leads d'une collection
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const {
      mode,
      leadId,
      companyId,
      collectionId,
    } = body as {
      mode?: "single" | "collection";
      leadId?: number;
      companyId?: number;
      collectionId?: number;
    };

    if (!mode || !["single", "collection"].includes(mode)) {
      return NextResponse.json(
        { error: "mode doit être 'single' ou 'collection'" },
        { status: 400 }
      );
    }

    // Récupérer l'ID du scraper pagespeed-seo pour le tracking
    const seoScraper = await db
      .select({ id: scrapers.id })
      .from(scrapers)
      .where(eq(scrapers.mapperType, "pagespeed-seo"))
      .limit(1);
    const seoScraperId = seoScraper[0]?.id ?? null;

    if (mode === "single") {
      let companyIdToUse: number | null = null;
      let website: string | null = null;

      if (companyId != null && typeof companyId === "number") {
        const company = await db
          .select({ id: companies.id, website: companies.website })
          .from(companies)
          .where(eq(companies.id, companyId))
          .limit(1);

        if (company.length === 0) {
          return NextResponse.json(
            { error: "Entreprise non trouvée" },
            { status: 404 }
          );
        }

        website = company[0].website;
        companyIdToUse = company[0].id;
      } else if (leadId != null && typeof leadId === "number") {
        const leadWithCompany = await db
          .select({
            leadId: leads.id,
            companyId: companies.id,
            website: companies.website,
          })
          .from(leads)
          .leftJoin(companies, eq(leads.companyId, companies.id))
          .where(
            and(
              eq(leads.id, leadId),
              eq(leads.userId, userId)
            )
          )
          .limit(1);

        if (leadWithCompany.length === 0) {
          return NextResponse.json(
            { error: "Lead non trouvé ou accès non autorisé" },
            { status: 404 }
          );
        }

        const row = leadWithCompany[0];
        if (!row.companyId || !row.website?.trim()) {
          return NextResponse.json(
            {
              error: "Ce lead n'a pas d'entreprise avec un website valide",
              withoutWebsite: 1,
            },
            { status: 400 }
          );
        }

        website = row.website;
        companyIdToUse = row.companyId;
      } else {
        return NextResponse.json(
          {
            error:
              "En mode single, fournissez leadId ou companyId",
          },
          { status: 400 }
        );
      }

      const normalUrl = normalizeWebsiteUrl(website);
      if (!normalUrl) {
        return NextResponse.json(
          {
            error: "URL du website invalide ou vide",
            withoutWebsite: 1,
          },
          { status: 400 }
        );
      }

      const result = await fetchPageSpeedFull(normalUrl);

      if (!result.success || (!result.mobile && !result.desktop)) {
        if (companyIdToUse != null && seoScraperId != null) {
          try {
            await recordEntityScraperUsage({
              entityType: "company",
              entityId: companyIdToUse,
              scraperId: seoScraperId,
              runId: null,
              source: "seo_analyze",
              hasResult: false,
              itemCount: 0,
              configUsed: {},
              userId,
            });
          } catch {
            /* ignore */
          }
        }
        return NextResponse.json(
          {
            error: result.error || "Erreur lors de l'analyse SEO",
            metrics: { analyzed: 0, skipped: 0, withoutWebsite: 0, errors: 1 },
          },
          { status: 500 }
        );
      }

      if (!companyIdToUse) {
        return NextResponse.json(
          {
            error: "Aucune donnée SEO extraite",
            metrics: { analyzed: 0, skipped: 0, withoutWebsite: 0, errors: 1 },
          },
          { status: 500 }
        );
      }

      const mobile = result.mobile;
      const desktop = result.desktop;
      const pageSpeedData = {
        ...(mobile && { mobile }),
        ...(desktop && { desktop }),
      };

      const updateData: Record<string, unknown> = {
        pageSpeedData,
        seoScore: mobile?.seo ?? desktop?.seo,
        seoScoreMobile: mobile?.seo,
        seoScoreDesktop: desktop?.seo,
        seoData: mobile
          ? { score: mobile.seo, strategy: "mobile", audits: mobile.audits }
          : desktop
            ? { score: desktop.seo, strategy: "desktop", audits: desktop.audits }
            : undefined,
        seoAnalyzedAt: new Date(),
        updatedAt: new Date(),
      };

      await db
        .update(companies)
        .set(updateData as typeof companies.$inferInsert)
        .where(eq(companies.id, companyIdToUse));

      if (seoScraperId != null) {
        try {
          await recordEntityScraperUsage({
            entityType: "company",
            entityId: companyIdToUse,
            scraperId: seoScraperId,
            runId: null,
            source: "seo_analyze",
            hasResult: true,
            itemCount: 1,
            configUsed: {},
            userId,
          });
        } catch {
          /* ignore */
        }
      }

      return NextResponse.json({
        success: true,
        companyId: companyIdToUse,
        metrics: {
          analyzed: 1,
          skipped: 0,
          withoutWebsite: 0,
          errors: 0,
        },
      });
    }

    // mode === "collection"
    if (!collectionId || typeof collectionId !== "number") {
      return NextResponse.json(
        { error: "collectionId est requis en mode collection" },
        { status: 400 }
      );
    }

    const collection = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, collectionId),
          eq(collections.userId, userId)
        )
      )
      .limit(1);

    if (collection.length === 0) {
      return NextResponse.json(
        { error: "Collection non trouvée ou accès non autorisé" },
        { status: 404 }
      );
    }

    const collectionLeads = await db
      .select({
        leadId: leads.id,
        companyId: companies.id,
        website: companies.website,
      })
      .from(leads)
      .innerJoin(leadCollections, and(
        eq(leadCollections.leadId, leads.id),
        eq(leadCollections.collectionId, collectionId)
      ))
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .where(eq(leads.userId, userId));

    const byWebsite = new Map<
      string,
      { companyId: number; website: string }
    >();

    for (const row of collectionLeads) {
      const url = normalizeWebsiteUrl(row.website);
      if (!row.companyId || !url) continue;
      if (!byWebsite.has(url)) {
        byWebsite.set(url, {
          companyId: row.companyId,
          website: url,
        });
      }
    }

    const withoutWebsite = collectionLeads.filter(
      (r) => !r.companyId || !normalizeWebsiteUrl(r.website)
    ).length;

    const toAnalyze = Array.from(byWebsite.values());
    let analyzed = 0;
    let errors = 0;

    for (let i = 0; i < toAnalyze.length; i++) {
      if (i > 0) {
        await sleep(DELAY_BETWEEN_REQUESTS_MS);
      }

      const { companyId: cid, website: w } = toAnalyze[i];
      const result = await fetchPageSpeedFull(w);

      if (result.success && (result.mobile || result.desktop)) {
        const mobile = result.mobile;
        const desktop = result.desktop;
        const pageSpeedData = {
          ...(mobile && { mobile }),
          ...(desktop && { desktop }),
        };

        const updateData: Record<string, unknown> = {
          pageSpeedData,
          seoScore: mobile?.seo ?? desktop?.seo,
          seoScoreMobile: mobile?.seo,
          seoScoreDesktop: desktop?.seo,
          seoData: mobile
            ? { score: mobile.seo, strategy: "mobile", audits: mobile.audits }
            : desktop
              ? { score: desktop.seo, strategy: "desktop", audits: desktop.audits }
              : undefined,
          seoAnalyzedAt: new Date(),
          updatedAt: new Date(),
        };

        await db
          .update(companies)
          .set(updateData as typeof companies.$inferInsert)
          .where(eq(companies.id, cid));
        analyzed++;

        if (seoScraperId != null) {
          try {
            await recordEntityScraperUsage({
              entityType: "company",
              entityId: cid,
              scraperId: seoScraperId,
              runId: null,
              source: "seo_analyze",
              hasResult: true,
              itemCount: 1,
              configUsed: {},
              userId,
            });
          } catch {
            /* ignore */
          }
        }
      } else {
        errors++;
        if (seoScraperId != null) {
          try {
            await recordEntityScraperUsage({
              entityType: "company",
              entityId: cid,
              scraperId: seoScraperId,
              runId: null,
              source: "seo_analyze",
              hasResult: false,
              itemCount: 0,
              configUsed: {},
              userId,
            });
          } catch {
            /* ignore */
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      metrics: {
        analyzed,
        skipped: toAnalyze.length - analyzed - errors,
        withoutWebsite,
        errors,
      },
      warnings:
        withoutWebsite > 0
          ? {
              withoutWebsiteCount: withoutWebsite,
              withoutWebsiteMessage: `${withoutWebsite} lead(s) ignoré(s) : pas de website URL`,
            }
          : undefined,
    });
  } catch (error) {
    console.error("[SEO Insights] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'analyse SEO",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
