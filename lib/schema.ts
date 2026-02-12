import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ============================================================
// TABLE USERS - Etendue pour NextAuth + profil
// ============================================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  password: text("password"), // Hashe avec bcrypt, nullable pour OAuth futur
  accountType: text("account_type").notNull().default("user"), // "user" | "business"

  // Champs de profil utilisateur
  bio: text("bio"),
  location: text("location"),
  website: text("website"),
  banner: text("banner"), // URL image de banniere

  // Background (gradient ou image)
  backgroundType: text("background_type").$type<"image" | "gradient" | null>(),
  backgroundGradient: jsonb("background_gradient").$type<{
    color1: string;
    color2: string;
    css: string;
  }>(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// TABLES NEXTAUTH - Necessaires pour le DrizzleAdapter
// ============================================================

// Table accounts (OAuth providers)
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

// Table sessions
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

// Table verification tokens (email verification)
export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires").notNull(),
});

// ============================================================
// TABLE FOLDERS - Dossiers pour organiser les collections
// ============================================================
export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// TABLE COLLECTIONS - Organisation des leads par utilisateur
// ============================================================
export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  folderId: integer("folder_id").references(() => folders.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// TABLE CAMPAIGNS - Campagnes marketing
// ============================================================
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft, active, paused, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// TABLE COMPANIES - Entreprises
// ============================================================
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website"),
  domain: text("domain"),
  linkedinUrl: text("linkedin_url"),
  foundedYear: integer("founded_year"),
  industry: text("industry"),
  size: text("size"),
  description: text("description"),
  specialities: jsonb("specialities").$type<string[]>(),
  technologies: text("technologies"), // Ex: "amazon aws, cloudflare dns, gmail"
  city: text("city"),
  state: text("state"),
  country: text("country"),
  employeesScraped: boolean("employees_scraped").default(false).notNull(),
  employeesScrapedAt: timestamp("employees_scraped_at"),

  // SEO (Google PageSpeed Insights)
  seoScore: real("seo_score"),
  seoScoreMobile: real("seo_score_mobile"),
  seoScoreDesktop: real("seo_score_desktop"),
  seoData: jsonb("seo_data").$type<{
    score?: number;
    strategy?: string;
    audits?: Record<string, { score?: number; title?: string }>;
  }>(),
  pageSpeedData: jsonb("page_speed_data").$type<{
    mobile?: {
      performance: number;
      accessibility: number;
      bestPractices: number;
      seo: number;
      audits?: Record<string, { score?: number; title?: string }>;
    };
    desktop?: {
      performance: number;
      accessibility: number;
      bestPractices: number;
      seo: number;
      audits?: Record<string, { score?: number; title?: string }>;
    };
  }>(),
  seoAnalyzedAt: timestamp("seo_analyzed_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// TABLE LEAD_COLLECTIONS - Liaison many-to-many entre leads et collections
// ============================================================
export const leadCollections = pgTable(
  "lead_collections",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("lead_collections_lead_collection_idx").on(
      table.leadId,
      table.collectionId,
    ),
  ],
);

// ============================================================
// TABLE LEADS - Leads de prospection
// ============================================================
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  // collectionId gardé temporairement pour compatibilité - sera supprimé après migration
  collectionId: integer("collection_id").references(() => collections.id, {
    onDelete: "set null",
  }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  companyId: integer("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),

  // Informations personnelles
  personId: text("person_id"),
  fullName: text("full_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  position: text("position"),
  linkedinUrl: text("linkedin_url"),
  seniority: text("seniority"),
  functional: text("functional"),
  headline: text("headline"),
  about: text("about"),
  publicIdentifier: text("public_identifier"),
  objectUrn: text("object_urn"),
  profilePicture: text("profile_picture"),
  connectionsCount: integer("connections_count"),
  followerCount: integer("follower_count"),
  registeredAt: timestamp("registered_at"),
  openToWork: boolean("open_to_work"),
  verified: boolean("verified"),
  currentPosition:
    jsonb("current_position").$type<Array<Record<string, unknown>>>(),
  experience: jsonb("experience").$type<Array<Record<string, unknown>>>(),
  education: jsonb("education").$type<Array<Record<string, unknown>>>(),
  topSkills: jsonb("top_skills").$type<string[]>(),

  // Contact
  email: text("email"),
  emailCertainty: text("email_certainty"), // Certitude de l'email (ultra_sure, sure, etc.)
  emailVerifyEmaillist: text("email_verify_emaillist"), // Statut EmailListVerify: ok, email_disabled, dead_server, etc.
  emailVerifyEmaillistAt: timestamp("email_verify_emaillist_at"), // Date de la dernière vérification
  personalEmail: text("personal_email"),
  phoneNumbers: jsonb("phone_numbers").$type<string[]>(),
  city: text("city"),
  state: text("state"),
  country: text("country"),

  // Contenu marketing
  companyLinkedinPost: text("company_linkedin_post"),
  personLinkedinPost: text("person_linkedin_post"),
  iceBreaker: text("ice_breaker"),
  status: text("status"),
  validated: boolean("validated").default(false).notNull(),
  reason: text("reason"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// TABLE SCRAPERS - Configuration des scrapers disponibles
// ============================================================
export const scrapers = pgTable("scrapers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  provider: text("provider").notNull(), // "apify", "custom", etc.
  providerConfig: jsonb("provider_config").$type<Record<string, unknown>>(), // Configuration spécifique au provider
  formConfig: jsonb("form_config").$type<{
    fields: Array<{
      id: string;
      type:
        | "number"
        | "switch"
        | "multiselect"
        | "select"
        | "text"
        | "collection"
        | "company"
        | "leads"
        | "folder_collection";
      label: string;
      required?: boolean;
      min?: number;
      max?: number;
      defaultValue?: unknown;
      options?: string[];
      optionsSource?: string; // Référence à une constante (ex: "JOB_TITLES")
      placeholder?: string;
      helpText?: string;
    }>;
    sections: Array<{
      title: string;
      description?: string;
      fields: string[];
    }>;
  }>(),
  mapperType: text("mapper_type").notNull(), // "apify", "custom", etc.
  source: text("source"), // "linkedin", "apollo", "crunchbase", "leads-finder", etc.
  infoType: text("info_type"), // "contact_info", "social_media_posts", "reviews"
  // Pricing
  toolUrl: text("tool_url"), // URL du scraper/outil (Apify, site externe, etc.)
  paymentType: text("payment_type"), // "pay_per_event" | "pay_per_result" | "pay_per_posts" | "pay_per_reviews" | "free_tier"
  costPerThousand: real("cost_per_thousand"), // Coût pour 1000 résultats
  costPerLead: real("cost_per_lead"), // Coût par lead (= costPerThousand / 1000)
  actorStartCost: real("actor_start_cost"), // Coût de démarrage d'acteur Apify (ponctuel par run)
  freeQuotaMonthly: integer("free_quota_monthly"), // Quota gratuit mensuel (pour free_tier)
  pricingTiers: jsonb("pricing_tiers").$type<
    Array<{
      name: string;
      costPerThousand: number;
      costPerLead: number;
    }>
  >(), // Tiers de prix multiples (ex: LinkedIn Company Employees)

  usesAi: boolean("uses_ai").default(false).notNull(), // Utilise l'IA (ChatGPT, etc.)

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// TABLE SCRAPER_RUNS - Tracking des exécutions et coûts Apify
// ============================================================
export const scraperRuns = pgTable(
  "scraper_runs",
  {
    id: serial("id").primaryKey(),
    runId: text("run_id").notNull(),
    scraperId: integer("scraper_id").references(() => scrapers.id, {
      onDelete: "set null",
    }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    source: text("source"), // "scraping" | "enrich_collection" | ...
    collectionId: integer("collection_id").references(() => collections.id, {
      onDelete: "set null",
    }),
    leadId: integer("lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),
    companyId: integer("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),

    costUsd: real("cost_usd"),
    usageDetails: jsonb("usage_details").$type<Record<string, unknown>>(),
    itemCount: integer("item_count"),
    status: text("status").notNull(),

    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_scraper_runs_user_id").on(table.userId),
    index("idx_scraper_runs_scraper_id").on(table.scraperId),
    index("idx_scraper_runs_created_at").on(table.createdAt),
    uniqueIndex("idx_scraper_runs_run_id").on(table.runId),
  ],
);

// ============================================================
// TABLE COMPANY_POSTS - Posts LinkedIn d'entreprises
// ============================================================
export const companyPosts = pgTable("company_posts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, {
    onDelete: "cascade",
  }),
  organizationLinkedinUrl: text("organization_linkedin_url").notNull(),
  postUrl: text("post_url").notNull(),
  postedDate: timestamp("posted_date"),
  language: text("language"),
  author: text("author"),
  text: text("text"),
  reactions: integer("reactions"),
  like: integer("like"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// TABLE LEAD_POSTS - Posts LinkedIn de leads
// ============================================================
export const leadPosts = pgTable("lead_posts", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id, {
    onDelete: "cascade",
  }),
  linkedinUrl: text("linkedin_url").notNull(),
  postUrl: text("post_url").notNull(),
  postedDate: timestamp("posted_date"),
  language: text("language"),
  author: text("author"),
  text: text("text"),
  reactions: integer("reactions"),
  like: integer("like"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// TABLE SEO_LOCAL_ANALYSES - Positionnement SEO local par entreprise
// ============================================================
export const seoLocalAnalyses = pgTable(
  "seo_local_analyses",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    leadId: integer("lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    analysis: jsonb("analysis").$type<{
      seo_score: "Bon" | "Moyen" | "Faible";
      avg_position: number;
      queries_tested: Array<{
        keyword: string;
        position: number | null;
        found: boolean;
      }>;
      verdict: string;
      opportunity: string;
    }>(),
    costUsd: real("cost_usd"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_seo_local_analyses_company_id").on(table.companyId),
    index("idx_seo_local_analyses_user_id").on(table.userId),
    index("idx_seo_local_analyses_created_at").on(table.createdAt),
  ],
);

// ============================================================
// TABLE TRUSTPILOT_REVIEWS - Avis Trustpilot des entreprises
// ============================================================
export const trustpilotReviews = pgTable(
  "trustpilot_reviews",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    trustpilotId: text("trustpilot_id").notNull(),
    rating: integer("rating").notNull(),
    publishedDate: timestamp("published_date"),
    title: text("title"),
    body: text("body"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("trustpilot_reviews_company_trustpilot_idx").on(
      table.companyId,
      table.trustpilotId,
    ),
  ],
);
