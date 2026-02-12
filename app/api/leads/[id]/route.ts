import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  leads,
  companies,
  collections,
  leadCollections,
  companyPosts,
  leadPosts,
} from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/leads/[id] - Récupère un lead spécifique avec toutes ses informations
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

    // Récupérer le lead avec joins sur company
    const result = await db
      .select({
        id: leads.id,
        personId: leads.personId,
        fullName: leads.fullName,
        firstName: leads.firstName,
        lastName: leads.lastName,
        position: leads.position,
        linkedinUrl: leads.linkedinUrl,
        seniority: leads.seniority,
        functional: leads.functional,
        email: leads.email,
        emailCertainty: leads.emailCertainty,
        emailVerifyEmaillist: leads.emailVerifyEmaillist,
        emailVerifyEmaillistAt: leads.emailVerifyEmaillistAt,
        personalEmail: leads.personalEmail,
        phoneNumbers: leads.phoneNumbers,
        city: leads.city,
        state: leads.state,
        country: leads.country,
        companyLinkedinPost: leads.companyLinkedinPost,
        personLinkedinPost: leads.personLinkedinPost,
        iceBreaker: leads.iceBreaker,
        status: leads.status,
        validated: leads.validated,
        reason: leads.reason,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
        company: {
          id: companies.id,
          name: companies.name,
          website: companies.website,
          domain: companies.domain,
          linkedinUrl: companies.linkedinUrl,
          foundedYear: companies.foundedYear,
          industry: companies.industry,
          size: companies.size,
          description: companies.description,
          specialities: companies.specialities,
          city: companies.city,
          state: companies.state,
          country: companies.country,
        },
      })
      .from(leads)
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: "Lead non trouvé" }, { status: 404 });
    }

    const lead = result[0];

    // Récupérer toutes les collections du lead
    let collectionsData: { id: number; name: string }[] = [];

    try {
      // Essayer d'abord la nouvelle table leadCollections
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
      // Fallback vers l'ancien système si la nouvelle table n'existe pas encore
      console.log("Nouvelle table leadCollections non trouvée, utilisation de l'ancien système");
      try {
        // Récupérer collectionId depuis la table leads
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

    // Récupérer les posts LinkedIn de l'entreprise
    const companyPostsData = lead.company?.id
      ? await db
          .select({
            id: companyPosts.id,
            postUrl: companyPosts.postUrl,
            postedDate: companyPosts.postedDate,
            author: companyPosts.author,
            text: companyPosts.text,
            reactions: companyPosts.reactions,
            like: companyPosts.like,
          })
          .from(companyPosts)
          .where(eq(companyPosts.companyId, lead.company.id))
          .orderBy(desc(companyPosts.postedDate))
          .limit(10)
      : [];

    // Récupérer les posts LinkedIn du lead
    const leadPostsData = await db
      .select({
        id: leadPosts.id,
        postUrl: leadPosts.postUrl,
        postedDate: leadPosts.postedDate,
        author: leadPosts.author,
        text: leadPosts.text,
        reactions: leadPosts.reactions,
        like: leadPosts.like,
      })
      .from(leadPosts)
      .where(eq(leadPosts.leadId, leadId))
      .orderBy(desc(leadPosts.postedDate))
      .limit(10);

    return NextResponse.json({
      ...lead,
      collections: collectionsData,
      // Garder la compatibilité avec l'ancien format (première collection)
      collection: collectionsData.length > 0 ? collectionsData[0] : null,
      companyPosts: companyPostsData,
      leadPosts: leadPostsData,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du lead:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}

// PATCH /api/leads/[id] - Mettre à jour un lead
export async function PATCH(
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
    const {
      firstName,
      lastName,
      fullName,
      position,
      linkedinUrl,
      seniority,
      functional,
      email,
      emailCertainty,
      personalEmail,
      phoneNumbers,
      city,
      state,
      country,
      iceBreaker,
      status,
      validated,
      reason,
    } = body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (firstName !== undefined) updateData.firstName = firstName || null;
    if (lastName !== undefined) updateData.lastName = lastName || null;
    if (fullName !== undefined) updateData.fullName = fullName || null;
    if (position !== undefined) updateData.position = position || null;
    if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl || null;
    if (seniority !== undefined) updateData.seniority = seniority || null;
    if (functional !== undefined) updateData.functional = functional || null;
    if (email !== undefined) updateData.email = email || null;
    if (emailCertainty !== undefined)
      updateData.emailCertainty = emailCertainty || null;
    if (personalEmail !== undefined)
      updateData.personalEmail = personalEmail || null;
    if (phoneNumbers !== undefined)
      updateData.phoneNumbers = phoneNumbers || null;
    if (city !== undefined) updateData.city = city || null;
    if (state !== undefined) updateData.state = state || null;
    if (country !== undefined) updateData.country = country || null;
    if (iceBreaker !== undefined) updateData.iceBreaker = iceBreaker || null;
    if (status !== undefined) updateData.status = status || null;
    if (validated !== undefined) updateData.validated = validated ?? false;
    if (reason !== undefined) updateData.reason = reason || null;

    const updatedLead = await db
      .update(leads)
      .set(updateData as typeof leads.$inferInsert)
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
      .returning();

    if (updatedLead.length === 0) {
      return NextResponse.json({ error: "Lead non trouvé" }, { status: 404 });
    }

    return NextResponse.json(updatedLead[0]);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du lead:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}

// DELETE /api/leads/[id] - Supprimer un lead
export async function DELETE(
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

    // Supprimer le lead (les posts liés seront supprimés automatiquement grâce aux foreign keys)
    await db.delete(leads).where(eq(leads.id, leadId));

    return NextResponse.json({ message: "Lead supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du lead:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
