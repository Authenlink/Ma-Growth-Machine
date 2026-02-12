import { db } from "@/lib/db";
import { scraperRuns, scrapers } from "@/lib/schema";
import { apifyClient } from "@/lib/apify-client";
import { eq, and } from "drizzle-orm";

/**
 * Supprime les runs importés (source='import') pour un utilisateur.
 * Permet de réinitialiser avant un nouvel import.
 */
export async function resetImportedScraperRuns(userId: number): Promise<number> {
  const result = await db
    .delete(scraperRuns)
    .where(and(eq(scraperRuns.userId, userId), eq(scraperRuns.source, "import")))
    .returning({ id: scraperRuns.id });
  return result.length;
}

/** Alias actId Apify (short ID) -> actorId complet pour le mapping */
const ACT_ID_ALIASES: Record<string, string> = {
  QM5YJIYftbZQiNpgN:
    "xmiso_scrapers/easy-bulk-email-validator---verify-emails-from-1-7-1000-rows",
};

/**
 * Construit une map actId (Apify) -> scraperId (notre table scrapers)
 */
async function buildActIdToScraperIdMap(): Promise<Map<string, number>> {
  const allScrapers = await db
    .select({ id: scrapers.id, providerConfig: scrapers.providerConfig })
    .from(scrapers);
  const map = new Map<string, number>();
  for (const s of allScrapers) {
    const actorId = (s.providerConfig as Record<string, unknown>)
      ?.actorId as string | undefined;
    if (typeof actorId === "string" && actorId.trim()) {
      const trimmed = actorId.trim();
      map.set(trimmed, s.id);
      const shortId = Object.keys(ACT_ID_ALIASES).find(
        (k) => ACT_ID_ALIASES[k] === trimmed,
      );
      if (shortId) map.set(shortId, s.id);
    }
  }
  return map;
}

export interface BackfillResult {
  processed: number;
  imported: number;
  skipped: number;
  errors: number;
}

/**
 * Importe les runs Apify du dernier mois dans scraper_runs.
 * Les runs déjà présents (run_id) sont ignorés.
 */
export async function backfillScraperRunsFromApify(
  userId: number,
  daysBack: number = 30
): Promise<BackfillResult> {
  const result: BackfillResult = { processed: 0, imported: 0, skipped: 0, errors: 0 };
  const actIdToScraperId = await buildActIdToScraperIdMap();

  const startedAfter = new Date();
  startedAfter.setDate(startedAfter.getDate() - daysBack);
  startedAfter.setHours(0, 0, 0, 0);

  const runsIterator = apifyClient.runs().list({
    limit: 1000,
    desc: true,
    status: ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT", "RUNNING"],
    startedAfter: startedAfter.toISOString(),
  });

  const runIds: string[] = [];
  for await (const run of runsIterator) {
    runIds.push(run.id);
  }

  for (const runId of runIds) {
    result.processed++;
    try {
      const run = await apifyClient.run(runId).get();
      if (!run) {
        result.errors++;
        continue;
      }

      const scraperId = run.actId ? actIdToScraperId.get(run.actId) ?? null : null;
      const costUsd = run.usageTotalUsd ?? null;
      const usageDetails = run.usageUsd as Record<string, unknown> | undefined;
      const status = run.status ?? "UNKNOWN";
      const startedAt = run.startedAt;
      const finishedAt = run.finishedAt;

      await db.insert(scraperRuns).values({
        runId: run.id,
        scraperId,
        userId,
        source: "import",
        collectionId: null,
        leadId: null,
        companyId: null,
        costUsd,
        usageDetails,
        itemCount: 0,
        status,
        startedAt: startedAt ? new Date(startedAt) : null,
        finishedAt: finishedAt ? new Date(finishedAt) : null,
      });
      result.imported++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("idx_scraper_runs_run_id")) {
        result.skipped++;
      } else {
        console.error(`[backfill] Erreur pour run ${runId}:`, err);
        result.errors++;
      }
    }
  }

  return result;
}
