import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  backfillScraperRunsFromApify,
  resetImportedScraperRuns,
} from "@/lib/backfill-scraper-runs";

/**
 * POST /api/scraper-runs/backfill
 * Importe les runs Apify dans scraper_runs.
 * Nécessite une session active (userId = utilisateur connecté).
 *
 * Query params:
 * - days (optionnel): nombre de jours à remonter (défaut 90)
 * - reset (optionnel): si "1", supprime d'abord les runs importés avant de ré-importer
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days");
    const daysBack = daysParam ? Math.min(Math.max(parseInt(daysParam, 10) || 90, 1), 365) : 90;
    const shouldReset = searchParams.get("reset") === "1";

    let resetCount = 0;
    if (shouldReset) {
      resetCount = await resetImportedScraperRuns(userId);
    }

    const result = await backfillScraperRunsFromApify(userId, daysBack);

    const resetMsg =
      shouldReset && resetCount > 0
        ? ` ${resetCount} ancien(s) run(s) supprimé(s).`
        : "";
    return NextResponse.json({
      success: true,
      message: `Backfill terminé : ${result.imported} importés, ${result.skipped} déjà présents, ${result.errors} erreurs.${resetMsg}`,
      result: { ...result, resetCount },
    });
  } catch (error) {
    console.error("[scraper-runs/backfill] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors du backfill",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
