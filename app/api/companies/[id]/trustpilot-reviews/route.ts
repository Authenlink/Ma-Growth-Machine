import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companies, trustpilotReviews } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";

/**
 * GET /api/companies/[id]/trustpilot-reviews
 * Récupère les avis Trustpilot d'une entreprise avec stats et pagination
 * Query: limit (défaut 10), offset (défaut 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = parseInt(id);
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "10", 10) || 10,
      100
    );
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

    if (isNaN(companyId)) {
      return NextResponse.json(
        { error: "ID d'entreprise invalide" },
        { status: 400 }
      );
    }

    const company = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (company.length === 0) {
      return NextResponse.json(
        { error: "Entreprise non trouvée" },
        { status: 404 }
      );
    }

    const [statsResult] = await db
      .select({
        count: sql<number>`count(*)::int`,
        averageRating: sql<number>`coalesce(avg(${trustpilotReviews.rating}), 0)`,
      })
      .from(trustpilotReviews)
      .where(eq(trustpilotReviews.companyId, companyId));

    const reviews = await db
      .select({
        id: trustpilotReviews.id,
        trustpilotId: trustpilotReviews.trustpilotId,
        rating: trustpilotReviews.rating,
        publishedDate: trustpilotReviews.publishedDate,
        title: trustpilotReviews.title,
        body: trustpilotReviews.body,
        createdAt: trustpilotReviews.createdAt,
      })
      .from(trustpilotReviews)
      .where(eq(trustpilotReviews.companyId, companyId))
      .orderBy(desc(trustpilotReviews.publishedDate), desc(trustpilotReviews.createdAt))
      .limit(limit)
      .offset(offset);

    const stats = {
      count: statsResult?.count ?? 0,
      averageRating: statsResult?.averageRating ?? 0,
    };

    return NextResponse.json({
      data: reviews,
      stats,
      hasMore: stats.count > offset + reviews.length,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des avis Trustpilot:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
