import { db } from "./db";
import { leads } from "./schema";
import { eq } from "drizzle-orm";
import { recordEntityScraperUsage } from "./entity-scraper-usages";
import type { MappingResult } from "./scrapers/adapters/base-adapter";

export interface EasyBulkEmailValidatorResult {
  email?: string;
  email_quality?: string;
  email_result?: string;
  subresult?: string;
  free?: boolean;
}

/**
 * Mappe email_result (Apify) vers emailVerifyEmaillist (compatible UI)
 */
function mapEmailResultToEmaillist(result: string | undefined): string {
  if (!result) return "unknown";
  const r = result.toLowerCase();
  if (r === "valid") return "ok";
  if (r === "invalid") return "invalid";
  if (r === "catch_all" || r === "accept_all") return "ok_for_all";
  return r;
}

/**
 * Met à jour les leads avec les résultats du validateur Apify
 */
export async function mapValidatorResultsToLeads(
  results: EasyBulkEmailValidatorResult[],
  emailToLeadId: Map<string, number>,
  userId: number,
  options?: { scraperId?: number; runId?: string }
): Promise<MappingResult> {
  let enriched = 0;
  let skipped = 0;
  let errors = 0;
  const now = new Date();

  for (const row of results) {
    try {
      const email = (row.email || "").trim().toLowerCase();
      if (!email) {
        skipped++;
        continue;
      }

      const leadId = emailToLeadId.get(email);
      if (leadId == null) {
        skipped++;
        continue;
      }

      const emailResult = row.email_result?.toLowerCase() || "unknown";
      const emaillistStatus = mapEmailResultToEmaillist(row.email_result);

      const updateData: Record<string, unknown> = {
        emailVerifyEmaillist: emaillistStatus,
        emailVerifyEmaillistAt: now,
        updatedAt: now,
      };

      if (emailResult === "valid") {
        updateData.emailCertainty = "sure";
      }

      await db.update(leads).set(updateData).where(eq(leads.id, leadId));

      enriched++;

      try {
        await recordEntityScraperUsage({
          entityType: "lead",
          entityId: leadId,
          scraperId: options?.scraperId ?? null,
          runId: options?.runId ?? null,
          source: "verify_email_apify",
          hasResult: emailResult === "valid",
          itemCount: 1,
          configUsed: {},
          userId,
        });
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error("[EasyBulkEmailValidator] Erreur mapping:", err, row);
      errors++;
    }
  }

  return {
    created: 0,
    skipped,
    errors,
    enriched,
  };
}
