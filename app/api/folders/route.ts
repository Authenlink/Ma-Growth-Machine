import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { folders, collections, leadCollections } from "@/lib/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { ensureDefaultFolder } from "@/lib/folders";

// GET /api/folders - Liste tous les dossiers de l'utilisateur avec leurs collections
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

    // S'assurer que le dossier et la collection Default existent (pour nouveaux utilisateurs)
    await ensureDefaultFolder(userId);

    const userFolders = await db
      .select()
      .from(folders)
      .where(eq(folders.userId, userId))
      .orderBy(folders.createdAt);

    // Récupérer les collections pour chaque dossier
    const foldersWithCollections = await Promise.all(
      userFolders.map(async (folder) => {
        const folderCollections = await db
          .select()
          .from(collections)
          .where(
            and(
              eq(collections.folderId, folder.id),
              eq(collections.userId, userId)
            )
          )
          .orderBy(collections.createdAt);

        // Récupérer le nombre de leads par collection
        const collectionIds = folderCollections.map((c) => c.id);
        const leadCounts =
          collectionIds.length > 0
            ? await db
                .select({
                  collectionId: leadCollections.collectionId,
                  count: sql<number>`count(*)::int`,
                })
                .from(leadCollections)
                .where(inArray(leadCollections.collectionId, collectionIds))
                .groupBy(leadCollections.collectionId)
            : [];

        const countByCollection = Object.fromEntries(
          leadCounts.map((r) => [r.collectionId, r.count])
        );

        const collectionsWithLeadCount = folderCollections.map((c) => ({
          ...c,
          leadCount: countByCollection[c.id] ?? 0,
        }));

        return {
          ...folder,
          collections: collectionsWithLeadCount,
        };
      })
    );

    return NextResponse.json(foldersWithCollections);
  } catch (error) {
    console.error("Erreur lors de la récupération des dossiers:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// POST /api/folders - Crée un nouveau dossier
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
        { error: "Le nom du dossier est requis" },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: "Le nom du dossier ne peut pas dépasser 255 caractères" },
        { status: 400 }
      );
    }

    const newFolder = await db
      .insert(folders)
      .values({
        userId: parseInt(session.user.id),
        name: name.trim(),
        description: description?.trim() || null,
      })
      .returning();

    return NextResponse.json(newFolder[0], { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du dossier:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
