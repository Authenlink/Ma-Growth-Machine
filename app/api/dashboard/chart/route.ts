import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

// GET /api/dashboard/chart - Retourne les données du graphique
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
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get("timeRange") || "90d";

    const now = new Date();
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
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

    // Utiliser sql directement depuis Neon pour les requêtes brutes
    const sqlQuery = neon(process.env.DATABASE_URL!);

    // Récupérer les leads groupés par date (UTC pour correspondre à Neon)
    const leadsData = await sqlQuery`
      SELECT 
        to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
        COUNT(*)::int as count
      FROM leads
      WHERE user_id = ${userId}
        AND created_at >= ${startDate.toISOString()}
        AND created_at <= ${endDate.toISOString()}
      GROUP BY to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ORDER BY date
    `;

    // Récupérer les companies groupées par date (UTC pour correspondre à Neon)
    const companiesData = await sqlQuery`
      SELECT 
        to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
        COUNT(*)::int as count
      FROM companies
      WHERE created_at >= ${startDate.toISOString()}
        AND created_at <= ${endDate.toISOString()}
      GROUP BY to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ORDER BY date
    `;

    // Convertir les résultats en objets
    const leadsMap = new Map<string, number>();
    for (const row of leadsData as Array<{ date: string; count: number }>) {
      leadsMap.set(row.date, row.count);
    }

    const companiesMap = new Map<string, number>();
    for (const row of companiesData as Array<{ date: string; count: number }>) {
      companiesMap.set(row.date, row.count);
    }

    // Générer toutes les dates entre startDate et aujourd'hui inclusivement (même si aucune donnée)
    const dateArray: string[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      dateArray.push(dateStr);
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    // Combiner les données
    const chartData = dateArray.map((date) => ({
      date,
      leads: leadsMap.get(date) || 0,
      companies: companiesMap.get(date) || 0,
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Erreur lors de la récupération des données du graphique:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
