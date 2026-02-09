import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collections } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/collections - Liste toutes les collections de l'utilisateur
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const userCollections = await db
      .select()
      .from(collections)
      .where(eq(collections.userId, parseInt(session.user.id)))
      .orderBy(collections.createdAt);

    return NextResponse.json(userCollections);
  } catch (error) {
    console.error("Erreur lors de la récupération des collections:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// POST /api/collections - Crée une nouvelle collection
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
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Le nom de la collection est requis" },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: "Le nom de la collection ne peut pas dépasser 255 caractères" },
        { status: 400 }
      );
    }

    const newCollection = await db
      .insert(collections)
      .values({
        userId: parseInt(session.user.id),
        name: name.trim(),
        description: description?.trim() || null,
      })
      .returning();

    return NextResponse.json(newCollection[0], { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la collection:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
