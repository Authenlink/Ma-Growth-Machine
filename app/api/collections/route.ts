import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collections, folders } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { ensureDefaultFolder } from "@/lib/folders";

// GET /api/collections - Liste toutes les collections de l'utilisateur (optionnel: ?folderId=X)
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

    // S'assurer que le dossier et la collection Default existent (pour nouveaux utilisateurs)
    const { defaultCollectionId } = await ensureDefaultFolder(userId);

    const folderIdParam = request.nextUrl.searchParams.get("folderId");
    const folderId = folderIdParam ? parseInt(folderIdParam) : null;

    const conditions = [eq(collections.userId, userId)];
    if (folderId !== null && !isNaN(folderId)) {
      conditions.push(eq(collections.folderId, folderId));
    }

    const userCollections = await db
      .select({
        id: collections.id,
        userId: collections.userId,
        folderId: collections.folderId,
        name: collections.name,
        description: collections.description,
        createdAt: collections.createdAt,
        updatedAt: collections.updatedAt,
        folderName: folders.name,
      })
      .from(collections)
      .leftJoin(folders, eq(collections.folderId, folders.id))
      .where(and(...conditions))
      .orderBy(collections.createdAt);

    // Ajouter isDefault pour identifier la collection "officielle" (utilisée par défaut)
    const collectionsWithDefault = userCollections.map((c) => ({
      ...c,
      isDefault: c.id === defaultCollectionId,
    }));

    return NextResponse.json(collectionsWithDefault);
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
    const { name, description, folderId } = body;

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

    const userId = parseInt(session.user.id);

    // Utiliser le dossier Default si folderId n'est pas fourni
    let targetFolderId: number | null = null;
    if (folderId !== undefined && folderId !== null) {
      const parsed = parseInt(String(folderId));
      targetFolderId = !isNaN(parsed) ? parsed : null;
    }
    if (targetFolderId === null) {
      const { folderId: defaultFolderId } = await ensureDefaultFolder(userId);
      targetFolderId = defaultFolderId;
    }

    const newCollection = await db
      .insert(collections)
      .values({
        userId,
        folderId: targetFolderId,
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
