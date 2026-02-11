/**
 * Service d'analyse SEO via l'API Google PageSpeed Insights v5
 * https://developers.google.com/speed/docs/insights/v5/get-started
 */

const PAGE_SPEED_API_BASE = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/** Audits SEO clés à extraire de la réponse Lighthouse */
const SEO_AUDIT_IDS = [
  "meta-description",
  "document-title",
  "link-text",
  "crawlable-anchors",
  "robots-txt",
  "canonical",
  "is-crawlable",
  "font-size",
  "image-alt",
  "tap-targets",
] as const;

export interface SeoAudit {
  score?: number;
  title?: string;
}

export interface SeoData {
  score: number;
  strategy: "mobile" | "desktop";
  audits: Record<string, SeoAudit>;
}

export interface PageSpeedSeoResult {
  success: boolean;
  url: string;
  seoData?: SeoData;
  error?: string;
}

interface PageSpeedApiResponse {
  captchaResult?: string;
  lighthouseResult?: {
    categories?: {
      seo?: { score?: number };
      performance?: { score?: number };
      accessibility?: { score?: number };
      "best-practices"?: { score?: number };
    };
    audits?: Record<
      string,
      { id?: string; title?: string; score?: number }
    >;
    configSettings?: {
      emulatedFormFactor?: string;
    };
  };
}

/** Scores des 4 catégories PageSpeed (0-100) */
export interface PageSpeedCategoryScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  audits?: Record<string, SeoAudit>;
}

export interface PageSpeedFullResult {
  success: boolean;
  url: string;
  error?: string;
  mobile?: PageSpeedCategoryScores;
  desktop?: PageSpeedCategoryScores;
}

/**
 * Normalise une URL de site web (ajoute https:// si absent)
 */
export function normalizeWebsiteUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string" || url.trim() === "") {
    return null;
  }

  const cleaned = url.trim();
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    return `https://${cleaned}`;
  }
  return cleaned;
}

/**
 * Extrait les données SEO essentielles de la réponse API PageSpeed
 */
function extractSeoData(
  apiResponse: PageSpeedApiResponse,
  strategy: "mobile" | "desktop"
): SeoData | null {
  const lh = apiResponse.lighthouseResult;
  if (!lh) return null;

  const seoCategory = lh.categories?.seo;
  const rawScore = seoCategory?.score;
  const score = rawScore != null ? Math.round(rawScore * 100) : 0;

  const audits: Record<string, SeoAudit> = {};
  const auditMap = lh.audits ?? {};

  for (const id of SEO_AUDIT_IDS) {
    const audit = auditMap[id];
    if (audit && typeof audit.score === "number") {
      audits[id] = {
        score: audit.score,
        title: audit.title,
      };
    }
  }

  return {
    score,
    strategy,
    audits,
  };
}

/**
 * Extrait les 4 catégories PageSpeed (Performance, Accessibility, Best Practices, SEO)
 */
function extractPageSpeedFullData(
  apiResponse: PageSpeedApiResponse
): PageSpeedCategoryScores | null {
  const lh = apiResponse.lighthouseResult;
  if (!lh) return null;

  const categories = lh.categories ?? {};
  const toScore = (raw?: number) =>
    raw != null ? Math.round(raw * 100) : 0;

  const audits: Record<string, SeoAudit> = {};
  const auditMap = lh.audits ?? {};
  for (const id of SEO_AUDIT_IDS) {
    const audit = auditMap[id];
    if (audit && typeof audit.score === "number") {
      audits[id] = { score: audit.score, title: audit.title };
    }
  }

  return {
    performance: toScore(categories.performance?.score),
    accessibility: toScore(categories.accessibility?.score),
    bestPractices: toScore(categories["best-practices"]?.score),
    seo: toScore(categories.seo?.score),
    audits: Object.keys(audits).length > 0 ? audits : undefined,
  };
}

/**
 * Appelle l'API PageSpeed pour mobile et desktop en parallèle, avec les 4 catégories
 */
