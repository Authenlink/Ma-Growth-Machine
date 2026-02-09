import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collections } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { mapCSVDataToApifyFormat } from "@/lib/csv-mapper";
import { mapApifyDataToLeads } from "@/lib/apify-mapper";
import * as Papa from "papaparse";

// Taille maximale du fichier (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * POST /api/leads/import - Importe des leads depuis un fichier CSV
 */
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

    // Récupérer le FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const collectionIdStr = formData.get("collectionId") as string | null;

    // Validation du fichier
    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Vérifier que c'est un fichier CSV
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { error: "Le fichier doit être un fichier CSV (.csv)" },
        { status: 400 }
      );
    }

    // Vérifier la taille du fichier
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Le fichier est trop volumineux. Taille maximale: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validation de la collection
    if (!collectionIdStr) {
      return NextResponse.json(
        { error: "L'ID de la collection est requis" },
        { status: 400 }
      );
    }

    const collectionId = parseInt(collectionIdStr);
    if (isNaN(collectionId)) {
      return NextResponse.json(
        { error: "L'ID de la collection est invalide" },
        { status: 400 }
      );
    }

    // Vérifier que la collection existe et appartient à l'utilisateur
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

    // Lire le contenu du fichier
    const fileContent = await file.text();

    // Parser le CSV avec papaparse
    return new Promise<NextResponse>((resolve) => {
      Papa.parse<Record<string, string>>(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => {
          // Normaliser les en-têtes (supprimer les espaces, convertir en camelCase si nécessaire)
          return header.trim();
        },
        complete: async (results) => {
          try {
            // Vérifier s'il y a des erreurs de parsing
            if (results.errors.length > 0) {
              console.error("Erreurs de parsing CSV:", results.errors);
              // On continue quand même si ce sont juste des warnings
              const criticalErrors = results.errors.filter(
                (e) => e.type === "Quotes" || e.type === "Delimiter"
              );
              if (criticalErrors.length > 0) {
                return resolve(
                  NextResponse.json(
                    {
                      error: "Erreur lors du parsing du CSV",
                      details: criticalErrors.map((e) => e.message).join(", "),
                    },
                    { status: 400 }
                  )
                );
              }
            }

            // Vérifier qu'il y a des données
            if (!results.data || results.data.length === 0) {
              return resolve(
                NextResponse.json(
                  { error: "Le fichier CSV est vide ou ne contient pas de données valides" },
                  { status: 400 }
                )
              );
            }

            // Transformer les données CSV en format Apify
            const csvData = results.data as any[];
            const apifyData = mapCSVDataToApifyFormat(csvData);

            // Importer les leads
            const result = await mapApifyDataToLeads(apifyData, collectionId, userId);

            resolve(
              NextResponse.json({
                success: true,
                ...result,
                message: `Import terminé: ${result.created} créés, ${result.skipped} ignorés, ${result.errors} erreurs`,
              })
            );
          } catch (error) {
            console.error("Erreur lors de l'import des leads:", error);
            resolve(
              NextResponse.json(
                {
                  error: "Erreur lors de l'import des leads",
                  details: error instanceof Error ? error.message : "Erreur inconnue",
                },
                { status: 500 }
              )
            );
          }
        },
        error: (error: any) => {
          console.error("Erreur lors du parsing CSV:", error);
          resolve(
            NextResponse.json(
              {
                error: "Erreur lors du parsing du fichier CSV",
                details: error.message,
              },
              { status: 400 }
            )
          );
        },
      });
    });
  } catch (error) {
    console.error("Erreur lors de l'import CSV:", error);
    return NextResponse.json(
      {
        error: "Erreur interne du serveur",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
