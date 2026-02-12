import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  collections,
  leads,
  leadCollections,
  scrapers,
} from "@/lib/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { getAdapter } from "@/lib/scrapers/adapter-factory";
import { recordScraperRun } from "@/lib/scraper-runs";

const MAX_RUN_TIMEOUT = 30 * 60 * 1000;
const POLL_INTERVAL = 5000;
const MAX_EMAILS_PER_RUN = 1000;
const DEFAULT_COST_PER_EMAIL = 0.001;

/**
 * GET /api/collections/[id]/verify-emails-apify?count=N - Prévision de coût
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(session.user.id);
    const collectionId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const countParam = searchParams.get("count");

    if (isNaN(collectionId)) {
      return NextResponse.json(
        { error: "ID de collection invalide" },
        { status: 400 },
      );
    }

    const collection = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, collectionId),
          eq(collections.userId, userId),
        ),
      )
      .limit(1);

    if (collection.length === 0) {
      return NextResponse.json(
        { error: "Collection non trouvée ou accès non autorisé" },
        { status: 404 },
      );
    }

    const leadsWithEmail = await db
      .select({
        id: leads.id,
        email: leads.email,
        emailVerifyEmaillist: leads.emailVerifyEmaillist,
      })
      .from(leads)
      .innerJoin(
        leadCollections,
        and(
          eq(leadCollections.leadId, leads.id),
          eq(leadCollections.collectionId, collectionId),
        ),
      )
      .where(and(eq(leads.userId, userId), isNotNull(leads.email)));

    const totalWithEmail = leadsWithEmail.filter((l) => l.email?.trim()).length;
    const verifiedCount = leadsWithEmail.filter(
      (l) => l.email?.trim() && l.emailVerifyEmaillist?.trim(),
    ).length;
    const unverifiedCount = totalWithEmail - verifiedCount;

    let count = totalWithEmail;
    if (countParam != null) {
      const paramCount = parseInt(countParam, 10);
      if (!isNaN(paramCount) && paramCount >= 0) count = paramCount;
    }

    const scraperResult = await db
      .select({ costPerLead: scrapers.costPerLead })
      .from(scrapers)
      .where(
        and(
          eq(scrapers.mapperType, "easy-bulk-email-validator"),
          eq(scrapers.isActive, true),
        ),
      )
      .limit(1);

    const costPerLead =
      scraperResult[0]?.costPerLead ?? DEFAULT_COST_PER_EMAIL;
    const estimatedCostUsd = count * costPerLead;

    return NextResponse.json({
      count,
      costPerLead,
      estimatedCostUsd: Math.round(estimatedCostUsd * 10000) / 10000,
      maxPerRun: MAX_EMAILS_PER_RUN,
      totalWithEmail,
      verifiedCount,
      unverifiedCount,
    });
  } catch (error) {
    console.error("[Verify Emails Apify Estimate] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'estimation" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/collections/[id]/verify-emails-apify - Vérifie les emails via Apify Easy Bulk Email Validator
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const userId = parseInt(session.user.id);
    const collectionId = parseInt(id);

    if (isNaN(collectionId)) {
      return NextResponse.json(
        { error: "ID de collection invalide" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { force = false } = body as { force?: boolean };

    const collection = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, collectionId),
          eq(collections.userId, userId),
        ),
      )
      .limit(1);

    if (collection.length === 0) {
      return NextResponse.json(
        { error: "Collection non trouvée ou accès non autorisé" },
        { status: 404 },
      );
    }

    const collectionLeads = await db
      .select({
        id: leads.id,
        email: leads.email,
        emailVerifyEmaillist: leads.emailVerifyEmaillist,
      })
      .from(leads)
      .innerJoin(
        leadCollections,
        and(
          eq(leadCollections.leadId, leads.id),
          eq(leadCollections.collectionId, collectionId),
        ),
      )
      .where(and(eq(leads.userId, userId), isNotNull(leads.email)));

    const leadsToVerify = collectionLeads.filter((l) => {
      if (!l.email?.trim()) return false;
      if (!force && l.emailVerifyEmaillist) return false;
      return true;
    });

    const uniqueEmails = new Map<string, number>();
    for (const l of leadsToVerify) {
      const email = l.email!.trim().toLowerCase();
      if (!force && uniqueEmails.has(email)) continue;
      uniqueEmails.set(email, l.id);
    }

    const emailsToVerify = Array.from(uniqueEmails.keys());
    const emailToLeadId = new Map(Array.from(uniqueEmails.entries()));

    if (emailsToVerify.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucun email à vérifier dans cette collection",
        metrics: {
          total: 0,
          verified: 0,
          enriched: 0,
          estimatedCostUsd: 0,
        },
      });
    }

    if (emailsToVerify.length > MAX_EMAILS_PER_RUN) {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_EMAILS_PER_RUN} emails par run. ${emailsToVerify.length} emails demandés. Divisez en plusieurs batches.`,
        },
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
    const costPerLead = scraperConfig.costPerLead ?? 0.001;
    const estimatedCostUsd = emailsToVerify.length * costPerLead;

    const adapter = getAdapter(
      scraperConfig.mapperType,
      (scraperConfig.providerConfig || {}) as Record<string, unknown>,
    );

    console.log(
      `[Verify Emails Apify] User ${userId} vérifie ${emailsToVerify.length} emails pour collection ${collectionId}`,
    );

    const run = await adapter.execute({ emails: emailsToVerify });
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

      if (attempts % 6 === 0) {
        console.log(
          `[Verify Emails Apify] Run ${run.id} en cours: ${runStatus.status}`,
        );
      }
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
          source: "verify_emails_collection_apify",
          collectionId,
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
    const mappingResult = await adapter.mapToLeads(
      items,
      collectionId,
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
        source: "verify_emails_collection_apify",
        collectionId,
        itemCount: items.length,
        status: runStatus.status,
        fetchCostFromApify: true,
      });
    } catch {
      /* ignore */
    }

    console.log(
      `[Verify Emails Apify] Terminé: ${mappingResult.enriched || 0} mis à jour`,
    );

    return NextResponse.json({
      success: true,
      runId: run.id,
      metrics: {
        total: collectionLeads.length,
        processed: emailsToVerify.length,
        enriched: mappingResult.enriched || 0,
        skipped: mappingResult.skipped || 0,
        errors: mappingResult.errors || 0,
        estimatedCostUsd: Math.round(estimatedCostUsd * 10000) / 10000,
      },
    });
  } catch (error) {
    console.error("[Verify Emails Apify] Erreur:", error);

    return NextResponse.json(
      {
        error: "Erreur lors de la vérification des emails",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
