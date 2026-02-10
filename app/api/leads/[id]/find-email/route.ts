import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, companies, scrapers, leadCollections } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getAdapter } from "@/lib/scrapers/adapter-factory";
import { extractDomain } from "@/lib/bulk-email-finder-mapper";

// Timeout maximum pour un run (30 minutes)
const MAX_RUN_TIMEOUT = 30 * 60 * 1000;
// Intervalle de polling (5 secondes)
const POLL_INTERVAL = 5000;

/**
 * POST /api/leads/[id]/find-email - Trouve l'email d'un lead spécifique
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const startTime = Date.now();
  let runId: string | null = null;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(session.user.id);
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: "ID de lead invalide" },
        { status: 400 },
      );
    }

    // Récupérer le lead avec son entreprise
    const leadResult = await db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        companyId: leads.companyId,
        company: {
          id: companies.id,
          name: companies.name,
          website: companies.website,
          domain: companies.domain,
        },
      })
      .from(leads)
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
      .limit(1);

    if (leadResult.length === 0) {
      return NextResponse.json(
        { error: "Lead non trouvé ou accès non autorisé" },
        { status: 404 },
      );
    }

    const lead = leadResult[0];

    // Vérifier que le lead n'a pas déjà d'email
    if (lead.email) {
      return NextResponse.json(
        { error: "Ce lead a déjà un email" },
        { status: 400 },
      );
    }

    // Vérifier qu'on a le prénom et le nom
    if (!lead.firstName || !lead.lastName) {
      return NextResponse.json(
        {
          error: "Le lead doit avoir un prénom et un nom pour trouver l'email",
        },
        { status: 400 },
      );
    }

    // Récupérer le domaine (priorité : domaine de l'entreprise, puis website de l'entreprise)
    let domain: string | null = null;

    if (lead.company?.domain && lead.company.domain.trim() !== "") {
      domain = lead.company.domain.trim();
    } else if (lead.company?.website && lead.company.website.trim() !== "") {
      domain = extractDomain(lead.company.website);
    }

    if (!domain) {
      return NextResponse.json(
        {
          error:
            "Le lead n'a pas de domaine disponible. Veuillez ajouter un domaine à l'entreprise associée ou mettre à jour le website de l'entreprise.",
          needsDomain: true,
        },
        { status: 400 },
      );
    }

    // Récupérer la première collection du lead (pour le mapper)
    const leadCollectionResult = await db
      .select({ collectionId: leadCollections.collectionId })
      .from(leadCollections)
      .where(eq(leadCollections.leadId, leadId))
      .limit(1);

    const collectionIdForMapper = leadCollectionResult[0]?.collectionId;
    if (!collectionIdForMapper) {
      return NextResponse.json(
        { error: "Ce lead n'est associé à aucune collection" },
        { status: 400 },
      );
    }

    // Trouver le scraper Bulk Email Finder
    const scraperResult = await db
      .select()
      .from(scrapers)
      .where(
        and(
          eq(scrapers.mapperType, "bulk-email-finder"),
          eq(scrapers.isActive, true),
        ),
      )
      .limit(1);

    if (scraperResult.length === 0) {
      return NextResponse.json(
        { error: "Scraper Bulk Email Finder non trouvé" },
        { status: 404 },
      );
    }

    const scraperConfig = scraperResult[0];

    // Créer l'adapter
    const adapter = getAdapter(
      scraperConfig.mapperType,
      (scraperConfig.providerConfig || {}) as Record<string, unknown>,
    );

    // Préparer les paramètres pour le scraper
    const personString = `${lead.firstName}, ${lead.lastName}, ${domain}`;
    const scrapingParams: Record<string, unknown> = {
      people: [personString],
    };

    console.log(
      `[Find Email] User ${userId} cherche l'email pour lead ${leadId}: ${personString}`,
    );

    // Exécuter le scraping
    const run = await adapter.execute(scrapingParams);
    runId = run.id;

    console.log(
      `[Find Email] Run créé: ${runId}, statut initial: ${run.status}`,
    );

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
          `[Find Email] Run ${runId} toujours en cours: ${runStatus.status} (${(attempts * POLL_INTERVAL) / 1000}s)`,
        );
      }
    }

    console.log(
      `[Find Email] Run ${runId} terminé avec le statut: ${runStatus.status}`,
    );

    // Vérifier le statut final
    if (runStatus.status !== "SUCCEEDED") {
      const errorMessage =
        runStatus.status === "FAILED"
          ? "La recherche d'email a échoué"
          : runStatus.status === "TIMED-OUT"
            ? "La recherche d'email a dépassé le temps limite"
            : runStatus.status === "ABORTED"
              ? "La recherche d'email a été annulée"
              : "La recherche d'email s'est terminée avec une erreur";

      console.error(`[Find Email] Erreur pour run ${runId}:`, errorMessage);

      return NextResponse.json(
        {
          error: errorMessage,
          runId: run.id,
          status: runStatus.status,
        },
        { status: 500 },
      );
    }

    // Récupérer les résultats
    console.log(`[Find Email] Récupération des résultats du run ${runId}`);
    const items = await adapter.getResults(run.id);
    console.log(`[Find Email] ${items.length} résultats récupérés`);

    // Vérifier si les résultats contiennent des NOT_FOUND avant le mapping
    const hasNotFound = items.some(
      (item: unknown) =>
        typeof item === "object" &&
        item !== null &&
        "status" in item &&
        item.status === "NOT_FOUND",
    );

    // Mapper et sauvegarder les résultats
    const mappingResult = await adapter.mapToLeads(
      items,
      collectionIdForMapper,
      userId,
    );

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(
      `[Find Email] Recherche terminée pour lead ${leadId}:`,
      `${mappingResult.enriched || 0} enrichi(s), ${mappingResult.skipped || 0} ignoré(s), ${mappingResult.errors || 0} erreur(s)`,
      `(durée: ${duration}s)`,
    );

    // Récupérer le lead mis à jour pour retourner l'email trouvé
    const updatedLead = await db
      .select({
        email: leads.email,
        emailCertainty: leads.emailCertainty,
      })
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    const foundEmail = updatedLead[0]?.email || null;

    // Si aucun email n'a été trouvé et qu'on a des NOT_FOUND, indiquer explicitement
    if (!foundEmail && hasNotFound) {
      return NextResponse.json({
        success: false,
        notFound: true,
        message: "Aucun email trouvé pour ce lead",
        runId: run.id,
        email: null,
        emailCertainty: null,
        metrics: {
          enriched: mappingResult.enriched || 0,
          skipped: mappingResult.skipped || 0,
          errors: mappingResult.errors || 0,
        },
        duration,
      });
    }

    return NextResponse.json({
      success: true,
      runId: run.id,
      email: foundEmail,
      emailCertainty: updatedLead[0]?.emailCertainty || null,
      metrics: {
        enriched: mappingResult.enriched || 0,
        skipped: mappingResult.skipped || 0,
        errors: mappingResult.errors || 0,
      },
      duration,
    });
  } catch (error) {
    console.error("[Find Email] Erreur:", error);

    if (error instanceof Error) {
      console.error("[Find Email] Message:", error.message);
      console.error("[Find Email] Stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: "Erreur lors de la recherche d'email",
        message: error instanceof Error ? error.message : "Erreur inconnue",
        runId,
      },
      { status: 500 },
    );
  }
}
