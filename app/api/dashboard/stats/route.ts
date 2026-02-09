import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, companies, collections, campaigns } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

// GET /api/dashboard/stats - Retourne les 4 KPIs pour l'utilisateur connecté
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);

    // Compter les leads de l'utilisateur
    const leadsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.userId, userId));

    // Compter toutes les companies (partagées entre utilisateurs)
    const companiesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(companies);

    // Compter les collections de l'utilisateur
    const collectionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(collections)
      .where(eq(collections.userId, userId));

    // Compter les campagnes de l'utilisateur
    const campaignsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(eq(campaigns.userId, userId));

    return NextResponse.json({
      leads: Number(leadsResult[0]?.count || 0),
      companies: Number(companiesResult[0]?.count || 0),
      collections: Number(collectionsResult[0]?.count || 0),
      campaigns: Number(campaignsResult[0]?.count || 0),
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des stats:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
