/**
 * Mappe les technologies des entreprises pour un affichage cohérent avec icônes.
 * Utilise Simple Icons CDN: https://cdn.simpleicons.org/{slug}
 */

export interface TechnologyItem {
  /** Nom affiché (formaté) */
  name: string;
  /** Slug Simple Icons pour l'icône, ou undefined si non trouvé */
  iconSlug?: string;
}

// Mapping nom normalisé -> slug Simple Icons (les plus courants)
const TECH_SLUG_MAP: Record<string, string> = {
  // Cloud & Hosting
  amazonaws: "amazonaws",
  "amazon aws": "amazonaws",
  aws: "amazonaws",
  azure: "microsoftazure",
  "microsoft azure": "microsoftazure",
  googlecloud: "googlecloud",
  "google cloud": "googlecloud",
  gcp: "googlecloud",
  cloudflare: "cloudflare",
  "cloudflare dns": "cloudflare",
  "cloudflare pages": "cloudflarepages",
  digitalocean: "digitalocean",
  "digital ocean": "digitalocean",
  vercel: "vercel",
  netlify: "netlify",
  heroku: "heroku",
  render: "render",
  "fly.io": "flydotio",
  railway: "railway",

  // Email & Comms
  gmail: "gmail",
  outlook: "microsoftoutlook",
  "microsoft outlook": "microsoftoutlook",
  sendgrid: "sendgrid",
  mailchimp: "mailchimp",
  brevo: "brevo",
  slack: "slack",
  discord: "discord",
  microsoftteams: "microsoftteams",
  "microsoft teams": "microsoftteams",
  zoom: "zoom",
  hubspot: "hubspot",

  // Frontend
  react: "react",
  "react.js": "react",
  reactjs: "react",
  next: "nextdotjs",
  "next.js": "nextdotjs",
  nextjs: "nextdotjs",
  vue: "vuedotjs",
  "vue.js": "vuedotjs",
  vuejs: "vuedotjs",
  angular: "angular",
  svelte: "svelte",
  nuxt: "nuxtdotjs",
  "nuxt.js": "nuxtdotjs",
  astro: "astro",
  tailwind: "tailwindcss",
  tailwindcss: "tailwindcss",
  bootstrap: "bootstrap",
  typescript: "typescript",
  javascript: "javascript",
  html5: "html5",
  css3: "css3",

  // Backend
  node: "nodedotjs",
  "node.js": "nodedotjs",
  nodejs: "nodedotjs",
  python: "python",
  django: "django",
  flask: "flask",
  fastapi: "fastapi",
  ruby: "ruby",
  "ruby on rails": "rubyonrails",
  rails: "rubyonrails",
  php: "php",
  laravel: "laravel",
  java: "openjdk",
  kotlin: "kotlin",
  go: "go",
  golang: "go",
  rust: "rust",
  dotnet: "dotnet",
  ".net": "dotnet",

  // Databases
  postgresql: "postgresql",
  postgres: "postgresql",
  mysql: "mysql",
  mongodb: "mongodb",
  redis: "redis",
  elasticsearch: "elasticsearch",
  dynamodb: "amazondynamodb",
  supabase: "supabase",
  firebase: "firebase",

  // DevOps & Tools
  docker: "docker",
  kubernetes: "kubernetes",
  k8s: "kubernetes",
  github: "github",
  gitlab: "gitlab",
  bitbucket: "bitbucket",
  jira: "jira",
  confluence: "confluence",
  notion: "notion",
  trello: "trello",
  linear: "linear",

  // Analytics & Marketing
  googleanalytics: "googleanalytics",
  "google analytics": "googleanalytics",
  segment: "segment",
  mixpanel: "mixpanel",
  amplitude: "amplitude",
  hotjar: "hotjar",
  intercom: "intercom",
  zapier: "zapier",
  make: "make",
  n8n: "n8n",

  // Design
  figma: "figma",
  sketch: "sketch",
  adobexd: "adobexd",
  "adobe xd": "adobexd",
  photoshop: "adobephotoshop",
  illustrator: "adobeillustrator",

  // CMS & E-commerce
  wordpress: "wordpress",
  shopify: "shopify",
  woocommerce: "woocommerce",
  webflow: "webflow",
  contentful: "contentful",
  sanity: "sanity",
  strapi: "strapi",
};

function normalizeForLookup(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\./g, "dot")
    .replace(/\./g, "");
}

function formatDisplayName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  // Capitaliser chaque mot (sauf acronymes connus en majuscules)
  const acronyms = [
    "aws",
    "api",
    "cdn",
    "cms",
    "sdk",
    "sso",
    "sass",
    "paas",
    "iaas",
  ];
  return trimmed
    .split(/[\s,]+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (acronyms.includes(lower) && word.length <= 4) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Parse une chaîne de technologies (ex: "amazon aws, cloudflare dns, gmail")
 * et retourne un tableau d'objets { name, iconSlug? } pour l'affichage.
 */
export function parseTechnologies(
  technologies: string | null | undefined,
): TechnologyItem[] {
  if (!technologies || typeof technologies !== "string") return [];

  const rawItems = technologies
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const result: TechnologyItem[] = [];

  for (const raw of rawItems) {
    const normalized = normalizeForLookup(raw);
    const normalizedNoSpaces = normalized.replace(/\s/g, "");

    // Éviter les doublons (variations de casse/espaces)
    const dedupKey = normalizedNoSpaces;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    let iconSlug: string | undefined;

    // Chercher dans le mapping (avec et sans espaces)
    iconSlug =
      TECH_SLUG_MAP[normalized] ??
      TECH_SLUG_MAP[normalizedNoSpaces] ??
      TECH_SLUG_MAP[raw.toLowerCase()];

    result.push({
      name: formatDisplayName(raw),
      iconSlug,
    });
  }

  return result;
}
