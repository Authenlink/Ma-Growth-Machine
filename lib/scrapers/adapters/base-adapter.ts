/**
 * Types pour les résultats de scraping
 */
export interface ScraperRun {
  id: string;
  status: "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "ABORTED" | "TIMED-OUT";
  startedAt?: string;
  finishedAt?: string;
  defaultDatasetId?: string;
}

export interface ScraperStatus {
  id: string;
  status: "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "ABORTED" | "TIMED-OUT";
  startedAt?: string;
  finishedAt?: string;
  defaultDatasetId?: string;
}

export interface MappingResult {
  created: number;
  skipped: number;
  errors: number;
  enriched?: number;
}

/**
 * Interface commune pour tous les adapters de scrapers
 * Chaque scraper doit implémenter cette interface pour être compatible avec le système
 */
export interface ScraperAdapter {
  /**
   * Exécute le scraping avec les paramètres fournis
   * @param params Paramètres du formulaire de scraping
   * @returns Informations sur le run créé
   */
  execute(params: Record<string, unknown>): Promise<ScraperRun>;

  /**
   * Récupère le statut d'un run en cours ou terminé
   * @param runId Identifiant du run
   * @returns Statut actuel du run
   */
  getStatus(runId: string): Promise<ScraperStatus>;

  /**
   * Récupère les résultats bruts d'un run terminé
   * @param runId Identifiant du run
   * @returns Tableau de données brutes
   */
  getResults(runId: string): Promise<unknown[]>;

  /**
   * Mappe les données brutes vers le schéma de leads de la base de données
   * @param data Données brutes du scraper
   * @param collectionId ID de la collection où sauvegarder les leads
   * @param userId ID de l'utilisateur propriétaire
   * @returns Résultat du mapping (créés, ignorés, erreurs)
   */
  mapToLeads(
    data: unknown[],
    collectionId: number,
    userId: number
  ): Promise<MappingResult>;
}
