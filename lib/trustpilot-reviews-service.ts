import { apifyClient } from "@/lib/apify-client";

const TRUSTPILOT_ACTOR_ID = "thewolves/trustpilot-reviews-scraper";
const MAX_RUN_TIMEOUT = 30 * 60 * 1000;
const POLL_INTERVAL = 5000;

/**
 * Lance le scraper Trustpilot Apify et retourne les avis
 * @param startUrls URLs Trustpilot (ex: https://www.trustpilot.com/review/bricks.co)
 * @param maxItems Nombre max d'avis à récupérer (défaut 100)
 */
export interface TrustpilotScraperResult {
  items: unknown[];
  runId: string;
  usageTotalUsd?: number;
  status: string;
}

export async function runTrustpilotScraper(
  startUrls: string[],
  maxItems: number = 100
): Promise<TrustpilotScraperResult> {
  if (startUrls.length === 0) {
    return { items: [], runId: "", usageTotalUsd: undefined, status: "SUCCEEDED" };
  }

  const input = {
    startUrls,
    maxItems,
  };

  const run = await apifyClient.actor(TRUSTPILOT_ACTOR_ID).call(input);

  let runStatus = await apifyClient.run(run.id).get();
  let attempts = 0;
  const maxAttempts = MAX_RUN_TIMEOUT / POLL_INTERVAL;

  while (
    runStatus &&
    runStatus.status !== "SUCCEEDED" &&
    runStatus.status !== "FAILED" &&
    runStatus.status !== "ABORTED" &&
    runStatus.status !== "TIMED-OUT" &&
    attempts < maxAttempts
  ) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    runStatus = await apifyClient.run(run.id).get();
    attempts++;
  }

  if (!runStatus) {
    throw new Error("Impossible de récupérer le statut du run");
  }

  if (runStatus.status !== "SUCCEEDED") {
    throw new Error(
      `Le scraping Trustpilot a échoué : ${runStatus.status}`
    );
  }

  if (!runStatus.defaultDatasetId) {
    throw new Error("Aucun dataset trouvé pour ce run");
  }

  const { items } = await apifyClient
    .dataset(runStatus.defaultDatasetId)
    .listItems();

  return {
    items,
    runId: run.id,
    usageTotalUsd: runStatus.usageTotalUsd ?? undefined,
    status: runStatus.status,
  };
}
