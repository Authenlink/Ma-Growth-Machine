import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, companies, collections, leadCollections } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/companies/[id]/leads - Récupère tous les leads d'une entreprise pour l'utilisateur connecté
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
    const userId = parseInt(session.user.id);
    const companyId = parseInt(id);

    if (isNaN(companyId)) {
      return NextResponse.json(
        { error: "ID d'entreprise invalide" },
        { status: 400 }
      );
    }

    // Vérifier que l'entreprise existe
    const companyExists = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (companyExists.length === 0) {
      return NextResponse.json(
        { error: "Entreprise non trouvée" },
        { status: 404 }
      );
    }

    // Récupérer tous les leads de l'entreprise pour l'utilisateur connecté
    const leadResults = await db
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
        createdAt: leads.createdAt,
        company: {
          id: companies.id,
          name: companies.name,
          website: companies.website,
          industry: companies.industry,
          size: companies.size,
        },
      })
      .from(leads)
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .where(and(eq(leads.companyId, companyId), eq(leads.userId, userId)))
      .orderBy(desc(leads.createdAt));

    // Récupérer les collections pour chaque lead
    const resultsWithCollections = await Promise.all(
      leadResults.map(async (lead) => {
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
            .where(and(eq(leadCollections.leadId, lead.id), eq(collections.userId, userId)));

          collectionsData = leadCollectionsResult;
        } catch (error) {
          // Fallback vers l'ancien système
          console.log("Table leadCollections non trouvée, utilisation de l'ancien système");
          try {
            const leadWithCollection = await db
              .select({ collectionId: leads.collectionId })
              .from(leads)
              .where(eq(leads.id, lead.id))
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

        return {
          ...lead,
          collections: collectionsData,
          // Garder la compatibilité avec l'ancien format (première collection)
          collection: collectionsData.length > 0 ? collectionsData[0] : null,
        };
      })
    );

    return NextResponse.json(resultsWithCollections);
  } catch (error) {
    console.error("Erreur lors de la récupération des leads de l'entreprise:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
