import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

/**
 * GET /api/dashboard/spending-chart
 * Retourne les coûts et exécutions par jour pour le graphique
 * Query params: timeRange=7d|30d|90d
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
    const timeRange = request.nextUrl.searchParams.get("timeRange") || "30d";

    const now = new Date();
    let daysToSubtract = 30;
    if (timeRange === "90d") {
      daysToSubtract = 90;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }

    // Utiliser UTC pour correspondre à PostgreSQL (Neon utilise UTC)
    const startDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - daysToSubtract,
        0,
        0,
        0,
        0
      )
    );
    const endDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );

    const sqlQuery = neon(process.env.DATABASE_URL!);

    const spendingData = await sqlQuery`
      SELECT
        to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
        COALESCE(SUM(cost_usd), 0)::double precision as cost_usd,
        COUNT(*)::int as runs,
        COUNT(*) FILTER (WHERE status = 'SUCCEEDED')::int as succeeded,
        COUNT(*) FILTER (WHERE status != 'SUCCEEDED')::int as failed
      FROM scraper_runs
      WHERE user_id = ${userId}
        AND created_at >= ${startDate.toISOString()}
        AND created_at <= ${endDate.toISOString()}
      GROUP BY to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ORDER BY date
    `;

    const spendingMap = new Map<
      string,
      { costUsd: number; runs: number; succeeded: number; failed: number }
    >();
    for (const row of spendingData) {
      const r = row as Record<string, unknown>;
      const date = String(r.date ?? "").split("T")[0];
      const costUsd = Number(r.cost_usd ?? r.costUsd ?? 0) || 0;
      const runs = Number(r.runs ?? 0) || 0;
      const succeeded = Number(r.succeeded ?? 0) || 0;
      const failed = Number(r.failed ?? 0) || 0;
      if (date) {
        spendingMap.set(date, { costUsd, runs, succeeded, failed });
      }
    }

    const dateArray: string[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      dateArray.push(dateStr);
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    const chartData = dateArray.map((date) => {
      const entry = spendingMap.get(date);
      return {
        date,
        costUsd: entry?.costUsd ?? 0,
        runs: entry?.runs ?? 0,
        succeeded: entry?.succeeded ?? 0,
        failed: entry?.failed ?? 0,
      };
    });

    return NextResponse.json(chartData);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération du graphique dépenses:",
      error
    );
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
