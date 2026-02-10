import { db } from "./db";
import { leads, companies, leadCollections } from "./schema";
import { eq, and, or } from "drizzle-orm";

/**
 * Type pour les données brutes retournées par le scraper Bulk Email Finder
 */
export interface BulkEmailFinderData {
  firstName: string;
  lastName: string;
  domain: string;
  email?: string;
  status: "FOUND" | "NOT_FOUND";
  certainty?: "ultra_sure" | "sure" | string;
}

/**
 * Hiérarchie des niveaux de certitude (du plus élevé au plus faible)
 */
const CERTAINTY_LEVELS: Record<string, number> = {
  ultra_sure: 3,
  sure: 2,
  default: 1,
};

/**
 * Compare deux niveaux de certitude
 * @returns true si newCertainty est meilleur ou égal à existingCertainty
 */
function isBetterCertainty(
  newCertainty: string | undefined | null,
  existingCertainty: string | undefined | null
): boolean {
  if (!newCertainty) return false;
  if (!existingCertainty) return true; // Si pas de certitude existante, accepter la nouvelle

  const newLevel = CERTAINTY_LEVELS[newCertainty] || CERTAINTY_LEVELS.default;
  const existingLevel =
    CERTAINTY_LEVELS[existingCertainty] || CERTAINTY_LEVELS.default;

  return newLevel >= existingLevel;
}


/**
 * Enrichit un lead existant avec un email trouvé
 */
