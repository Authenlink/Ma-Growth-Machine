import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, scrapers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getAdapter } from "@/lib/scrapers/adapter-factory";
import { recordScraperRun } from "@/lib/scraper-runs";

const MAX_RUN_TIMEOUT = 30 * 60 * 1000;
const POLL_INTERVAL = 5000;

/**
 * POST /api/leads/[id]/verify-email-apify - Vérifie l'email d'un lead via Apify Easy Bulk Email Validator
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const startTime = Date.now();
  let runId: string | null = null;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(session.user.id);
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: "ID de lead invalide" },
        { status: 400 },
      );
    }

    const leadResult = await db
      .select({
        id: leads.id,
        email: leads.email,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
      .limit(1);

    if (leadResult.length === 0) {
      return NextResponse.json(
        { error: "Lead non trouvé ou accès non autorisé" },
        { status: 404 },
      );
    }

    const lead = leadResult[0];

    if (!lead.email?.trim()) {
      return NextResponse.json(
        { error: "Ce lead n'a pas d'email à vérifier" },
        { status: 400 },
      );
    }

    const scraperResult = await db
      .select()
      .from(scrapers)
      .where(
        and(
          eq(scrapers.mapperType, "easy-bulk-email-validator"),
          eq(scrapers.isActive, true),
        ),
      )
      .limit(1);

    if (scraperResult.length === 0) {
      return NextResponse.json(
        { error: "Scraper Easy Bulk Email Validator non trouvé" },
        { status: 404 },
      );
    }

    const scraperConfig = scraperResult[0];
    const adapter = getAdapter(
      scraperConfig.mapperType,
      (scraperConfig.providerConfig || {}) as Record<string, unknown>,
    );

    const email = lead.email.trim();
    const run = await adapter.execute({ emails: [email] });
    runId = run.id;

    let runStatus = await adapter.getStatus(run.id);
    let attempts = 0;
    const maxAttempts = MAX_RUN_TIMEOUT / POLL_INTERVAL;

    while (
      runStatus.status !== "SUCCEEDED" &&
      runStatus.status !== "FAILED" &&
      runStatus.status !== "ABORTED" &&
      runStatus.status !== "TIMED-OUT" &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      runStatus = await adapter.getStatus(run.id);
      attempts++;
    }

    if (runStatus.status !== "SUCCEEDED") {
      const errorMessage =
        runStatus.status === "FAILED"
          ? "La vérification a échoué"
          : runStatus.status === "TIMED-OUT"
            ? "La vérification a dépassé le temps limite"
            : runStatus.status === "ABORTED"
              ? "La vérification a été annulée"
              : "La vérification s'est terminée avec une erreur";

      try {
        await recordScraperRun({
          runId: run.id,
          scraperId: scraperConfig.id,
          userId,
          source: "verify_email_apify",
          leadId,
          itemCount: 0,
          status: runStatus.status,
          fetchCostFromApify: true,
        });
      } catch {
        /* ignore */
      }

      return NextResponse.json(
        { error: errorMessage, runId: run.id, status: runStatus.status },
        { status: 500 },
      );
    }

    const items = await adapter.getResults(run.id);
    const emailToLeadId = new Map<string, number>([[email.toLowerCase(), leadId]]);

    const mappingResult = await adapter.mapToLeads(
      items,
      0,
      userId,
      {
        scraperId: scraperConfig.id,
        emailToLeadId,
        runId: run.id,
      },
    );

    try {
      await recordScraperRun({
        runId: run.id,
        scraperId: scraperConfig.id,
        userId,
        source: "verify_email_apify",
        leadId,
        itemCount: items.length,
        status: runStatus.status,
        fetchCostFromApify: true,
      });
    } catch {
      /* ignore */
    }

    const updatedLead = await db
      .select({
        emailVerifyEmaillist: leads.emailVerifyEmaillist,
        emailCertainty: leads.emailCertainty,
      })
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    const duration = Math.round((Date.now() - startTime) / 1000);

    return NextResponse.json({
      success: true,
      runId: run.id,
      result: updatedLead[0]?.emailVerifyEmaillist || null,
      emailCertainty: updatedLead[0]?.emailCertainty || null,
      metrics: {
        enriched: mappingResult.enriched || 0,
        skipped: mappingResult.skipped || 0,
        errors: mappingResult.errors || 0,
      },
      duration,
    });
  } catch (error) {
    console.error("[Verify Email Apify] Erreur:", error);

    return NextResponse.json(
      {
        error: "Erreur lors de la vérification de l'email",
        message: error instanceof Error ? error.message : "Erreur inconnue",
        runId,
      },
      { status: 500 },
    );
  }
}