export async function fetchPageSpeedFull(
  url: string
): Promise<PageSpeedFullResult> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  const normalizedUrl = normalizeWebsiteUrl(url);

  if (!normalizedUrl) {
    return {
      success: false,
      url: url,
      error: "URL invalide ou vide",
    };
  }

  const fetchOne = async (
    strategy: "mobile" | "desktop"
  ): Promise<{ strategy: "mobile" | "desktop"; data?: PageSpeedCategoryScores; error?: string }> => {
    try {
      const params = new URLSearchParams();
      params.set("url", normalizedUrl);
      params.set("strategy", strategy);
      params.append("category", "performance");
      params.append("category", "accessibility");
      params.append("category", "best-practices");
      params.append("category", "seo");
      if (apiKey) params.set("key", apiKey);

      const res = await fetch(`${PAGE_SPEED_API_BASE}?${params.toString()}`, {
        next: { revalidate: 0 },
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = `HTTP ${res.status}`;
        if (res.status === 429) {
          errorMsg = "Limite de requêtes atteinte. Veuillez réessayer plus tard.";
        } else if (text) {
          try {
            const json = JSON.parse(text);
            errorMsg = json.error?.message || text.slice(0, 200);
          } catch {
            errorMsg = text.slice(0, 200);
          }
        }
        return { strategy, error: errorMsg };
      }

      const json: PageSpeedApiResponse = await res.json();

      if (json.captchaResult && json.captchaResult !== "CAPTCHA_NOT_NEEDED") {
        return {
          strategy,
          error: "CAPTCHA requis par Google. Réessayez plus tard.",
        };
      }

      const data = extractPageSpeedFullData(json);
      return { strategy, data: data ?? undefined };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      return { strategy, error: message };
    }
  };

  const [mobileRes, desktopRes] = await Promise.all([
    fetchOne("mobile"),
    fetchOne("desktop"),
  ]);

  const mobile = mobileRes.data;
  const desktop = desktopRes.data;

  const hasAny = !!mobile || !!desktop;
  const errors: string[] = [];
  if (mobileRes.error) errors.push(`Mobile: ${mobileRes.error}`);
  if (desktopRes.error) errors.push(`Desktop: ${desktopRes.error}`);

  return {
    success: hasAny,
    url: normalizedUrl,
    error: errors.length > 0 ? errors.join("; ") : undefined,
    mobile,
    desktop,
  };
}

/**
 * Appelle l'API Google PageSpeed Insights pour une URL et retourne les données SEO
 */
export async function fetchPageSpeedSeo(
  url: string,
  strategy: "mobile" | "desktop" = "mobile"
): Promise<PageSpeedSeoResult> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  const normalizedUrl = normalizeWebsiteUrl(url);

  if (!normalizedUrl) {
    return {
      success: false,
      url: url,
      error: "URL invalide ou vide",
    };
  }

  try {
    const params = new URLSearchParams({
      url: normalizedUrl,
      category: "seo",
      strategy,
      ...(apiKey && { key: apiKey }),
    });

    const res = await fetch(`${PAGE_SPEED_API_BASE}?${params.toString()}`, {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const text = await res.text();
      let errorMsg = `HTTP ${res.status}`;
      if (res.status === 429) {
        errorMsg = "Limite de requêtes atteinte. Veuillez réessayer plus tard.";
      } else if (res.status === 404) {
        errorMsg = "URL non trouvée ou inaccessible";
      } else if (text) {
        try {
          const json = JSON.parse(text);
          errorMsg = json.error?.message || text.slice(0, 200);
        } catch {
          errorMsg = text.slice(0, 200);
        }
      }
      return {
        success: false,
        url: normalizedUrl,
        error: errorMsg,
      };
    }

    const json: PageSpeedApiResponse = await res.json();

    if (json.captchaResult && json.captchaResult !== "CAPTCHA_NOT_NEEDED") {
      return {
        success: false,
        url: normalizedUrl,
        error: "CAPTCHA requis par Google. Réessayez plus tard.",
      };
    }

    const seoData = extractSeoData(json, strategy);

    return {
      success: true,
      url: normalizedUrl,
      seoData: seoData ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return {
      success: false,
      url: normalizedUrl,
      error: message,
    };
  }
}
