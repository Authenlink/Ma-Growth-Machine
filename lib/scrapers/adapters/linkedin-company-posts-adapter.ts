import { ApifyAdapter, ApifyProviderConfig } from "./apify-adapter";
import { ScraperRun } from "./base-adapter";

/**
 * Adapter pour le scraper LinkedIn Company Posts
 * Scrape les posts d'une entreprise LinkedIn
 */
export class LinkedInCompanyPostsAdapter extends ApifyAdapter {
  constructor(providerConfig: ApifyProviderConfig) {
    super({
      actorId: "harvestapi/linkedin-company-posts",
    });
  }

  /**
   * Exécute le scraping des posts d'entreprise LinkedIn
   * @param params Paramètres contenant organizationLinkedinUrl (array), maxPosts, postedDateLimit
   */
  async execute(params: Record<string, unknown>): Promise<ScraperRun> {
    // Préparer les paramètres pour Apify
    const input: Record<string, unknown> = {};

    // targetUrls doit être un array d'URLs (le scraper Apify attend targetUrls, pas organizationLinkedinUrl)
    let targetUrls: string[] = [];
    if (Array.isArray(params.organizationLinkedinUrl)) {
      targetUrls = params.organizationLinkedinUrl as string[];
    } else if (params.organizationLinkedinUrl) {
      targetUrls = [params.organizationLinkedinUrl as string];
    } else {
      throw new Error("organizationLinkedinUrl est requis (string ou array)");
    }
    input.targetUrls = targetUrls;

    // maxPosts : nombre maximum de posts à récupérer
    if (params.maxPosts !== undefined) {
      input.maxPosts = params.maxPosts;
    }

    // Paramètres optionnels avec valeurs par défaut
    input.includeQuotePosts = params.includeQuotePosts !== undefined ? params.includeQuotePosts : true;
    input.includeReposts = params.includeReposts !== undefined ? params.includeReposts : true;
    input.scrapeComments = params.scrapeComments !== undefined ? params.scrapeComments : false;
    input.scrapeReactions = params.scrapeReactions !== undefined ? params.scrapeReactions : false;
    
    // maxComments et maxReactions (optionnels)
    if (params.maxComments !== undefined) {
      input.maxComments = params.maxComments;
    }
    if (params.maxReactions !== undefined) {
      input.maxReactions = params.maxReactions;
    }

    // postedDateLimit : date limite pour les posts (format ISO string ou timestamp)
    // Note: Le scraper Apify peut ne pas supporter directement postedDateLimit
    // On le passe quand même au cas où
    if (params.postedDateLimit) {
      input.postedDateLimit = params.postedDateLimit;
    }

    // Appeler la méthode parent avec les paramètres préparés
    // On ne veut pas que le parent ajoute totalResults pour ce scraper
    return super.execute(input);
  }
}
