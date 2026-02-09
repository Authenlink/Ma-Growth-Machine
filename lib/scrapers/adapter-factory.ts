import { ScraperAdapter } from "./adapters/base-adapter";
import { ApifyAdapter, ApifyProviderConfig } from "./adapters/apify-adapter";
import { LinkedInCompanyPostsAdapter } from "./adapters/linkedin-company-posts-adapter";
import { LinkedInProfilePostsAdapter } from "./adapters/linkedin-profile-posts-adapter";
import { LinkedInCompanyEmployeesAdapter } from "./adapters/linkedin-company-employees-adapter";
import { BulkEmailFinderAdapter } from "./adapters/bulk-email-finder-adapter";

/**
 * Factory pour créer les adapters de scrapers selon leur type
 */
export function getAdapter(
  mapperType: string,
  providerConfig: Record<string, unknown>
): ScraperAdapter {
  // Type assertion nécessaire car providerConfig vient de la DB et contient toujours actorId
  const apifyConfig = providerConfig as unknown as ApifyProviderConfig;
  
  switch (mapperType.toLowerCase()) {
    case "apify":
      return new ApifyAdapter(apifyConfig);

    case "linkedin-company-posts":
      return new LinkedInCompanyPostsAdapter(apifyConfig);

    case "linkedin-profile-posts":
      return new LinkedInProfilePostsAdapter(apifyConfig);

    case "linkedin-company-employees":
      return new LinkedInCompanyEmployeesAdapter(apifyConfig);

    case "bulk-email-finder":
      return new BulkEmailFinderAdapter(apifyConfig);

    default:
      throw new Error(
        `Type de mapper non supporté: ${mapperType}. Types supportés: apify, linkedin-company-posts, linkedin-profile-posts, linkedin-company-employees, bulk-email-finder`
      );
  }
}
