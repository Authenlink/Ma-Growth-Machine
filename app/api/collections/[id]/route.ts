import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  collections,
  leads,
  companies,
  leadCollections,
  entityScraperUsages,
  scrapers,
  trustpilotReviews,
} from "@/lib/schema";
import { eq, and, sql, exists, isNotNull, ne } from "drizzle-orm";
import {
  FILTERABLE_SOURCE_TYPES,
  SOURCE_ENTITY_TYPE,
  SOURCE_USE_ENTITY_SCRAPER_USAGES,
} from "@/lib/source-types";
import { FILTERABLE_SCORE_CATEGORIES, getScoreCategory, type ScoreCategory } from "@/lib/score-types";
import {
  buildLeadScoreSqlExpression,
  buildLeadScoreCategoryCondition,
} from "@/lib/lead-scoring";

// GET /api/collections/[id] - Récupère une collection spécifique avec ses leads
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const collectionId = parseInt(id);
    const searchParams = request.nextUrl.searchParams;

    // Paramètres de pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const sourceTypesRaw = searchParams.getAll("sourceTypes");
    const sourceTypes = sourceTypesRaw
      .flatMap((s) => s.split(",").map((t) => t.trim()))
      .filter((t) => t && FILTERABLE_SOURCE_TYPES.includes(t));

    const scoreCategoryRaw = searchParams.get("scoreCategory");
    const scoreCategory: ScoreCategory | null =
      scoreCategoryRaw && FILTERABLE_SCORE_CATEGORIES.includes(scoreCategoryRaw as ScoreCategory)
        ? (scoreCategoryRaw as ScoreCategory)
        : null;

    if (isNaN(collectionId)) {
      return NextResponse.json(
        { error: "ID de collection invalide" },
        { status: 400 }
      );
    }

    // Vérifier que la collection appartient à l'utilisateur
    const collection = await db
      .select()
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (collection.length === 0) {
      return NextResponse.json(
        { error: "Collection non trouvée" },
        { status: 404 }
      );
    }

    if (collection[0].userId !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    const userId = parseInt(session.user.id);

    // Filtre par sources (enrichissements) - AND : le lead doit avoir la source pour chaque mapperType
    const sourceTypeConditions = sourceTypes.map((mapperType) => {
      if (SOURCE_USE_ENTITY_SCRAPER_USAGES[mapperType] !== false) {
        const entityType =
          SOURCE_ENTITY_TYPE[mapperType] ?? "lead";
        const entityIdColumn =
          entityType === "company" ? leads.companyId : leads.id;
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
                eq(entityScraperUsages.entityType, entityType),
                eq(entityScraperUsages.entityId, entityIdColumn),
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
            .where(eq(trustpilotReviews.companyId, leads.companyId))
        );
      }
      if (mapperType === "email-verify") {
        return sql`${leads.emailVerifyEmaillist} IN ('ok', 'ok_for_all', 'valid')`;
      }
      return sql`true`;
    });

    const baseWhereConditions = [
      eq(leadCollections.collectionId, collectionId),
      eq(leads.userId, userId),
    ];
    if (sourceTypeConditions.length > 0) {
      baseWhereConditions.push(and(...sourceTypeConditions)!);
    }
    if (scoreCategory) {
      baseWhereConditions.push(buildLeadScoreCategoryCondition(scoreCategory));
    }
    const whereCondition = and(...baseWhereConditions)!;

    // Compter le nombre total de leads dans la collection (via lead_collections)
    const countBase = db
      .select({ count: sql<number>`count(*)` })
      .from(leadCollections)
      .innerJoin(leads, eq(leadCollections.leadId, leads.id));

    const totalCountResult = await (scoreCategory
      ? countBase
          .leftJoin(companies, eq(leads.companyId, companies.id))
          .where(whereCondition)
      : countBase.where(whereCondition));

    const totalItems = Number(totalCountResult[0]?.count ?? 0);

    // Récupérer les leads de la collection via lead_collections
    const collectionLeads = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        firstName: leads.firstName,
        lastName: leads.lastName,
        position: leads.position,
        email: leads.email,
        emailCertainty: leads.emailCertainty,
        emailVerifyEmaillist: leads.emailVerifyEmaillist,
        linkedinUrl: leads.linkedinUrl,
        seniority: leads.seniority,
        functional: leads.functional,
        status: leads.status,
        validated: leads.validated,
        city: leads.city,
        state: leads.state,
        country: leads.country,
        score: buildLeadScoreSqlExpression(),
        company: {
          id: companies.id,
          name: companies.name,
          website: companies.website,
          industry: companies.industry,
          size: companies.size,
        },
        createdAt: leads.createdAt,
      })
      .from(leads)
      .innerJoin(leadCollections, and(
        eq(leadCollections.leadId, leads.id),
        eq(leadCollections.collectionId, collectionId)
      ))
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .where(whereCondition)
      .orderBy(leads.createdAt)
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(totalItems / limit);

    // Ajouter la collection courante à chaque lead (pour compatibilité avec LeadsTableView/LeadsCardView)
    const currentCollection = { id: collection[0].id, name: collection[0].name };
    const leadsWithCollection = collectionLeads.map((lead) => {
      const score = typeof lead.score === "number" ? lead.score : 0;
      return {
        ...lead,
        score,
        scoreCategory: getScoreCategory(score),
        collection: currentCollection,
        collections: [currentCollection],
      };
    });

    const response = {
      collection: collection[0],
      leads: {
        data: leadsWithCollection,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erreur lors de la récupération de la collection:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/[id] - Supprime une collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const collectionId = parseInt(id);

    if (isNaN(collectionId)) {
      return NextResponse.json(
        { error: "ID de collection invalide" },
        { status: 400 }
      );
    }

    // Vérifier que la collection appartient à l'utilisateur
    const collection = await db
      .select()
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (collection.length === 0) {
      return NextResponse.json(
        { error: "Collection non trouvée" },
        { status: 404 }
      );
    }

    if (collection[0].userId !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    // Supprimer la collection (les leads seront supprimés automatiquement grâce aux contraintes de clé étrangère)
    await db
      .delete(collections)
      .where(eq(collections.id, collectionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression de la collection:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}