import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collections, scrapers, companies, leads, leadCollections } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAdapter } from "@/lib/scrapers/adapter-factory";
import { recordScraperRun } from "@/lib/scraper-runs";

// Timeout maximum pour un run (30 minutes)
const MAX_RUN_TIMEOUT = 30 * 60 * 1000;
// Intervalle de polling (5 secondes)
const POLL_INTERVAL = 5000;

/**
 * POST /api/scraping - Lance un scraping avec le scraper spécifié
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let runId: string | null = null;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const {
      scraperId,
      collectionId,
      companyId,
      companyLinkedinUrl: directLinkedinUrl,
      people,
      selectedLeads,
      ...scrapingParams
    } = body;

    // Validation des paramètres
    if (!scraperId || typeof scraperId !== "number") {
      return NextResponse.json(
        { error: "scraperId est requis et doit être un nombre" },
        { status: 400 },
      );
    }

    if (!collectionId || typeof collectionId !== "number") {
      return NextResponse.json(
        { error: "collectionId est requis et doit être un nombre" },
        { status: 400 },
      );
    }

    // Vérifier que la collection appartient à l'utilisateur
    const collection = await db
      .select()
      .from(collections)
      .where(
        and(eq(collections.id, collectionId), eq(collections.userId, userId)),
      )
      .limit(1);

    if (collection.length === 0) {
      return NextResponse.json(
        { error: "Collection non trouvée ou accès non autorisé" },
        { status: 404 },
      );
    }

    // Charger le scraper depuis la DB
    const scraper = await db
      .select()
      .from(scrapers)
      .where(and(eq(scrapers.id, scraperId), eq(scrapers.isActive, true)))
      .limit(1);

    if (scraper.length === 0) {
      return NextResponse.json(
        { error: "Scraper non trouvé ou inactif" },
        { status: 404 },
      );
    }

    const scraperConfig = scraper[0];

    // Créer l'adapter approprié
    const adapter = getAdapter(
      scraperConfig.mapperType,
      (scraperConfig.providerConfig || {}) as Record<string, unknown>,
    );

    // Déterminer l'URL LinkedIn de l'entreprise
    // Priorité : 1) URL directe fournie, 2) companyId fourni
    let companyLinkedinUrl: string | undefined = undefined;

    // Si une URL LinkedIn est fournie directement, l'utiliser en priorité
    if (
      directLinkedinUrl &&
      typeof directLinkedinUrl === "string" &&
      directLinkedinUrl.trim() !== ""
    ) {
      companyLinkedinUrl = directLinkedinUrl.trim();
      // Valider le format de l'URL LinkedIn
      if (!companyLinkedinUrl.includes("linkedin.com/company/")) {
        return NextResponse.json(
          {
            error:
              "L'URL LinkedIn fournie n'est pas valide. Elle doit contenir 'linkedin.com/company/'",
          },
          { status: 400 },
        );
      }
      scrapingParams.companyLinkedinUrl = companyLinkedinUrl;
    }
    // Sinon, si companyId est fourni, récupérer l'entreprise et extraire linkedinUrl
    else if (companyId && typeof companyId === "number") {
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (company.length === 0) {
        return NextResponse.json(
          { error: "Entreprise non trouvée" },
          { status: 404 },
        );
      }

      if (!company[0].linkedinUrl) {
        return NextResponse.json(
          { error: "L'entreprise sélectionnée n'a pas d'URL LinkedIn" },
          { status: 400 },
        );
      }

      companyLinkedinUrl = company[0].linkedinUrl;
      scrapingParams.companyLinkedinUrl = companyLinkedinUrl;
    }

    // Vérifier qu'au moins une méthode a été fournie pour le scraper linkedin-company-employees
    if (
      scraperConfig.mapperType === "linkedin-company-employees" &&
      !companyLinkedinUrl
    ) {
      return NextResponse.json(
        {
          error:
            "Vous devez soit sélectionner une entreprise, soit fournir une URL LinkedIn d'entreprise",
        },
        { status: 400 },
      );
    }

    console.log(
      `[Scraping] User ${userId} lance un scraping avec scraper ${scraperId} (${scraperConfig.name}) pour collection ${collectionId}`,
    );

    // Pour bulk-email-finder, préparer les personnes à rechercher
    if (scraperConfig.mapperType === "bulk-email-finder") {
      const peopleArray: string[] = [];
      const leadsWithoutDomain: Array<{
        id: number;
        name: string;
        companyName: string | null;
      }> = [];

      // 1. Ajouter les leads sélectionnés s'ils existent
      if (
        selectedLeads &&
        Array.isArray(selectedLeads) &&
        selectedLeads.length > 0
      ) {
        // Récupérer les leads sélectionnés avec leurs entreprises
        const leadIds = selectedLeads
          .map((id) => parseInt(id.toString()))
          .filter((id) => !isNaN(id));

        if (leadIds.length > 0) {
          const leadsToProcess = await db
            .select({
              id: leads.id,
              firstName: leads.firstName,
              lastName: leads.lastName,
              fullName: leads.fullName,
              company: {
                id: companies.id,
                name: companies.name,
                website: companies.website,
              },
            })
            .from(leads)
            .innerJoin(leadCollections, and(
              eq(leadCollections.leadId, leads.id),
              eq(leadCollections.collectionId, collectionId),
            ))
            .leftJoin(companies, eq(leads.companyId, companies.id))
            .where(and(inArray(leads.id, leadIds), eq(leads.userId, userId)));

          // Transformer chaque lead en format "Prénom, Nom, Domaine"
          for (const lead of leadsToProcess) {
            if (!lead.firstName || !lead.lastName) {
              const leadName = lead.fullName || `Lead #${lead.id}`;
              leadsWithoutDomain.push({
                id: lead.id,
                name: leadName,
                companyName: lead.company?.name || null,
              });
              continue;
            }

            // Extraire le domaine depuis l'entreprise
            let domain: string | null = null;
            if (lead.company?.website) {
              try {
                const url = new URL(lead.company.website);
                domain = url.hostname.replace(/^www\./, "");
              } catch {
                domain = lead.company.website
                  .replace(/^www\./, "")
                  .split("/")[0];
              }
            }

            if (!domain) {
              const leadName =
                lead.fullName || `${lead.firstName} ${lead.lastName}`;
              leadsWithoutDomain.push({
                id: lead.id,
                name: leadName,
                companyName: lead.company?.name || null,
              });
              console.log(
                `[Scraping] Lead ${lead.id} (${leadName}) ignoré : pas de domaine disponible${lead.company?.name ? ` (entreprise: ${lead.company.name})` : " (pas d'entreprise associée)"}`,
              );
              continue;
            }

            peopleArray.push(`${lead.firstName}, ${lead.lastName}, ${domain}`);
          }
        }
      }

      // 2. Ajouter les personnes saisies manuellement
      if (people) {
        // Si people est une string, la parser en array (une ligne = une personne)
        if (typeof people === "string") {
          const manualPeople = people
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
          peopleArray.push(...manualPeople);
        } else if (Array.isArray(people)) {
          peopleArray.push(...people);
        }
      }

      // Vérifier qu'on a au moins une personne
      if (peopleArray.length === 0) {
        let errorMessage = "Aucune personne valide à rechercher. ";

        if (leadsWithoutDomain.length > 0) {
          errorMessage += `Les leads suivants n'ont pas de domaine disponible (entreprise sans website ou pas d'entreprise associée) :\n`;
          leadsWithoutDomain.forEach((lead) => {
            errorMessage += `- ${lead.name}${lead.companyName ? ` (${lead.companyName})` : " (pas d'entreprise)"}\n`;
          });
          errorMessage += "\nVous pouvez soit :\n";
          errorMessage += "1. Ajouter un website à l'entreprise de ces leads\n";
          errorMessage +=
            "2. Entrer manuellement ces personnes au format 'Prénom, Nom, Domaine' dans le champ texte";
        } else {
          errorMessage +=
            "Vous devez soit sélectionner des leads, soit entrer manuellement des personnes au format 'Prénom, Nom, Domaine'";
        }

        return NextResponse.json(
          {
            error: errorMessage,
            leadsWithoutDomain:
              leadsWithoutDomain.length > 0 ? leadsWithoutDomain : undefined,
          },
          { status: 400 },
        );
      }

      // Avertir si certains leads n'ont pas pu être traités
      if (leadsWithoutDomain.length > 0) {
        console.log(
          `[Scraping] ${leadsWithoutDomain.length} lead(s) ignoré(s) car sans domaine :`,
          leadsWithoutDomain.map((l) => `${l.name} (ID: ${l.id})`).join(", "),
        );
      }

      scrapingParams.people = peopleArray;
    }

    console.log(
      `[Scraping] Paramètres:`,
      JSON.stringify(scrapingParams, null, 2),
    );

    // Exécuter le scraping
    const run = await adapter.execute(scrapingParams);
    runId = run.id;

    console.log(`[Scraping] Run créé: ${runId}, statut initial: ${run.status}`);

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

      // Log du progrès toutes les 30 secondes
      if (attempts % 6 === 0) {
        console.log(
          `[Scraping] Run ${runId} toujours en cours: ${runStatus.status} (${(attempts * POLL_INTERVAL) / 1000}s)`,
        );
      }
    }

    console.log(
      `[Scraping] Run ${runId} terminé avec le statut: ${runStatus.status}`,
    );

    // Vérifier le statut final
    if (runStatus.status !== "SUCCEEDED") {
      const errorMessage =
        runStatus.status === "FAILED"
          ? "Le scraping a échoué"
          : runStatus.status === "TIMED-OUT"
            ? "Le scraping a dépassé le temps limite"
            : runStatus.status === "ABORTED"
              ? "Le scraping a été annulé"
              : "Le scraping s'est terminé avec une erreur";

      console.error(`[Scraping] Erreur pour run ${runId}:`, errorMessage);

      try {
        await recordScraperRun({
          runId: run.id,
          scraperId,
          userId,
          source: "scraping",
          collectionId,
          companyId: companyId ?? null,
          itemCount: 0,
          status: runStatus.status,
          fetchCostFromApify: true,
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
        { status: 500 },
      );
    }

    // Récupérer les résultats
    console.log(`[Scraping] Récupération des résultats du run ${runId}`);
    const items = await adapter.getResults(run.id);
    console.log(`[Scraping] ${items.length} résultats récupérés`);

    // Mapper et sauvegarder les leads dans la DB
    // Pour le scraper linkedin-company-employees, passer companyLinkedinUrl au mapper
    console.log(`[Scraping] Début mapToLeads (${items.length} items)`);
    const mapperType = scraperConfig.mapperType;
    const mappingOptions = {
      scraperId,
      companyLinkedinUrl,
    };
    const mappingResult = await adapter.mapToLeads(items, collectionId, userId, mappingOptions);

    const duration = Math.round((Date.now() - startTime) / 1000);

    const enrichedCount = (mappingResult as any).enriched || 0;
    console.log(
      `[Scraping] Scraping terminé pour collection ${collectionId}:`,
      `${mappingResult.created} créés, ${mappingResult.skipped} ignorés, ${mappingResult.errors} erreurs${enrichedCount > 0 ? `, ${enrichedCount} enrichis` : ""}`,
      `(durée: ${duration}s)`,
    );

    // Mettre à jour les champs employeesScraped pour le scraper linkedin-company-employees
    if (
      mapperType === "linkedin-company-employees" &&
      mappingResult.created > 0
    ) {
      let companyToUpdate: number | null = null;

      // Si companyId est fourni, l'utiliser directement
      if (companyId && typeof companyId === "number") {
        companyToUpdate = companyId;
      }
      // Sinon, chercher l'entreprise par linkedinUrl
      else if (companyLinkedinUrl) {
        const companyResult = await db
          .select({ id: companies.id })
          .from(companies)
          .where(eq(companies.linkedinUrl, companyLinkedinUrl))
          .limit(1);

        if (companyResult.length > 0) {
          companyToUpdate = companyResult[0].id;
        }
      }

      // Mettre à jour l'entreprise si trouvée
      if (companyToUpdate) {
        await db
          .update(companies)
          .set({
            employeesScraped: true,
            employeesScrapedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(companies.id, companyToUpdate));

        console.log(
          `[Scraping] Entreprise ${companyToUpdate} mise à jour : employeesScraped = true`,
        );
      }
    }

    // Enregistrer le run en arrière-plan (fire-and-forget) pour ne pas bloquer la réponse
    console.log(`[Scraping] Début recordScraperRun`);
    recordScraperRun({
      runId: run.id,
      scraperId,
      userId,
      source: "scraping",
      collectionId,
      companyId: companyId ?? null,
      itemCount: items.length,
      status: runStatus.status,
      fetchCostFromApify: true,
    })
      .then(() => console.log(`[Scraping] recordScraperRun terminé`))
      .catch((err) =>
        console.error("[recordScraperRun] Erreur en arrière-plan:", err),
      );

    return NextResponse.json({
      success: true,
      runId: run.id,
      metrics: {
        totalFound: items.length,
        created: mappingResult.created,
        skipped: mappingResult.skipped,
        errors: mappingResult.errors,
        ...(enrichedCount > 0 && { enriched: enrichedCount }),
      },
      duration,
    });
  } catch (error) {
    console.error("[Scraping] Erreur lors du scraping:", error);

    // Log détaillé de l'erreur
    if (error instanceof Error) {
      console.error("[Scraping] Message:", error.message);
      console.error("[Scraping] Stack:", error.stack);
    }

    // Si c'est une erreur de rate limiting
    if (
      error instanceof Error &&
      (error.message.includes("429") || error.message.includes("rate limit"))
    ) {
      return NextResponse.json(
        {
          error: "Limite de requêtes atteinte. Veuillez réessayer plus tard.",
          runId,
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        error: "Erreur lors du scraping",
        message: error instanceof Error ? error.message : "Erreur inconnue",
        runId,
      },
      { status: 500 },
    );
  }
}
