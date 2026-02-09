import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/user/profile - Récupérer le profil utilisateur
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        bio: users.bio,
        location: users.location,
        website: users.website,
        banner: users.banner,
        backgroundType: users.backgroundType,
        backgroundGradient: users.backgroundGradient,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, parseInt(session.user.id)))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    const userData = user[0];
    // Ajouter des valeurs par défaut pour les champs qui n'existent pas encore dans le schéma
    return NextResponse.json({
      ...userData,
      referencedCity: null,
      isOnline: false,
      instagramUrl: null,
      tiktokUrl: null,
      linkedinUrl: null,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile - Mettre à jour le profil utilisateur
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      bio,
      location,
      website,
      banner,
      backgroundType,
      backgroundGradient,
      referencedCity,
      isOnline,
      instagramUrl,
      tiktokUrl,
      linkedinUrl,
    } = body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;
    if (banner !== undefined) updateData.banner = banner;
    if (backgroundType !== undefined) updateData.backgroundType = backgroundType;
    if (backgroundGradient !== undefined)
      updateData.backgroundGradient = backgroundGradient;
    // Note: Les champs suivants ne sont pas encore dans le schéma mais sont acceptés pour éviter les erreurs
    // Pour les activer complètement, il faudra créer une migration
    // if (referencedCity !== undefined) updateData.referencedCity = referencedCity;
    // if (isOnline !== undefined) updateData.isOnline = isOnline;
    // if (instagramUrl !== undefined) updateData.instagramUrl = instagramUrl;
    // if (tiktokUrl !== undefined) updateData.tiktokUrl = tiktokUrl;
    // if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl;

    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, parseInt(session.user.id)))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Profil mis à jour" });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// DELETE /api/user/profile - Supprimer le compte utilisateur
export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);

    // Supprimer l'utilisateur (les sessions et accounts seront supprimés automatiquement via CASCADE)
    const deletedUser = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();

    if (deletedUser.length === 0) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Compte supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du compte:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}