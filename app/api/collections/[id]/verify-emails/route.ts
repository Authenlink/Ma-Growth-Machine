import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collections, leads, leadCollections } from "@/lib/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import {
  uploadBulkVerification,
  getBulkProgress,
  downloadBulkResults,
} from "@/lib/emaillistverify";

const MAX_RUN_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const POLL_INTERVAL = 5000; // 5 seconds

/**
 * POST /api/collections/[id]/verify-emails - Vérifie les emails de tous les leads d'une collection via EmailListVerify
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
    const collectionId = parseInt(id);

    if (isNaN(collectionId)) {
      return NextResponse.json(
        { error: "ID de collection invalide" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { force = false, quality = "standard" } = body as {
      force?: boolean;
      quality?: "standard" | "high";
    };

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

    // Récupérer les leads de la collection avec email
    const collectionLeads = await db
      .select({
        id: leads.id,
        email: leads.email,
        emailVerifyEmaillist: leads.emailVerifyEmaillist,
      })
      .from(leads)
      .innerJoin(
        leadCollections,
        and(
          eq(leadCollections.leadId, leads.id),
          eq(leadCollections.collectionId, collectionId)
        )
      )
      .where(and(eq(leads.userId, userId), isNotNull(leads.email)));

    // Filtrer ceux qui ont un email non vide
    // Si force=false, exclure ceux déjà vérifiés
    const leadsToVerify = collectionLeads.filter((l) => {
      if (!l.email?.trim()) return false;
      if (!force && l.emailVerifyEmaillist) return false;
      return true;
    });
    const uniqueEmails = new Map<string, number>(); // email -> leadId (first occurrence)
    for (const l of leadsToVerify) {
      const email = l.email!.trim().toLowerCase();
      if (!force && uniqueEmails.has(email)) continue; // skip duplicates
      uniqueEmails.set(email, l.id);
    }

    const emailsToVerify = Array.from(uniqueEmails.keys());
    const emailToLeadId = new Map(Array.from(uniqueEmails.entries()));

    if (emailsToVerify.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucun email à vérifier dans cette collection",
        metrics: { total: 0, verified: 0, ok: 0, invalid: 0, unknown: 0 },
      });
    }

    console.log(
      `[Verify Emails Collection] User ${userId} vérifie ${emailsToVerify.length} emails pour collection ${collectionId}`
    );

    const maillistId = await uploadBulkVerification(emailsToVerify, quality);

    let attempts = 0;
    const maxAttempts = MAX_RUN_TIMEOUT / POLL_INTERVAL;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      const progress = await getBulkProgress(maillistId);

      const status = (progress as { status?: string }).status;
      if (status === "finished" || status === "completed") {
        break;
      }
      if (status === "failed" || status === "error") {
        throw new Error("La vérification en masse a échoué");
      }

      attempts++;
      if (attempts % 12 === 0) {
        console.log(
          `[Verify Emails Collection] Maillist ${maillistId} en cours (${attempts * POLL_INTERVAL / 1000}s)`
        );
      }
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        {
          error: "La vérification a dépassé le temps limite (30 min). Consultez EmailListVerify pour les résultats.",
          maillistId,
        },
        { status: 504 }
      );
    }

    const results = await downloadBulkResults(maillistId);
    const now = new Date();

    const metrics = { ok: 0, invalid: 0, unknown: 0, updated: 0 };
    const invalidStatuses = new Set([
      "email_disabled",
      "dead_server",
      "invalid_mx",
      "disposable",
      "spamtrap",
      "invalid_syntax",
    ]);
    const okStatuses = new Set(["ok", "ok_for_all"]);

    for (const row of results) {
      const email = row.email.trim().toLowerCase();
      const leadId = emailToLeadId.get(email);
      if (!leadId) continue;

      if (okStatuses.has(row.result)) {
        metrics.ok++;
      } else if (invalidStatuses.has(row.result)) {
        metrics.invalid++;
      } else {
        metrics.unknown++;
      }

      await db
        .update(leads)
        .set({
          emailVerifyEmaillist: row.result,
          emailVerifyEmaillistAt: now,
          updatedAt: now,
        })
        .where(eq(leads.id, leadId));
      metrics.updated++;
    }

    console.log(
      `[Verify Emails Collection] Terminé: ${metrics.updated} mis à jour (ok: ${metrics.ok}, invalid: ${metrics.invalid}, unknown: ${metrics.unknown})`
    );

    return NextResponse.json({
      success: true,
      maillistId,
      metrics: {
        total: emailsToVerify.length,
        verified: results.length,
        updated: metrics.updated,
        ok: metrics.ok,
        invalid: metrics.invalid,
        unknown: metrics.unknown,
      },
    });
  } catch (error) {
    console.error("[Verify Emails Collection] Erreur:", error);

    if (error instanceof Error) {
      if (error.message.includes("EMAIL_LIST_VERIFY_API_KEY")) {
        return NextResponse.json(
          { error: "EmailListVerify n'est pas configuré (clé API manquante)" },
          { status: 500 }
        );
      }
      if (
        error.message.includes("error_credit") ||
        error.message.includes("Not enough credit")
      ) {
        return NextResponse.json(
          { error: "Crédits EmailListVerify insuffisants" },
          { status: 402 }
        );
      }
      return NextResponse.json(
        {
          error: "Erreur lors de la vérification des emails",
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la vérification des emails" },
      { status: 500 }
    );
  }
}
