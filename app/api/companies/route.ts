import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  companies,
  entityScraperUsages,
  scrapers,
  trustpilotReviews,
  leads,
} from "@/lib/schema";
import { extractDomain } from "@/lib/bulk-email-finder-mapper";
import { and, or, like, sql, eq, exists, isNotNull, isNull, ne, getTableColumns } from "drizzle-orm";
import {
  FILTERABLE_SOURCE_TYPES,
  SOURCE_USE_ENTITY_SCRAPER_USAGES,
} from "@/lib/source-types";
import { FILTERABLE_SCORE_CATEGORIES, getScoreCategory, type ScoreCategory } from "@/lib/score-types";
import {
  buildCompanyScoreSqlExpression,
  buildCompanyScoreCategoryCondition,
} from "@/lib/company-scoring";

function normalizeWebsite(input?: string | null): string | null {
  if (!input || input.trim() === "") return null;
  const cleaned = input.trim();
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }
  return `https://${cleaned}`;
}

// GET /api/companies - Liste toutes les entreprises avec filtres
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

    // Récupérer les paramètres de filtres
    const name = searchParams.get("name");
    const industry = searchParams.get("industry");
    const size = searchParams.get("size");
    const country = searchParams.get("country");
    const city = searchParams.get("city");
    const sourceTypesRaw = searchParams.getAll("sourceTypes");
    const sourceTypes = sourceTypesRaw
      .flatMap((s) => s.split(",").map((t) => t.trim()))
      .filter((t) => t && FILTERABLE_SOURCE_TYPES.includes(t));

    const scoreCategoryRaw = searchParams.get("scoreCategory");
    const scoreCategory: ScoreCategory | null =
      scoreCategoryRaw && FILTERABLE_SCORE_CATEGORIES.includes(scoreCategoryRaw as ScoreCategory)
        ? (scoreCategoryRaw as ScoreCategory)
        : null;

    const verifiedEmail = searchParams.get("verifiedEmail");

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

    // Filtre par email vérifié
    if (verifiedEmail && verifiedEmail !== "all") {
      if (verifiedEmail === "verified") {
        // Entreprise avec au moins un lead ayant un email vérifié
        conditions.push(
          exists(
            db
              .select()
              .from(leads)
              .where(
                and(
                  eq(leads.companyId, companies.id),
                  eq(leads.userId, userId),
                  sql`${leads.emailVerifyEmaillist} IN ('ok', 'ok_for_all', 'valid')`
                )
              )
          )
        );
      } else if (verifiedEmail === "unverified") {
        // Entreprise sans lead ayant un email vérifié (tous les leads ont des emails non vérifiés ou pas d'email)
        conditions.push(
          sql`NOT EXISTS (
            SELECT 1 FROM ${leads}
            WHERE ${leads.companyId} = ${companies.id}
            AND ${leads.userId} = ${userId}
            AND ${leads.emailVerifyEmaillist} IN ('ok', 'ok_for_all', 'valid')
          )`
        );
      }
    }

    // Filtre par sources (enrichissements) - AND : l'entreprise doit avoir la source pour chaque mapperType
    const sourceTypeConditions = sourceTypes.map((mapperType) => {
      if (SOURCE_USE_ENTITY_SCRAPER_USAGES[mapperType] !== false) {
        return exists(
          db
            .select()
            .from(entityScraperUsages)
            .innerJoin(
              scrapers,
              eq(entityScraperUsages.scraperId, scrapers.id)
            )
            .where(
              and(
                eq(entityScraperUsages.entityType, "company"),
                eq(entityScraperUsages.entityId, companies.id),
                eq(entityScraperUsages.hasResult, true),
                eq(entityScraperUsages.userId, userId),
                eq(scrapers.mapperType, mapperType)
              )
            )
        );
      }
      if (mapperType === "trustpilot-reviews") {
        return exists(
          db
            .select()
            .from(trustpilotReviews)
            .where(eq(trustpilotReviews.companyId, companies.id))
        );
      }
      if (mapperType === "email-verify") {
        return exists(
          db
            .select()
            .from(leads)
            .where(
              and(
                eq(leads.companyId, companies.id),
                eq(leads.userId, userId),
                sql`${leads.emailVerifyEmaillist} IN ('ok', 'ok_for_all', 'valid')`
              )
            )
        );
      }
      return sql`true`;
    });

    if (sourceTypeConditions.length > 0) {
      conditions.push(and(...sourceTypeConditions)!);
    }

    if (scoreCategory) {
      conditions.push(buildCompanyScoreCategoryCondition(scoreCategory));
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
      .select({
        ...getTableColumns(companies),
        score: buildCompanyScoreSqlExpression(),
      })
      .from(companies)
      .where(whereCondition || undefined)
      .orderBy(companies.name)
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(totalItems / limit);

    const resultsWithScore = results.map((company) => {
      const score = typeof company.score === "number" ? company.score : 0;
      const { score: _s, ...rest } = company;
      return {
        ...rest,
        score,
        scoreCategory: getScoreCategory(score),
      };
    });

    return NextResponse.json({
      data: resultsWithScore,
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

// POST /api/companies - Créer une entreprise
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      website,
      domain,
      linkedinUrl,
      foundedYear,
      industry,
      size,
      description,
      specialities,
      city,
      state,
      country,
    } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Le nom de l'entreprise est obligatoire" },
        { status: 400 }
      );
    }

    // Normaliser le website (ajouter https:// si absent)
    const normalizedWebsite = normalizeWebsite(website);

    // Extraire le domaine : priorité domaine explicite, sinon depuis website
    let normalizedDomain = domain?.trim() ? extractDomain(domain) : null;
    if (!normalizedDomain && normalizedWebsite) {
      normalizedDomain = extractDomain(normalizedWebsite);
    }

    const insertData = {
      name: name.trim(),
      website: normalizedWebsite || null,
      domain: normalizedDomain || null,
      linkedinUrl: linkedinUrl?.trim() || null,
      foundedYear:
        foundedYear === null || foundedYear === ""
          ? null
          : parseInt(String(foundedYear), 10) || null,
      industry: industry?.trim() || null,
      size: size?.trim() || null,
      description: description?.trim() || null,
      specialities: (() => {
        let arr: string[] = [];
        if (Array.isArray(specialities)) {
          arr = specialities.filter((s) => s && typeof s === "string");
        } else if (typeof specialities === "string" && specialities.trim()) {
          arr = specialities.split(",").map((s) => s.trim()).filter(Boolean);
        }
        return arr.length > 0 ? arr : null;
      })(),
      city: city?.trim() || null,
      state: state?.trim() || null,
      country: country?.trim() || null,
    };

    const [created] = await db
      .insert(companies)
      .values(insertData)
      .returning();

    return NextResponse.json({ success: true, company: created });
  } catch (error) {
    console.error("Erreur lors de la création de l'entreprise:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}