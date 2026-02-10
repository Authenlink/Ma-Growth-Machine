import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collections, leads, companies, leadCollections } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";

// GET /api/collections/[id] - Récupère une collection spécifique avec ses leads
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
    const collectionId = parseInt(id);
    const searchParams = request.nextUrl.searchParams;

    // Paramètres de pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    if (isNaN(collectionId)) {
      return NextResponse.json(
        { error: "ID de collection invalide" },
        { status: 400 }
      );
    }

    // Vérifier que la collection appartient à l'utilisateur
    const collection = await db
      .select()
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (collection.length === 0) {
      return NextResponse.json(
        { error: "Collection non trouvée" },
        { status: 404 }
      );
    }

    if (collection[0].userId !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    const userId = parseInt(session.user.id);

    // Compter le nombre total de leads dans la collection (via lead_collections)
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leadCollections)
      .innerJoin(leads, eq(leadCollections.leadId, leads.id))
      .where(and(
        eq(leadCollections.collectionId, collectionId),
        eq(leads.userId, userId)
      ));

    const totalItems = Number(totalCountResult[0]?.count ?? 0);

    // Récupérer les leads de la collection via lead_collections
    const collectionLeads = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        firstName: leads.firstName,
        lastName: leads.lastName,
        position: leads.position,
        email: leads.email,
        linkedinUrl: leads.linkedinUrl,
        seniority: leads.seniority,
        functional: leads.functional,
        status: leads.status,
        validated: leads.validated,
        city: leads.city,
        state: leads.state,
        country: leads.country,
        company: {
          id: companies.id,
          name: companies.name,
          website: companies.website,
          industry: companies.industry,
          size: companies.size,
        },
        createdAt: leads.createdAt,
      })
      .from(leads)
      .innerJoin(leadCollections, and(
        eq(leadCollections.leadId, leads.id),
        eq(leadCollections.collectionId, collectionId)
      ))
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .where(eq(leads.userId, userId))
      .orderBy(leads.createdAt)
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(totalItems / limit);

    // Ajouter la collection courante à chaque lead (pour compatibilité avec LeadsTableView/LeadsCardView)
    const currentCollection = { id: collection[0].id, name: collection[0].name };
    const leadsWithCollection = collectionLeads.map((lead) => ({
      ...lead,
      collection: currentCollection,
      collections: [currentCollection],
    }));

    const response = {
      collection: collection[0],
      leads: {
        data: leadsWithCollection,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erreur lors de la récupération de la collection:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/[id] - Supprime une collection
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
    const collectionId = parseInt(id);

    if (isNaN(collectionId)) {
      return NextResponse.json(
        { error: "ID de collection invalide" },
        { status: 400 }
      );
    }

    // Vérifier que la collection appartient à l'utilisateur
    const collection = await db
      .select()
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (collection.length === 0) {
      return NextResponse.json(
        { error: "Collection non trouvée" },
        { status: 404 }
      );
    }

    if (collection[0].userId !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    // Supprimer la collection (les leads seront supprimés automatiquement grâce aux contraintes de clé étrangère)
    await db
      .delete(collections)
      .where(eq(collections.id, collectionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression de la collection:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}