import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/companies/[id] - Récupère une entreprise spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = parseInt(id);

    if (isNaN(companyId)) {
      return NextResponse.json(
        { error: "ID d'entreprise invalide" },
        { status: 400 }
      );
    }

    // Récupérer l'entreprise
    const result = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Entreprise non trouvée" },
        { status: 404 }
      );
    }

    const company = result[0];

    return NextResponse.json(company);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'entreprise:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// PATCH /api/companies/[id] - Mettre à jour une entreprise
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
    const companyId = parseInt(id);

    if (isNaN(companyId)) {
      return NextResponse.json(
        { error: "ID d'entreprise invalide" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      website,
      domain,
      linkedinUrl,
      foundedYear,
      industry,
      size,
      description,
      specialities,
      city,
      state,
      country,
    } = body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name ?? "";
    if (website !== undefined) updateData.website = website || null;
    if (domain !== undefined) updateData.domain = domain || null;
    if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl || null;
    if (foundedYear !== undefined) updateData.foundedYear = foundedYear === null || foundedYear === "" ? null : parseInt(String(foundedYear), 10) || null;
    if (industry !== undefined) updateData.industry = industry || null;
    if (size !== undefined) updateData.size = size || null;
    if (description !== undefined) updateData.description = description || null;
    if (specialities !== undefined) updateData.specialities = specialities || null;
    if (city !== undefined) updateData.city = city || null;
    if (state !== undefined) updateData.state = state || null;
    if (country !== undefined) updateData.country = country || null;

    const updatedCompany = await db
      .update(companies)
      .set(updateData as typeof companies.$inferInsert)
      .where(eq(companies.id, companyId))
      .returning();

    if (updatedCompany.length === 0) {
      return NextResponse.json(
        { error: "Entreprise non trouvée" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedCompany[0]);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'entreprise:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
