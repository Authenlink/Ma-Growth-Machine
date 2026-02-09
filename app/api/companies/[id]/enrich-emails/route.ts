import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies, leads, scrapers } from "@/lib/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getAdapter } from "@/lib/scrapers/adapter-factory";
import { extractDomain } from "@/lib/bulk-email-finder-mapper";

// Timeout maximum pour un run (30 minutes)
const MAX_RUN_TIMEOUT = 30 * 60 * 1000;
// Intervalle de polling (5 secondes)
const POLL_INTERVAL = 5000;

/**
 * POST /api/companies/[id]/enrich-emails - Enrichit tous les leads d'une entreprise sans email
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
    const { scraperId } = body;

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

    // Récupérer tous les leads de l'entreprise sans email pour l'utilisateur
    const companyLeads = await db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        collectionId: leads.collectionId,
      })
      .from(leads)
      .where(
        and(
          eq(leads.companyId, companyId),
          eq(leads.userId, userId),
          isNull(leads.email)
        )
      );

    console.log(
      `[Enrichment Emails Company] User ${userId} enrichit entreprise ${companyId} avec ${companyLeads.length} leads sans email`
    );

    if (companyLeads.length === 0) {
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

    // Extraire le domaine depuis l'entreprise
    let domain: string | null = null;
    if (company.website) {
      domain = extractDomain(company.website);
    }

    if (!domain) {
      return NextResponse.json(
        {
          error: "L'entreprise n'a pas de domaine (website) disponible pour la recherche d'emails",
        },
        { status: 400 }
      );
    }

    // Préparer les personnes pour le scraper
    const people: string[] = [];
    const leadMapping: Map<string, number> = new Map(); // Map "Prénom, Nom, Domaine" -> leadId

    for (const lead of companyLeads) {
      // Vérifier qu'on a au moins firstName et lastName
      if (!lead.firstName || !lead.lastName) {
        continue;
      }

      const personString = `${lead.firstName}, ${lead.lastName}, ${domain}`;
      people.push(personString);
      leadMapping.set(personString, lead.id);
    }

    if (people.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucun lead avec les informations nécessaires (prénom, nom)",
        metrics: {
          total: companyLeads.length,
          enriched: 0,
          skipped: companyLeads.length,
          errors: 0,
        },
      });
    }

    console.log(
      `[Enrichment Emails Company] ${people.length} personnes à rechercher sur ${companyLeads.length} leads`
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
          `[Enrichment Emails Company] Run ${run.id} toujours en cours: ${runStatus.status} (${attempts * POLL_INTERVAL / 1000}s)`
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

      console.error(`[Enrichment Emails Company] Erreur pour run ${run.id}:`, errorMessage);

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

    // Pour chaque collection, mapper et sauvegarder les emails trouvés
    // On groupe les leads par collectionId pour optimiser les appels
    const leadsByCollection = new Map<number, typeof companyLeads>();
    for (const lead of companyLeads) {
      if (!leadsByCollection.has(lead.collectionId)) {
        leadsByCollection.set(lead.collectionId, []);
      }
      leadsByCollection.get(lead.collectionId)!.push(lead);
    }

    let totalEnriched = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Utiliser la première collection pour mapper (le mapper gère déjà la collection)
    // En fait, on peut mapper tous les résultats en une fois car le mapper trouve les leads par nom + company
    const firstCollectionId = companyLeads[0].collectionId;
    const mappingResult = await adapter.mapToLeads(items, firstCollectionId, userId);

    totalEnriched = mappingResult.enriched || 0;
    totalSkipped = mappingResult.skipped || 0;
    totalErrors = mappingResult.errors || 0;

    console.log(
      `[Enrichment Emails Company] Enrichissement terminé pour entreprise ${companyId}:`,
      `${totalEnriched} enrichis, ${totalSkipped} ignorés, ${totalErrors} erreurs`
    );

    return NextResponse.json({
      success: true,
      runId: run.id,
      metrics: {
        total: companyLeads.length,
        processed: people.length,
        enriched: totalEnriched,
        skipped: totalSkipped,
        errors: totalErrors,
      },
    });
  } catch (error) {
    console.error("[Enrichment Emails Company] Erreur:", error);

    if (error instanceof Error) {
      console.error("[Enrichment Emails Company] Message:", error.message);
      console.error("[Enrichment Emails Company] Stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: "Erreur lors de l'enrichissement des emails de l'entreprise",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
