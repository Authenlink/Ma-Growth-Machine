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

    // Calculer la date de début selon le timeRange
    const now = new Date();
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    startDate.setHours(0, 0, 0, 0);

    // La date de fin doit toujours inclure aujourd'hui
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    // Utiliser sql directement depuis Neon pour les requêtes brutes
    const sqlQuery = neon(process.env.DATABASE_URL!);

    // Récupérer les leads groupés par date
    const leadsData = await sqlQuery`
      SELECT 
        DATE(created_at)::text as date,
        COUNT(*)::int as count
      FROM leads
      WHERE user_id = ${userId}
        AND created_at >= ${startDate.toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    // Récupérer les companies groupées par date
    const companiesData = await sqlQuery`
      SELECT 
        DATE(created_at)::text as date,
        COUNT(*)::int as count
      FROM companies
      WHERE created_at >= ${startDate.toISOString()}
      GROUP BY DATE(created_at)
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
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Combiner les données
    const chartData = dateArray.map((date) => ({
      date,
      leads: leadsMap.get(date) || 0,
      companies: companiesMap.get(date) || 0,
    }));

    // Debug: Afficher les dates générées et la date d'aujourd'hui
    const todayStr = new Date().toISOString().split("T")[0];
    console.log("Date d'aujourd'hui:", todayStr);
    console.log("Dernière date dans chartData:", chartData[chartData.length - 1]?.date);
    console.log("Nombre total de dates:", chartData.length);

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Erreur lors de la récupération des données du graphique:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
