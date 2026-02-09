import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, companies, collections } from "@/lib/schema";
import { eq, and, or, like, desc, sql } from "drizzle-orm";

// GET /api/leads - Liste tous les leads de l'utilisateur avec filtres
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const searchParams = request.nextUrl.searchParams;

    // Récupérer les paramètres de filtres
    const collectionId = searchParams.get("collectionId");
    const companyName = searchParams.get("companyName");
    const leadName = searchParams.get("leadName");
    const seniority = searchParams.get("seniority");
    const functional = searchParams.get("functional");
    const position = searchParams.get("position");
    const status = searchParams.get("status");
    const validated = searchParams.get("validated");

    // Paramètres de pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Construire les conditions de filtrage
    const conditions = [eq(leads.userId, userId)];

    // Filtre par collection
    if (collectionId) {
      conditions.push(eq(leads.collectionId, parseInt(collectionId)));
    }

    // Filtre par nom de lead (recherche dans fullName, firstName, lastName)
    if (leadName && leadName.trim() !== "") {
      const leadNamePattern = `%${leadName.trim()}%`;
      const nameConditions = [];
      nameConditions.push(sql`${leads.fullName} ILIKE ${leadNamePattern}`);
      nameConditions.push(sql`${leads.firstName} ILIKE ${leadNamePattern}`);
      nameConditions.push(sql`${leads.lastName} ILIKE ${leadNamePattern}`);
      conditions.push(or(...nameConditions)!);
    }

    // Filtre par seniority
    if (seniority && seniority.trim() !== "") {
      conditions.push(eq(leads.seniority, seniority));
    }

    // Filtre par functional
    if (functional && functional.trim() !== "") {
      conditions.push(eq(leads.functional, functional));
    }

    // Filtre par position
    if (position && position.trim() !== "") {
      conditions.push(like(leads.position, `%${position.trim()}%`));
    }

    // Filtre par status
    if (status && status.trim() !== "") {
      conditions.push(eq(leads.status, status));
    }

    // Filtre par validated
    if (validated !== null && validated !== undefined && validated !== "") {
      conditions.push(eq(leads.validated, validated === "true"));
    }

    // Filtre par nom d'entreprise (sera ajouté après le join)
    let companyNameCondition = undefined;
    if (companyName && companyName.trim() !== "") {
      const companyNamePattern = `%${companyName.trim()}%`;
      companyNameCondition = sql`${companies.name} ILIKE ${companyNamePattern}`;
    }

    // Construire la condition where finale
    const whereConditions = [];
    if (conditions.length > 0) {
      whereConditions.push(and(...conditions)!);
    }
    if (companyNameCondition) {
      whereConditions.push(companyNameCondition);
    }

    const finalWhereCondition = whereConditions.length > 0
      ? (whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)!)
      : undefined;

    // Compter le nombre total d'éléments
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .leftJoin(collections, eq(leads.collectionId, collections.id));

    if (finalWhereCondition) {
      countQuery.where(finalWhereCondition);
    }

    const totalCountResult = await countQuery;
    const totalItems = totalCountResult[0]?.count || 0;

    // Requête avec joins pour récupérer les leads avec leurs entreprises et collections
    let query = db
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
        collection: {
          id: collections.id,
          name: collections.name,
        },
      })
      .from(leads)
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .leftJoin(collections, eq(leads.collectionId, collections.id));

    // Appliquer toutes les conditions et ordonner par date de création (plus récent en premier) et appliquer la pagination
    const results = await query
      .where(finalWhereCondition || undefined)
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      data: results,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des leads:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

/**
 * Extrait le domaine d'une URL ou retourne la valeur si c'est déjà un domaine
 */
