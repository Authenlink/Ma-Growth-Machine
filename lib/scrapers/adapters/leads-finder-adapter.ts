import { ApifyAdapter, ApifyProviderConfig } from "./apify-adapter";
import { ScraperRun } from "./base-adapter";
import { mapLeadsFinderDataToLeads } from "../../leads-finder-mapper";
import type { MappingResult } from "./base-adapter";

/**
 * Adapter pour le scraper code_crafter/leads-finder
 * Alternative à Apollo avec emails vérifiés à $1.5/1k leads
 */
export class LeadsFinderAdapter extends ApifyAdapter {
  constructor(providerConfig: ApifyProviderConfig) {
    super({
      actorId: providerConfig.actorId || "code_crafter/leads-finder",
    });
  }

  /**
   * Transforme les paramètres du formulaire vers le format Leads Finder API
   */
  async execute(params: Record<string, unknown>): Promise<ScraperRun> {
    const input: Record<string, unknown> = {};

    // fetch_count (nombre de leads)
    if (params.totalResults !== undefined) {
      input.fetch_count = params.totalResults;
    } else {
      input.fetch_count = 100;
    }

    // file_name (label du run, optionnel)
    if (params.fileName && typeof params.fileName === "string") {
      input.file_name = params.fileName;
    }

    // Job titles
    if (Array.isArray(params.personTitleIncludes) && params.personTitleIncludes.length > 0) {
      input.contact_job_title = params.personTitleIncludes;
    }
    if (Array.isArray(params.personTitleExcludes) && params.personTitleExcludes.length > 0) {
      input.contact_not_job_title = params.personTitleExcludes;
    }

    // Seniority & functional
    if (Array.isArray(params.seniorityIncludes) && params.seniorityIncludes.length > 0) {
      input.seniority_level = params.seniorityIncludes;
    }
    if (Array.isArray(params.personFunctionIncludes) && params.personFunctionIncludes.length > 0) {
      input.functional_level = params.personFunctionIncludes;
    }

    // Location - Leads Finder attend les pays en minuscules (ex: "united states", "france")
    if (Array.isArray(params.personLocationCountryIncludes) && params.personLocationCountryIncludes.length > 0) {
      input.contact_location = params.personLocationCountryIncludes.map((c) =>
        typeof c === "string" ? c.toLowerCase().trim() : c
      );
    }
    if (params.personLocationCityIncludes) {
      const cities = typeof params.personLocationCityIncludes === "string"
        ? params.personLocationCityIncludes.split(",").map((s) => s.trim()).filter(Boolean)
        : Array.isArray(params.personLocationCityIncludes)
          ? params.personLocationCityIncludes
          : [];
      if (cities.length > 0) input.contact_city = cities;
    }
    if (Array.isArray(params.personLocationCountryExcludes) && params.personLocationCountryExcludes.length > 0) {
      input.contact_not_location = params.personLocationCountryExcludes.map((c) =>
        typeof c === "string" ? c.toLowerCase().trim() : c
      );
    }
    if (params.personLocationCityExcludes) {
      const cities = typeof params.personLocationCityExcludes === "string"
        ? params.personLocationCityExcludes.split(",").map((s) => s.trim()).filter(Boolean)
        : Array.isArray(params.personLocationCityExcludes)
          ? params.personLocationCityExcludes
          : [];
      if (cities.length > 0) input.contact_not_city = cities;
    }

    // Email status
    if (typeof params.emailStatus === "string" && params.emailStatus.trim() !== "") {
      input.email_status = [params.emailStatus];
    }

    // Company filters
    if (Array.isArray(params.companyDomainIncludes) && params.companyDomainIncludes.length > 0) {
      input.company_domain = params.companyDomainIncludes;
    } else if (params.companyDomainIncludes && typeof params.companyDomainIncludes === "string") {
      input.company_domain = params.companyDomainIncludes.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (Array.isArray(params.companyEmployeeSizeIncludes) && params.companyEmployeeSizeIncludes.length > 0) {
      input.size = params.companyEmployeeSizeIncludes;
    }
    // Industries - Leads Finder attend des valeurs en minuscules
    if (Array.isArray(params.companyIndustryIncludes) && params.companyIndustryIncludes.length > 0) {
      input.company_industry = params.companyIndustryIncludes.map((i) =>
        typeof i === "string" ? i.toLowerCase().trim() : i
      );
    }
    if (Array.isArray(params.companyIndustryExcludes) && params.companyIndustryExcludes.length > 0) {
      input.company_not_industry = params.companyIndustryExcludes.map((i) =>
        typeof i === "string" ? i.toLowerCase().trim() : i
      );
    }
    if (params.companyKeywordsIncludes) {
      const keywords = typeof params.companyKeywordsIncludes === "string"
        ? params.companyKeywordsIncludes.split(",").map((s) => s.trim()).filter(Boolean)
        : Array.isArray(params.companyKeywordsIncludes)
          ? params.companyKeywordsIncludes
          : [];
      if (keywords.length > 0) input.company_keywords = keywords;
    }
    if (params.companyKeywordsExcludes) {
      const keywords = typeof params.companyKeywordsExcludes === "string"
        ? params.companyKeywordsExcludes.split(",").map((s) => s.trim()).filter(Boolean)
        : Array.isArray(params.companyKeywordsExcludes)
          ? params.companyKeywordsExcludes
          : [];
      if (keywords.length > 0) input.company_not_keywords = keywords;
    }
    if (params.minRevenue && typeof params.minRevenue === "string") {
      input.min_revenue = params.minRevenue;
    }
    if (params.maxRevenue && typeof params.maxRevenue === "string") {
      input.max_revenue = params.maxRevenue;
    }
    if (Array.isArray(params.funding) && params.funding.length > 0) {
      input.funding = params.funding;
    }

    return super.execute(input);
  }

  /**
   * Mappe les données Leads Finder (normalisation snake_case) vers les leads
   */
  async mapToLeads(
    data: unknown[],
    collectionId: number,
    userId: number,
    options?: { scraperId?: number; companyLinkedinUrl?: string },
  ): Promise<MappingResult> {
    return mapLeadsFinderDataToLeads(
      data as Record<string, unknown>[],
      collectionId,
      userId,
      { scraperId: options?.scraperId },
    );
  }
}
