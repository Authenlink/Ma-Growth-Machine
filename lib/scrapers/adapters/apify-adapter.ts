import { ApifyClient } from "apify-client";
import {
  ScraperAdapter,
  ScraperRun,
  ScraperStatus,
  MappingResult,
} from "./base-adapter";
import { mapApifyDataToLeads, ApifyLeadData } from "../../apify-mapper";

/** Valeurs acceptées par l'Actor Apollo (pipelinelabs/lead-scraper-apollo-zoominfo-lusha-ppe) */
const APIFY_PERSON_FUNCTIONS = new Set([
  "Accounting",
  "Administrative",
  "Arts & Design",
  "Business Development",
  "Consulting",
  "Data Science",
  "Education",
  "Engineering",
  "Entrepreneurship",
  "Finance",
  "Human Resources",
  "Information Technology",
  "Legal",
  "Marketing",
  "Media & Communications",
  "Operations",
  "Product Management",
  "Research",
  "Sales",
  "Support",
]);

/** Mapping des valeurs de notre formulaire vers les valeurs Apify */
const PERSON_FUNCTION_MAP: Record<string, string> = {
  "Customer Success": "Support",
};

function mapPersonFunctions(values: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const mapped = PERSON_FUNCTION_MAP[v] ?? v;
    if (APIFY_PERSON_FUNCTIONS.has(mapped) && !seen.has(mapped)) {
      result.push(mapped);
      seen.add(mapped);
    }
  }
  return result;
}

/**
 * Configuration du provider Apify
 */
export interface ApifyProviderConfig {
  actorId: string;
}

/**
 * Adapter pour le scraper Apify
 * Implémente l'interface ScraperAdapter pour être compatible avec le système
 */
export class ApifyAdapter implements ScraperAdapter {
  private client: ApifyClient;
  private actorId: string;

  constructor(providerConfig: ApifyProviderConfig) {
    const token = process.env.APIFY_TOKEN;
    if (!token) {
      throw new Error("APIFY_TOKEN n'est pas défini dans les variables d'environnement");
    }

    this.client = new ApifyClient({ token });
    this.actorId = providerConfig.actorId;
  }

