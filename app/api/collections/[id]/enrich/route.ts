import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collections, leads, companies, scrapers, leadCollections } from "@/lib/schema";
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
 * POST /api/collections/[id]/enrich - Enrichit tous les leads d'une collection avec des posts LinkedIn
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
    const collectionId = parseInt(id);

    if (isNaN(collectionId)) {
      return NextResponse.json(
        { error: "ID de collection invalide" },
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

    // Vérifier que la collection appartient à l'utilisateur
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

    if (
      mapperType !== "linkedin-company-posts" &&
      mapperType !== "linkedin-profile-posts"
    ) {
      return NextResponse.json(
        { error: "Type de scraper non supporté pour l'enrichissement" },
        { status: 400 }
      );
    }

    // Récupérer tous les leads de la collection via lead_collections
    const collectionLeads = await db
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
      .innerJoin(leadCollections, and(
        eq(leadCollections.leadId, leads.id),
        eq(leadCollections.collectionId, collectionId),
      ))
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .where(eq(leads.userId, userId));

    console.log(
      `[Enrichment Collection] User ${userId} enrichit collection ${collectionId} avec ${collectionLeads.length} leads`
    );

    // Filtrer les leads selon le statut et forceEnrichment
    const leadsToEnrich = collectionLeads.filter((lead) => {
      if (mapperType === "linkedin-company-posts") {
        const hasLinkedinUrl = lead.company?.linkedinUrl;
        const status = lead.companyLinkedinPost;
        return (
          hasLinkedinUrl &&
          (status !== "enriched" || forceEnrichment === true)
        );
      } else {
        const hasLinkedinUrl = lead.linkedinUrl;
        const status = lead.personLinkedinPost;
        return (
          hasLinkedinUrl &&
          (status !== "enriched" || forceEnrichment === true)
        );
      }
    });

    console.log(
      `[Enrichment Collection] ${leadsToEnrich.length} leads à enrichir sur ${collectionLeads.length}`
    );

    if (leadsToEnrich.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucun lead à enrichir",
        metrics: {
          total: collectionLeads.length,
          enriched: 0,
          skipped: collectionLeads.length,
          errors: 0,
        },
      });
    }

    // Créer l'adapter approprié
    const adapter = getAdapter(
      mapperType,
      (scraperConfig.providerConfig || {}) as Record<string, unknown>
    );

    // Collecter les URLs uniques selon le type de scraper
    const urlsToScrape: string[] = [];
    let leadUrlMap: Record<string, number[]> = {}; // URL -> [leadIds]

    if (mapperType === "linkedin-company-posts") {
      // Pour les posts d'entreprise, grouper par URL d'entreprise
      const urlMap: Record<string, number[]> = {};
      for (const lead of leadsToEnrich) {
        if (lead.company?.linkedinUrl) {
          if (!urlMap[lead.company.linkedinUrl]) {
            urlMap[lead.company.linkedinUrl] = [];
            urlsToScrape.push(lead.company.linkedinUrl);
          }
          urlMap[lead.company.linkedinUrl].push(lead.id);
        }
      }
      leadUrlMap = urlMap;
    } else {
      // Pour les posts de profil, chaque lead a sa propre URL
      for (const lead of leadsToEnrich) {
        if (lead.linkedinUrl) {
          urlsToScrape.push(lead.linkedinUrl);
          leadUrlMap[lead.linkedinUrl] = [lead.id];
        }
      }
    }

    console.log(
      `[Enrichment Collection] URLs à scraper en bulk: ${urlsToScrape.length}`
    );

    if (urlsToScrape.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucune URL à scraper",
        metrics: {
          total: collectionLeads.length,
          enriched: 0,
          skipped: collectionLeads.length,
          errors: 0,
        },
      });
    }

    // Préparer les paramètres pour le scraping bulk
    const scrapingParams: Record<string, unknown> = {
      targetUrls: urlsToScrape,
      maxPosts: maxPosts || 10,
    };

    if (postedDateLimit) {
      scrapingParams.postedDateLimit = postedDateLimit;
    }

    // Exécuter le scraping bulk
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
    }

    if (runStatus.status !== "SUCCEEDED") {
      console.error(
        `[Enrichment Collection] Erreur du run bulk: ${runStatus.status}`
      );
      return NextResponse.json(
        {
          error: `Échec du scraping bulk: ${runStatus.status}`,
          metrics: {
            total: collectionLeads.length,
            enriched: 0,
            skipped: collectionLeads.length - leadsToEnrich.length,
            errors: leadsToEnrich.length,
          },
        },
        { status: 500 }
      );
    }

    // Récupérer les résultats bulk
    const items = await adapter.getResults(run.id);
    console.log(`[Enrichment Collection] ${items.length} résultats reçus du scraping bulk`);

    // Grouper les résultats par URL source
    const resultsByUrl: Record<string, LinkedInPostData[]> = {};
    for (const item of items as LinkedInPostData[]) {
      const query = item.query as { targetUrl: string };
      if (query?.targetUrl) {
        if (!resultsByUrl[query.targetUrl]) {
          resultsByUrl[query.targetUrl] = [];
        }
        resultsByUrl[query.targetUrl].push(item);
      }
    }

    // Traiter les résultats par URL
    const results = {
      enriched: 0,
      skipped: 0,
      errors: 0,
      noPosts: 0,
    };

    for (const [url, urlItems] of Object.entries(resultsByUrl)) {
      const leadIds = leadUrlMap[url];
      if (!leadIds || leadIds.length === 0) {
        console.warn(`[Enrichment Collection] Aucune association trouvée pour l'URL ${url}`);
        continue;
      }

      try {
        // Traiter chaque lead associé à cette URL
        for (const leadId of leadIds) {
          const lead = leadsToEnrich.find(l => l.id === leadId);
          if (!lead) continue;

          let mappingResult;
          let newStatus: string;

          if (urlItems.length === 0) {
            newStatus = "no-posts";
            mappingResult = { created: 0, skipped: 0, errors: 0 };
            results.noPosts++;
          } else {
            if (mapperType === "linkedin-company-posts") {
              mappingResult = await mapCompanyPostsToDB(
                urlItems,
                lead.companyId,
                lead.company?.linkedinUrl!
              );
            } else {
              mappingResult = await mapLeadPostsToDB(
                urlItems,
                lead.id,
                lead.linkedinUrl!
              );
            }

            if (mappingResult.created > 0) {
              newStatus = "enriched";
              results.enriched++;
            } else {
              newStatus = "no-posts";
              results.noPosts++;
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
            .where(eq(leads.id, lead.id));

          try {
            await recordEntityScraperUsage({
              entityType: "lead",
              entityId: lead.id,
              scraperId,
              runId: run.id,
              source: "enrich_collection",
              hasResult: urlItems.length > 0,
              itemCount: urlItems.length,
              configUsed: { maxPosts: maxPosts || 10, postedDateLimit: postedDateLimit ?? undefined },
              userId,
            });
          } catch {
            /* ignore */
          }
        }
      } catch (error) {
        console.error(
          `[Enrichment Collection] Erreur pour l'URL ${url}:`,
          error
        );
        results.errors += leadIds.length;
      }
    }

    // Traiter les URLs qui n'ont pas eu de résultats
    for (const url of urlsToScrape) {
      if (!resultsByUrl[url]) {
        const leadIds = leadUrlMap[url];
        results.noPosts += leadIds.length;

        // Mettre à jour le statut des leads sans résultats
        for (const leadId of leadIds) {
          const lead = leadsToEnrich.find(l => l.id === leadId);
          if (!lead) continue;

          const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
          };

          if (mapperType === "linkedin-company-posts") {
            updateData.companyLinkedinPost = "no-posts";
          } else {
            updateData.personLinkedinPost = "no-posts";
          }

          await db
            .update(leads)
            .set(updateData)
            .where(eq(leads.id, lead.id));

          try {
            await recordEntityScraperUsage({
              entityType: "lead",
              entityId: lead.id,
              scraperId,
              runId: run.id,
              source: "enrich_collection",
              hasResult: false,
              itemCount: 0,
              configUsed: { maxPosts: maxPosts || 10, postedDateLimit: postedDateLimit ?? undefined },
              userId,
            });
          } catch {
            /* ignore */
          }
        }
      }
    }

    try {
      await recordScraperRun({
        runId: run.id,
        scraperId,
        userId,
        source: "enrich_collection",
        collectionId,
        itemCount: items.length,
        status: runStatus.status,
        fetchCostFromApify: true,
      });
    } catch {
      /* ignore */
    }

    const skipped =
      collectionLeads.length - leadsToEnrich.length + results.noPosts;

    console.log(
      `[Enrichment Collection] Enrichissement terminé pour collection ${collectionId}:`,
      `${results.enriched} enrichis, ${skipped} ignorés, ${results.errors} erreurs`
    );

    return NextResponse.json({
      success: true,
      metrics: {
        total: collectionLeads.length,
        enriched: results.enriched,
        skipped,
        errors: results.errors,
        noPosts: results.noPosts,
      },
    });
  } catch (error) {
    console.error("[Enrichment Collection] Erreur:", error);

    if (error instanceof Error) {
      console.error("[Enrichment Collection] Message:", error.message);
      console.error("[Enrichment Collection] Stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: "Erreur lors de l'enrichissement de la collection",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
