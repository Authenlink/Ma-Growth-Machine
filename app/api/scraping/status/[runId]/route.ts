import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apifyClient } from "@/lib/apify-client";

/**
 * GET /api/scraping/status/[runId] - Vérifie le statut d'un run Apify
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { runId } = await params;

    if (!runId) {
      return NextResponse.json({ error: "runId est requis" }, { status: 400 });
    }

    const run = await apifyClient.run(runId).get();

    if (!run) {
      return NextResponse.json({ error: "Run non trouvé" }, { status: 404 });
    }

    return NextResponse.json({
      id: run.id,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      defaultDatasetId: run.defaultDatasetId,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du statut:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: "Run non trouvé" }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: "Erreur lors de la récupération du statut",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
