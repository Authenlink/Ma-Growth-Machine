import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scraperRuns } from "@/lib/schema";
import { eq, and, gte, sql } from "drizzle-orm";

/**
 * GET /api/scraper-runs/summary
 * Retourne le total des dépenses et le nombre de runs pour la période donnée
 * Query params: period=day|week|month|all
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const period = request.nextUrl.searchParams.get("period") || "month";

    const conditions = [eq(scraperRuns.userId, userId)];

    if (period !== "all") {
      const now = new Date();
      let startDate: Date;

      if (period === "day") {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
      } else if (period === "week") {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
      } else {
        // month (défaut)
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
      }

      conditions.push(gte(scraperRuns.createdAt, startDate));
    }

    const whereClause =
      conditions.length > 1 ? and(...conditions) : conditions[0];

    const summaryResult = await db
      .select({
        totalCostUsd: sql<number>`COALESCE(SUM(${scraperRuns.costUsd}), 0)`.as(
          "total_cost_usd"
        ),
        totalRuns: sql<number>`COUNT(*)::int`.as("total_runs"),
      })
      .from(scraperRuns)
      .where(whereClause);

    const summary = summaryResult[0];
    const totalCostUsd =
      typeof summary?.totalCostUsd === "number"
        ? summary.totalCostUsd
        : parseFloat(String(summary?.totalCostUsd ?? 0)) || 0;
    const totalRuns = Number(summary?.totalRuns ?? 0) || 0;

    return NextResponse.json({
      totalCostUsd,
      totalRuns,
    });
  } catch (error) {
    console.error("[scraper-runs/summary] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération du résumé",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
