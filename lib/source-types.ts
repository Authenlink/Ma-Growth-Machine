export const SOURCE_TYPE_LABELS: Record<string, string> = {
  "linkedin-company-posts": "Posts LinkedIn entreprise",
  "linkedin-profile-posts": "Posts LinkedIn profil",
  "pagespeed-seo": "Analyse SEO",
  "trustpilot-reviews": "Avis Trustpilot",
  "email-verify": "Email verify",
};

export const FILTERABLE_SOURCE_TYPES = Object.keys(SOURCE_TYPE_LABELS);

/**
 * Type d'entité utilisé lors de l'enregistrement dans entity_scraper_usages.
 * pagespeed-seo, trustpilot-reviews : company.
 * email-verify : basé sur leads.emailVerifyEmaillist (lead).
 */
export const SOURCE_ENTITY_TYPE: Record<string, "lead" | "company"> = {
  "linkedin-company-posts": "lead",
  "linkedin-profile-posts": "lead",
  "pagespeed-seo": "company",
  "trustpilot-reviews": "company",
  "email-verify": "lead",
};

/**
 * Sources qui n'utilisent pas entity_scraper_usages.
 * trustpilot-reviews : table trustpilot_reviews (companyId).
 * email-verify : champ leads.emailVerifyEmaillist (lead).
 */
export const SOURCE_USE_ENTITY_SCRAPER_USAGES: Record<string, boolean> = {
  "linkedin-company-posts": true,
  "linkedin-profile-posts": true,
  "pagespeed-seo": true,
  "trustpilot-reviews": false,
  "email-verify": false,
};
