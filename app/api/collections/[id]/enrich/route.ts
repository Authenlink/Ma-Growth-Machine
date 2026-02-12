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

    // Traiter chaque lead
    const results = {
      enriched: 0,
      skipped: 0,
      errors: 0,
      noPosts: 0,
    };

    for (const lead of leadsToEnrich) {
      try {
        // Préparer les paramètres pour le scraper
        const scrapingParams: Record<string, unknown> = {
          maxPosts: maxPosts || 10,
        };

        if (postedDateLimit) {
          scrapingParams.postedDateLimit = postedDateLimit;
        }

        if (mapperType === "linkedin-company-posts") {
          scrapingParams.organizationLinkedinUrl = lead.company?.linkedinUrl;
        } else {
          scrapingParams.linkedinUrl = lead.linkedinUrl;
        }

        // Exécuter le scraping
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
            `[Enrichment Collection] Erreur pour lead ${lead.id}: ${runStatus.status}`
          );
          try {
            await recordScraperRun({
              runId: run.id,
              scraperId,
              userId,
              source: "enrich_collection",
              collectionId,
              leadId: lead.id,
              itemCount: 0,
              status: runStatus.status,
              fetchCostFromApify: true,
            });
          } catch {
            /* ignore */
          }
          results.errors++;
          continue;
        }

        // Récupérer les résultats
        const items = await adapter.getResults(run.id);
        if (items.length > 0 && lead.id === leadsToEnrich[0]?.id) {
          console.log(`[Enrichment Collection] Exemple de résultat pour lead ${lead.id}:`, JSON.stringify(items[0], null, 2));
        }

        // Mapper et sauvegarder les posts
        let mappingResult;
        let newStatus: string;

        if (items.length === 0) {
          newStatus = "no-posts";
          mappingResult = { created: 0, skipped: 0, errors: 0 };
          results.noPosts++;
        } else {
          if (mapperType === "linkedin-company-posts") {
            mappingResult = await mapCompanyPostsToDB(
              items as LinkedInPostData[],
              lead.companyId,
              lead.company?.linkedinUrl!
            );
          } else {
            mappingResult = await mapLeadPostsToDB(
              items as LinkedInPostData[],
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
          await recordScraperRun({
            runId: run.id,
            scraperId,
            userId,
            source: "enrich_collection",
            collectionId,
            leadId: lead.id,
            itemCount: items.length,
            status: runStatus.status,
            fetchCostFromApify: true,
          });
        } catch {
          /* ignore */
        }
      } catch (error) {
        console.error(
          `[Enrichment Collection] Erreur pour lead ${lead.id}:`,
          error
        );
        results.errors++;
      }
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
