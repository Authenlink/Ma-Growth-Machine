import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collections, leads, companies, leadCollections } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { extractDomain } from "@/lib/bulk-email-finder-mapper";
import { runTrustpilotScraper } from "@/lib/trustpilot-reviews-service";
import { mapTrustpilotReviewsToDb } from "@/lib/trustpilot-reviews-mapper";

const DELAY_BETWEEN_REQUESTS_MS = 1500;
const TRUSTPILOT_REVIEW_BASE_URL = "https://www.trustpilot.com/review/";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCompanyDomain(
  companyDomain: string | null,
  companyWebsite: string | null
): string | null {
  if (companyDomain?.trim()) {
    return extractDomain(companyDomain) ?? companyDomain.trim();
  }
  if (companyWebsite?.trim()) {
    return extractDomain(companyWebsite);
  }
  return null;
}

/**
 * POST /api/trustpilot-reviews/scrape
 * Scrape les avis Trustpilot pour une entreprise ou une collection
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const {
      mode,
      companyId,
      leadId,
      collectionId,
      maxItems = 100,
    } = body as {
      mode?: "single" | "collection";
      companyId?: number;
      leadId?: number;
      collectionId?: number;
      maxItems?: number;
    };

    if (!mode || !["single", "collection"].includes(mode)) {
      return NextResponse.json(
        { error: "mode doit être 'single' ou 'collection'" },
        { status: 400 }
      );
    }

    const toScrape: Array<{ companyId: number; domain: string }> = [];
    let withoutDomain = 0;

    if (mode === "single") {
      let companyIdToUse: number | null = null;
      let companyDomain: string | null = null;
      let companyWebsite: string | null = null;

      if (companyId != null && typeof companyId === "number") {
        const company = await db
          .select({
            id: companies.id,
            domain: companies.domain,
            website: companies.website,
          })
          .from(companies)
          .where(eq(companies.id, companyId))
          .limit(1);

        if (company.length === 0) {
          return NextResponse.json(
            { error: "Entreprise non trouvée" },
            { status: 404 }
          );
        }
        companyIdToUse = company[0].id;
        companyDomain = company[0].domain;
        companyWebsite = company[0].website;
      } else if (leadId != null && typeof leadId === "number") {
        const leadWithCompany = await db
          .select({
            companyId: companies.id,
            domain: companies.domain,
            website: companies.website,
          })
          .from(leads)
          .leftJoin(companies, eq(leads.companyId, companies.id))
          .where(
            and(eq(leads.id, leadId), eq(leads.userId, userId))
          )
          .limit(1);

        if (leadWithCompany.length === 0) {
          return NextResponse.json(
            { error: "Lead non trouvé ou accès non autorisé" },
            { status: 404 }
          );
        }

        const row = leadWithCompany[0];
        if (!row.companyId) {
          return NextResponse.json(
            { error: "Ce lead n'a pas d'entreprise associée" },
            { status: 400 }
          );
        }
        companyIdToUse = row.companyId;
        companyDomain = row.domain;
        companyWebsite = row.website;
      } else {
        return NextResponse.json(
          { error: "En mode single, fournissez companyId ou leadId" },
          { status: 400 }
        );
      }

      const domain = getCompanyDomain(companyDomain, companyWebsite);

      if (!domain) {
        return NextResponse.json(
          {
            error:
              "Cette entreprise n'a pas de domaine (website). Veuillez ajouter un website ou un domaine pour scraper les avis Trustpilot.",
            withoutWebsite: 1,
          },
          { status: 400 }
        );
      }

      toScrape.push({ companyId: companyIdToUse!, domain });
    } else {
      if (collectionId == null || typeof collectionId !== "number") {
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
          companyId: companies.id,
          domain: companies.domain,
          website: companies.website,
        })
        .from(leads)
        .innerJoin(leadCollections, and(
          eq(leadCollections.leadId, leads.id),
          eq(leadCollections.collectionId, collectionId)
        ))
        .innerJoin(companies, eq(leads.companyId, companies.id))
        .where(eq(leads.userId, userId));

      const byDomain = new Map<string, { companyId: number; domain: string }>();
      for (const row of collectionLeads) {
        const domain = getCompanyDomain(row.domain, row.website);
        if (!domain) {
          withoutDomain++;
          continue;
        }
        if (!byDomain.has(domain)) {
          byDomain.set(domain, { companyId: row.companyId, domain });
        }
      }

      toScrape.push(...byDomain.values());
    }

    if (toScrape.length === 0) {
      return NextResponse.json(
        {
          error:
            mode === "single"
              ? "Cette entreprise n'a pas de domaine (website). Veuillez ajouter un website ou un domaine pour scraper les avis Trustpilot."
              : "Aucune entreprise avec un domaine valide dans cette collection.",
          withoutDomain: withoutDomain || (mode === "single" ? 0 : 1),
        },
        { status: 400 }
      );
    }

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let scrapedCompanies = 0;

    for (let i = 0; i < toScrape.length; i++) {
      if (i > 0) {
        await sleep(DELAY_BETWEEN_REQUESTS_MS);
      }

      const { companyId: cid, domain } = toScrape[i];
      const startUrl = `${TRUSTPILOT_REVIEW_BASE_URL}${domain}`;

      try {
        const items = await runTrustpilotScraper([startUrl], maxItems);
        const result = await mapTrustpilotReviewsToDb(items, cid);

        totalCreated += result.created;
        totalSkipped += result.skipped;
        totalErrors += result.errors;
        scrapedCompanies++;
      } catch (err) {
        console.error(`[Trustpilot] Erreur pour company ${cid}:`, err);
        totalErrors += 1;
      }
    }

    return NextResponse.json({
      success: true,
      metrics: {
        scraped: scrapedCompanies,
        created: totalCreated,
        skipped: totalSkipped,
        withoutDomain,
        errors: totalErrors,
      },
      warnings:
        withoutDomain > 0
          ? {
              withoutDomainCount: withoutDomain,
              withoutDomainMessage: `${withoutDomain} entreprise(s) ignorée(s) : pas de domaine (website)`,
            }
          : undefined,
    });
  } catch (error) {
    console.error("[Trustpilot] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors du scraping Trustpilot",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
