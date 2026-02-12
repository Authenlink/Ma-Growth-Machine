/**
 * Calcul du score des leads (1-10) basé sur la complétude des données.
 * Voir docs/SCORING-SYSTEM.md pour la documentation complète.
 */

import { sql, exists, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  leads,
  companies,
  leadPosts,
  companyPosts,
  trustpilotReviews,
} from "@/lib/schema";
import type { ScoreCategory } from "./score-types";
import { getScoreCategoryBounds } from "./score-types";

/** EXISTS: lead a des posts LinkedIn */
const hasLeadPost = exists(
  db.select().from(leadPosts).where(eq(leadPosts.leadId, leads.id))
);

/** EXISTS: entreprise du lead a des posts LinkedIn */
const hasCompanyPost = exists(
  db
    .select()
    .from(companyPosts)
    .where(eq(companyPosts.companyId, leads.companyId))
);

/** EXISTS: entreprise du lead a des avis Trustpilot */
const hasTrustpilot = exists(
  db
    .select()
    .from(trustpilotReviews)
    .where(eq(trustpilotReviews.companyId, leads.companyId))
);

/**
 * Expression SQL pour calculer le score d'un lead.
 * À utiliser dans un SELECT avec leftJoin(companies, eq(leads.companyId, companies.id)).
 *
 * Pondération :
 * - Email: 2, Email vérifié: 1, LinkedIn person: 1, LinkedIn company: 1
 * - Prénom: 0.5, Nom: 0.5, Position: 1, Entreprise: 1
 * - Post person: 0.5, Post company: 0.5, SEO: 0.5, Trustpilot: 0.5
 */
export function buildLeadScoreSqlExpression() {
  return sql<number>`LEAST(10, (
    CASE WHEN ${leads.email} IS NOT NULL AND TRIM(${leads.email}) != '' THEN 2 ELSE 0 END +
    CASE WHEN ${leads.emailVerifyEmaillist} IS NOT NULL AND TRIM(${leads.emailVerifyEmaillist}) != '' THEN 1 ELSE 0 END +
    CASE WHEN ${leads.linkedinUrl} IS NOT NULL AND TRIM(${leads.linkedinUrl}) != '' THEN 1 ELSE 0 END +
    CASE WHEN ${companies.linkedinUrl} IS NOT NULL AND TRIM(${companies.linkedinUrl}) != '' THEN 1 ELSE 0 END +
    CASE WHEN ${leads.firstName} IS NOT NULL AND TRIM(${leads.firstName}) != '' THEN 0.5 ELSE 0 END +
    CASE WHEN ${leads.lastName} IS NOT NULL AND TRIM(${leads.lastName}) != '' THEN 0.5 ELSE 0 END +
    CASE WHEN ${leads.position} IS NOT NULL AND TRIM(${leads.position}) != '' THEN 1 ELSE 0 END +
    CASE WHEN ${leads.companyId} IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN ${hasLeadPost} THEN 0.5 ELSE 0 END +
    CASE WHEN ${leads.companyId} IS NOT NULL AND ${hasCompanyPost} THEN 0.5 ELSE 0 END +
    CASE WHEN ${leads.companyId} IS NOT NULL AND ${companies.seoAnalyzedAt} IS NOT NULL THEN 0.5 ELSE 0 END +
    CASE WHEN ${leads.companyId} IS NOT NULL AND ${hasTrustpilot} THEN 0.5 ELSE 0 END
  ))`;
}

/**
 * Condition SQL pour filtrer par catégorie de score.
 */
export function buildLeadScoreCategoryCondition(category: ScoreCategory) {
  const { min, max } = getScoreCategoryBounds(category);
  const scoreExpr = buildLeadScoreSqlExpression();
  return sql`${scoreExpr} BETWEEN ${min} AND ${max}`;
}
