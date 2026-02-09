import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, companies, collections, companyPosts, leadPosts } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/leads/[id] - Récupère un lead spécifique avec toutes ses informations
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
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: "ID de lead invalide" },
        { status: 400 }
      );
    }

    // Récupérer le lead avec joins sur company et collection
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
        collection: {
          id: collections.id,
          name: collections.name,
        },
      })
      .from(leads)
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .leftJoin(collections, eq(leads.collectionId, collections.id))
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Lead non trouvé" },
        { status: 404 }
      );
    }

    const lead = result[0];

    // Récupérer les posts LinkedIn de l'entreprise
    const companyPostsData = lead.company?.id ? await db
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
      .limit(10) : [];

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
      companyPosts: companyPostsData,
      leadPosts: leadPostsData,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du lead:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
