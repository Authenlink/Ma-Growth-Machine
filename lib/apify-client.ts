import { ApifyClient } from "apify-client";

// Configuration du client Apify
// Le token doit être défini dans les variables d'environnement
// Dans Next.js, les variables d'environnement sont chargées automatiquement au runtime
// Dans les scripts standalone, il faut charger dotenv avant d'importer ce module
const getApifyToken = () => {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    // Si le token n'est pas disponible, on retourne une chaîne vide
    // Le client Apify lancera une erreur si on essaie de l'utiliser sans token
    // Cela permet de détecter le problème rapidement
    return "";
  }
  return token;
};

export const apifyClient = new ApifyClient({
  token: getApifyToken(),
});

// Actor ID du scraper de leads
export const LEAD_SCRAPER_ACTOR_ID = "kVYdvNOefemtiDXO5";

// Types pour les paramètres de scraping
export interface ScrapingInput {
  totalResults?: number;
  includeSimilarTitles?: boolean;
  companyNameMatchMode?: "phrase" | "contains" | "exact";
  companyDomainMatchMode?: "contains" | "exact";
  
  // Email/Phone
  hasEmail?: boolean;
  hasPhone?: boolean;
  emailStatus?: "verified" | "unverified";
  
  // Titres
  personTitleIncludes?: string[];
  personTitleExcludes?: string[];
  personTitleExtraIncludes?: string[];
  
  // Seniority
  seniorityIncludes?: string[];
  seniorityExcludes?: string[];
  
  // Departments
  personFunctionIncludes?: string[];
  personFunctionExcludes?: string[];
  
  // Location
  personLocationCountryIncludes?: string[];
  personLocationCountryExcludes?: string[];
  personLocationStateIncludes?: string[];
  personLocationCityIncludes?: string[];
  
  // Company filters
  companyNameIncludes?: string[];
  companyDomainIncludes?: string[];
  companyEmployeeSizeIncludes?: string[];
  companyIndustryIncludes?: string[];
  companyLocationCountryIncludes?: string[];
  companyLocationCityIncludes?: string[];
  
  // Autres paramètres possibles
  [key: string]: unknown;
}

// Types pour le statut d'un run
export interface RunStatus {
  id: string;
  status: "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "ABORTED" | "TIMED-OUT";
  startedAt?: string;
  finishedAt?: string;
  defaultDatasetId?: string;
}
