import { db } from "@/lib/db";
import { scraperRuns } from "@/lib/schema";
import { getApifyRunCost } from "@/lib/apify-cost";

export type ScraperRunSource =
  | "scraping"
  | "enrich_collection"
  | "enrich_lead"
  | "enrich_company"
  | "enrich_emails_collection"
  | "enrich_emails_company"
  | "find_email"
  | "trustpilot"
  | "seo_local_ranking"
  | "import"; // Backfill depuis l'API Apify

export interface RecordScraperRunParams {
  runId: string;
  scraperId: number | null;
  userId: number;
  source: ScraperRunSource;
  collectionId?: number | null;
  leadId?: number | null;
  companyId?: number | null;
  itemCount: number;
  status: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  /** Si true, appelle getApifyRunCost pour compléter costUsd */
  fetchCostFromApify?: boolean;
  /** Coût connu (ex. Trustpilot retourne usageTotalUsd) - évite un appel API si fourni */
  costUsd?: number | null;
  /** Détails d'usage (ex. openai_tokens, apify_runs) pour tracking */
  usageDetails?: Record<string, unknown>;
}

/**
 * Enregistre une exécution de scraper dans scraper_runs pour le tracking des coûts.
 * Ne lève jamais d'erreur - en cas de conflit ou d'échec, log et ignore.
 */
export async function recordScraperRun(
  params: RecordScraperRunParams,
): Promise<void> {
  try {
    let costUsd: number | null = params.costUsd ?? null;
    let usageDetails: Record<string, unknown> | undefined;
    let startedAt = params.startedAt;
    let finishedAt = params.finishedAt;

    if (
      params.fetchCostFromApify &&
      (costUsd === null || costUsd === undefined)
    ) {
      const cost = await getApifyRunCost(params.runId);
      if (cost) {
        costUsd = cost.costUsd ?? null;
        usageDetails = cost.usageUsd as Record<string, unknown> | undefined;
        if (cost.startedAt) startedAt = cost.startedAt;
        if (cost.finishedAt) finishedAt = cost.finishedAt;
      }
    } else if (params.costUsd != null) {
      costUsd = params.costUsd;
    }
    if (params.usageDetails) {
      usageDetails = params.usageDetails;
    }

    await db.insert(scraperRuns).values({
      runId: params.runId,
      scraperId: params.scraperId,
      userId: params.userId,
      source: params.source,
      collectionId: params.collectionId ?? null,
      leadId: params.leadId ?? null,
      companyId: params.companyId ?? null,
      costUsd,
      usageDetails,
      itemCount: params.itemCount,
      status: params.status,
      startedAt: startedAt ? new Date(startedAt) : null,
      finishedAt: finishedAt ? new Date(finishedAt) : null,
    });
  } catch (err) {
    console.error("[recordScraperRun] Erreur:", err);
  }
}