function extractDomain(urlOrDomain?: string): string | null {
  if (!urlOrDomain || urlOrDomain.trim() === "") {
    return null;
  }

  const cleaned = urlOrDomain.trim();

  // Si c'est déjà un domaine simple (ex: "example.com"), le retourner
  if (!cleaned.includes("://") && !cleaned.startsWith("www.")) {
    return cleaned;
  }

  try {
    // Essayer de parser comme URL
    const url = new URL(cleaned.startsWith("http") ? cleaned : `https://${cleaned}`);
    return url.hostname.replace(/^www\./, ""); // Retirer www. si présent
  } catch {
    // Si l'URL n'est pas valide, essayer d'extraire le domaine manuellement
    const match = cleaned.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    return match ? match[1] : cleaned;
  }
}

/**
 * Crée ou récupère une company dans la DB
 */
async function getOrCreateCompany(
  companyName: string,
  companyDomain?: string,
  companyLinkedinUrl?: string
): Promise<number | null> {
  if (!companyName || companyName.trim() === "") {
    return null;
  }

  // Normaliser le domaine si fourni
  const normalizedDomain = companyDomain ? extractDomain(companyDomain) : null;

  // Chercher une company existante par nom, domaine ou URL LinkedIn
  const searchConditions = [eq(companies.name, companyName)];
  
  if (normalizedDomain) {
    searchConditions.push(eq(companies.domain, normalizedDomain));
  }
  
  if (companyLinkedinUrl && companyLinkedinUrl.trim() !== "") {
    searchConditions.push(eq(companies.linkedinUrl, companyLinkedinUrl));
  }
  
  const existingCompany = await db
    .select()
    .from(companies)
    .where(or(...searchConditions))
    .limit(1);

  if (existingCompany.length > 0) {
    return existingCompany[0].id;
  }

  // Créer une nouvelle company
  const [newCompany] = await db
    .insert(companies)
    .values({
      name: companyName,
      domain: normalizedDomain || null,
      linkedinUrl: companyLinkedinUrl && companyLinkedinUrl.trim() !== "" ? companyLinkedinUrl : null,
    })
    .returning();

  return newCompany.id;
}

// POST /api/leads - Crée un nouveau lead
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();

    // Validation des champs obligatoires
    if (!body.firstName || !body.firstName.trim()) {
      return NextResponse.json(
        { error: "Le prénom est obligatoire" },
        { status: 400 }
      );
    }

    if (!body.lastName || !body.lastName.trim()) {
      return NextResponse.json(
        { error: "Le nom est obligatoire" },
        { status: 400 }
      );
    }

    if (!body.companyName || !body.companyName.trim()) {
      return NextResponse.json(
        { error: "Le nom de l'entreprise est obligatoire" },
        { status: 400 }
      );
    }

    if (!body.collectionId) {
      return NextResponse.json(
        { error: "La collection est obligatoire" },
        { status: 400 }
      );
    }

    const collectionId = parseInt(body.collectionId);
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
      .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
      .limit(1);

    if (collection.length === 0) {
      return NextResponse.json(
        { error: "Collection non trouvée ou accès non autorisé" },
        { status: 404 }
      );
    }

    // Créer ou récupérer l'entreprise
    const companyId = await getOrCreateCompany(
      body.companyName.trim(),
      body.companyDomain,
      body.companyLinkedinUrl
    );

    // Construire le nom complet
    const fullName = `${body.firstName.trim()} ${body.lastName.trim()}`;

    // Créer le lead
    const [newLead] = await db
      .insert(leads)
      .values({
        collectionId,
        userId,
        companyId: companyId || null,
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        fullName,
        linkedinUrl: body.linkedinUrl || null,
        email: body.email || null,
        position: body.position || null,
        seniority: body.seniority || null,
        functional: body.functional || null,
        headline: body.headline || null,
        about: body.about || null,
        personalEmail: body.personalEmail || null,
        phoneNumbers: body.phoneNumbers && body.phoneNumbers.length > 0 ? body.phoneNumbers : null,
        city: body.city || null,
        state: body.state || null,
        country: body.country || null,
        status: body.status || null,
        validated: body.validated !== undefined ? body.validated : false,
        reason: body.reason || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newLead,
      message: "Lead créé avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la création du lead:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
