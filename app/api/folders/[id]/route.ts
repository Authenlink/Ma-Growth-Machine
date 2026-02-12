import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { folders, collections } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

// GET /api/folders/[id] - Récupère un dossier avec ses collections
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
    const folderId = parseInt(id);
    const userId = parseInt(session.user.id);

    if (isNaN(folderId)) {
      return NextResponse.json(
        { error: "ID de dossier invalide" },
        { status: 400 }
      );
    }

    const folder = await db
      .select()
      .from(folders)
      .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
      .limit(1);

    if (folder.length === 0) {
      return NextResponse.json(
        { error: "Dossier non trouvé" },
        { status: 404 }
      );
    }

    const folderCollections = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.folderId, folderId),
          eq(collections.userId, userId)
        )
      )
      .orderBy(collections.createdAt);

    return NextResponse.json({
      ...folder[0],
      collections: folderCollections,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du dossier:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// PATCH /api/folders/[id] - Modifie un dossier
export async function PATCH(
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
    const folderId = parseInt(id);
    const userId = parseInt(session.user.id);

    if (isNaN(folderId)) {
      return NextResponse.json(
        { error: "ID de dossier invalide" },
        { status: 400 }
      );
    }

    const folder = await db
      .select()
      .from(folders)
      .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
      .limit(1);

    if (folder.length === 0) {
      return NextResponse.json(
        { error: "Dossier non trouvé" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    const updateData: { name?: string; description?: string | null } = {};
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Le nom du dossier ne peut pas être vide" },
          { status: 400 }
        );
      }
      if (name.length > 255) {
        return NextResponse.json(
          { error: "Le nom du dossier ne peut pas dépasser 255 caractères" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description =
        description === null || description === ""
          ? null
          : String(description).trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(folder[0]);
    }

    const [updatedFolder] = await db
      .update(folders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(folders.id, folderId))
      .returning();

    return NextResponse.json(updatedFolder);
  } catch (error) {
    console.error("Erreur lors de la modification du dossier:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// DELETE /api/folders/[id] - Supprime un dossier (cascade sur les collections)
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
    const folderId = parseInt(id);
    const userId = parseInt(session.user.id);

    if (isNaN(folderId)) {
      return NextResponse.json(
        { error: "ID de dossier invalide" },
        { status: 400 }
      );
    }

    const folder = await db
      .select()
      .from(folders)
      .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
      .limit(1);

    if (folder.length === 0) {
      return NextResponse.json(
        { error: "Dossier non trouvé" },
        { status: 404 }
      );
    }

    // Ne pas permettre la suppression du dossier Default
    if (folder[0].name === "Default") {
      return NextResponse.json(
        { error: "Le dossier Default ne peut pas être supprimé" },
        { status: 400 }
      );
    }

    await db.delete(folders).where(eq(folders.id, folderId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression du dossier:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
