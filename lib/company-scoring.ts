/**
 * Calcul du score des entreprises (1-10) basé sur la complétude des données.
 * Voir docs/SCORING-SYSTEM.md pour la documentation complète.
 */

import { sql, exists, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, trustpilotReviews } from "@/lib/schema";
import type { ScoreCategory } from "./score-types";
import { getScoreCategoryBounds } from "./score-types";

/** EXISTS: entreprise a des avis Trustpilot */
const hasTrustpilot = exists(
  db
    .select()
    .from(trustpilotReviews)
    .where(eq(trustpilotReviews.companyId, companies.id))
);

/**
 * Expression SQL pour calculer le score d'une entreprise.
 *
 * Pondération :
 * - Nom: 1, LinkedIn URL: 2, Domaine: 2, Website: 1
 * - Analyse SEO: 2, Avis Trustpilot: 1
 * - Industrie: 0.5, Taille/localisation: 0.5
 */
export function buildCompanyScoreSqlExpression() {
  return sql<number>`LEAST(10, (
    CASE WHEN ${companies.name} IS NOT NULL AND TRIM(${companies.name}) != '' THEN 1 ELSE 0 END +
    CASE WHEN ${companies.linkedinUrl} IS NOT NULL AND TRIM(${companies.linkedinUrl}) != '' THEN 2 ELSE 0 END +
    CASE WHEN ${companies.domain} IS NOT NULL AND TRIM(${companies.domain}) != '' THEN 2 ELSE 0 END +
    CASE WHEN ${companies.website} IS NOT NULL AND TRIM(${companies.website}) != '' THEN 1 ELSE 0 END +
    CASE WHEN ${companies.seoAnalyzedAt} IS NOT NULL THEN 2 ELSE 0 END +
    CASE WHEN ${hasTrustpilot} THEN 1 ELSE 0 END +
    CASE WHEN ${companies.industry} IS NOT NULL AND TRIM(${companies.industry}) != '' THEN 0.5 ELSE 0 END +
    CASE WHEN (
      (${companies.size} IS NOT NULL AND TRIM(${companies.size}) != '') OR
      (${companies.city} IS NOT NULL AND TRIM(${companies.city}) != '') OR
      (${companies.country} IS NOT NULL AND TRIM(${companies.country}) != '')
    ) THEN 0.5 ELSE 0 END
  ))`;
}

/**
 * Condition SQL pour filtrer par catégorie de score.
 */
export function buildCompanyScoreCategoryCondition(category: ScoreCategory) {
  const { min, max } = getScoreCategoryBounds(category);
  const scoreExpr = buildCompanyScoreSqlExpression();
  return sql`${scoreExpr} BETWEEN ${min} AND ${max}`;
}
