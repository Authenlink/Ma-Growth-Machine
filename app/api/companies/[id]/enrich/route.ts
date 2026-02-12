import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies, leads, scrapers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getAdapter } from "@/lib/scrapers/adapter-factory";
import {
  mapCompanyPostsToDB,
  LinkedInPostData,
} from "@/lib/linkedin-posts-mapper";
import { recordScraperRun } from "@/lib/scraper-runs";
import { recordEntityScraperUsage } from "@/lib/entity-scraper-usages";

// Timeout maximum pour un run (30 minutes)
const MAX_RUN_TIMEOUT = 30 * 60 * 1000;
// Intervalle de polling (5 secondes)
const POLL_INTERVAL = 5000;

/**
 * POST /api/companies/[id]/enrich - Enrichit tous les leads d'une entreprise avec des posts LinkedIn de l'entreprise
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = parseInt(session.user.id);
    const companyId = parseInt(id);

    if (isNaN(companyId)) {
      return NextResponse.json(
        { error: "ID d'entreprise invalide" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { scraperId, maxPosts, postedDateLimit, forceEnrichment } = body;

    // Validation des paramètres
    if (!scraperId || typeof scraperId !== "number") {
      return NextResponse.json(
        { error: "scraperId est requis et doit être un nombre" },
        { status: 400 }
      );
    }

    // Récupérer l'entreprise
    const companyResult = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (companyResult.length === 0) {
      return NextResponse.json(
        { error: "Entreprise non trouvée" },
        { status: 404 }
      );
    }

    const company = companyResult[0];

    if (!company.linkedinUrl) {
      return NextResponse.json(
        { error: "L'entreprise n'a pas d'URL LinkedIn" },
        { status: 400 }
      );
    }

    // Charger le scraper depuis la DB
    const scraper = await db
      .select()
      .from(scrapers)
      .where(
        and(
          eq(scrapers.id, scraperId),
          eq(scrapers.isActive, true)
        )
      )
      .limit(1);

    if (scraper.length === 0) {
      return NextResponse.json(
        { error: "Scraper non trouvé ou inactif" },
        { status: 404 }
      );
    }

    const scraperConfig = scraper[0];
    const mapperType = scraperConfig.mapperType;

    if (mapperType !== "linkedin-company-posts") {
      return NextResponse.json(
        { error: "Ce scraper n'est pas adapté pour enrichir une entreprise" },
        { status: 400 }
      );
    }

    // Récupérer tous les leads de l'entreprise pour l'utilisateur
    const companyLeads = await db
      .select({
        id: leads.id,
        companyLinkedinPost: leads.companyLinkedinPost,
      })
      .from(leads)
      .where(and(eq(leads.companyId, companyId), eq(leads.userId, userId)));

    console.log(
      `[Enrichment Company] User ${userId} enrichit entreprise ${companyId} avec ${companyLeads.length} leads`
    );

    // Filtrer les leads selon le statut et forceEnrichment
    const leadsToEnrich = companyLeads.filter((lead) => {
      const status = lead.companyLinkedinPost;
      return status !== "enriched" || forceEnrichment === true;
    });

    console.log(
      `[Enrichment Company] ${leadsToEnrich.length} leads à enrichir sur ${companyLeads.length}`
    );

    if (leadsToEnrich.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucun lead à enrichir",
        metrics: {
          total: companyLeads.length,
          enriched: 0,
          skipped: companyLeads.length,
          errors: 0,
        },
      });
    }

    // Créer l'adapter approprié
    const adapter = getAdapter(
      mapperType,
      (scraperConfig.providerConfig || {}) as Record<string, unknown>
    );

    // Préparer les paramètres pour le scraper
    const scrapingParams: Record<string, unknown> = {
      organizationLinkedinUrl: company.linkedinUrl,
      maxPosts: maxPosts || 10,
    };

    if (postedDateLimit) {
      scrapingParams.postedDateLimit = postedDateLimit;
    }

    // Exécuter le scraping une seule fois pour l'entreprise
    const run = await adapter.execute(scrapingParams);
    let runStatus = await adapter.getStatus(run.id);
    let attempts = 0;
    const maxAttempts = MAX_RUN_TIMEOUT / POLL_INTERVAL;

    // Attendre que le run se termine
    while (
      runStatus.status !== "SUCCEEDED" &&
      runStatus.status !== "FAILED" &&
      runStatus.status !== "ABORTED" &&
      runStatus.status !== "TIMED-OUT" &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      runStatus = await adapter.getStatus(run.id);
      attempts++;

      if (attempts % 6 === 0) {
        console.log(
          `[Enrichment Company] Run ${run.id} toujours en cours: ${runStatus.status} (${attempts * POLL_INTERVAL / 1000}s)`
        );
      }
    }

    if (runStatus.status !== "SUCCEEDED") {
      const errorMessage =
        runStatus.status === "FAILED"
          ? "L'enrichissement a échoué"
          : runStatus.status === "TIMED-OUT"
          ? "L'enrichissement a dépassé le temps limite"
          : runStatus.status === "ABORTED"
          ? "L'enrichissement a été annulé"
          : "L'enrichissement s'est terminé avec une erreur";

      console.error(`[Enrichment Company] Erreur pour run ${run.id}:`, errorMessage);

      try {
        await recordScraperRun({
          runId: run.id,
          scraperId,
          userId,
          source: "enrich_company",
          companyId,
          itemCount: 0,
          status: runStatus.status,
          fetchCostFromApify: true,
        });
        for (const lead of leadsToEnrich) {
          await recordEntityScraperUsage({
            entityType: "lead",
            entityId: lead.id,
            scraperId,
            runId: run.id,
            source: "enrich_company",
            hasResult: false,
            itemCount: 0,
            configUsed: { maxPosts: maxPosts || 10, postedDateLimit: postedDateLimit ?? undefined },
            userId,
          });
        }
      } catch {
        /* ignore */
      }

      return NextResponse.json(
        {
          error: errorMessage,
          runId: run.id,
          status: runStatus.status,
        },
        { status: 500 }
      );
    }

    // Récupérer les résultats
    const items = await adapter.getResults(run.id);

    // Mapper et sauvegarder les posts pour tous les leads de l'entreprise
    let mappingResult;
    let newStatus: string;

    if (items.length === 0) {
      newStatus = "no-posts";
      mappingResult = { created: 0, skipped: 0, errors: 0 };
    } else {
      mappingResult = await mapCompanyPostsToDB(
        items as LinkedInPostData[],
        companyId,
        company.linkedinUrl
      );
      newStatus = mappingResult.created > 0 ? "enriched" : "no-posts";
    }

    // Mettre à jour le statut de tous les leads de l'entreprise
    await db
      .update(leads)
      .set({
        companyLinkedinPost: newStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leads.companyId, companyId),
          eq(leads.userId, userId)
        )
      );

    console.log(
      `[Enrichment Company] Enrichissement terminé pour entreprise ${companyId}:`,
      `${mappingResult.created} posts créés, ${mappingResult.skipped} ignorés, ${mappingResult.errors} erreurs`,
      `(statut: ${newStatus})`
    );

    try {
      await recordScraperRun({
        runId: run.id,
        scraperId,
        userId,
        source: "enrich_company",
        companyId,
        itemCount: items.length,
        status: runStatus.status,
        fetchCostFromApify: true,
      });
      const configUsed = { maxPosts: maxPosts || 10, postedDateLimit: postedDateLimit ?? undefined };
      for (const lead of leadsToEnrich) {
        await recordEntityScraperUsage({
          entityType: "lead",
          entityId: lead.id,
          scraperId,
          runId: run.id,
          source: "enrich_company",
          hasResult: items.length > 0,
          itemCount: items.length,
          configUsed,
          userId,
        });
      }
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      success: true,
      runId: run.id,
      status: newStatus,
      metrics: {
        totalFound: items.length,
        created: mappingResult.created,
        skipped: mappingResult.skipped,
        errors: mappingResult.errors,
        leadsUpdated: leadsToEnrich.length,
      },
    });
  } catch (error) {
    console.error("[Enrichment Company] Erreur:", error);

    if (error instanceof Error) {
      console.error("[Enrichment Company] Message:", error.message);
      console.error("[Enrichment Company] Stack:", error.stack);
    }

    if (
      error instanceof Error &&
      (error.message.includes("429") || error.message.includes("rate limit"))
    ) {
      return NextResponse.json(
        {
          error: "Limite de requêtes atteinte. Veuillez réessayer plus tard.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: "Erreur lors de l'enrichissement de l'entreprise",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
