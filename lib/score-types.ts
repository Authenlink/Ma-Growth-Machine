/**
 * Constantes et helpers pour le système de notation des leads et entreprises.
 * Voir docs/SCORING-SYSTEM.md pour la documentation complète.
 */

export const SCORE_CATEGORIES = ["1-3", "4-6", "7-8", "9-10"] as const;
export type ScoreCategory = (typeof SCORE_CATEGORIES)[number];

export const SCORE_CATEGORY_LABELS: Record<ScoreCategory, string> = {
  "1-3": "Faible",
  "4-6": "Moyen",
  "7-8": "Élevé",
  "9-10": "Excellent",
};

export const FILTERABLE_SCORE_CATEGORIES: ScoreCategory[] = [...SCORE_CATEGORIES];

/**
 * Retourne la catégorie de score pour une note donnée (1-10).
 */
export function getScoreCategory(score: number): ScoreCategory {
  if (score <= 3) return "1-3";
  if (score <= 6) return "4-6";
  if (score <= 8) return "7-8";
  return "9-10";
}

/**
 * Retourne les bornes min/max pour une catégorie.
 */
export function getScoreCategoryBounds(
  category: ScoreCategory
): { min: number; max: number } {
  switch (category) {
    case "1-3":
      return { min: 1, max: 3 };
    case "4-6":
      return { min: 4, max: 6 };
    case "7-8":
      return { min: 7, max: 8 };
    case "9-10":
      return { min: 9, max: 10 };
    default:
      return { min: 1, max: 10 };
  }
}
