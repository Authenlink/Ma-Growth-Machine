import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  collections,
  leads,
  companies,
  leadCollections,
} from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";

function normalizeEmail(email: string | null): string | null {
  if (!email || email.trim() === "") return null;
  return email.trim().toLowerCase();
}

/**
 * Score un lead pour décider lequel garder (plus haut = mieux)
 * - a un email: +2
 * - validé: +1
 * - createdAt plus récent: ordre secondaire
 */
function scoreLead(lead: {
  email: string | null;
  validated: boolean;
  createdAt: Date;
}): number {
  let score = 0;
  if (normalizeEmail(lead.email)) score += 2;
  if (lead.validated) score += 1;
  return score;
}

// POST /api/collections/[id]/clean-duplicates - Nettoie les doublons
export async function POST(
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

    const body = await request.json().catch(() => ({}));
    const strategy = body.strategy as "byEmail" | "byCompany" | undefined;
    if (!strategy || !["byEmail", "byCompany"].includes(strategy)) {
      return NextResponse.json(
        { error: "Strategy invalide. Utilisez 'byEmail' ou 'byCompany'." },
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
      .where(eq(leads.userId, userId));

    let leadIdsToRemoveFromCollection: number[] = [];

    if (strategy === "byEmail") {
      const byEmailMap = new Map<string, typeof collectionLeads>();
      for (const lead of collectionLeads) {
        const normalized = normalizeEmail(lead.email);
        if (!normalized) continue;
        const list = byEmailMap.get(normalized) ?? [];
        list.push(lead);
        byEmailMap.set(normalized, list);
      }
      for (const [, list] of byEmailMap) {
        if (list.length <= 1) continue;
        const sorted = [...list].sort((a, b) => {
          const scoreA = scoreLead(a);
          const scoreB = scoreLead(b);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        const toKeep = sorted[0]!;
        const toRemove = list.filter((l) => l.id !== toKeep.id);
        leadIdsToRemoveFromCollection.push(
          ...toRemove.map((l) => l.id)
        );
      }
    } else {
      // byCompany
      const byCompanyMap = new Map<number, typeof collectionLeads>();
      for (const lead of collectionLeads) {
        if (lead.companyId == null) continue;
        const list = byCompanyMap.get(lead.companyId) ?? [];
        list.push(lead);
        byCompanyMap.set(lead.companyId, list);
      }
      for (const [, list] of byCompanyMap) {
        if (list.length <= 1) continue;
        const sorted = [...list].sort((a, b) => {
          const scoreA = scoreLead(a);
          const scoreB = scoreLead(b);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        const toKeep = sorted[0]!;
        const toRemove = list.filter((l) => l.id !== toKeep.id);
        leadIdsToRemoveFromCollection.push(
          ...toRemove.map((l) => l.id)
        );
      }
    }

    if (leadIdsToRemoveFromCollection.length === 0) {
      return NextResponse.json({
        success: true,
        removed: 0,
        message: "Aucun doublon à supprimer.",
      });
    }

    // Supprimer les doublons de la collection (retirer l'association lead_collections)
    await db
      .delete(leadCollections)
      .where(
        and(
          eq(leadCollections.collectionId, collectionId),
          inArray(leadCollections.leadId, leadIdsToRemoveFromCollection)
        )
      );

    return NextResponse.json({
      success: true,
      removed: leadIdsToRemoveFromCollection.length,
      message: `${leadIdsToRemoveFromCollection.length} doublon(s) retiré(s) de la collection.`,
    });
  } catch (error) {
    console.error("Erreur lors du nettoyage des doublons:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
