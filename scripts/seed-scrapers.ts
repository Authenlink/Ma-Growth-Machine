import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import { resolve } from "path";
import * as dotenv from "dotenv";
import { scrapers } from "../lib/schema";

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
        id: "folder_collection",
        type: "folder_collection" as const,
        label: "Dossier et collection",
        required: true,
        helpText:
          "Sélectionnez d'abord un dossier, puis une collection où sauvegarder les leads.",
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
        title: "Dossier et collection",
        description:
          "Sélectionnez d'abord un dossier, puis une collection où sauvegarder les leads.",
        fields: ["folder_collection"],
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
        fields: ["personLocationCountryIncludes", "personLocationCityIncludes"],
      },
      {
        title: "Entreprise",
        description:
          "Filtrez par entreprise, taille, industrie et localisation.",
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
        helpText:
          "Ne récupérer que les posts après cette date (format ISO ou timestamp)",
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
        helpText:
          "Ne récupérer que les posts après cette date (format ISO ou timestamp)",
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
        id: "folder_collection",
        type: "folder_collection" as const,
        label: "Dossier et collection",
        required: true,
        helpText:
          "Sélectionnez d'abord un dossier, puis une collection où sauvegarder les employés.",
      },
      {
        id: "companyId",
        type: "company" as const,
        label: "Entreprise (depuis la liste)",
        required: false,
        helpText:
          "Sélectionnez une entreprise depuis votre liste, ou saisissez directement l'URL LinkedIn ci-dessous.",
      },
      {
        id: "companyLinkedinUrl",
        type: "text" as const,
        label: "URL LinkedIn de l'entreprise",
        required: false,
        placeholder: "https://www.linkedin.com/company/nom-entreprise",
        helpText:
          "Saisissez directement l'URL LinkedIn de l'entreprise (ex: https://www.linkedin.com/company/bricks-fr). Ce champ est prioritaire sur la sélection ci-dessus.",
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
        options: [
          "Short ($4 per 1k)",
          "Full ($8 per 1k)",
          "Full + email search ($12 per 1k)",
        ],
        optionLabels: {
          "Short ($4 per 1k)": "Court ($4 pour 1k)",
          "Full ($8 per 1k)": "Complet ($8 pour 1k)",
          "Full + email search ($12 per 1k)":
            "Complet + recherche email ($12 pour 1k)",
        },
        helpText: "Choisissez le niveau de détail des profils à scraper",
      },
      {
        id: "recentlyChangedJobs",
        type: "switch" as const,
        label: "Employés ayant changé de poste récemment",
        defaultValue: false,
        helpText:
          "Ne récupérer que les employés ayant changé de poste récemment",
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
        helpText:
          "Comment traiter les entreprises (toutes en une fois ou une par une)",
      },
    ],
    sections: [
      {
        title: "Dossier et collection",
        description:
          "Sélectionnez d'abord un dossier, puis une collection où sauvegarder les employés.",
        fields: ["folder_collection"],
      },
      {
        title: "Entreprise",
        description:
          "Sélectionnez une entreprise depuis votre liste ou saisissez directement son URL LinkedIn.",
        fields: ["companyId", "companyLinkedinUrl"],
      },
      {
        title: "Paramètres",
        description: "Configurez les paramètres de scraping.",
        fields: [
          "maxItems",
          "profileScraperMode",
          "recentlyChangedJobs",
          "companyBatchMode",
        ],
      },
    ],
  };

  // Configuration du formulaire Leads Finder (code_crafter/leads-finder)
  const REVENUE_OPTIONS = [
    "100K",
    "500K",
    "1M",
    "5M",
    "10M",
    "25M",
    "50M",
    "100M",
    "500M",
    "1B",
    "5B",
    "10B",
  ];
  const leadsFinderFormConfig = {
    fields: [
      {
        id: "folder_collection",
        type: "folder_collection" as const,
        label: "Dossier et collection",
        required: true,
        helpText:
          "Sélectionnez d'abord un dossier, puis une collection où sauvegarder les leads.",
      },
      {
        id: "totalResults",
        type: "number" as const,
        label: "Nombre de leads à récupérer",
        required: true,
        min: 1,
        max: 50000,
        defaultValue: 100,
        helpText:
          "Nombre maximum de leads (1-50000). Plan gratuit Apify: 100 max.",
      },
      {
        id: "emailStatus",
        type: "select" as const,
        label: "Statut de l'email",
        defaultValue: "",
        options: ["", "validated", "unverified"],
        optionLabels: {
          "": "Tous",
          validated: "Vérifiés uniquement",
          unverified: "Non vérifiés",
        },
        helpText: "Filtrer par statut de vérification de l'email",
      },
      {
        id: "personTitleIncludes",
        type: "multiselect" as const,
        label: "Titres à inclure",
        optionsSource: "JOB_TITLES",
        helpText: "Ex: realtor, software developer, teacher",
      },
      {
        id: "personTitleExcludes",
        type: "multiselect" as const,
        label: "Titres à exclure",
        optionsSource: "JOB_TITLES",
        helpText: "Exclure certains titres de poste",
      },
      {
        id: "seniorityIncludes",
        type: "multiselect" as const,
        label: "Niveau de seniorité",
        optionsSource: "SENIORITY_LEVELS",
        helpText: "Filtrez par niveau hiérarchique",
      },
      {
        id: "personFunctionIncludes",
        type: "multiselect" as const,
        label: "Départements à inclure",
        optionsSource: "DEPARTMENTS",
        helpText: "Filtrez par département ou fonction",
      },
      {
        id: "personLocationCountryIncludes",
        type: "multiselect" as const,
        label: "Pays / Région à inclure",
        optionsSource: "COUNTRIES",
        helpText: "Localisation des contacts",
      },
      {
        id: "personLocationCityIncludes",
        type: "text" as const,
        label: "Villes à inclure",
        placeholder: "Paris, Marseille, Lyon...",
        helpText: "Villes séparées par des virgules",
      },
      {
        id: "personLocationCountryExcludes",
        type: "multiselect" as const,
        label: "Pays / Région à exclure",
        optionsSource: "COUNTRIES",
        helpText: "Exclure certains pays",
      },
      {
        id: "personLocationCityExcludes",
        type: "text" as const,
        label: "Villes à exclure",
        placeholder: "Paris, Lyon...",
        helpText: "Villes à exclure, séparées par des virgules",
      },
      {
        id: "companyDomainIncludes",
        type: "text" as const,
        label: "Domaines d'entreprise",
        placeholder: "google.com, apple.com, tesla.com",
        helpText: "Domaines ou URLs à inclure (séparés par des virgules)",
      },
      {
        id: "companyEmployeeSizeIncludes",
        type: "multiselect" as const,
        label: "Taille de l'entreprise",
        optionsSource: "COMPANY_SIZES",
        helpText: "Filtrez par nombre d'employés",
      },
      {
        id: "companyIndustryIncludes",
        type: "multiselect" as const,
        label: "Industries à inclure",
        optionsSource: "INDUSTRIES",
        helpText: "Filtrez par industrie",
      },
      {
        id: "companyIndustryExcludes",
        type: "multiselect" as const,
        label: "Industries à exclure",
        optionsSource: "INDUSTRIES",
        helpText: "Exclure certaines industries",
      },
      {
        id: "companyKeywordsIncludes",
        type: "text" as const,
        label: "Mots-clés entreprise à inclure",
        placeholder: "restaurant, fitness, gym, software",
        helpText: "Mots-clés séparés par des virgules",
      },
      {
        id: "companyKeywordsExcludes",
        type: "text" as const,
        label: "Mots-clés entreprise à exclure",
        placeholder: "restaurant, fitness...",
        helpText: "Mots-clés à exclure",
      },
      {
        id: "minRevenue",
        type: "select" as const,
        label: "Revenu minimum",
        defaultValue: "",
        options: ["", ...REVENUE_OPTIONS],
        helpText: "Revenu minimum de l'entreprise",
      },
      {
        id: "maxRevenue",
        type: "select" as const,
        label: "Revenu maximum",
        defaultValue: "",
        options: ["", ...REVENUE_OPTIONS],
        helpText: "Revenu maximum de l'entreprise",
      },
      {
        id: "funding",
        type: "multiselect" as const,
        label: "Funding",
        options: [
          "seed",
          "series-a",
          "series-b",
          "series-c",
          "series-d",
          "growth",
          "ipo",
        ],
        optionLabels: {
          seed: "Seed",
          "series-a": "Series A",
          "series-b": "Series B",
          "series-c": "Series C",
          "series-d": "Series D",
          growth: "Growth",
          ipo: "IPO",
        },
        helpText: "Filtrer par tour de financement",
      },
    ],
    sections: [
      {
        title: "Dossier et collection",
        description:
          "Sélectionnez d'abord un dossier, puis une collection cible.",
        fields: ["folder_collection"],
      },
      {
        title: "Résultats",
        description: "Nombre de leads à récupérer.",
        fields: ["totalResults"],
      },
      {
        title: "Email",
        description: "Filtrer par statut de l'email.",
        fields: ["emailStatus"],
      },
      {
        title: "Contact",
        description: "Titres, seniorité et localisation.",
        fields: [
          "personTitleIncludes",
          "personTitleExcludes",
          "seniorityIncludes",
          "personFunctionIncludes",
          "personLocationCountryIncludes",
          "personLocationCityIncludes",
          "personLocationCountryExcludes",
          "personLocationCityExcludes",
        ],
      },
      {
        title: "Entreprise",
        description: "Filtres par entreprise.",
        fields: [
          "companyDomainIncludes",
          "companyEmployeeSizeIncludes",
          "companyIndustryIncludes",
          "companyIndustryExcludes",
          "companyKeywordsIncludes",
          "companyKeywordsExcludes",
          "minRevenue",
          "maxRevenue",
          "funding",
        ],
      },
    ],
  };

  try {
    // Vérifier si le scraper existe déjà (Apify LinkedIn - mapperType apify)
    const existing = await db
      .select()
      .from(scrapers)
      .where(
        and(eq(scrapers.provider, "apify"), eq(scrapers.mapperType, "apify")),
      )
      .limit(1);

    if (existing.length > 0) {
      console.log("✅ Scraper Apify LinkedIn existe déjà, mise à jour...");
      await db
        .update(scrapers)
        .set({
          name: "Leads Scraper - Apollo Scraper",
          description:
            "Scraper de leads LinkedIn via Apify. Permet de filtrer par titre, localisation, entreprise et bien plus.",
          provider: "apify",
          providerConfig: {
            actorId: "pipelinelabs/lead-scraper-apollo-zoominfo-lusha-ppe",
          },
          formConfig: apifyFormConfig,
          mapperType: "apify",
          source: "apollo",
          infoType: "contact_info",
          toolUrl: "https://console.apify.com/actors/kVYdvNOefemtiDXO5/input",
          paymentType: "pay_per_event",
          costPerThousand: 1.0,
          costPerLead: 0.001,
          actorStartCost: 0.00001,
          freeQuotaMonthly: null,
          pricingTiers: null,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(scrapers.id, existing[0].id));
      console.log("✅ Scraper Apify LinkedIn mis à jour");
    } else {
      console.log("➕ Insertion du scraper Apify LinkedIn...");
      await db.insert(scrapers).values({
        name: "Leads Scraper - Apollo",
        description:
          "Scraper de leads LinkedIn via Apify. Permet de filtrer par titre, localisation, entreprise et bien plus.",
        provider: "apify",
        providerConfig: {
          actorId: "pipelinelabs/lead-scraper-apollo-zoominfo-lusha-ppe",
        },
        formConfig: apifyFormConfig,
        mapperType: "apify",
        source: "apollo",
        infoType: "contact_info",
        toolUrl: "https://console.apify.com/actors/kVYdvNOefemtiDXO5/input",
        paymentType: "pay_per_event",
        costPerThousand: 1.0,
        costPerLead: 0.001,
        actorStartCost: 0.00001,
        isActive: true,
      });
      console.log("✅ Scraper Apify LinkedIn inséré");
    }

    // Leads Finder (code_crafter/leads-finder)
    const existingLeadsFinder = await db
      .select()
      .from(scrapers)
      .where(eq(scrapers.mapperType, "leads-finder"))
      .limit(1);

    if (existingLeadsFinder.length > 0) {
      console.log("✅ Scraper Leads Finder existe déjà, mise à jour...");
      await db
        .update(scrapers)
        .set({
          name: "Leads Scraper - Finder (Code Crafter)",
          description:
            "Alternative Apollo à $1.5/1k leads. Emails vérifiés, téléphones, LinkedIn, infos entreprise.",
          provider: "apify",
          providerConfig: { actorId: "code_crafter/leads-finder" },
          formConfig: leadsFinderFormConfig,
          mapperType: "leads-finder",
          source: "leads-finder",
          infoType: "contact_info",
          toolUrl: "https://console.apify.com/actors/IoSHqwTR9YGhzccez/input",
          paymentType: "pay_per_event",
          costPerThousand: 2.0,
          costPerLead: 0.002,
          actorStartCost: 0.02,
          freeQuotaMonthly: null,
          pricingTiers: null,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(scrapers.id, existingLeadsFinder[0].id));
      console.log("✅ Scraper Leads Finder mis à jour");
    } else {
      console.log("➕ Insertion du scraper Leads Finder...");
      await db.insert(scrapers).values({
        name: "Leads Scraper - Finder (Code Crafter)",
        description:
          "Alternative Apollo à $1.5/1k leads. Emails vérifiés, téléphones, LinkedIn, infos entreprise.",
        provider: "apify",
        providerConfig: { actorId: "code_crafter/leads-finder" },
        formConfig: leadsFinderFormConfig,
        mapperType: "leads-finder",
        source: "leads-finder",
        infoType: "contact_info",
        toolUrl: "https://console.apify.com/actors/IoSHqwTR9YGhzccez/input",
        paymentType: "pay_per_event",
        costPerThousand: 2.0,
        costPerLead: 0.002,
        actorStartCost: 0.02,
        isActive: true,
      });
      console.log("✅ Scraper Leads Finder inséré");
    }

    // LinkedIn Company Posts Scraper
    const existingCompanyPosts = await db
      .select()
      .from(scrapers)
      .where(eq(scrapers.mapperType, "linkedin-company-posts"))
      .limit(1);

    if (existingCompanyPosts.length > 0) {
      console.log(
        "✅ Scraper LinkedIn Company Posts existe déjà, mise à jour...",
      );
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
          source: "linkedin",
          infoType: "social_media_posts",
          toolUrl: "https://console.apify.com/actors/WI0tj4Ieb5Kq458gB/input",
          paymentType: "pay_per_posts",
          costPerThousand: 2.0,
          costPerLead: 0.002,
          actorStartCost: null,
          freeQuotaMonthly: null,
          pricingTiers: null,
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
        source: "linkedin",
        infoType: "social_media_posts",
        toolUrl: "https://console.apify.com/actors/WI0tj4Ieb5Kq458gB/input",
        paymentType: "pay_per_posts",
        costPerThousand: 2.0,
        costPerLead: 0.002,
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
      console.log(
        "✅ Scraper LinkedIn Profile Posts existe déjà, mise à jour...",
      );
      await db
        .update(scrapers)
        .set({
          name: "LinkedIn Profile Posts Enrichment",
          description: "Enrichit les leads avec leurs propres posts LinkedIn.",
          provider: "apify",
          providerConfig: {
            actorId: "harvestapi/linkedin-profile-posts",
          },
          formConfig: linkedinProfilePostsFormConfig,
          mapperType: "linkedin-profile-posts",
          source: "linkedin",
          infoType: "social_media_posts",
          toolUrl: "https://console.apify.com/actors/A3cAPGpwBEG8RJwse/input",
          paymentType: "pay_per_posts",
          costPerThousand: 2.0,
          costPerLead: 0.002,
          actorStartCost: null,
          freeQuotaMonthly: null,
          pricingTiers: null,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(scrapers.id, existingProfilePosts[0].id));
      console.log("✅ Scraper LinkedIn Profile Posts mis à jour");
    } else {
      console.log("➕ Insertion du scraper LinkedIn Profile Posts...");
      await db.insert(scrapers).values({
        name: "LinkedIn Profile Posts Enrichment",
        description: "Enrichit les leads avec leurs propres posts LinkedIn.",
        provider: "apify",
        providerConfig: {
          actorId: "harvestapi/linkedin-profile-posts",
        },
        formConfig: linkedinProfilePostsFormConfig,
        mapperType: "linkedin-profile-posts",
        source: "linkedin",
        infoType: "social_media_posts",
        toolUrl: "https://console.apify.com/actors/A3cAPGpwBEG8RJwse/input",
        paymentType: "pay_per_posts",
        costPerThousand: 2.0,
        costPerLead: 0.002,
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
      console.log(
        "✅ Scraper LinkedIn Company Employees existe déjà, mise à jour...",
      );
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
          source: "linkedin",
          infoType: "contact_info",
          toolUrl: "https://console.apify.com/actors/IoSHqwTR9YGhzccez/input",
          paymentType: "pay_per_event",
          costPerThousand: null,
          costPerLead: null,
          actorStartCost: 0.02,
          freeQuotaMonthly: null,
          pricingTiers: [
            {
              name: "Short profile ($4 per 1k)",
              costPerThousand: 4.0,
              costPerLead: 0.004,
            },
            {
              name: "Full profile ($8 per 1k)",
              costPerThousand: 8.0,
              costPerLead: 0.008,
            },
            {
              name: "Full profile + email search ($12 per 1k)",
              costPerThousand: 12.0,
              costPerLead: 0.012,
            },
          ],
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
        source: "linkedin",
        infoType: "contact_info",
        toolUrl: "https://console.apify.com/actors/IoSHqwTR9YGhzccez/input",
        paymentType: "pay_per_event",
        actorStartCost: 0.02,
        pricingTiers: [
          {
            name: "Short profile ($4 per 1k)",
            costPerThousand: 4.0,
            costPerLead: 0.004,
          },
          {
            name: "Full profile ($8 per 1k)",
            costPerThousand: 8.0,
            costPerLead: 0.008,
          },
          {
            name: "Full profile + email search ($12 per 1k)",
            costPerThousand: 12.0,
            costPerLead: 0.012,
          },
        ],
        isActive: true,
      });
      console.log("✅ Scraper LinkedIn Company Employees inséré");
    }

    // Bulk Email Finder Scraper
    const bulkEmailFinderFormConfig = {
      fields: [
        {
          id: "folder_collection",
          type: "folder_collection" as const,
          label: "Dossier et collection",
          required: true,
          helpText:
            "Sélectionnez d'abord un dossier, puis une collection où sauvegarder les leads.",
        },
        {
          id: "selectedLeads",
          type: "leads" as const,
          label: "Sélectionner des leads existants",
          helpText:
            "Sélectionnez des leads de la collection pour lesquels vous souhaitez trouver des emails. Seuls les leads sans email sont affichés.",
        },
        {
          id: "people",
          type: "text" as const,
          label: "Ou entrer manuellement",
          placeholder: "Alban, Huntziger, bricks.co\nYoann, Ross, bricks.co",
          helpText:
            "Entrez une personne par ligne au format : Prénom, Nom, Domaine. Vous pouvez coller plusieurs lignes.",
        },
      ],
      sections: [
        {
          title: "Dossier et collection",
          description:
            "Sélectionnez d'abord un dossier, puis une collection où sauvegarder les leads.",
          fields: ["folder_collection"],
        },
        {
          title: "Personnes à rechercher",
          description:
            "Sélectionnez des leads existants ou entrez manuellement les personnes pour lesquelles vous souhaitez trouver des emails.",
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
          source: "email",
          infoType: "contact_info",
          toolUrl: "https://console.apify.com/actors/ISxvHIfe6r5GZ0veb/input",
          paymentType: "pay_per_result",
          costPerThousand: 28.0,
          costPerLead: 0.028,
          actorStartCost: null,
          freeQuotaMonthly: null,
          pricingTiers: null,
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
        source: "email",
        infoType: "contact_info",
        toolUrl: "https://console.apify.com/actors/ISxvHIfe6r5GZ0veb/input",
        paymentType: "pay_per_result",
        costPerThousand: 28.0,
        costPerLead: 0.028,
        isActive: true,
      });
      console.log("✅ Scraper Bulk Email Finder inséré");
    }

    // Trustpilot Reviews Scraper
    const trustpilotReviewsFormConfig = {
      fields: [
        {
          id: "folder_collection",
          type: "folder_collection" as const,
          label: "Dossier et collection",
          helpText:
            "En mode collection, sélectionnez d'abord un dossier, puis une collection à enrichir.",
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
          description:
            "Scrape les avis Trustpilot via Apify. Un domaine (website) est requis pour chaque entreprise.",
          fields: ["folder_collection", "companyId", "maxItems"],
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
          source: "trustpilot",
          infoType: "reviews",
          toolUrl: "https://console.apify.com/actors/Omb7MeKVdwRZUOhCK/input",
          paymentType: "pay_per_reviews",
          costPerThousand: 0.5,
          costPerLead: 0.0005,
          actorStartCost: null,
          freeQuotaMonthly: null,
          pricingTiers: null,
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
        source: "trustpilot",
        infoType: "reviews",
        toolUrl: "https://console.apify.com/actors/Omb7MeKVdwRZUOhCK/input",
        paymentType: "pay_per_reviews",
        costPerThousand: 0.5,
        costPerLead: 0.0005,
        isActive: true,
      });
      console.log("✅ Scraper Trustpilot Reviews inséré");
    }

    // EmailListVerify - Vérification des emails
    const emailVerifyFormConfig = {
      fields: [
        {
          id: "folder_collection",
          type: "folder_collection" as const,
          label: "Collection",
          required: true,
          helpText:
            "Sélectionnez une collection dont vous souhaitez vérifier les emails via EmailListVerify (1 crédit par email).",
        },
      ],
      sections: [
        {
          title: "Collection",
          description:
            "Sélectionnez une collection pour vérifier la délivrabilité des emails de tous les leads qui ont un email.",
          fields: ["folder_collection"],
        },
      ],
    };

    const existingEmailVerify = await db
      .select()
      .from(scrapers)
      .where(eq(scrapers.mapperType, "email-verify"))
      .limit(1);

    if (existingEmailVerify.length > 0) {
      console.log("✅ Scraper EmailListVerify existe déjà, mise à jour...");
      await db
        .update(scrapers)
        .set({
          name: "EmailListVerify - Vérifier les emails",
          description:
            "Vérifie la délivrabilité des emails de vos leads via EmailListVerify. 1 crédit par email.",
          provider: "emaillistverify",
          providerConfig: {},
          formConfig: emailVerifyFormConfig,
          mapperType: "email-verify",
          source: "emaillistverify",
          infoType: "contact_info",
          toolUrl: "https://app.emaillistverify.com/",
          paymentType: "free_tier",
          costPerThousand: null,
          costPerLead: null,
          actorStartCost: null,
          freeQuotaMonthly: 100,
          pricingTiers: null,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(scrapers.id, existingEmailVerify[0].id));
      console.log("✅ Scraper EmailListVerify mis à jour");
    } else {
      console.log("➕ Insertion du scraper EmailListVerify...");
      await db.insert(scrapers).values({
        name: "EmailListVerify - Vérifier les emails",
        description:
          "Vérifie la délivrabilité des emails de vos leads via EmailListVerify. 1 crédit par email.",
        provider: "emaillistverify",
        providerConfig: {},
        formConfig: emailVerifyFormConfig,
        mapperType: "email-verify",
        source: "emaillistverify",
        infoType: "contact_info",
        toolUrl: "https://app.emaillistverify.com/",
        paymentType: "free_tier",
        freeQuotaMonthly: 100,
        isActive: true,
      });
      console.log("✅ Scraper EmailListVerify inséré");
    }

    // Easy Bulk Email Validator (Apify) - Vérification des emails via MillionVerifier
    const easyBulkEmailValidatorFormConfig = {
      fields: [
        {
          id: "folder_collection",
          type: "folder_collection" as const,
          label: "Collection",
          required: true,
          helpText:
            "Sélectionnez une collection dont vous souhaitez vérifier les emails via Apify (~$1/1000 emails).",
        },
      ],
      sections: [
        {
          title: "Collection",
          description:
            "Sélectionnez une collection pour vérifier la délivrabilité des emails de tous les leads qui ont un email.",
          fields: ["folder_collection"],
        },
      ],
    };

    const existingEasyBulkEmailValidator = await db
      .select()
      .from(scrapers)
      .where(eq(scrapers.mapperType, "easy-bulk-email-validator"))
      .limit(1);

    if (existingEasyBulkEmailValidator.length > 0) {
      console.log(
        "✅ Scraper Easy Bulk Email Validator existe déjà, mise à jour...",
      );
      await db
        .update(scrapers)
        .set({
          name: "Easy Bulk Email Validator (Apify)",
          description:
            "Vérifie la délivrabilité des emails via MillionVerifier/Apify. ~$1/1000 emails. Utilisez Vérifier (Apify) sur un lead ou une collection.",
          provider: "apify",
          providerConfig: {
            actorId:
              "xmiso_scrapers/easy-bulk-email-validator---verify-emails-from-1-7-1000-rows",
          },
          formConfig: easyBulkEmailValidatorFormConfig,
          mapperType: "easy-bulk-email-validator",
          source: "apify",
          infoType: "email_verify",
          toolUrl: "https://console.apify.com/actors/QM5YJIYftbZQiNpgN/input",
          paymentType: "pay_per_event",
          costPerThousand: 1.0,
          costPerLead: 0.001,
          actorStartCost: null,
          freeQuotaMonthly: 300,
          pricingTiers: [
            { name: "FREE", costPerThousand: 2.5, costPerLead: 0.0025 },
            { name: "BRONZE", costPerThousand: 1.5, costPerLead: 0.0015 },
            { name: "SILVER", costPerThousand: 1.3, costPerLead: 0.0013 },
            { name: "GOLD/PLATINUM/DIAMOND", costPerThousand: 1.0, costPerLead: 0.001 },
          ],
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(scrapers.id, existingEasyBulkEmailValidator[0].id));
      console.log("✅ Scraper Easy Bulk Email Validator mis à jour");
    } else {
      console.log("➕ Insertion du scraper Easy Bulk Email Validator...");
      await db.insert(scrapers).values({
        name: "Easy Bulk Email Validator (Apify)",
        description:
          "Vérifie la délivrabilité des emails via MillionVerifier/Apify. ~$1/1000 emails. Utilisez Vérifier (Apify) sur un lead ou une collection.",
        provider: "apify",
        providerConfig: {
          actorId:
            "xmiso_scrapers/easy-bulk-email-validator---verify-emails-from-1-7-1000-rows",
        },
        formConfig: easyBulkEmailValidatorFormConfig,
        mapperType: "easy-bulk-email-validator",
        source: "apify",
        infoType: "email_verify",
        toolUrl: "https://console.apify.com/actors/QM5YJIYftbZQiNpgN/input",
        paymentType: "pay_per_event",
        costPerThousand: 1.0,
        costPerLead: 0.001,
        actorStartCost: null,
        freeQuotaMonthly: 300,
        pricingTiers: [
          { name: "FREE", costPerThousand: 2.5, costPerLead: 0.0025 },
          { name: "BRONZE", costPerThousand: 1.5, costPerLead: 0.0015 },
          { name: "SILVER", costPerThousand: 1.3, costPerLead: 0.0013 },
          { name: "GOLD/PLATINUM/DIAMOND", costPerThousand: 1.0, costPerLead: 0.001 },
        ],
        isActive: true,
      });
      console.log("✅ Scraper Easy Bulk Email Validator inséré");
    }

    // PageSpeed Insights - Analyse SEO
    const pageSpeedSeoFormConfig = {
      fields: [
        {
          id: "mode",
          type: "select" as const,
          label: "Mode d'analyse",
          required: true,
          defaultValue: "single",
          options: ["single", "collection"],
          optionLabels: {
            single: "Un lead ou une entreprise",
            collection: "Toute une collection",
          },
          helpText:
            "Choisissez d'analyser un élément unique ou toute une collection.",
        },
        {
          id: "companyId",
          type: "company" as const,
          label: "Entreprise",
          required: false,
          helpText: "Sélectionnez une entreprise à analyser (mode single).",
        },
        {
          id: "folder_collection",
          type: "folder_collection" as const,
          label: "Collection",
          required: false,
          helpText:
            "Sélectionnez une collection pour analyser le SEO de tous les leads/entreprises avec un website.",
        },
      ],
      sections: [
        {
          title: "Mode d'analyse",
          description:
            "Choisissez d'analyser un lead/entreprise ou toute une collection.",
          fields: ["mode"],
        },
        {
          title: "Cible",
          description: "Sélectionnez l'entreprise ou la collection à analyser.",
          fields: ["companyId", "folder_collection"],
        },
      ],
    };

    const existingPageSpeed = await db
      .select()
      .from(scrapers)
      .where(eq(scrapers.mapperType, "pagespeed-seo"))
      .limit(1);

    if (existingPageSpeed.length > 0) {
      console.log("✅ Scraper PageSpeed Insights existe déjà, mise à jour...");
      await db
        .update(scrapers)
        .set({
          name: "PageSpeed Insights - Analyse SEO",
          description:
            "Analyse le SEO des sites web via Google PageSpeed Insights (performance, accessibilité, bonnes pratiques, SEO). Mobile et desktop.",
          provider: "google",
          providerConfig: {},
          formConfig: pageSpeedSeoFormConfig,
          mapperType: "pagespeed-seo",
          source: "google",
          infoType: "seo",
          toolUrl: "https://pagespeed.web.dev/",
          paymentType: "free_tier",
          costPerThousand: null,
          costPerLead: null,
          actorStartCost: null,
          freeQuotaMonthly: 25000,
          pricingTiers: null,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(scrapers.id, existingPageSpeed[0].id));
      console.log("✅ Scraper PageSpeed Insights mis à jour");
    } else {
      console.log("➕ Insertion du scraper PageSpeed Insights...");
      await db.insert(scrapers).values({
        name: "PageSpeed Insights - Analyse SEO",
        description:
          "Analyse le SEO des sites web via Google PageSpeed Insights (performance, accessibilité, bonnes pratiques, SEO). Mobile et desktop.",
        provider: "google",
        providerConfig: {},
        formConfig: pageSpeedSeoFormConfig,
        mapperType: "pagespeed-seo",
        source: "google",
        infoType: "seo",
        toolUrl: "https://pagespeed.web.dev/",
        paymentType: "free_tier",
        freeQuotaMonthly: 25000,
        isActive: true,
      });
      console.log("✅ Scraper PageSpeed Insights inséré");
    }

    // Désactiver les scrapers qui ne sont plus dans la liste active
    const activeMapperTypes = [
      "apify", // Leads Scraper - Apollo
      "leads-finder", // Leads Scraper - Finder (Code Crafter)
      "linkedin-company-posts", // LinkedIn Company Posts Enrichment
      "linkedin-profile-posts", // LinkedIn Profile Posts Enrichment
      "linkedin-company-employees", // LinkedIn Company Employees Scraper
      "bulk-email-finder", // Bulk Email Finder
      "trustpilot-reviews", // Trustpilot Reviews Scraper
      "email-verify", // EmailListVerify
      "easy-bulk-email-validator", // Easy Bulk Email Validator (Apify)
      "pagespeed-seo", // PageSpeed Insights
    ];

    console.log("🔄 Désactivation des scrapers obsolètes...");
    // Récupérer tous les scrapers actifs qui ne sont pas dans la liste active
    const obsoleteScrapers = await db
      .select()
      .from(scrapers)
      .where(
        and(
          eq(scrapers.isActive, true),
          // Utiliser not in avec une requête SQL personnalisée
        ),
      );

    // Filtrer manuellement les scrapers obsolètes
    const scrapersToDeactivate = obsoleteScrapers.filter(
      (scraper) => !activeMapperTypes.includes(scraper.mapperType),
    );

    if (scrapersToDeactivate.length > 0) {
      console.log(
        `📋 Trouvé ${scrapersToDeactivate.length} scraper(s) obsolète(s) à désactiver:`,
      );
      for (const scraper of scrapersToDeactivate) {
        console.log(`  - ${scraper.name} (${scraper.mapperType})`);
        await db
          .update(scrapers)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(scrapers.id, scraper.id));
      }
      console.log("✅ Scrapers obsolètes désactivés");
    } else {
      console.log("✅ Aucun scraper obsolète trouvé");
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
