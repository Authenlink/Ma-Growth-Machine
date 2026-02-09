import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scrapers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/scrapers/[scraperId] - Récupère les détails d'un scraper
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scraperId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { scraperId: scraperIdParam } = await params;
    const scraperId = parseInt(scraperIdParam);

    if (isNaN(scraperId)) {
      return NextResponse.json(
        { error: "ID de scraper invalide" },
        { status: 400 }
      );
    }

    const scraper = await db
      .select()
      .from(scrapers)
      .where(
        and(
          eq(scrapers.id, scraperId),
          eq(scrapers.isActive, true)
        )
      )
      .limit(1);

    if (scraper.length === 0) {
      return NextResponse.json(
        { error: "Scraper non trouvé ou inactif" },
        { status: 404 }
      );
    }

    return NextResponse.json(scraper[0]);
  } catch (error) {
    console.error(
      "[Scrapers] Erreur lors de la récupération du scraper:",
      error
    );
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération du scraper",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