  /**
   * Exécute le scraping Apify avec les paramètres fournis
   */
  async execute(params: Record<string, unknown>): Promise<ScraperRun> {
    // Préparer les paramètres pour Apify
    const input: Record<string, unknown> = {};
    
    // totalResults seulement si pas déjà défini (pour les scrapers qui l'utilisent)
    // Les scrapers LinkedIn posts n'utilisent pas totalResults
    if (params.totalResults !== undefined && !params.targetUrls) {
      input.totalResults = params.totalResults || 100;
    }

    // Ajouter les paramètres optionnels seulement s'ils sont définis
    if (params.hasEmail !== undefined) input.hasEmail = params.hasEmail;
    if (params.hasPhone !== undefined && params.hasPhone === true) input.hasPhone = params.hasPhone;
    if (params.includeSimilarTitles !== undefined) input.includeSimilarTitles = params.includeSimilarTitles;
    if (params.companyNameMatchMode && params.companyNameMatchMode !== "phrase") input.companyNameMatchMode = params.companyNameMatchMode;
    if (params.companyDomainMatchMode && params.companyDomainMatchMode !== "contains") input.companyDomainMatchMode = params.companyDomainMatchMode;
    if (typeof params.emailStatus === "string" && params.emailStatus.trim() !== "") {
      input.emailStatus = params.emailStatus;
    }
    if (Array.isArray(params.personTitleIncludes) && params.personTitleIncludes.length > 0) {
      input.personTitleIncludes = params.personTitleIncludes;
    }
    if (Array.isArray(params.personTitleExcludes)) {
      input.personTitleExcludes = params.personTitleExcludes;
    }
    if (Array.isArray(params.seniorityIncludes)) {
      input.seniorityIncludes = params.seniorityIncludes;
    }
    if (Array.isArray(params.seniorityExcludes)) {
      input.seniorityExcludes = params.seniorityExcludes;
    }
    if (Array.isArray(params.personFunctionIncludes) && params.personFunctionIncludes.length > 0) {
      const mapped = mapPersonFunctions(params.personFunctionIncludes as string[]);
      if (mapped.length > 0) input.personFunctionIncludes = mapped;
    }
    if (Array.isArray(params.personFunctionExcludes) && params.personFunctionExcludes.length > 0) {
      const mapped = mapPersonFunctions(params.personFunctionExcludes as string[]);
      if (mapped.length > 0) input.personFunctionExcludes = mapped;
    }
    if (Array.isArray(params.personLocationCountryIncludes) && params.personLocationCountryIncludes.length > 0) {
      input.personLocationCountryIncludes = params.personLocationCountryIncludes;
    }
    if (Array.isArray(params.personLocationCityIncludes) && params.personLocationCityIncludes.length > 0) {
      input.personLocationCityIncludes = params.personLocationCityIncludes;
    }
    if (Array.isArray(params.companyNameIncludes) && params.companyNameIncludes.length > 0) {
      input.companyNameIncludes = params.companyNameIncludes;
    }
    if (Array.isArray(params.companyEmployeeSizeIncludes) && params.companyEmployeeSizeIncludes.length > 0) {
      input.companyEmployeeSizeIncludes = params.companyEmployeeSizeIncludes;
    }
    if (Array.isArray(params.companyIndustryIncludes) && params.companyIndustryIncludes.length > 0) {
      input.companyIndustryIncludes = params.companyIndustryIncludes;
    }
    if (Array.isArray(params.companyLocationCountryIncludes) && params.companyLocationCountryIncludes.length > 0) {
      input.companyLocationCountryIncludes = params.companyLocationCountryIncludes;
    }
    if (Array.isArray(params.companyLocationCityIncludes) && params.companyLocationCityIncludes.length > 0) {
      input.companyLocationCityIncludes = params.companyLocationCityIncludes;
    }

    // Ajouter tous les autres paramètres non définis explicitement
    Object.keys(params).forEach((key) => {
      if (!(key in input) && params[key] !== undefined && params[key] !== null && key !== "collectionId" && key !== "scraperId" && key !== "emailStatus") {
        input[key] = params[key];
      }
    });

    // Lancer l'Actor Apify
    const run = await this.client.actor(this.actorId).call(input);

    return {
      id: run.id,
      status: run.status as ScraperRun["status"],
      startedAt: run.startedAt?.toISOString(),
      finishedAt: run.finishedAt?.toISOString(),
      defaultDatasetId: run.defaultDatasetId,
    };
  }

  /**
   * Récupère le statut d'un run Apify
   */
  async getStatus(runId: string): Promise<ScraperStatus> {
    const run = await this.client.run(runId).get();

    if (!run) {
      throw new Error(`Run ${runId} non trouvé`);
    }

    return {
      id: run.id,
      status: run.status as ScraperStatus["status"],
      startedAt: run.startedAt?.toISOString(),
      finishedAt: run.finishedAt?.toISOString(),
      defaultDatasetId: run.defaultDatasetId,
    };
  }

  /**
   * Récupère les résultats d'un run Apify terminé
   */
  async getResults(runId: string): Promise<unknown[]> {
    const run = await this.client.run(runId).get();

    if (!run) {
      throw new Error(`Run ${runId} non trouvé`);
    }

    if (!run.defaultDatasetId) {
      throw new Error(`Aucun dataset trouvé pour run ${runId}`);
    }

    const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

    return items;
  }

  /**
   * Mappe les données Apify vers le schéma de leads
   */
  async mapToLeads(
    data: unknown[],
    collectionId: number,
    userId: number
  ): Promise<MappingResult> {
    return mapApifyDataToLeads(
      data as ApifyLeadData[],
      collectionId,
      userId
    );
  }
}
