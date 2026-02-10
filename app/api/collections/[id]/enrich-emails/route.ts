import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collections, leads, companies, scrapers, leadCollections } from "@/lib/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getAdapter } from "@/lib/scrapers/adapter-factory";
import { extractDomain } from "@/lib/bulk-email-finder-mapper";

// Timeout maximum pour un run (30 minutes)
const MAX_RUN_TIMEOUT = 30 * 60 * 1000;
// Intervalle de polling (5 secondes)
const POLL_INTERVAL = 5000;

/**
 * POST /api/collections/[id]/enrich-emails - Enrichit tous les leads d'une collection sans email
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
    const { scraperId } = body;

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

    if (mapperType !== "bulk-email-finder") {
      return NextResponse.json(
        { error: "Ce scraper n'est pas adapté pour l'enrichissement d'emails" },
        { status: 400 }
      );
    }

    // Récupérer tous les leads de la collection sans email (via lead_collections)
    const collectionLeads = await db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        companyId: leads.companyId,
        company: {
          id: companies.id,
          website: companies.website,
          linkedinUrl: companies.linkedinUrl,
        },
      })
      .from(leads)
      .innerJoin(leadCollections, and(
        eq(leadCollections.leadId, leads.id),
        eq(leadCollections.collectionId, collectionId)
      ))
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .where(and(eq(leads.userId, userId), isNull(leads.email)));

    console.log(
      `[Enrichment Emails Collection] User ${userId} enrichit collection ${collectionId} avec ${collectionLeads.length} leads sans email`
    );

    if (collectionLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucun lead sans email à enrichir",
        metrics: {
          total: 0,
          enriched: 0,
          skipped: 0,
          errors: 0,
        },
      });
    }

    // Préparer les personnes pour le scraper
    const people: string[] = [];
    const leadMapping: Map<string, number> = new Map(); // Map "Prénom, Nom, Domaine" -> leadId

    for (const lead of collectionLeads) {
      // Vérifier qu'on a au moins firstName et lastName
      if (!lead.firstName || !lead.lastName) {
        continue;
      }

      // Extraire le domaine depuis l'entreprise
      let domain: string | null = null;
      if (lead.company?.website) {
        domain = extractDomain(lead.company.website);
      } else if (lead.company?.linkedinUrl) {
        // Essayer d'extraire un domaine depuis LinkedIn URL (peu probable mais possible)
        // Pour l'instant, on skip si pas de website
        continue;
      }

      if (!domain) {
        console.log(
          `[Enrichment Emails Collection] Lead ${lead.id} ignoré : pas de domaine disponible`
        );
        continue;
      }

      const personString = `${lead.firstName}, ${lead.lastName}, ${domain}`;
      people.push(personString);
      leadMapping.set(personString, lead.id);
    }

    if (people.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucun lead avec les informations nécessaires (prénom, nom, domaine)",
        metrics: {
          total: collectionLeads.length,
          enriched: 0,
          skipped: collectionLeads.length,
          errors: 0,
        },
      });
    }

    console.log(
      `[Enrichment Emails Collection] ${people.length} personnes à rechercher sur ${collectionLeads.length} leads`
    );

    // Créer l'adapter approprié
    const adapter = getAdapter(
      mapperType,
      (scraperConfig.providerConfig || {}) as Record<string, unknown>
    );

    // Préparer les paramètres pour le scraper
    const scrapingParams: Record<string, unknown> = {
      people: people,
    };

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

      if (attempts % 6 === 0) {
        console.log(
          `[Enrichment Emails Collection] Run ${run.id} toujours en cours: ${runStatus.status} (${attempts * POLL_INTERVAL / 1000}s)`
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

      console.error(`[Enrichment Emails Collection] Erreur pour run ${run.id}:`, errorMessage);

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

    // Mapper et sauvegarder les emails trouvés
    const mappingResult = await adapter.mapToLeads(items, collectionId, userId);

    console.log(
      `[Enrichment Emails Collection] Enrichissement terminé pour collection ${collectionId}:`,
      `${mappingResult.enriched || 0} enrichis, ${mappingResult.skipped || 0} ignorés, ${mappingResult.errors || 0} erreurs`
    );

    return NextResponse.json({
      success: true,
      runId: run.id,
      metrics: {
        total: collectionLeads.length,
        processed: people.length,
        enriched: mappingResult.enriched || 0,
        skipped: mappingResult.skipped || 0,
        errors: mappingResult.errors || 0,
      },
    });
  } catch (error) {
    console.error("[Enrichment Emails Collection] Erreur:", error);

    if (error instanceof Error) {
      console.error("[Enrichment Emails Collection] Message:", error.message);
      console.error("[Enrichment Emails Collection] Stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: "Erreur lors de l'enrichissement des emails de la collection",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
