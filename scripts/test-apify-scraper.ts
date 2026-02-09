/**
 * Script de test pour voir la structure des données retournées par le scraper Apify
 * 
 * Usage: npx tsx scripts/test-apify-scraper.ts
 */

import * as dotenv from "dotenv";
import { resolve } from "path";
import { ApifyClient } from "apify-client";

// IMPORTANT: Charger les variables d'environnement AVANT d'importer le client
const envPath = resolve(process.cwd(), ".env");
console.log(`📁 Chargement du fichier .env depuis: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error("❌ Erreur lors du chargement du fichier .env:", result.error);
  process.exit(1);
}

// Créer le client Apify après avoir chargé les variables d'environnement
const token = process.env.APIFY_TOKEN;
if (!token) {
  console.error("❌ APIFY_TOKEN non trouvé après chargement de dotenv");
  console.error("💡 Vérifiez que le fichier .env contient APIFY_TOKEN=...");
  console.error("💡 Variables chargées:", Object.keys(result.parsed || {}).join(", "));
  process.exit(1);
}

// Masquer le token pour la sécurité (afficher seulement les 10 premiers caractères)
const tokenPreview = token.substring(0, 10) + "...";
console.log(`✅ Token chargé: ${tokenPreview}\n`);

const apifyClient = new ApifyClient({
  token: token,
});

const LEAD_SCRAPER_ACTOR_ID = "kVYdvNOefemtiDXO5";

interface ScrapingInput {
  totalResults?: number;
  includeSimilarTitles?: boolean;
  companyNameMatchMode?: "phrase" | "contains" | "exact";
  companyDomainMatchMode?: "contains" | "exact";
  [key: string]: unknown;
}

async function testScraper() {
  console.log("🚀 Démarrage du test du scraper Apify...\n");

  // Paramètres minimaux pour le test
  const input: ScrapingInput = {
    totalResults: 10, // Limiter à 10 résultats pour le test
    includeSimilarTitles: false,
    companyNameMatchMode: "phrase",
    companyDomainMatchMode: "contains",
  };

  console.log("📋 Paramètres de scraping:");
  console.log(JSON.stringify(input, null, 2));
  console.log("\n");

  try {
    console.log("⏳ Lancement de l'Actor Apify...");
    const run = await apifyClient.actor(LEAD_SCRAPER_ACTOR_ID).call(input);

    console.log(`✅ Run créé avec l'ID: ${run.id}`);
    console.log(`📊 Statut initial: ${run.status}`);
    console.log("\n⏳ Attente de la fin du run...\n");

    // Attendre que le run se termine
    let runStatus = await apifyClient.run(run.id).waitForFinish();

    console.log(`✅ Run terminé avec le statut: ${runStatus.status}`);
    console.log(`📦 Dataset ID: ${runStatus.defaultDatasetId}\n`);

    if (runStatus.status === "SUCCEEDED" && runStatus.defaultDatasetId) {
      console.log("📥 Récupération des résultats...\n");
      const { items } = await apifyClient
        .dataset(runStatus.defaultDatasetId)
        .listItems();

      console.log(`📊 Nombre total de résultats: ${items.length}\n`);

      if (items.length > 0) {
        console.log("=".repeat(80));
        console.log("STRUCTURE DU PREMIER RÉSULTAT:");
        console.log("=".repeat(80));
        console.log(JSON.stringify(items[0], null, 2));
        console.log("=".repeat(80));

        if (items.length > 1) {
          console.log("\n📋 Tous les champs disponibles dans les résultats:");
          const allKeys = new Set<string>();
          items.forEach((item) => {
            Object.keys(item).forEach((key) => allKeys.add(key));
          });
          console.log(Array.from(allKeys).sort().join(", "));
        }
      } else {
        console.log("⚠️  Aucun résultat trouvé");
      }
    } else {
      console.error(`❌ Le run a échoué avec le statut: ${runStatus.status}`);
      if (runStatus.status === "FAILED") {
        const runDetails = await apifyClient.run(run.id).get();
        console.error("Détails de l'erreur:", runDetails);
      }
    }
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

testScraper();
