import { db } from "./db";
import { leads, companies, leadCollections } from "./schema";
import { eq, and, or } from "drizzle-orm";

/**
 * Type pour les données brutes retournées par Apify
 * Basé sur la structure réelle retournée par le scraper
 */
export interface ApifyLeadData {
  // Informations personnelles
  firstName?: string;
  lastName?: string;
  fullName?: string;
  position?: string;
  linkedinUrl?: string;
  headline?: string;
  seniority?: string;
  functional?: string; // Format: "['sales']" ou similaire (string, pas array)

  // Informations entreprise (préfixées par "org")
  orgName?: string;
  orgWebsite?: string;
  orgLinkedinUrl?: string;
  orgFoundedYear?: string | number;
  orgIndustry?: string;
  orgSize?: string;
  orgDomain?: string;
  orgTechnologies?: string;
  orgDescription?: string;
  orgCity?: string;
  orgState?: string;
  orgCountry?: string;

  // Contact
  email?: string;
  emailCertainty?: string; // Certitude de l'email (ultra_sure, sure, etc.)
  personalEmail?: string; // Email personnel (depuis CSV)
  phone?: string; // Pas phoneNumbers comme array
  phoneNumbers?: string[]; // Array de numéros de téléphone (depuis CSV)
  city?: string;
  state?: string;
  country?: string;

  // Champs techniques Apify
  ppeIndex?: number;
  ppeBatchIndex?: number;

  // Champs marketing (optionnels, depuis CSV)
  status?: string;
  validated?: boolean;
  reason?: string;

  // Autres champs possibles
  [key: string]: unknown;
}

/**
 * Parse le champ functional qui est une string comme "['sales']" en array
 */
function parseFunctional(functional?: string): string[] | null {
  if (!functional) return null;

  try {
    // Le format est "['sales']" ou similaire
    // On essaie de parser comme JSON d'abord
    const parsed = JSON.parse(functional);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [functional];
  } catch {
    // Si ce n'est pas du JSON valide, retourner comme array avec un seul élément
    return functional.trim() ? [functional] : null;
  }
}

/**
 * Parse les URLs LinkedIn qui peuvent être sous forme de string ou de tableau
 * Format attendu: "http://www.linkedin.com/company/3284074" ou "['http://www.linkedin.com/company/3284074']"
 */
function parseLinkedinUrl(linkedinUrl?: string): string | null {
  if (!linkedinUrl || linkedinUrl.trim() === "") {
    return null;
  }

  const trimmed = linkedinUrl.trim();

  try {
    // Essayer de parser comme JSON d'abord (au cas où c'est un tableau)
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Prendre le premier élément du tableau
      const url = parsed[0];
      return typeof url === "string" ? url.trim() : null;
    }
    // Si ce n'est pas un tableau, traiter comme une string normale
    return trimmed;
  } catch {
    // Si ce n'est pas du JSON valide, retourner la string telle quelle
    return trimmed;
  }
}

/**
 * Parse orgFoundedYear qui peut être une string ou un number
 */
