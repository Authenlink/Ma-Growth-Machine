import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scrapers } from "@/lib/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/scrapers - Liste tous les scrapers actifs
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const activeScrapers = await db
      .select({
        id: scrapers.id,
        name: scrapers.name,
        description: scrapers.description,
        provider: scrapers.provider,
        mapperType: scrapers.mapperType,
        source: scrapers.source,
        infoType: scrapers.infoType,
        toolUrl: scrapers.toolUrl,
        paymentType: scrapers.paymentType,
        costPerThousand: scrapers.costPerThousand,
        costPerLead: scrapers.costPerLead,
        actorStartCost: scrapers.actorStartCost,
        freeQuotaMonthly: scrapers.freeQuotaMonthly,
        pricingTiers: scrapers.pricingTiers,
        usesAi: scrapers.usesAi,
      })
      .from(scrapers)
      .where(eq(scrapers.isActive, true));

    return NextResponse.json(activeScrapers);
  } catch (error) {
    console.error(
      "[Scrapers] Erreur lors de la récupération des scrapers:",
      error,
    );
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des scrapers",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