async function enrichLeadWithEmail(
  existingLead: typeof leads.$inferSelect,
  data: BulkEmailFinderData,
  companyId: number | null
): Promise<void> {
  // Ne mettre à jour que si l'email est trouvé
  if (data.status !== "FOUND" || !data.email) {
    return;
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  // Mettre à jour l'email seulement si :
  // 1. Le lead n'a pas d'email OU
  // 2. Le nouvel email a une meilleure certitude
  const shouldUpdateEmail =
    !existingLead.email ||
    isBetterCertainty(data.certainty, existingLead.emailCertainty);

  if (shouldUpdateEmail) {
    updateData.email = data.email;
    if (data.certainty) {
      updateData.emailCertainty = data.certainty;
    }
  }

  // Mettre à jour les champs de base si vides
  if (!existingLead.firstName && data.firstName) {
    updateData.firstName = data.firstName;
  }
  if (!existingLead.lastName && data.lastName) {
    updateData.lastName = data.lastName;
  }
  if (!existingLead.fullName && data.firstName && data.lastName) {
    updateData.fullName = `${data.firstName} ${data.lastName}`.trim();
  }

  // Company ID
  if (!existingLead.companyId && companyId) {
    updateData.companyId = companyId;
  }

  // Mettre à jour uniquement si on a des changements
  if (Object.keys(updateData).length > 1) {
    await db.update(leads).set(updateData).where(eq(leads.id, existingLead.id));
  }
}

/**
 * Extrait le domaine d'une URL ou retourne la valeur si c'est déjà un domaine
 * Cette fonction est exportée pour être utilisée dans d'autres modules
 */
export function extractDomain(urlOrDomain?: string | null): string | null {
  if (!urlOrDomain || urlOrDomain.trim() === "") {
    return null;
  }

  const cleaned = urlOrDomain.trim();

  // Si c'est déjà un domaine simple (ex: "example.com"), le retourner
  if (!cleaned.includes("://") && !cleaned.startsWith("www.")) {
    return cleaned;
  }

  try {
    // Essayer de parser comme URL
    const url = new URL(cleaned.startsWith("http") ? cleaned : `https://${cleaned}`);
    return url.hostname.replace(/^www\./, ""); // Retirer www. si présent
  } catch {
    // Si l'URL n'est pas valide, essayer d'extraire le domaine manuellement
    const match = cleaned.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    return match ? match[1] : cleaned;
  }
}

/**
 * Trouve ou crée une company à partir du domaine
 */
async function getOrCreateCompanyByDomain(
  domain: string
): Promise<number | null> {
  if (!domain || domain.trim() === "") {
    return null;
  }

  // Normaliser le domaine
  const normalizedDomain = extractDomain(domain);
  if (!normalizedDomain) {
    return null;
  }

  // Chercher une company existante par domaine (champ domain ou website)
  const existingCompany = await db
    .select()
    .from(companies)
    .where(
      or(
        eq(companies.domain, normalizedDomain),
        eq(companies.website, domain),
        eq(companies.website, `https://${domain}`),
        eq(companies.website, `http://${domain}`),
        eq(companies.website, `https://www.${domain}`),
        eq(companies.website, `http://www.${domain}`)
      )
    )
    .limit(1);

  if (existingCompany.length > 0) {
    return existingCompany[0].id;
  }

  // Chercher par nom de domaine dans le nom de l'entreprise (fallback)
  const domainName = normalizedDomain.split(".")[0]; // Ex: "bricks" depuis "bricks.co"
  const companyByName = await db
    .select()
    .from(companies)
    .where(eq(companies.name, domainName))
    .limit(1);

  if (companyByName.length > 0) {
    return companyByName[0].id;
  }

  // Créer une nouvelle company avec le domaine
  const [newCompany] = await db
    .insert(companies)
    .values({
      name: domainName.charAt(0).toUpperCase() + domainName.slice(1), // Capitaliser
      domain: normalizedDomain,
      website: domain.startsWith("http") ? domain : `https://${domain}`,
    })
    .returning();

  return newCompany.id;
}

/**
 * Mappe les données Bulk Email Finder vers le schéma de la DB
 */
export async function mapBulkEmailFinderDataToLeads(
  apifyData: BulkEmailFinderData[],
  collectionId: number,
  userId: number
): Promise<{
  created: number;
  skipped: number;
  errors: number;
  enriched: number;
}> {
  let created = 0;
  let skipped = 0;
  let errors = 0;
  let enriched = 0;

  for (const data of apifyData) {
    try {
      // Si l'email n'a pas été trouvé, skip
      if (data.status !== "FOUND" || !data.email) {
        skipped++;
        continue;
      }

      // Trouver ou créer la company à partir du domaine
      const companyId = await getOrCreateCompanyByDomain(data.domain);

      // Chercher un lead existant dans cette collection par :
      // 1. Email (si déjà présent)
      // 2. firstName + lastName + companyId (si disponible)
      const collectionCondition = and(
        eq(leadCollections.leadId, leads.id),
        eq(leadCollections.collectionId, collectionId)
      );

      // Chercher par email d'abord
      const existingByEmail = await db
        .select({ lead: leads })
        .from(leads)
        .innerJoin(leadCollections, collectionCondition)
        .where(and(eq(leads.userId, userId), eq(leads.email, data.email)))
        .limit(1);

      if (existingByEmail.length > 0) {
        // Enrichir le lead existant
        await enrichLeadWithEmail(existingByEmail[0].lead, data, companyId);
        enriched++;
        continue;
      }

      // Chercher par nom + company
      if (data.firstName && data.lastName) {
        const nameConditions = [
          eq(leads.userId, userId),
          eq(leads.firstName, data.firstName),
          eq(leads.lastName, data.lastName),
        ];

        if (companyId) {
          nameConditions.push(eq(leads.companyId, companyId));
        }

        const existingByName = await db
          .select({ lead: leads })
          .from(leads)
          .innerJoin(leadCollections, collectionCondition)
          .where(and(...nameConditions))
          .limit(1);

        if (existingByName.length > 0) {
          // Enrichir le lead existant
          await enrichLeadWithEmail(existingByName[0].lead, data, companyId);
          enriched++;
          continue;
        }
      }

      // Créer un nouveau lead (lié via lead_collections)
      const fullName =
        data.firstName && data.lastName
          ? `${data.firstName} ${data.lastName}`
          : null;

      const [insertedLead] = await db.insert(leads).values({
        userId,
        companyId: companyId || null,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        fullName: fullName,
        email: data.email,
        emailCertainty: data.certainty || null,
      }).returning();

      if (insertedLead) {
        await db.insert(leadCollections).values({
          leadId: insertedLead.id,
          collectionId,
        });
      }

      created++;
    } catch (error) {
      console.error("Erreur lors du mapping d'un lead:", error, data);
      errors++;
    }
  }

  return { created, skipped, errors, enriched };
}
