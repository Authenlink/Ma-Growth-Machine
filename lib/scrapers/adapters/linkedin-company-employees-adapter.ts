import { ApifyAdapter, ApifyProviderConfig } from "./apify-adapter";
import { ScraperRun, MappingResult } from "./base-adapter";
import { mapLinkedInEmployeesToLeads, LinkedInEmployeeData } from "../../linkedin-employees-mapper";

/**
 * Adapter pour le scraper LinkedIn Company Employees
 * Scrape les employés d'une entreprise LinkedIn
 */
export class LinkedInCompanyEmployeesAdapter extends ApifyAdapter {
  constructor(providerConfig: ApifyProviderConfig) {
    super({
      actorId: "harvestapi/linkedin-company-employees",
    });
  }

  /**
   * Exécute le scraping des employés d'entreprise LinkedIn
   * @param params Paramètres contenant companyLinkedinUrl (string), maxItems, profileScraperMode, etc.
   */
  async execute(params: Record<string, unknown>): Promise<ScraperRun> {
    // Préparer les paramètres pour Apify
    const input: Record<string, unknown> = {};

    // companies doit être un array d'URLs LinkedIn d'entreprises
    let companies: string[] = [];
    if (params.companyLinkedinUrl) {
      if (Array.isArray(params.companyLinkedinUrl)) {
        companies = params.companyLinkedinUrl as string[];
      } else {
        companies = [params.companyLinkedinUrl as string];
      }
    } else {
      throw new Error("companyLinkedinUrl est requis (string ou array)");
    }
    input.companies = companies;

    // maxItems : nombre maximum d'employés à récupérer
    if (params.maxItems !== undefined) {
      input.maxItems = params.maxItems;
    }

    // profileScraperMode : mode de scraping des profils (défaut: "Full ($8 per 1k)")
    input.profileScraperMode = params.profileScraperMode || "Full ($8 per 1k)";

    // companyBatchMode : mode de traitement par batch (défaut: "all_at_once")
    input.companyBatchMode = params.companyBatchMode || "all_at_once";

    // recentlyChangedJobs : filtrer les changements récents (défaut: false)
    input.recentlyChangedJobs = params.recentlyChangedJobs !== undefined ? params.recentlyChangedJobs : false;

    // Autres paramètres optionnels
    if (params.locations !== undefined) {
      input.locations = params.locations;
    }
    if (params.searchQuery !== undefined) {
      input.searchQuery = params.searchQuery;
    }
    if (params.jobTitles !== undefined) {
      input.jobTitles = params.jobTitles;
    }
    if (params.pastJobTitles !== undefined) {
      input.pastJobTitles = params.pastJobTitles;
    }
    if (params.industryIds !== undefined) {
      input.industryIds = params.industryIds;
    }
    if (params.yearsAtCurrentCompanyIds !== undefined) {
      input.yearsAtCurrentCompanyIds = params.yearsAtCurrentCompanyIds;
    }
    if (params.yearsOfExperienceIds !== undefined) {
      input.yearsOfExperienceIds = params.yearsOfExperienceIds;
    }
    if (params.seniorityLevelIds !== undefined) {
      input.seniorityLevelIds = params.seniorityLevelIds;
    }
    if (params.functionIds !== undefined) {
      input.functionIds = params.functionIds;
    }
    if (params.companyHeadcount !== undefined) {
      input.companyHeadcount = params.companyHeadcount;
    }
    if (params.maxItemsPerCompany !== undefined) {
      input.maxItemsPerCompany = params.maxItemsPerCompany;
    }
    if (params.startPage !== undefined) {
      input.startPage = params.startPage;
    }
    if (params.takePages !== undefined) {
      input.takePages = params.takePages;
    }
    if (params.excludeLocations !== undefined) {
      input.excludeLocations = params.excludeLocations;
    }
    if (params.excludePastCompanies !== undefined) {
      input.excludePastCompanies = params.excludePastCompanies;
    }
    if (params.excludeSchools !== undefined) {
      input.excludeSchools = params.excludeSchools;
    }
    if (params.excludeCurrentJobTitles !== undefined) {
      input.excludeCurrentJobTitles = params.excludeCurrentJobTitles;
    }
    if (params.excludePastJobTitles !== undefined) {
      input.excludePastJobTitles = params.excludePastJobTitles;
    }
    if (params.excludeIndustryIds !== undefined) {
      input.excludeIndustryIds = params.excludeIndustryIds;
    }
    if (params.excludeSeniorityLevelIds !== undefined) {
      input.excludeSeniorityLevelIds = params.excludeSeniorityLevelIds;
    }
    if (params.excludeFunctionIds !== undefined) {
      input.excludeFunctionIds = params.excludeFunctionIds;
    }

    // Appeler la méthode parent avec les paramètres préparés
    return super.execute(input);
  }

  /**
   * Mappe les données LinkedIn Employees vers le schéma de leads
   */
  async mapToLeads(
    data: unknown[],
    collectionId: number,
    userId: number,
    options?: { scraperId?: number; companyLinkedinUrl?: string },
  ): Promise<MappingResult> {
    return mapLinkedInEmployeesToLeads(
      data as LinkedInEmployeeData[],
      collectionId,
      userId,
      options?.companyLinkedinUrl,
      { scraperId: options?.scraperId },
    );
  }
}
