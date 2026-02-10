import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collections, leads, companies, leadCollections } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import * as Papa from "papaparse";

// GET /api/collections/[id]/export - Exporte tous les leads d'une collection en CSV
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

    // Récupérer tous les leads de la collection via lead_collections
    const collectionLeads = await db
      .select({
        // Informations personnelles
        id: leads.id,
        personId: leads.personId,
        fullName: leads.fullName,
        firstName: leads.firstName,
        lastName: leads.lastName,
        position: leads.position,
        linkedinUrl: leads.linkedinUrl,
        seniority: leads.seniority,
        functional: leads.functional,
        // Contact
        email: leads.email,
        personalEmail: leads.personalEmail,
        phoneNumbers: leads.phoneNumbers,
        city: leads.city,
        state: leads.state,
        country: leads.country,
        // Marketing
        companyLinkedinPost: leads.companyLinkedinPost,
        personLinkedinPost: leads.personLinkedinPost,
        iceBreaker: leads.iceBreaker,
        status: leads.status,
        validated: leads.validated,
        reason: leads.reason,
        // Entreprise
        companyId: companies.id,
        companyName: companies.name,
        companyWebsite: companies.website,
        companyLinkedinUrl: companies.linkedinUrl,
        companyIndustry: companies.industry,
        companySize: companies.size,
        companyCity: companies.city,
        companyState: companies.state,
        companyCountry: companies.country,
        companyDescription: companies.description,
        companyFoundedYear: companies.foundedYear,
        companySpecialities: companies.specialities,
        // Métadonnées
        collectionName: collections.name,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
      })
      .from(leads)
      .innerJoin(leadCollections, and(
        eq(leadCollections.leadId, leads.id),
        eq(leadCollections.collectionId, collectionId),
      ))
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .leftJoin(collections, eq(leadCollections.collectionId, collections.id))
      .where(eq(leads.userId, parseInt(session.user.id)))
      .orderBy(leads.createdAt);

    // Transformer les données en format plat pour le CSV
    const csvData = collectionLeads.map((lead) => {
      // Convertir phoneNumbers (array JSONB) en string
      let phoneNumbersStr = "";
      if (lead.phoneNumbers && Array.isArray(lead.phoneNumbers)) {
        phoneNumbersStr = lead.phoneNumbers.join("; ");
      }

      // Convertir companySpecialities (array JSONB) en string
      let companySpecialitiesStr = "";
      if (lead.companySpecialities && Array.isArray(lead.companySpecialities)) {
        companySpecialitiesStr = lead.companySpecialities.join("; ");
      }

      // Convertir validated en string "true"/"false"
      const validatedStr = lead.validated ? "true" : "false";

      // Formater les dates
      const createdAtStr = lead.createdAt
        ? new Date(lead.createdAt).toISOString()
        : "";
      const updatedAtStr = lead.updatedAt
        ? new Date(lead.updatedAt).toISOString()
        : "";

      return {
        // Informations personnelles
        id: lead.id?.toString() || "",
        personId: lead.personId || "",
        fullName: lead.fullName || "",
        firstName: lead.firstName || "",
        lastName: lead.lastName || "",
        position: lead.position || "",
        linkedinUrl: lead.linkedinUrl || "",
        seniority: lead.seniority || "",
        functional: lead.functional || "",
        // Contact
        email: lead.email || "",
        personalEmail: lead.personalEmail || "",
        phoneNumbers: phoneNumbersStr,
        city: lead.city || "",
        state: lead.state || "",
        country: lead.country || "",
        // Informations entreprise
        companyId: lead.companyId?.toString() || "",
        companyName: lead.companyName || "",
        companyWebsite: lead.companyWebsite || "",
        companyLinkedinUrl: lead.companyLinkedinUrl || "",
        companyIndustry: lead.companyIndustry || "",
        companySize: lead.companySize || "",
        companyCity: lead.companyCity || "",
        companyState: lead.companyState || "",
        companyCountry: lead.companyCountry || "",
        companyDescription: lead.companyDescription || "",
        companyFoundedYear: lead.companyFoundedYear?.toString() || "",
        companySpecialities: companySpecialitiesStr,
        // Marketing
        companyLinkedinPost: lead.companyLinkedinPost || "",
        personLinkedinPost: lead.personLinkedinPost || "",
        iceBreaker: lead.iceBreaker || "",
        status: lead.status || "",
        validated: validatedStr,
        reason: lead.reason || "",
        // Métadonnées
        collectionName: lead.collectionName || "",
        createdAt: createdAtStr,
        updatedAt: updatedAtStr,
      };
    });

    // Générer le CSV avec papaparse
    const csv = Papa.unparse(csvData, {
      header: true,
      delimiter: ",",
      newline: "\n",
    });

    // Ajouter le BOM UTF-8 pour une meilleure compatibilité avec Excel/Google Sheets
    const csvWithBOM = "\uFEFF" + csv;

    // Créer le nom du fichier avec timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const sanitizedName = collection[0].name.replace(/[^a-z0-9]/gi, "_");
    const filename = `collection-${sanitizedName}-${timestamp}.csv`;

    // Retourner le CSV avec les headers appropriés
    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'export:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
