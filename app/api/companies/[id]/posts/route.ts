import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companies, companyPosts } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/companies/[id]/posts
 * Récupère les posts LinkedIn d'une entreprise (company_posts)
 * Query: limit (défaut 50), offset (défaut 0)
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
      parseInt(searchParams.get("limit") || "50", 10) || 50,
      100
    );
    const offset = Math.max(
      parseInt(searchParams.get("offset") || "0", 10) || 0,
      0
    );

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

    const posts = await db
      .select({
        id: companyPosts.id,
        postUrl: companyPosts.postUrl,
        postedDate: companyPosts.postedDate,
        author: companyPosts.author,
        text: companyPosts.text,
        reactions: companyPosts.reactions,
        like: companyPosts.like,
        language: companyPosts.language,
      })
      .from(companyPosts)
      .where(eq(companyPosts.companyId, companyId))
      .orderBy(desc(companyPosts.postedDate))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(posts);
  } catch (error) {
    console.error("Erreur lors de la récupération des posts:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
