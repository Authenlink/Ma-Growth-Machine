import { resolve } from "path";
import * as dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { companies, leads } from "../lib/schema";
import { eq, like, isNotNull } from "drizzle-orm";

// Charger les variables d'environnement depuis .env
const envPath = resolve(process.cwd(), ".env");
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error("❌ Erreur lors du chargement du fichier .env:", result.error);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL non trouvé après chargement de dotenv");
  console.error("💡 Vérifiez que le fichier .env contient DATABASE_URL=...");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

/**
 * Parse les URLs LinkedIn qui peuvent être sous forme de string ou de tableau
 * Format attendu: "http://www.linkedin.com/company/3284074" ou "['http://www.linkedin.com/company/3284074']"
 */
function parseLinkedinUrl(linkedinUrl?: string | null): string | null {
  if (!linkedinUrl || linkedinUrl.trim() === "") {
    return null;
  }

  const trimmed = linkedinUrl.trim();
  console.log(`🔍 Parsing: "${trimmed}"`);

  // Vérifier si c'est au format ['url'] avec des guillemets simples
  const singleQuoteMatch = trimmed.match(/^\['(.+)'\]$/);
  if (singleQuoteMatch) {
    // Extraire l'URL entre les guillemets simples
    const url = singleQuoteMatch[1];
    console.log(`📋 Single quote array format detected, URL: "${url}"`);
    return url;
  }

  try {
    // Essayer de parser comme JSON d'abord (au cas où c'est du vrai JSON)
    const parsed = JSON.parse(trimmed);
    console.log(`📋 Parsed as JSON:`, parsed);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Prendre le premier élément du tableau
      const url = parsed[0];
      console.log(`🎯 First element:`, url);
      return typeof url === "string" ? url.trim() : null;
    }
    // Si ce n'est pas un tableau, traiter comme une string normale
    console.log(`📝 Not an array, returning as string`);
    return trimmed;
  } catch (error) {
    console.log(`❌ JSON parse failed:`, error);
    // Si ce n'est pas du JSON valide, retourner la string telle quelle
    return trimmed;
  }
}

/**
 * Nettoie les URLs LinkedIn dans la table companies
 */
async function cleanCompaniesLinkedinUrls() {
  console.log("🔍 Recherche des URLs LinkedIn dans la table companies...");

  // Trouver toutes les companies avec linkedinUrl non null
  const companiesWithLinkedin = await db
    .select({ id: companies.id, linkedinUrl: companies.linkedinUrl })
    .from(companies)
    .where(isNotNull(companies.linkedinUrl));

  console.log(`📊 Trouvé ${companiesWithLinkedin.length} companies avec des URLs LinkedIn`);

  // Filtrer celles qui contiennent '[' ou commencent par '['
  const companiesToClean = companiesWithLinkedin.filter(company =>
    company.linkedinUrl && (company.linkedinUrl.includes('[') || company.linkedinUrl.startsWith('['))
  );

  console.log(`🎯 Parmi elles, ${companiesToClean.length} semblent mal formatées`);

  // Afficher quelques exemples pour debug
  if (companiesToClean.length > 0) {
    console.log("🔍 Exemples d'URLs mal formatées:");
    companiesToClean.slice(0, 3).forEach((company, index) => {
      console.log(`   ${index + 1}. Company ${company.id}: "${company.linkedinUrl}"`);
    });
  }

  let cleaned = 0;
  let errors = 0;

  for (const company of companiesToClean) {
    try {
      const cleanedUrl = parseLinkedinUrl(company.linkedinUrl);

      console.log(`🔄 Company ${company.id}: "${company.linkedinUrl}" -> "${cleanedUrl}"`);

      if (cleanedUrl !== company.linkedinUrl) {
        await db
          .update(companies)
          .set({
            linkedinUrl: cleanedUrl,
            updatedAt: new Date(),
          })
          .where(eq(companies.id, company.id));

        console.log(`✅ Company ${company.id}: nettoyée`);
        cleaned++;
      } else {
        console.log(`⏭️  Company ${company.id}: pas de changement nécessaire`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors du nettoyage de la company ${company.id}:`, error);
      errors++;
    }
  }

  return { cleaned, errors };
}

/**
 * Nettoie les URLs LinkedIn dans la table leads
 */
async function cleanLeadsLinkedinUrls() {
  console.log("🔍 Recherche des URLs LinkedIn dans la table leads...");

  // Trouver toutes les leads avec linkedinUrl non null
  const leadsWithLinkedin = await db
    .select({ id: leads.id, linkedinUrl: leads.linkedinUrl })
    .from(leads)
    .where(isNotNull(leads.linkedinUrl));

  console.log(`📊 Trouvé ${leadsWithLinkedin.length} leads avec des URLs LinkedIn`);

  // Filtrer celles qui contiennent '[' ou commencent par '['
  const leadsToClean = leadsWithLinkedin.filter(lead =>
    lead.linkedinUrl && (lead.linkedinUrl.includes('[') || lead.linkedinUrl.startsWith('['))
  );

  console.log(`🎯 Parmi elles, ${leadsToClean.length} semblent mal formatées`);

  // Afficher quelques exemples pour debug
  if (leadsToClean.length > 0) {
    console.log("🔍 Exemples d'URLs mal formatées:");
    leadsToClean.slice(0, 3).forEach((lead, index) => {
      console.log(`   ${index + 1}. Lead ${lead.id}: "${lead.linkedinUrl}"`);
    });
  }

  let cleaned = 0;
  let errors = 0;

  for (const lead of leadsToClean) {
    try {
      const cleanedUrl = parseLinkedinUrl(lead.linkedinUrl);

      if (cleanedUrl !== lead.linkedinUrl) {
        await db
          .update(leads)
          .set({
            linkedinUrl: cleanedUrl,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, lead.id));

        console.log(`✅ Lead ${lead.id}: "${lead.linkedinUrl}" -> "${cleanedUrl}"`);
        cleaned++;
      }
    } catch (error) {
      console.error(`❌ Erreur lors du nettoyage du lead ${lead.id}:`, error);
      errors++;
    }
  }

  return { cleaned, errors };
}

/**
 * Script principal pour nettoyer toutes les URLs LinkedIn mal formatées
 */
async function main() {
  try {
    console.log("🚀 Démarrage du nettoyage des URLs LinkedIn...");

    const companiesResult = await cleanCompaniesLinkedinUrls();
    const leadsResult = await cleanLeadsLinkedinUrls();

    console.log("\n📈 Résumé du nettoyage:");
    console.log(`   Companies: ${companiesResult.cleaned} nettoyées, ${companiesResult.errors} erreurs`);
    console.log(`   Leads: ${leadsResult.cleaned} nettoyés, ${leadsResult.errors} erreurs`);
    console.log(`   Total: ${companiesResult.cleaned + leadsResult.cleaned} nettoyés`);

    if (companiesResult.cleaned > 0 || leadsResult.cleaned > 0) {
      console.log("✅ Nettoyage terminé avec succès !");
    } else {
      console.log("ℹ️  Aucune URL à nettoyer trouvée.");
    }

    if (companiesResult.errors === 0 && leadsResult.errors === 0) {
      console.log("✅ Nettoyage terminé avec succès !");
    } else {
      console.log("⚠️  Nettoyage terminé avec quelques erreurs");
    }

  } catch (error) {
    console.error("💥 Erreur lors du nettoyage:", error);
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

export { cleanCompaniesLinkedinUrls, cleanLeadsLinkedinUrls, parseLinkedinUrl };