function parseFoundedYear(year?: string | number): number | null {
  if (!year) return null;
  if (typeof year === "number") return year;
  const parsed = parseInt(year, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Extrait le domaine d'une URL ou retourne la valeur si c'est déjà un domaine
 */
function extractDomain(urlOrDomain?: string): string | null {
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
 * Crée ou récupère une company dans la DB
 * Évite les doublons en cherchant par nom ou domaine
 */
async function getOrCreateCompany(
  companyData: ApifyLeadData
): Promise<number | null> {
  if (!companyData.orgName || companyData.orgName.trim() === "") {
    return null;
  }

  // Extraire le domaine : priorité orgDomain (ex: company_domain), sinon depuis website
  const domain = companyData.orgDomain && companyData.orgDomain.trim() !== ""
    ? companyData.orgDomain.trim().replace(/^www\./, "")
    : companyData.orgWebsite
      ? extractDomain(companyData.orgWebsite)
      : null;

  // Chercher une company existante par nom, domaine ou website
  const searchConditions = [eq(companies.name, companyData.orgName)];
  
  if (domain) {
    searchConditions.push(eq(companies.domain, domain));
  }
  if (companyData.orgWebsite && companyData.orgWebsite.trim() !== "") {
    searchConditions.push(eq(companies.website, companyData.orgWebsite));
  }
  
  const existingCompany = await db
    .select()
    .from(companies)
    .where(or(...searchConditions))
    .limit(1);

  if (existingCompany.length > 0) {
    return existingCompany[0].id;
  }

  // Créer une nouvelle company
  const [newCompany] = await db
    .insert(companies)
    .values({
      name: companyData.orgName,
      website: companyData.orgWebsite && companyData.orgWebsite.trim() !== ""
        ? companyData.orgWebsite
        : null,
      domain: domain || null,
      linkedinUrl: parseLinkedinUrl(companyData.orgLinkedinUrl),
      foundedYear: parseFoundedYear(companyData.orgFoundedYear),
      industry: companyData.orgIndustry && companyData.orgIndustry.trim() !== ""
        ? companyData.orgIndustry
        : null,
      size: companyData.orgSize && String(companyData.orgSize).trim() !== ""
        ? String(companyData.orgSize)
        : null,
      description: companyData.orgDescription && companyData.orgDescription.trim() !== ""
        ? companyData.orgDescription
        : null,
      specialities: null,
      technologies: companyData.orgTechnologies && companyData.orgTechnologies.trim() !== ""
        ? companyData.orgTechnologies
        : null,
      city: companyData.orgCity && companyData.orgCity.trim() !== ""
        ? companyData.orgCity
        : null,
      state: companyData.orgState && companyData.orgState.trim() !== ""
        ? companyData.orgState
        : null,
      country: companyData.orgCountry && companyData.orgCountry.trim() !== ""
        ? companyData.orgCountry
        : null,
    })
    .returning();

  return newCompany.id;
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
 * Enrichit un lead existant avec de nouvelles données sans remplacer les valeurs existantes
 */
async function enrichLead(
  existingLead: typeof leads.$inferSelect,
  data: ApifyLeadData,
  companyId: number | null
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  // Enrichir uniquement les champs vides/null
  if (!existingLead.firstName && data.firstName) {
    updateData.firstName = data.firstName;
  }
  if (!existingLead.lastName && data.lastName) {
    updateData.lastName = data.lastName;
  }
  if (!existingLead.fullName && (data.fullName || (data.firstName && data.lastName))) {
    updateData.fullName = data.fullName || `${data.firstName} ${data.lastName}`.trim() || null;
  }
  if (!existingLead.position && data.position) {
    updateData.position = data.position;
  }
  if (!existingLead.linkedinUrl && data.linkedinUrl) {
    updateData.linkedinUrl = parseLinkedinUrl(data.linkedinUrl);
  }
  if (!existingLead.headline && data.headline) {
    updateData.headline = data.headline;
  }
  if (!existingLead.seniority && data.seniority) {
    updateData.seniority = data.seniority;
  }
  if (!existingLead.functional && data.functional) {
    const functionalArray = parseFunctional(data.functional);
    if (functionalArray && functionalArray.length > 0) {
      updateData.functional = functionalArray.join(", ");
    }
  }
  // Gérer l'email avec logique de certitude
  if (data.email) {
    const emailCertainty = (data.emailCertainty as string) || null;
    if (!existingLead.email) {
      // Pas d'email existant, ajouter le nouveau
      updateData.email = data.email;
      if (emailCertainty) {
        updateData.emailCertainty = emailCertainty;
      }
    } else if (isBetterCertainty(emailCertainty, existingLead.emailCertainty)) {
      // Email existant mais nouvelle certitude meilleure, remplacer
      updateData.email = data.email;
      if (emailCertainty) {
        updateData.emailCertainty = emailCertainty;
      }
    }
  }
  if (!existingLead.personalEmail && data.personalEmail) {
    updateData.personalEmail = data.personalEmail;
  }
  if (!existingLead.phoneNumbers && (data.phoneNumbers || data.phone)) {
    let phoneNumbers: string[] | null = null;
    if (data.phoneNumbers && Array.isArray(data.phoneNumbers)) {
      phoneNumbers = data.phoneNumbers.filter((p) => p && p.trim() !== "");
    } else if (data.phone && data.phone.trim() !== "") {
      phoneNumbers = [data.phone];
    }
    if (phoneNumbers && phoneNumbers.length > 0) {
      updateData.phoneNumbers = phoneNumbers;
    }
  }
  if (!existingLead.city && data.city) {
    updateData.city = data.city;
  }
  if (!existingLead.state && data.state) {
    updateData.state = data.state;
  }
  if (!existingLead.country && data.country) {
    updateData.country = data.country;
  }
  if (existingLead.status === null && data.status) {
    updateData.status = data.status;
  }
  if (existingLead.reason === null && data.reason) {
    updateData.reason = data.reason;
  }

  // Company ID
  if (!existingLead.companyId && companyId) {
    updateData.companyId = companyId;
  }

  // Mettre à jour uniquement si on a des changements
  if (Object.keys(updateData).length > 1) {
    await db
      .update(leads)
      .set(updateData)
      .where(eq(leads.id, existingLead.id));
  }
}

/**
 * Mappe les données Apify vers le schéma de la DB
 */
export async function mapApifyDataToLeads(
  apifyData: ApifyLeadData[],
  collectionId: number,
  userId: number,
  options?: { scraperId?: number },
): Promise<{
  created: number;
  skipped: number;
  errors: number;
  enriched?: number;
}> {
  let created = 0;
  let skipped = 0;
  let errors = 0;
  let enriched = 0;

  for (const data of apifyData) {
    try {
      // Vérifier si le lead existe déjà dans cette collection (par email ou linkedinUrl)
      if (data.email || data.linkedinUrl) {
        const conditions = [eq(leads.userId, userId)];
        if (data.email) conditions.push(eq(leads.email, data.email));
        if (data.linkedinUrl) conditions.push(eq(leads.linkedinUrl, data.linkedinUrl));

        const existingLead = await db
          .select({ lead: leads })
          .from(leads)
          .innerJoin(leadCollections, and(
            eq(leadCollections.leadId, leads.id),
            eq(leadCollections.collectionId, collectionId)
          ))
          .where(and(...conditions))
          .limit(1);

        if (existingLead.length > 0) {
          // Enrichir le lead existant
          const companyId = await getOrCreateCompany(data);
          await enrichLead(existingLead[0].lead, data, companyId);
          enriched++;
          continue;
        }
      }

      // Créer ou récupérer la company
      const companyId = await getOrCreateCompany(data);

      // Extraire le nom complet si nécessaire
      const fullName =
        data.fullName ||
        (data.firstName && data.lastName
          ? `${data.firstName} ${data.lastName}`
          : null);

      // Parser le champ functional (string format "['sales']" -> array)
      const functionalArray = parseFunctional(data.functional);
      
      // Parser phoneNumbers (peut être un array depuis CSV ou une string depuis Apify)
      let phoneNumbers: string[] | null = null;
      if (data.phoneNumbers && Array.isArray(data.phoneNumbers)) {
        // Si c'est déjà un array (depuis CSV)
        phoneNumbers = data.phoneNumbers.filter((p) => p && p.trim() !== "");
      } else if (data.phone && data.phone.trim() !== "") {
        // Si c'est une string (depuis Apify)
        phoneNumbers = [data.phone];
      }

      // Créer le lead (sans collectionId - lié via lead_collections)
      const [insertedLead] = await db.insert(leads).values({
        userId,
        companyId: companyId || null,
        sourceScraperId: options?.scraperId ?? null,
        personId: null, // Pas de personId dans les données Apify
        fullName: fullName || null,
        firstName: data.firstName && data.firstName.trim() !== "" ? data.firstName : null,
        lastName: data.lastName && data.lastName.trim() !== "" ? data.lastName : null,
        position: data.position && data.position.trim() !== "" ? data.position : null,
        linkedinUrl: parseLinkedinUrl(data.linkedinUrl),
        headline: data.headline && data.headline.trim() !== "" ? data.headline : null,
        seniority: data.seniority && data.seniority.trim() !== "" ? data.seniority : null,
        functional: functionalArray && functionalArray.length > 0 
          ? functionalArray.join(", ") 
          : null, // Stocker comme string séparée par virgules
        email: data.email && data.email.trim() !== "" ? data.email : null,
        personalEmail: data.personalEmail && data.personalEmail.trim() !== "" 
          ? data.personalEmail 
          : null,
        phoneNumbers: phoneNumbers && phoneNumbers.length > 0 ? phoneNumbers : null,
        city: data.city && data.city.trim() !== "" ? data.city : null,
        state: data.state && data.state.trim() !== "" ? data.state : null,
        country: data.country && data.country.trim() !== "" ? data.country : null,
        // Les champs marketing peuvent être fournis depuis CSV ou seront remplis plus tard lors de l'enrichissement
        status: data.status && data.status.trim() !== "" ? data.status : null,
        validated: data.validated !== undefined ? data.validated : false,
        reason: data.reason && data.reason.trim() !== "" ? data.reason : null,
      }).returning();

      // Associer le lead à la collection
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
