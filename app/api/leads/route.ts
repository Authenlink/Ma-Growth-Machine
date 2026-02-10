import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, companies, collections, leadCollections } from "@/lib/schema";
import { eq, and, or, like, desc, sql, inArray } from "drizzle-orm";

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

    // Filtre par collection (via lead_collections) - géré via join plus bas
    const filterCollectionId = collectionId ? parseInt(collectionId) : null;

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

    // Compter le nombre total d'éléments (avec filtre collection via lead_collections)
    const countBase = db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .leftJoin(companies, eq(leads.companyId, companies.id));

    const countWithCollection = filterCollectionId
      ? countBase.innerJoin(
          leadCollections,
          and(
            eq(leadCollections.leadId, leads.id),
            eq(leadCollections.collectionId, filterCollectionId)
          )
        )
      : countBase;

    const totalCountResult = await (finalWhereCondition
      ? countWithCollection.where(finalWhereCondition)
      : countWithCollection);
    const totalItems = totalCountResult[0]?.count || 0;

    // Requête avec joins pour récupérer les leads avec leurs entreprises
    const queryBase = db
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
      .leftJoin(companies, eq(leads.companyId, companies.id));

    const queryWithCollection = filterCollectionId
      ? queryBase.innerJoin(
          leadCollections,
          and(
            eq(leadCollections.leadId, leads.id),
            eq(leadCollections.collectionId, filterCollectionId)
          )
        )
      : queryBase;

    // Appliquer toutes les conditions et ordonner par date de création (plus récent en premier) et appliquer la pagination
    const results = await (finalWhereCondition
      ? queryWithCollection.where(finalWhereCondition)
      : queryWithCollection)
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(totalItems / limit);

    // Récupérer les collections pour chaque lead (via lead_collections)
    const leadIds = results.map((r) => r.id);
    const leadCollectionsData =
      leadIds.length > 0
        ? await db
            .select({
              leadId: leadCollections.leadId,
              id: collections.id,
              name: collections.name,
            })
            .from(leadCollections)
            .innerJoin(collections, eq(leadCollections.collectionId, collections.id))
            .where(inArray(leadCollections.leadId, leadIds))
        : [];

    const collectionsByLead = new Map<number, { id: number; name: string }[]>();
    for (const lc of leadCollectionsData) {
      const list = collectionsByLead.get(lc.leadId) ?? [];
      list.push({ id: lc.id, name: lc.name });
      collectionsByLead.set(lc.leadId, list);
    }

    const resultsWithCollections = results.map((lead) => ({
      ...lead,
      collections: collectionsByLead.get(lead.id) ?? [],
      collection: (() => {
        const cols = collectionsByLead.get(lead.id);
        return cols && cols.length > 0 ? cols[0] : null;
      })(),
    }));

    return NextResponse.json({
      data: resultsWithCollections,
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

    // Créer le lead (sans collectionId - lié via lead_collections)
    const [newLead] = await db
      .insert(leads)
      .values({
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

    // Associer le lead à la collection via lead_collections
    await db.insert(leadCollections).values({
      leadId: newLead.id,
      collectionId,
    });

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
