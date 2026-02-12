import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  collections,
  leads,
  companies,
  leadCollections,
  seoLocalAnalyses,
  scrapers,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import {
  analyzeCompanySeoLocal,
  CompanyContext,
  SeoLocalResult,
} from "@/lib/seo-local-ranking-service";
import { recordScraperRun } from "@/lib/scraper-runs";

const DELAY_BETWEEN_COMPANIES_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/seo-local-ranking/analyze
 * Analyse le positionnement SEO local des entreprises d'une collection
 * Body: { folderId, collectionId, selectedLeadIds?: number[], scraperId?: number }
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
      folderId,
      collectionId,
      selectedLeadIds,
      scraperId,
    } = body as {
      folderId?: number;
      collectionId?: number;
      selectedLeadIds?: number[];
      scraperId?: number;
    };

    if (!collectionId || typeof collectionId !== "number") {
      return NextResponse.json(
        { error: "collectionId est requis" },
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

    let collectionLeads = await db
      .select({
        leadId: leads.id,
        companyId: companies.id,
        companyName: companies.name,
        industry: companies.industry,
        description: companies.description,
        city: companies.city,
        state: companies.state,
        country: companies.country,
        website: companies.website,
      })
      .from(leads)
      .innerJoin(
        leadCollections,
        and(
          eq(leadCollections.leadId, leads.id),
          eq(leadCollections.collectionId, collectionId)
        )
      )
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .where(eq(leads.userId, userId));

    if (
      selectedLeadIds &&
      Array.isArray(selectedLeadIds) &&
      selectedLeadIds.length > 0
    ) {
      const idSet = new Set(selectedLeadIds.map(Number));
      collectionLeads = collectionLeads.filter((r) =>
        idSet.has(r.leadId)
      );
    }

    const toAnalyze = collectionLeads.filter(
      (r) => r.companyId != null && r.companyName != null
    );

    if (toAnalyze.length === 0) {
      return NextResponse.json(
        {
          error:
            "Aucun lead avec entreprise trouvé dans cette collection. Assurez-vous que les leads ont une entreprise avec au moins un nom.",
        },
        { status: 400 }
      );
    }

    const results: SeoLocalResult[] = [];
    let totalCostUsd = 0;
    let totalTokens = 0;

    for (let i = 0; i < toAnalyze.length; i++) {
      if (i > 0) await sleep(DELAY_BETWEEN_COMPANIES_MS);

      const row = toAnalyze[i];
      const context: CompanyContext = {
        companyName: row.companyName!,
        industry: row.industry,
        description: row.description,
        city: row.city,
        state: row.state,
        country: row.country,
        website: row.website,
      };

      try {
        const result = await analyzeCompanySeoLocal({
          context,
          leadId: row.leadId,
          companyId: row.companyId ?? undefined,
        });

        results.push(result);
        totalCostUsd += result.cost.estimated_cost_usd;
        totalTokens += result.cost.tokens_used;

        await db.insert(seoLocalAnalyses).values({
          companyId: row.companyId!,
          leadId: row.leadId,
          userId,
          analysis: result.analysis,
          costUsd: result.cost.estimated_cost_usd,
        });
      } catch (err) {
        console.error(
          `[SEO Local] Erreur pour ${row.companyName} (lead ${row.leadId}):`,
          err
        );
        results.push({
          company: row.companyName!,
          location: [row.city, row.state, row.country].filter(Boolean).join(", "),
          industry: row.industry ?? "N/A",
          leadId: row.leadId,
          companyId: row.companyId ?? undefined,
          analysis: {
            seo_score: "Faible",
            avg_position: 0,
            queries_tested: [],
            verdict: "Erreur lors de l'analyse.",
            opportunity: "Réessayer plus tard.",
            cost: { tokens_used: 0, estimated_cost_usd: 0 },
          },
          cost: { tokens_used: 0, estimated_cost_usd: 0 },
        });
      }
    }

    const runId = `seo-local-${Date.now()}-${userId}`;
    const scraperIdNum =
      typeof scraperId === "number"
        ? scraperId
        : (
            await db
              .select({ id: scrapers.id })
              .from(scrapers)
              .where(eq(scrapers.mapperType, "seo-local-ranking"))
              .limit(1)
          )[0]?.id ?? null;

    await recordScraperRun({
      runId,
      scraperId: scraperIdNum,
      userId,
      source: "seo_local_ranking",
      collectionId,
      itemCount: toAnalyze.length,
      status: "completed",
      costUsd: totalCostUsd,
      usageDetails: {
        openai_tokens: totalTokens,
        analyzed_count: toAnalyze.length,
      },
    });

    return NextResponse.json({
      success: true,
      results,
      metrics: {
        analyzed: toAnalyze.length,
        totalCostUsd,
        totalTokens,
      },
    });
  } catch (error) {
    console.error("[SEO Local Ranking] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'analyse SEO local",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
