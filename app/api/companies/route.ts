import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companies } from "@/lib/schema";
import { and, or, like, desc, sql, eq } from "drizzle-orm";

// GET /api/companies - Liste toutes les entreprises avec filtres
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Récupérer les paramètres de filtres
    const name = searchParams.get("name");
    const industry = searchParams.get("industry");
    const size = searchParams.get("size");
    const country = searchParams.get("country");
    const city = searchParams.get("city");

    // Paramètres de pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Construire les conditions de filtrage
    const conditions = [];

    // Filtre par nom d'entreprise
    if (name && name.trim() !== "") {
      const namePattern = `%${name.trim()}%`;
      conditions.push(sql`${companies.name} ILIKE ${namePattern}`);
    }

    // Filtre par industrie - nettoyer les crochets JSON si présents
    if (industry && industry.trim() !== "") {
      const searchTerm = industry.trim();
      // Utiliser une expression SQL pour nettoyer l'industrie stockée
      // Si c'est du format ['value'], extraire 'value', sinon utiliser tel quel
      conditions.push(sql`
        CASE
          WHEN ${companies.industry} LIKE '[%' AND ${companies.industry} LIKE '%]'
          THEN REPLACE(REPLACE(REPLACE(${companies.industry}, '[', ''), ']', ''), '"', '')
          ELSE ${companies.industry}
        END ILIKE ${`%${searchTerm}%`}
      `);
    }

    // Filtre par taille
    if (size && size.trim() !== "") {
      conditions.push(eq(companies.size, size));
    }

    // Filtre par pays
    if (country && country.trim() !== "") {
      conditions.push(like(companies.country, `%${country.trim()}%`));
    }

    // Filtre par ville
    if (city && city.trim() !== "") {
      conditions.push(like(companies.city, `%${city.trim()}%`));
    }

    // Construire la condition where finale
    const whereCondition = conditions.length > 0 ? and(...conditions)! : undefined;

    // Compter le nombre total d'éléments
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(companies);

    if (whereCondition) {
      countQuery.where(whereCondition);
    }

    const totalCountResult = await countQuery;
    const totalItems = totalCountResult[0]?.count || 0;

    // Requête pour récupérer les entreprises
    const results = await db
      .select()
      .from(companies)
      .where(whereCondition || undefined)
      .orderBy(companies.name)
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      data: results,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des entreprises:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}