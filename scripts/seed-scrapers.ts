import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { resolve } from "path";
import * as dotenv from "dotenv";
import { scrapers } from "../lib/schema";
import {
  JOB_TITLES,
  SENIORITY_LEVELS,
  DEPARTMENTS,
  COUNTRIES,
  COMPANY_SIZES,
  INDUSTRIES,
} from "../lib/scrapers/constants";

// Charger les variables d'environnement depuis .env
const envPath = resolve(process.cwd(), ".env");
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error("❌ Erreur lors du chargement du fichier .env:", result.error);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL non trouvé après chargement de dotenv");
  console.error("💡 Vérifiez que le fichier .env contient DATABASE_URL=...");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function seedScrapers() {
  console.log("🌱 Seeding scrapers...");

  // Configuration du formulaire Apify LinkedIn Scraper
  const apifyFormConfig = {
    fields: [
      {
        id: "collectionId",
        type: "collection" as const,
        label: "Collection",
        required: true,
        helpText: "Sélectionnez la collection où sauvegarder les leads.",
      },
      {
        id: "totalResults",
        type: "number" as const,
        label: "Nombre de résultats maximum",
        required: true,
        min: 1,
        max: 50000,
        defaultValue: 100,
        helpText: "Nombre maximum de leads à récupérer (1-50000)",
      },
      {
        id: "hasEmail",
        type: "switch" as const,
        label: "Exiger un email",
        defaultValue: false,
        helpText: "Ne récupérer que les leads avec une adresse email",
      },
      {
        id: "hasPhone",
        type: "switch" as const,
        label: "Exiger un téléphone",
        defaultValue: false,
        helpText: "Ne récupérer que les leads avec un numéro de téléphone",
      },
      {
        id: "emailStatus",
        type: "select" as const,
        label: "Statut de l'email",
        defaultValue: "",
        options: ["", "verified", "unverified"],
        optionLabels: {
          "": "Tous",
          verified: "Vérifiés uniquement",
          unverified: "Non vérifiés",
        },
        helpText: "Filtrer par statut de vérification de l'email",
      },
      {
        id: "personTitleIncludes",
        type: "multiselect" as const,
        label: "Titres à inclure",
        optionsSource: "JOB_TITLES",
        helpText: "Sélectionnez les titres de poste à inclure",
      },
      {
        id: "includeSimilarTitles",
        type: "switch" as const,
        label: "Inclure les titres similaires",
        defaultValue: false,
        helpText: "Inclure les variantes et alias des titres sélectionnés",
      },
      {
        id: "personTitleExcludes",
        type: "multiselect" as const,
        label: "Titres à exclure",
        optionsSource: "JOB_TITLES",
        helpText: "Sélectionnez les titres de poste à exclure",
      },
      {
        id: "seniorityIncludes",
        type: "multiselect" as const,
        label: "Niveaux de management à inclure",
        optionsSource: "SENIORITY_LEVELS",
        helpText: "Filtrez par niveau hiérarchique",
      },
      {
        id: "seniorityExcludes",
        type: "multiselect" as const,
        label: "Niveaux de management à exclure",
        optionsSource: "SENIORITY_LEVELS",
        helpText: "Exclure certains niveaux hiérarchiques",
      },
      {
        id: "personFunctionIncludes",
        type: "multiselect" as const,
        label: "Départements à inclure",
        optionsSource: "DEPARTMENTS",
        helpText: "Filtrez par département ou fonction",
      },
      {
        id: "personFunctionExcludes",
        type: "multiselect" as const,
        label: "Départements à exclure",
        optionsSource: "DEPARTMENTS",
        helpText: "Exclure certains départements",
      },
      {
        id: "personLocationCountryIncludes",
        type: "multiselect" as const,
        label: "Pays de la personne à inclure",
        optionsSource: "COUNTRIES",
        helpText: "Filtrez par pays de la personne",
      },
      {
        id: "personLocationCityIncludes",
        type: "text" as const,
        label: "Ville de la personne",
        placeholder: "Ex: Marseille, Paris...",
        helpText: "Ajoutez des villes (saisie libre)",
      },
      {
        id: "companyNameMatchMode",
        type: "select" as const,
        label: "Mode de correspondance du nom d'entreprise",
        defaultValue: "phrase",
        options: ["phrase", "contains", "exact"],
        optionLabels: {
          phrase: "Phrase exacte",
          contains: "Contient",
          exact: "Exact",
        },
        helpText: "Comment faire correspondre les noms d'entreprises",
      },
      {
        id: "companyDomainMatchMode",
        type: "select" as const,
        label: "Mode de correspondance du domaine",
        defaultValue: "contains",
        options: ["contains", "exact"],
        optionLabels: {
          contains: "Contient",
          exact: "Exact",
        },
        helpText: "Comment faire correspondre les domaines",
      },
      {
        id: "companyNameIncludes",
        type: "text" as const,
        label: "Noms d'entreprises spécifiques",
        placeholder: "Ex: Getfluence, Agence Syril Digital...",
        helpText: "Ajoutez des noms d'entreprises (saisie libre)",
      },
      {
        id: "companyEmployeeSizeIncludes",
        type: "multiselect" as const,
        label: "Taille de l'entreprise (nombre d'employés)",
        optionsSource: "COMPANY_SIZES",
        helpText: "Filtrez par taille d'entreprise",
      },
      {
        id: "companyIndustryIncludes",
        type: "multiselect" as const,
        label: "Industries",
        optionsSource: "INDUSTRIES",
        helpText: "Filtrez par industrie",
      },
      {
        id: "companyLocationCountryIncludes",
        type: "multiselect" as const,
        label: "Pays de l'entreprise",
        optionsSource: "COUNTRIES",
        helpText: "Filtrez par pays de l'entreprise",
      },
      {
        id: "companyLocationCityIncludes",
        type: "text" as const,
        label: "Ville de l'entreprise",
        placeholder: "Ex: Marseille, Paris...",
        helpText: "Ajoutez des villes (saisie libre)",
      },
    ],
    sections: [
      {
        title: "Collection",
        description: "Sélectionnez la collection où sauvegarder les leads.",
        fields: ["collectionId"],
      },
      {
        title: "Résultats",
        description: "Configurez le nombre de leads à récupérer.",
        fields: ["totalResults"],
      },
      {
        title: "Email & Téléphone",
        description: "Filtrez les leads selon leurs informations de contact.",
        fields: ["hasEmail", "hasPhone", "emailStatus"],
      },
      {
        title: "Titres de poste",
        description: "Filtrez par titre de poste (sélection multiple).",
        fields: [
          "personTitleIncludes",
          "includeSimilarTitles",
          "personTitleExcludes",
        ],
      },
      {
        title: "Niveau de management",
        description: "Filtrez par niveau hiérarchique.",
        fields: ["seniorityIncludes", "seniorityExcludes"],
      },
      {
        title: "Départements",
        description: "Filtrez par département ou fonction.",
        fields: ["personFunctionIncludes", "personFunctionExcludes"],
      },
      {
        title: "Localisation Personne",
        description: "Filtrez par pays et ville de la personne.",
        fields: [
          "personLocationCountryIncludes",
          "personLocationCityIncludes",
        ],
      },
      {
        title: "Entreprise",
        description: "Filtrez par entreprise, taille, industrie et localisation.",
        fields: [
          "companyNameMatchMode",
          "companyDomainMatchMode",
          "companyNameIncludes",
          "companyEmployeeSizeIncludes",
          "companyIndustryIncludes",
          "companyLocationCountryIncludes",
          "companyLocationCityIncludes",
        ],
      },
    ],
  };

  // Configuration du formulaire LinkedIn Company Posts
  const linkedinCompanyPostsFormConfig = {
    fields: [
      {
        id: "maxPosts",
        type: "number" as const,
        label: "Nombre maximum de posts",
        required: true,
        min: 1,
        max: 1000,
        defaultValue: 10,
        helpText: "Nombre maximum de posts à récupérer (1-1000)",
      },
      {
        id: "postedDateLimit",
        type: "text" as const,
        label: "Date limite (optionnel)",
        placeholder: "YYYY-MM-DD ou timestamp",
        helpText: "Ne récupérer que les posts après cette date (format ISO ou timestamp)",
      },
      {
        id: "forceEnrichment",
        type: "switch" as const,
        label: "Forcer l'enrichissement",
        defaultValue: false,
        helpText: "Ré-enrichir même si déjà enrichi",
      },
    ],
    sections: [
      {
        title: "Paramètres de scraping",
        description: "Configurez le nombre de posts et la date limite.",
        fields: ["maxPosts", "postedDateLimit"],
      },
      {
        title: "Options",
        description: "Options d'enrichissement.",
        fields: ["forceEnrichment"],
      },
    ],
  };

  // Configuration du formulaire LinkedIn Profile Posts
  const linkedinProfilePostsFormConfig = {
    fields: [
      {
        id: "maxPosts",
        type: "number" as const,
        label: "Nombre maximum de posts",
        required: true,
        min: 1,
        max: 1000,
        defaultValue: 10,
        helpText: "Nombre maximum de posts à récupérer (1-1000)",
      },
      {
        id: "postedDateLimit",
        type: "text" as const,
        label: "Date limite (optionnel)",
        placeholder: "YYYY-MM-DD ou timestamp",
        helpText: "Ne récupérer que les posts après cette date (format ISO ou timestamp)",
      },
      {
        id: "forceEnrichment",
        type: "switch" as const,
        label: "Forcer l'enrichissement",
        defaultValue: false,
        helpText: "Ré-enrichir même si déjà enrichi",
      },
    ],
    sections: [
      {
        title: "Paramètres de scraping",
        description: "Configurez le nombre de posts et la date limite.",
        fields: ["maxPosts", "postedDateLimit"],
      },
      {
        title: "Options",
        description: "Options d'enrichissement.",
        fields: ["forceEnrichment"],
      },
    ],
  };

  // Configuration du formulaire LinkedIn Company Employees
  const linkedinCompanyEmployeesFormConfig = {
    fields: [
      {
        id: "collectionId",
        type: "collection" as const,
        label: "Collection",
        required: true,
        helpText: "Sélectionnez la collection où sauvegarder les employés.",
      },
      {
        id: "companyId",
        type: "company" as const,
        label: "Entreprise (depuis la liste)",
        required: false,
        helpText: "Sélectionnez une entreprise depuis votre liste, ou saisissez directement l'URL LinkedIn ci-dessous.",
      },
      {
        id: "companyLinkedinUrl",
        type: "text" as const,
        label: "URL LinkedIn de l'entreprise",
        required: false,
        placeholder: "https://www.linkedin.com/company/nom-entreprise",
        helpText: "Saisissez directement l'URL LinkedIn de l'entreprise (ex: https://www.linkedin.com/company/bricks-fr). Ce champ est prioritaire sur la sélection ci-dessus.",
      },
      {
        id: "maxItems",
        type: "number" as const,
        label: "Nombre maximum d'employés",
        required: true,
        min: 1,
        max: 1000,
        defaultValue: 25,
        helpText: "Nombre maximum d'employés à récupérer (1-1000)",
      },
      {
        id: "profileScraperMode",
        type: "select" as const,
        label: "Mode de scraping des profils",
        defaultValue: "Full ($8 per 1k)",
        options: ["Short ($4 per 1k)", "Full ($8 per 1k)", "Full + email search ($12 per 1k)"],
        optionLabels: {
          "Short ($4 per 1k)": "Court ($4 pour 1k)",
          "Full ($8 per 1k)": "Complet ($8 pour 1k)",
          "Full + email search ($12 per 1k)": "Complet + recherche email ($12 pour 1k)",
        },
        helpText: "Choisissez le niveau de détail des profils à scraper",
      },
      {
        id: "recentlyChangedJobs",
        type: "switch" as const,
        label: "Employés ayant changé de poste récemment",
        defaultValue: false,
        helpText: "Ne récupérer que les employés ayant changé de poste récemment",
      },
      {
        id: "companyBatchMode",
        type: "select" as const,
        label: "Mode de traitement",
        defaultValue: "all_at_once",
        options: ["all_at_once", "one_by_one"],
        optionLabels: {
          all_at_once: "Toutes en une fois",
          one_by_one: "Une par une",
        },
        helpText: "Comment traiter les entreprises (toutes en une fois ou une par une)",
      },
    ],
    sections: [
      {
        title: "Collection",
        description: "Sélectionnez la collection où sauvegarder les employés.",
        fields: ["collectionId"],
      },
      {
        title: "Entreprise",
        description: "Sélectionnez une entreprise depuis votre liste ou saisissez directement son URL LinkedIn.",
        fields: ["companyId", "companyLinkedinUrl"],
      },
      {
        title: "Paramètres",
        description: "Configurez les paramètres de scraping.",
        fields: ["maxItems", "profileScraperMode", "recentlyChangedJobs", "companyBatchMode"],
      },
    ],
  };

  try {
    // Vérifier si le scraper existe déjà
    const existing = await db
      .select()
      .from(scrapers)
      .where(eq(scrapers.provider, "apify"))
      .limit(1);

    if (existing.length > 0) {
      console.log("✅ Scraper Apify existe déjà, mise à jour...");
      await db
        .update(scrapers)
        .set({
          name: "Apify LinkedIn Scraper",
          description:
            "Scraper de leads LinkedIn via Apify. Permet de filtrer par titre, localisation, entreprise et bien plus.",
          provider: "apify",
          providerConfig: {
            actorId: "pipelinelabs/lead-scraper-apollo-zoominfo-lusha-ppe",
          },
          formConfig: apifyFormConfig,
          mapperType: "apify",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(scrapers.id, existing[0].id));
      console.log("✅ Scraper Apify mis à jour");
    } else {
      console.log("➕ Insertion du scraper Apify...");
      await db.insert(scrapers).values({
        name: "Apify LinkedIn Scraper",
        description:
          "Scraper de leads LinkedIn via Apify. Permet de filtrer par titre, localisation, entreprise et bien plus.",
        provider: "apify",
        providerConfig: {
          actorId: "kVYdvNOefemtiDXO5",
        },
        formConfig: apifyFormConfig,
        mapperType: "apify",
        isActive: true,
      });
      console.log("✅ Scraper Apify inséré");
    }

    // LinkedIn Company Posts Scraper
    const existingCompanyPosts = await db
      .select()
      .from(scrapers)
      .where(eq(scrapers.mapperType, "linkedin-company-posts"))
      .limit(1);

    if (existingCompanyPosts.length > 0) {
      console.log("✅ Scraper LinkedIn Company Posts existe déjà, mise à jour...");
      await db
        .update(scrapers)
        .set({
          name: "LinkedIn Company Posts Enrichment",
          description:
            "Enrichit les leads avec les posts LinkedIn de leur entreprise.",
          provider: "apify",
          providerConfig: {
            actorId: "harvestapi/linkedin-company-posts",
          },
          formConfig: linkedinCompanyPostsFormConfig,
          mapperType: "linkedin-company-posts",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(scrapers.id, existingCompanyPosts[0].id));
      console.log("✅ Scraper LinkedIn Company Posts mis à jour");
    } else {
      console.log("➕ Insertion du scraper LinkedIn Company Posts...");
      await db.insert(scrapers).values({
        name: "LinkedIn Company Posts Enrichment",
        description:
          "Enrichit les leads avec les posts LinkedIn de leur entreprise.",
        provider: "apify",
        providerConfig: {
          actorId: "harvestapi/linkedin-company-posts",
        },
        formConfig: linkedinCompanyPostsFormConfig,
        mapperType: "linkedin-company-posts",
        isActive: true,
      });
      console.log("✅ Scraper LinkedIn Company Posts inséré");
    }

    // LinkedIn Profile Posts Scraper
    const existingProfilePosts = await db
      .select()
      .from(scrapers)
      .where(eq(scrapers.mapperType, "linkedin-profile-posts"))
      .limit(1);

    if (existingProfilePosts.length > 0) {
      console.log("✅ Scraper LinkedIn Profile Posts existe déjà, mise à jour...");
      await db
        .update(scrapers)
        .set({
          name: "LinkedIn Profile Posts Enrichment",
          description:
            "Enrichit les leads avec leurs propres posts LinkedIn.",
          provider: "apify",
          providerConfig: {
            actorId: "harvestapi/linkedin-profile-posts",
          },
          formConfig: linkedinProfilePostsFormConfig,
          mapperType: "linkedin-profile-posts",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(scrapers.id, existingProfilePosts[0].id));
      console.log("✅ Scraper LinkedIn Profile Posts mis à jour");
    } else {
      console.log("➕ Insertion du scraper LinkedIn Profile Posts...");
      await db.insert(scrapers).values({
        name: "LinkedIn Profile Posts Enrichment",
        description:
          "Enrichit les leads avec leurs propres posts LinkedIn.",
        provider: "apify",
        providerConfig: {
          actorId: "harvestapi/linkedin-profile-posts",
        },
        formConfig: linkedinProfilePostsFormConfig,
        mapperType: "linkedin-profile-posts",
        isActive: true,
      });
      console.log("✅ Scraper LinkedIn Profile Posts inséré");
    }

    // LinkedIn Company Employees Scraper
    const existingCompanyEmployees = await db
      .select()
      .from(scrapers)
      .where(eq(scrapers.mapperType, "linkedin-company-employees"))
      .limit(1);

    if (existingCompanyEmployees.length > 0) {
      console.log("✅ Scraper LinkedIn Company Employees existe déjà, mise à jour...");
      await db
        .update(scrapers)
        .set({
          name: "LinkedIn Company Employees Scraper",
          description:
            "Scrape les employés d'une entreprise LinkedIn avec leurs informations détaillées.",
          provider: "apify",
          providerConfig: {
            actorId: "harvestapi/linkedin-company-employees",
          },
          formConfig: linkedinCompanyEmployeesFormConfig,
          mapperType: "linkedin-company-employees",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(scrapers.id, existingCompanyEmployees[0].id));
      console.log("✅ Scraper LinkedIn Company Employees mis à jour");
    } else {
      console.log("➕ Insertion du scraper LinkedIn Company Employees...");
      await db.insert(scrapers).values({
        name: "LinkedIn Company Employees Scraper",
        description:
          "Scrape les employés d'une entreprise LinkedIn avec leurs informations détaillées.",
        provider: "apify",
        providerConfig: {
          actorId: "harvestapi/linkedin-company-employees",
        },
        formConfig: linkedinCompanyEmployeesFormConfig,
        mapperType: "linkedin-company-employees",
        isActive: true,
      });
      console.log("✅ Scraper LinkedIn Company Employees inséré");
    }

    // Bulk Email Finder Scraper
    const bulkEmailFinderFormConfig = {
      fields: [
        {
          id: "collectionId",
          type: "collection" as const,
          label: "Collection",
          required: true,
          helpText: "Sélectionnez la collection où sauvegarder les leads.",
        },
        {
          id: "selectedLeads",
          type: "leads" as const,
          label: "Sélectionner des leads existants",
          helpText: "Sélectionnez des leads de la collection pour lesquels vous souhaitez trouver des emails. Seuls les leads sans email sont affichés.",
        },
        {
          id: "people",
          type: "text" as const,
          label: "Ou entrer manuellement",
          placeholder: "Alban, Huntziger, bricks.co\nYoann, Ross, bricks.co",
          helpText: "Entrez une personne par ligne au format : Prénom, Nom, Domaine. Vous pouvez coller plusieurs lignes.",
        },
      ],
      sections: [
        {
          title: "Collection",
          description: "Sélectionnez la collection où sauvegarder les leads.",
          fields: ["collectionId"],
        },
        {
          title: "Personnes à rechercher",
          description: "Sélectionnez des leads existants ou entrez manuellement les personnes pour lesquelles vous souhaitez trouver des emails.",
          fields: ["selectedLeads", "people"],
        },
      ],
    };

    const existingBulkEmailFinder = await db
      .select()
      .from(scrapers)
      .where(eq(scrapers.mapperType, "bulk-email-finder"))
      .limit(1);

    if (existingBulkEmailFinder.length > 0) {
      console.log("✅ Scraper Bulk Email Finder existe déjà, mise à jour...");
      await db
        .update(scrapers)
        .set({
          name: "Bulk Email Finder",
          description:
            "Trouve des emails à partir de prénom, nom et domaine d'entreprise.",
          provider: "apify",
          providerConfig: {
            actorId: "icypeas_official/bulk-email-finder",
          },
          formConfig: bulkEmailFinderFormConfig,
          mapperType: "bulk-email-finder",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(scrapers.id, existingBulkEmailFinder[0].id));
      console.log("✅ Scraper Bulk Email Finder mis à jour");
    } else {
      console.log("➕ Insertion du scraper Bulk Email Finder...");
      await db.insert(scrapers).values({
        name: "Bulk Email Finder",
        description:
          "Trouve des emails à partir de prénom, nom et domaine d'entreprise.",
        provider: "apify",
        providerConfig: {
          actorId: "icypeas_official/bulk-email-finder",
        },
        formConfig: bulkEmailFinderFormConfig,
        mapperType: "bulk-email-finder",
        isActive: true,
      });
      console.log("✅ Scraper Bulk Email Finder inséré");
    }

    // Trustpilot Reviews Scraper
    const trustpilotReviewsFormConfig = {
      fields: [
        {
          id: "collectionId",
          type: "collection" as const,
          label: "Collection",
          helpText: "En mode collection, sélectionnez la collection à enrichir.",
        },
        {
          id: "companyId",
          type: "company" as const,
          label: "Entreprise",
          helpText: "En mode entreprise unique, sélectionnez l'entreprise.",
        },
        {
          id: "maxItems",
          type: "number" as const,
          label: "Nombre max d'avis par entreprise",
          min: 10,
          max: 500,
          defaultValue: 100,
          helpText: "Nombre maximum d'avis à récupérer (10-500)",
        },
      ],
      sections: [
        {
          title: "Paramètres",
          description: "Scrape les avis Trustpilot via Apify. Un domaine (website) est requis pour chaque entreprise.",
          fields: ["collectionId", "companyId", "maxItems"],
        },
      ],
    };

    const existingTrustpilot = await db
      .select()
      .from(scrapers)
      .where(eq(scrapers.mapperType, "trustpilot-reviews"))
      .limit(1);

    if (existingTrustpilot.length > 0) {
      console.log("✅ Scraper Trustpilot Reviews existe déjà, mise à jour...");
      await db
        .update(scrapers)
        .set({
          name: "Trustpilot Reviews Scraper",
          description:
            "Scrape les avis Trustpilot des entreprises. Utilisez la page Enrichissement > Avis Trustpilot pour lancer.",
          provider: "apify",
          providerConfig: {
            actorId: "thewolves/trustpilot-reviews-scraper",
          },
          formConfig: trustpilotReviewsFormConfig,
          mapperType: "trustpilot-reviews",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(scrapers.id, existingTrustpilot[0].id));
      console.log("✅ Scraper Trustpilot Reviews mis à jour");
    } else {
      console.log("➕ Insertion du scraper Trustpilot Reviews...");
      await db.insert(scrapers).values({
        name: "Trustpilot Reviews Scraper",
        description:
          "Scrape les avis Trustpilot des entreprises. Utilisez la page Enrichissement > Avis Trustpilot pour lancer.",
        provider: "apify",
        providerConfig: {
          actorId: "thewolves/trustpilot-reviews-scraper",
        },
        formConfig: trustpilotReviewsFormConfig,
        mapperType: "trustpilot-reviews",
        isActive: true,
      });
      console.log("✅ Scraper Trustpilot Reviews inséré");
    }

    console.log("🎉 Seeding terminé!");
  } catch (error) {
    console.error("❌ Erreur lors du seeding:", error);
    throw error;
  }
}

// Exécuter le seed si le script est appelé directement
if (require.main === module) {
  seedScrapers()
    .then(() => {
      console.log("✅ Seed terminé avec succès");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erreur lors du seed:", error);
      process.exit(1);
    });
}

export { seedScrapers };
