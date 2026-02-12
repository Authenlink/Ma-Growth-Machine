import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scraperRuns, scrapers } from "@/lib/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

/**
 * GET /api/scraper-runs
 * Liste les exécutions de scrapers avec filtres et agrégations
 * Query params: from, to (ISO), scraperId, source, limit (défaut 50), offset (défaut 0)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const scraperIdParam = searchParams.get("scraperId");
    const sourceParam = searchParams.get("source");
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "50", 10) || 50,
      100
    );
    const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;

    const conditions = [eq(scraperRuns.userId, userId)];

    if (fromParam) {
      try {
        const fromDate = new Date(fromParam);
        if (!isNaN(fromDate.getTime())) {
          conditions.push(gte(scraperRuns.createdAt, fromDate));
        }
      } catch {
        /* ignore invalid date */
      }
    }
    if (toParam) {
      try {
        const toDate = new Date(toParam);
        if (!isNaN(toDate.getTime())) {
          conditions.push(lte(scraperRuns.createdAt, toDate));
        }
      } catch {
        /* ignore invalid date */
      }
    }
    if (scraperIdParam) {
      const scraperId = parseInt(scraperIdParam, 10);
      if (!isNaN(scraperId)) {
        conditions.push(eq(scraperRuns.scraperId, scraperId));
      }
    }
    if (sourceParam && sourceParam.trim()) {
      conditions.push(eq(scraperRuns.source, sourceParam.trim()));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [runsResult, summaryResult] = await Promise.all([
      db
        .select({
          id: scraperRuns.id,
          runId: scraperRuns.runId,
          scraperId: scraperRuns.scraperId,
          scraperName: scrapers.name,
          source: scraperRuns.source,
          collectionId: scraperRuns.collectionId,
          leadId: scraperRuns.leadId,
          companyId: scraperRuns.companyId,
          costUsd: scraperRuns.costUsd,
          itemCount: scraperRuns.itemCount,
          status: scraperRuns.status,
          createdAt: scraperRuns.createdAt,
        })
        .from(scraperRuns)
        .leftJoin(scrapers, eq(scraperRuns.scraperId, scrapers.id))
        .where(whereClause)
        .orderBy(desc(scraperRuns.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({
          totalCostUsd: sql<number>`COALESCE(SUM(${scraperRuns.costUsd}), 0)`.as(
            "total_cost_usd"
          ),
          totalRuns: sql<number>`COUNT(*)::int`.as("total_runs"),
        })
        .from(scraperRuns)
        .where(whereClause),
    ]);

    const summary = summaryResult[0];
    const totalCostUsd =
      typeof summary?.totalCostUsd === "number"
        ? summary.totalCostUsd
        : parseFloat(String(summary?.totalCostUsd ?? 0)) || 0;
    const totalRuns = Number(summary?.totalRuns ?? 0) || 0;

    const runs = runsResult.map((r) => ({
      id: r.id,
      runId: r.runId,
      scraperId: r.scraperId,
      scraperName: r.scraperName ?? (r.scraperId === null ? "Trustpilot" : null),
      source: r.source,
      collectionId: r.collectionId,
      leadId: r.leadId,
      companyId: r.companyId,
      costUsd: r.costUsd,
      itemCount: r.itemCount,
      status: r.status,
      createdAt: r.createdAt?.toISOString?.() ?? null,
    }));

    return NextResponse.json({
      runs,
      summary: {
        totalCostUsd,
        totalRuns,
        period:
          fromParam || toParam
            ? {
                from: fromParam ?? null,
                to: toParam ?? null,
              }
            : undefined,
      },
    });
  } catch (error) {
    console.error("[scraper-runs] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des runs",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
