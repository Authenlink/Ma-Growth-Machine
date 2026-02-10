import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  leads,
  collections,
  leadCollections,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";

// POST /api/leads/[id]/collections - Ajouter un lead à une collection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(session.user.id);
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: "ID de lead invalide" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { collectionId } = body;

    if (!collectionId || isNaN(parseInt(collectionId))) {
      return NextResponse.json(
        { error: "ID de collection invalide" },
        { status: 400 },
      );
    }

    const collectionIdNum = parseInt(collectionId);

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

    // Ajouter la relation (avec gestion des doublons)
    try {
      await db.insert(leadCollections).values({
        leadId,
        collectionId: collectionIdNum,
      }).onConflictDoNothing({
        target: [leadCollections.leadId, leadCollections.collectionId],
      });

      return NextResponse.json({ message: "Lead ajouté à la collection" });
    } catch (error) {
      // Si la table n'existe pas encore, utiliser l'ancien système
      console.log("Table leadCollections non trouvée, tentative de mise à jour de leads.collectionId");
      await db
        .update(leads)
        .set({ collectionId: collectionIdNum, updatedAt: new Date() })
        .where(eq(leads.id, leadId));

      return NextResponse.json({ message: "Lead ajouté à la collection (ancien système)" });
    }
  } catch (error) {
    console.error("Erreur lors de l'ajout du lead à la collection:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}

// GET /api/leads/[id]/collections - Récupérer toutes les collections d'un lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(session.user.id);
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: "ID de lead invalide" },
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

    // Récupérer toutes les collections du lead
    let collectionsData: { id: number; name: string }[] = [];

    try {
      // Essayer la nouvelle table leadCollections
      const leadCollectionsResult = await db
        .select({
          id: collections.id,
          name: collections.name,
        })
        .from(leadCollections)
        .innerJoin(collections, eq(leadCollections.collectionId, collections.id))
        .where(and(eq(leadCollections.leadId, leadId), eq(collections.userId, userId)));

      collectionsData = leadCollectionsResult;
    } catch (error) {
      // Fallback vers l'ancien système
      console.log("Table leadCollections non trouvée, utilisation de l'ancien système");
      try {
        const leadWithCollection = await db
          .select({ collectionId: leads.collectionId })
          .from(leads)
          .where(eq(leads.id, leadId))
          .limit(1);

        if (leadWithCollection.length > 0 && leadWithCollection[0].collectionId) {
          const oldCollectionResult = await db
            .select({
              id: collections.id,
              name: collections.name,
            })
            .from(collections)
            .where(eq(collections.id, leadWithCollection[0].collectionId));

          collectionsData = oldCollectionResult;
        }
      } catch (fallbackError) {
        console.error("Erreur lors de la récupération des collections:", fallbackError);
        collectionsData = [];
      }
    }

    return NextResponse.json({ collections: collectionsData });
  } catch (error) {
    console.error("Erreur lors de la récupération des collections du lead:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}