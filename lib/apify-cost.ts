import { apifyClient } from "@/lib/apify-client";

const TIMEOUT_MS = 8000; // 8 secondes max pour récupérer le coût

export interface ApifyRunCost {
  costUsd: number | null;
  usageUsd?: Record<string, number>;
  startedAt?: string;
  finishedAt?: string;
}

/**
 * Récupère le coût et les métriques d'un run Apify
 */
export async function getApifyRunCost(
  runId: string,
): Promise<ApifyRunCost | null> {
  try {
    const run = await Promise.race([
      apifyClient.run(runId).get(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS),
      ),
    ]);
    if (!run) return null;

    return {
      costUsd: run.usageTotalUsd ?? null,
      usageUsd: run.usageUsd as Record<string, number> | undefined,
      startedAt: run.startedAt?.toISOString?.(),
      finishedAt: run.finishedAt?.toISOString?.(),
    };
  } catch {
    return null;
  }
}
