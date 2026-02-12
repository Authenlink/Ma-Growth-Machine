import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  collections,
  leads,
  companies,
  leadCollections,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";

function normalizeEmail(email: string | null): string | null {
  if (!email || email.trim() === "") return null;
  return email.trim().toLowerCase();
}

// GET /api/collections/[id]/duplicates - Analyse les doublons dans une collection
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
    const userId = parseInt(session.user.id);

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
      .where(
        and(
          eq(collections.id, collectionId),
          eq(collections.userId, userId)
        )
      )
      .limit(1);

    if (collection.length === 0) {
      return NextResponse.json(
        { error: "Collection non trouvée ou accès non autorisé" },
        { status: 404 }
      );
    }

    // Récupérer tous les leads de la collection (sans pagination)
    const collectionLeads = await db
      .select({
        id: leads.id,
        email: leads.email,
        validated: leads.validated,
        companyId: leads.companyId,
        companyName: companies.name,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .innerJoin(
        leadCollections,
        and(
          eq(leadCollections.leadId, leads.id),
          eq(leadCollections.collectionId, collectionId)
        )
      )
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .where(eq(leads.userId, userId))
      .orderBy(leads.createdAt);

    // Grouper par email (normalisé)
    const byEmailMap = new Map<string, typeof collectionLeads>();
    for (const lead of collectionLeads) {
      const normalized = normalizeEmail(lead.email);
      if (!normalized) continue;
      const list = byEmailMap.get(normalized) ?? [];
      list.push(lead);
      byEmailMap.set(normalized, list);
    }

    // Grouper par entreprise
    const byCompanyMap = new Map<
      number,
      (typeof collectionLeads)[0][]
    >();
    for (const lead of collectionLeads) {
      if (lead.companyId == null) continue;
      const list = byCompanyMap.get(lead.companyId) ?? [];
      list.push(lead);
      byCompanyMap.set(lead.companyId, list);
    }

    // Filtrer uniquement les groupes avec doublons (2+)
    const byEmailGroups = Array.from(byEmailMap.entries())
      .filter(([, list]) => list.length > 1)
      .map(([email, list]) => ({
        email,
        leadIds: list.map((l) => l.id),
        count: list.length,
      }));

    const byCompanyGroups = Array.from(byCompanyMap.entries())
      .filter(([, list]) => list.length > 1)
      .map(([companyId, list]) => ({
        companyId,
        companyName: list[0]?.companyName ?? "—",
        leadIds: list.map((l) => l.id),
        count: list.length,
      }));

    const byEmailStats = {
      groupsCount: byEmailGroups.length,
      totalDuplicates: byEmailGroups.reduce((sum, g) => sum + g.count - 1, 0),
      groups: byEmailGroups,
    };

    const byCompanyStats = {
      groupsCount: byCompanyGroups.length,
      totalDuplicates: byCompanyGroups.reduce((sum, g) => sum + g.count - 1, 0),
      groups: byCompanyGroups,
    };

    return NextResponse.json({
      byEmail: byEmailStats,
      byCompany: byCompanyStats,
      totalLeads: collectionLeads.length,
    });
  } catch (error) {
    console.error("Erreur lors de l'analyse des doublons:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
