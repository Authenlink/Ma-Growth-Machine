import { ApifyAdapter, ApifyProviderConfig } from "./apify-adapter";
import { ScraperRun, MappingResult } from "./base-adapter";
import { mapBulkEmailFinderDataToLeads, BulkEmailFinderData } from "../../bulk-email-finder-mapper";

/**
 * Adapter pour le scraper Bulk Email Finder
 * Trouve des emails à partir de prénom, nom et domaine d'entreprise
 */
export class BulkEmailFinderAdapter extends ApifyAdapter {
  constructor(providerConfig: ApifyProviderConfig) {
    super({
      actorId: "icypeas_official/bulk-email-finder",
    });
  }

  /**
   * Exécute le scraping d'emails
   * @param params Paramètres contenant people (array de strings au format "Prénom, Nom, Domaine")
   */
  async execute(params: Record<string, unknown>): Promise<ScraperRun> {
    // Préparer les paramètres pour Apify
    const input: Record<string, unknown> = {};

    // people doit être un array de strings au format "Prénom, Nom, Domaine"
    let people: string[] = [];
    if (params.people) {
      if (Array.isArray(params.people)) {
        people = params.people as string[];
      } else if (typeof params.people === "string") {
        // Si c'est une string, la traiter comme une seule personne
        people = [params.people];
      } else {
        throw new Error("people doit être un array de strings ou une string");
      }
    } else {
      throw new Error("people est requis (array de strings au format 'Prénom, Nom, Domaine')");
    }

    // Valider le format de chaque entrée
    const validatedPeople = people.filter((person) => {
      const parts = person.split(",").map((p) => p.trim());
      return parts.length >= 3 && parts[0] && parts[1] && parts[2];
    });

    if (validatedPeople.length === 0) {
      throw new Error("Aucune entrée valide trouvée. Format attendu: 'Prénom, Nom, Domaine'");
    }

    input.people = validatedPeople;

    // Appeler la méthode parent avec les paramètres préparés
    return super.execute(input);
  }

  /**
   * Mappe les données Bulk Email Finder vers le schéma de leads
   */
  async mapToLeads(
    data: unknown[],
    collectionId: number,
    userId: number
  ): Promise<MappingResult> {
    return mapBulkEmailFinderDataToLeads(
      data as BulkEmailFinderData[],
      collectionId,
      userId
    );
  }
}
