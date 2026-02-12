import { ApifyAdapter, ApifyProviderConfig } from "./apify-adapter";
import { ScraperRun, MappingResult } from "./base-adapter";
import { mapValidatorResultsToLeads } from "../../easy-bulk-email-validator-mapper";

const DEFAULT_ACTOR_ID =
  "xmiso_scrapers/easy-bulk-email-validator---verify-emails-from-1-7-1000-rows";

/**
 * Adapter pour le scraper Easy Bulk Email Validator (Apify)
 * Vérifie la délivrabilité d'emails via MillionVerifier
 */
export class EasyBulkEmailValidatorAdapter extends ApifyAdapter {
  constructor(providerConfig: ApifyProviderConfig) {
    super({
      actorId:
        providerConfig.actorId ||
        DEFAULT_ACTOR_ID,
    });
  }

  /**
   * Exécute la vérification d'emails
   * @param params Paramètres contenant emails (array de strings)
   */
  async execute(params: Record<string, unknown>): Promise<ScraperRun> {
    let emails: string[] = [];
    if (params.emails) {
      if (Array.isArray(params.emails)) {
        emails = (params.emails as unknown[]).filter(
          (e): e is string => typeof e === "string" && e.trim().length > 0
        ) as string[];
      } else if (typeof params.emails === "string" && params.emails.trim()) {
        emails = [params.emails.trim()];
      }
    }

    if (emails.length === 0) {
      throw new Error("emails est requis (array de strings non vides)");
    }

    // Limite Apify : 1000 emails/run (paid), 100 (free)
    if (emails.length > 1000) {
      throw new Error(
        "Maximum 1000 emails par run. Divisez en plusieurs batches."
      );
    }

    const input = { emails };
    return super.execute(input);
  }

  /**
   * Mappe les résultats du validateur vers les leads (mise à jour uniquement)
   */
  async mapToLeads(
    data: unknown[],
    _collectionId: number,
    userId: number,
    options?: {
      scraperId?: number;
      companyLinkedinUrl?: string;
      emailToLeadId?: Map<string, number>;
      runId?: string;
    }
  ): Promise<MappingResult> {
    const emailToLeadId = options?.emailToLeadId;
    if (!emailToLeadId || emailToLeadId.size === 0) {
      return { created: 0, skipped: data.length, errors: 0, enriched: 0 };
    }

    return mapValidatorResultsToLeads(
      data as EasyBulkEmailValidatorResult[],
      emailToLeadId,
      userId,
      { scraperId: options?.scraperId, runId: options?.runId }
    );
  }
}

export interface EasyBulkEmailValidatorResult {
  email?: string;
  email_quality?: string;
  email_result?: string;
  subresult?: string;
  free?: boolean;
}
