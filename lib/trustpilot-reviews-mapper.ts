import { db } from "@/lib/db";
import { trustpilotReviews } from "@/lib/schema";

/**
 * Données brutes d'un avis Trustpilot depuis Apify
 * L'output peut avoir "user.name" (flat) ou user: { name } (nested)
 */
export interface TrustpilotReviewData {
  id: string;
  rating: number;
  publishedDate?: string | null;
  title?: string | null;
  body?: string | null;
}

export interface MapTrustpilotResult {
  created: number;
  skipped: number;
  errors: number;
}

function parseReviewItem(item: unknown): TrustpilotReviewData | null {
  const raw = item as Record<string, unknown>;
  const id = raw.id;
  const rating = raw.rating;

  if (!id || typeof id !== "string") return null;
  if (rating == null || typeof rating !== "number") return null;

  const publishedDate = raw.publishedDate as string | null | undefined;
  const title = (raw.title as string | null | undefined) ?? null;
  const body = (raw.body as string | null | undefined) ?? null;

  return {
    id: String(id),
    rating,
    publishedDate: publishedDate ?? null,
    title,
    body,
  };
}

function parsePublishedDate(value: string | null | undefined): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Mappe les avis Trustpilot vers la base de données
 * Utilise onConflictDoNothing pour éviter les doublons (trustpilotId + companyId)
 */
export async function mapTrustpilotReviewsToDb(
  items: unknown[],
  companyId: number
): Promise<MapTrustpilotResult> {
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of items) {
    const parsed = parseReviewItem(item);
    if (!parsed) {
      errors++;
      continue;
    }

    try {
      const publishedDate = parsePublishedDate(parsed.publishedDate);

      const result = await db
        .insert(trustpilotReviews)
        .values({
          companyId,
          trustpilotId: parsed.id,
          rating: parsed.rating,
          publishedDate,
          title: parsed.title ?? null,
          body: parsed.body ?? null,
          updatedAt: new Date(),
        })
        .onConflictDoNothing({
          target: [trustpilotReviews.companyId, trustpilotReviews.trustpilotId],
        })
        .returning({ id: trustpilotReviews.id });

      if (result.length > 0) {
        created++;
      } else {
        skipped++;
      }
    } catch {
      errors++;
    }
  }

  return { created, skipped, errors };
}
