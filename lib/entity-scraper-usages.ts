import { db } from "@/lib/db";
import { entityScraperUsages } from "@/lib/schema";

export interface RecordEntityScraperUsageParams {
  entityType: "lead" | "company";
  entityId: number;
  scraperId: number | null;
  runId: string | null;
  source: string;
  hasResult: boolean;
  itemCount: number;
  configUsed?: Record<string, unknown>;
  userId: number;
}

/**
 * Enregistre une utilisation de scraper sur une entité (lead ou company).
 * Ne lève jamais d'erreur - en cas d'échec, log et ignore.
 */
export async function recordEntityScraperUsage(
  params: RecordEntityScraperUsageParams,
): Promise<void> {
  try {
    await db.insert(entityScraperUsages).values({
      entityType: params.entityType,
      entityId: params.entityId,
      scraperId: params.scraperId,
      runId: params.runId,
      source: params.source,
      hasResult: params.hasResult,
      itemCount: params.itemCount,
      configUsed: params.configUsed ?? null,
      userId: params.userId,
    });
  } catch (err) {
    console.error("[recordEntityScraperUsage] Erreur:", err);
  }
}
