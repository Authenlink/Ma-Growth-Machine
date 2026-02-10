import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  leads,
  collections,
  leadCollections,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";

// DELETE /api/leads/[id]/collections/[collectionId] - Supprimer un lead d'une collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collectionId: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id, collectionId } = await params;
    const userId = parseInt(session.user.id);
    const leadId = parseInt(id);
    const collectionIdNum = parseInt(collectionId);

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: "ID de lead invalide" },
        { status: 400 },
      );
    }

    if (isNaN(collectionIdNum)) {
      return NextResponse.json(
        { error: "ID de collection invalide" },
        { status: 400 },
      );
    }

    // Vérifier que le lead existe et appartient à l'utilisateur
    const existingLead = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
      .limit(1);

    if (existingLead.length === 0) {
      return NextResponse.json({ error: "Lead non trouvé" }, { status: 404 });
    }

    // Vérifier que la collection existe et appartient à l'utilisateur
    const existingCollection = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionIdNum), eq(collections.userId, userId)))
      .limit(1);

    if (existingCollection.length === 0) {
      return NextResponse.json({ error: "Collection non trouvée" }, { status: 404 });
    }

    // Supprimer la relation
    try {
      const deleted = await db
        .delete(leadCollections)
        .where(and(
          eq(leadCollections.leadId, leadId),
          eq(leadCollections.collectionId, collectionIdNum)
        ))
        .returning({ id: leadCollections.id });

      if (deleted.length === 0) {
        return NextResponse.json({ error: "Relation non trouvée" }, { status: 404 });
      }

      return NextResponse.json({ message: "Lead retiré de la collection" });
    } catch (error) {
      // Si la table n'existe pas encore
      return NextResponse.json(
        { error: "Système de collections multiples non disponible" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Erreur lors de la suppression du lead de la collection:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}