import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { verifyEmail } from "@/lib/emaillistverify";

/**
 * POST /api/leads/[id]/verify-email - Vérifie la délivrabilité de l'email d'un lead via EmailListVerify
 */
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
    const userId = parseInt(session.user.id);
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: "ID de lead invalide" },
        { status: 400 }
      );
    }

    const leadResult = await db
      .select({
        id: leads.id,
        email: leads.email,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
      .limit(1);

    if (leadResult.length === 0) {
      return NextResponse.json(
        { error: "Lead non trouvé ou accès non autorisé" },
        { status: 404 }
      );
    }

    const lead = leadResult[0];

    if (!lead.email || !lead.email.trim()) {
      return NextResponse.json(
        { error: "Ce lead n'a pas d'email à vérifier" },
        { status: 400 }
      );
    }

    const result = await verifyEmail(lead.email.trim());

    const now = new Date();
    await db
      .update(leads)
      .set({
        emailVerifyEmaillist: result,
        emailVerifyEmaillistAt: now,
        updatedAt: now,
      })
      .where(eq(leads.id, leadId));

    return NextResponse.json({
      success: true,
      result,
      verifiedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("[Verify Email] Erreur:", error);

    if (error instanceof Error) {
      if (error.message.includes("EMAIL_LIST_VERIFY_API_KEY")) {
        return NextResponse.json(
          { error: "EmailListVerify n'est pas configuré (clé API manquante)" },
          { status: 500 }
        );
      }
      if (error.message.includes("error_credit") || error.message.includes("Not enough credit")) {
        return NextResponse.json(
          { error: "Crédits EmailListVerify insuffisants" },
          { status: 402 }
        );
      }
      return NextResponse.json(
        {
          error: "Erreur lors de la vérification de l'email",
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la vérification de l'email" },
      { status: 500 }
    );
  }
}
