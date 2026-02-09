import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/campaigns - Liste toutes les campagnes de l'utilisateur
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const userCampaigns = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, parseInt(session.user.id)))
      .orderBy(campaigns.createdAt);

    return NextResponse.json(userCampaigns);
  } catch (error) {
    console.error("Erreur lors de la récupération des campagnes:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Crée une nouvelle campagne
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
    const { name, description, status } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Le nom de la campagne est requis" },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: "Le nom de la campagne ne peut pas dépasser 255 caractères" },
        { status: 400 }
      );
    }

    const validStatuses = ["draft", "active", "paused", "completed"];
    const campaignStatus = status && validStatuses.includes(status) ? status : "draft";

    const newCampaign = await db
      .insert(campaigns)
      .values({
        userId: parseInt(session.user.id),
        name: name.trim(),
        description: description?.trim() || null,
        status: campaignStatus,
      })
      .returning();

    return NextResponse.json(newCampaign[0], { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la campagne:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
