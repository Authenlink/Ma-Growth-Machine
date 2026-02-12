import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, companies, scrapers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getAdapter } from "@/lib/scrapers/adapter-factory";
import {
  mapCompanyPostsToDB,
  mapLeadPostsToDB,
  LinkedInPostData,
} from "@/lib/linkedin-posts-mapper";
import { recordScraperRun } from "@/lib/scraper-runs";
import { recordEntityScraperUsage } from "@/lib/entity-scraper-usages";

// Timeout maximum pour un run (30 minutes)
const MAX_RUN_TIMEOUT = 30 * 60 * 1000;
// Intervalle de polling (5 secondes)
const POLL_INTERVAL = 5000;

/**
 * POST /api/leads/[id]/enrich - Enrichit un lead avec des posts LinkedIn
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let runId: string | null = null;

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
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: "ID de lead invalide" },
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

    // Récupérer le lead avec l'entreprise
    const leadResult = await db
      .select({
        id: leads.id,
        linkedinUrl: leads.linkedinUrl,
        companyLinkedinPost: leads.companyLinkedinPost,
        personLinkedinPost: leads.personLinkedinPost,
        companyId: leads.companyId,
        company: {
          id: companies.id,
          linkedinUrl: companies.linkedinUrl,
        },
      })
      .from(leads)
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
      .limit(1);

    if (leadResult.length === 0) {
      return NextResponse.json(
        { error: "Lead non trouvé ou accès non autorisé" },
        { status: 404 }
      );
    }

    const lead = leadResult[0];

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

    // Déterminer quel type d'enrichissement et vérifier le statut
    let enrichmentStatus: string | null = null;
    let linkedinUrl: string | null = null;
    let organizationLinkedinUrl: string | null = null;

    if (mapperType === "linkedin-company-posts") {
      enrichmentStatus = lead.companyLinkedinPost;
      organizationLinkedinUrl = lead.company?.linkedinUrl || null;

      if (!organizationLinkedinUrl) {
        return NextResponse.json(
          { error: "L'entreprise associée n'a pas d'URL LinkedIn" },
          { status: 400 }
        );
      }

      // Vérifier si déjà enrichi
      if (enrichmentStatus === "enriched" && !forceEnrichment) {
        return NextResponse.json(
          {
            error: "Ce lead a déjà été enrichi avec des posts d'entreprise",
            alreadyEnriched: true,
          },
          { status: 400 }
        );
      }
    } else if (mapperType === "linkedin-profile-posts") {
      enrichmentStatus = lead.personLinkedinPost;
      linkedinUrl = lead.linkedinUrl;

      if (!linkedinUrl) {
        return NextResponse.json(
          { error: "Le lead n'a pas d'URL LinkedIn" },
          { status: 400 }
        );
      }

      // Vérifier si déjà enrichi
      if (enrichmentStatus === "enriched" && !forceEnrichment) {
        return NextResponse.json(
          {
            error: "Ce lead a déjà été enrichi avec ses posts",
            alreadyEnriched: true,
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Type de scraper non supporté pour l'enrichissement" },
        { status: 400 }
      );
    }

    // Créer l'adapter approprié
    const adapter = getAdapter(
      mapperType,
      (scraperConfig.providerConfig || {}) as Record<string, unknown>
    );

    console.log(
      `[Enrichment] User ${userId} enrichit lead ${leadId} avec scraper ${scraperId} (${scraperConfig.name})`
    );

    // Préparer les paramètres pour le scraper
    const scrapingParams: Record<string, unknown> = {
      maxPosts: maxPosts || 10,
    };

    if (postedDateLimit) {
      scrapingParams.postedDateLimit = postedDateLimit;
    }

    if (mapperType === "linkedin-company-posts") {
      scrapingParams.organizationLinkedinUrl = organizationLinkedinUrl;
    } else if (mapperType === "linkedin-profile-posts") {
      scrapingParams.linkedinUrl = linkedinUrl;
    }

    // Exécuter le scraping
    const run = await adapter.execute(scrapingParams);
    runId = run.id;

    console.log(`[Enrichment] Run créé: ${runId}, statut initial: ${run.status}`);

    // Attendre que le run se termine avec polling
    let runStatus = await adapter.getStatus(run.id);
    let attempts = 0;
    const maxAttempts = MAX_RUN_TIMEOUT / POLL_INTERVAL;

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
          `[Enrichment] Run ${runId} toujours en cours: ${runStatus.status} (${attempts * POLL_INTERVAL / 1000}s)`
        );
      }
    }

    console.log(`[Enrichment] Run ${runId} terminé avec le statut: ${runStatus.status}`);

    // Vérifier le statut final
    if (runStatus.status !== "SUCCEEDED") {
      const errorMessage =
        runStatus.status === "FAILED"
          ? "L'enrichissement a échoué"
          : runStatus.status === "TIMED-OUT"
          ? "L'enrichissement a dépassé le temps limite"
          : runStatus.status === "ABORTED"
          ? "L'enrichissement a été annulé"
          : "L'enrichissement s'est terminé avec une erreur";

      console.error(`[Enrichment] Erreur pour run ${runId}:`, errorMessage);

      try {
        await recordScraperRun({
          runId: run.id,
          scraperId,
          userId,
          source: "enrich_lead",
          leadId,
          itemCount: 0,
          status: runStatus.status,
          fetchCostFromApify: true,
        });
        await recordEntityScraperUsage({
          entityType: "lead",
          entityId: leadId,
          scraperId,
          runId: run.id,
          source: "enrich_lead",
          hasResult: false,
          itemCount: 0,
          configUsed: { maxPosts: maxPosts || 10, postedDateLimit: postedDateLimit ?? undefined },
          userId,
        });
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
    console.log(`[Enrichment] Récupération des résultats du run ${runId}`);
    const items = await adapter.getResults(run.id);
    console.log(`[Enrichment] ${items.length} résultats récupérés`);
    if (items.length > 0) {
      console.log(`[Enrichment] Exemple de résultat:`, JSON.stringify(items[0], null, 2));
    }

    // Mapper et sauvegarder les posts
    let mappingResult;
    let newStatus: string;

    console.log(`[Enrichment] Nombre d'items reçus: ${items.length}`);
    
    if (items.length === 0) {
      // Aucun post trouvé
      console.log(`[Enrichment] Aucun post trouvé pour lead ${leadId}`);
      newStatus = "no-posts";
      mappingResult = { created: 0, skipped: 0, errors: 0 };
    } else {
      console.log(`[Enrichment] Tentative de mapping de ${items.length} posts...`);
      // Mapper les posts selon le type
      if (mapperType === "linkedin-company-posts") {
        mappingResult = await mapCompanyPostsToDB(
          items as LinkedInPostData[],
          lead.companyId,
          organizationLinkedinUrl!
        );
        console.log(`[Enrichment] Résultat mapping company posts:`, mappingResult);
        newStatus = mappingResult.created > 0 ? "enriched" : "no-posts";
      } else {
        mappingResult = await mapLeadPostsToDB(
          items as LinkedInPostData[],
          leadId,
          linkedinUrl!
        );
        console.log(`[Enrichment] Résultat mapping lead posts:`, mappingResult);
        newStatus = mappingResult.created > 0 ? "enriched" : "no-posts";
      }
    }

    // Mettre à jour le statut du lead
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (mapperType === "linkedin-company-posts") {
      updateData.companyLinkedinPost = newStatus;
    } else {
      updateData.personLinkedinPost = newStatus;
    }

    await db
      .update(leads)
      .set(updateData)
      .where(eq(leads.id, leadId));

    try {
      await recordScraperRun({
        runId: run.id,
        scraperId,
        userId,
        source: "enrich_lead",
        leadId,
        itemCount: items.length,
        status: runStatus.status,
        fetchCostFromApify: true,
      });
    } catch {
      /* ignore */
    }

    try {
      await recordEntityScraperUsage({
        entityType: "lead",
        entityId: leadId,
        scraperId,
        runId: run.id,
        source: "enrich_lead",
        hasResult: items.length > 0,
        itemCount: items.length,
        configUsed: { maxPosts: maxPosts || 10, postedDateLimit: postedDateLimit ?? undefined },
        userId,
      });
    } catch {
      /* ignore */
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(
      `[Enrichment] Enrichissement terminé pour lead ${leadId}:`,
      `${mappingResult.created} posts créés, ${mappingResult.skipped} ignorés, ${mappingResult.errors} erreurs`,
      `(durée: ${duration}s, statut: ${newStatus})`
    );

    return NextResponse.json({
      success: true,
      runId: run.id,
      status: newStatus,
      metrics: {
        totalFound: items.length,
        created: mappingResult.created,
        skipped: mappingResult.skipped,
        errors: mappingResult.errors,
      },
      duration,
    });
  } catch (error) {
    console.error("[Enrichment] Erreur lors de l'enrichissement:", error);

    if (error instanceof Error) {
      console.error("[Enrichment] Message:", error.message);
      console.error("[Enrichment] Stack:", error.stack);
    }

    if (
      error instanceof Error &&
      (error.message.includes("429") || error.message.includes("rate limit"))
    ) {
      return NextResponse.json(
        {
          error: "Limite de requêtes atteinte. Veuillez réessayer plus tard.",
          runId,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: "Erreur lors de l'enrichissement",
        message: error instanceof Error ? error.message : "Erreur inconnue",
        runId,
      },
      { status: 500 }
    );
  }
}
