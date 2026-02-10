import { db } from "./db";
import { leads, companies, leadCollections } from "./schema";
import { eq, and, or } from "drizzle-orm";

/**
 * Type pour les données brutes retournées par le scraper harvestapi/linkedin-company-employees
 * Basé sur la structure réelle retournée par le scraper (voir outputEmployee.json)
 */
export interface LinkedInEmployeeData {
  id?: string;
  publicIdentifier?: string;
  linkedinUrl?: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  about?: string;
  location?: {
    linkedinText?: string;
    countryCode?: string;
    parsed?: {
      text?: string;
      countryCode?: string;
      regionCode?: string | null;
      country?: string;
      countryFull?: string;
      state?: string;
      city?: string;
    };
  };
  currentPosition?: Array<{
    companyId?: string;
    companyLinkedinUrl?: string;
    companyName?: string;
    dateRange?: {
      start?: {
        month?: number | string;
        year?: number;
        day?: number | null;
      };
      end?: {
        month?: number | string;
        year?: number;
        day?: number | null;
      } | null;
    };
    position?: string;
  }>;
  experience?: Array<Record<string, unknown>>;
  education?: Array<Record<string, unknown>>;
  topSkills?: string[] | null;
  connectionsCount?: number;
  followerCount?: number;
  profilePicture?: {
    url?: string;
    sizes?: Array<{
      url: string;
      width: number;
      height: number;
      expiresAt: number;
    }>;
  } | null;
  photo?: string;
  objectUrn?: string;
  registeredAt?: string;
  openToWork?: boolean;
  verified?: boolean;
  [key: string]: unknown;
}

/**
 * Parse registeredAt qui peut être une string ISO ou null
 */
function parseRegisteredAt(date?: string): Date | null {
  if (!date) return null;
  try {
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Extrait l'URL de la photo de profil depuis l'objet profilePicture ou photo
 */
function extractProfilePictureUrl(data: LinkedInEmployeeData): string | null {
  if (data.photo && typeof data.photo === "string") {
    return data.photo;
  }
  if (data.profilePicture?.url && typeof data.profilePicture.url === "string") {
    return data.profilePicture.url;
  }
  return null;
}

/**
 * Extrait le nom de l'entreprise depuis currentPosition
 */
function extractCompanyName(data: LinkedInEmployeeData): string | null {
  if (data.currentPosition && Array.isArray(data.currentPosition) && data.currentPosition.length > 0) {
    const firstPosition = data.currentPosition[0];
    if (firstPosition?.companyName && typeof firstPosition.companyName === "string") {
      return firstPosition.companyName;
    }
  }
  return null;
}

/**
 * Extrait l'URL LinkedIn de l'entreprise depuis currentPosition
 */
function extractCompanyLinkedinUrl(data: LinkedInEmployeeData): string | null {
  if (data.currentPosition && Array.isArray(data.currentPosition) && data.currentPosition.length > 0) {
    const firstPosition = data.currentPosition[0];
    if (firstPosition?.companyLinkedinUrl && typeof firstPosition.companyLinkedinUrl === "string") {
      return firstPosition.companyLinkedinUrl;
    }
  }
  return null;
}

/**
 * Extrait le poste actuel depuis currentPosition ou headline
 */
function extractPosition(data: LinkedInEmployeeData): string | null {
  if (data.currentPosition && Array.isArray(data.currentPosition) && data.currentPosition.length > 0) {
    const firstPosition = data.currentPosition[0];
    if (firstPosition?.position && typeof firstPosition.position === "string") {
      return firstPosition.position;
    }
  }
  if (data.headline && typeof data.headline === "string") {
    return data.headline;
  }
  return null;
}

/**
 * Extrait le domaine d'une URL ou retourne la valeur si c'est déjà un domaine
 */
function extractDomain(urlOrDomain?: string | null): string | null {
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
 */
async function getOrCreateCompany(
  companyName: string | null,
  companyLinkedinUrl: string | null,
  companyDomain?: string | null
): Promise<number | null> {
  if (!companyName || companyName.trim() === "") {
    return null;
  }

  // Chercher une company existante par nom, domaine ou URL LinkedIn
  const conditions = [eq(companies.name, companyName)];
  
  if (companyDomain) {
    const domain = extractDomain(companyDomain);
    if (domain) {
      conditions.push(eq(companies.domain, domain));
    }
  }
  
  if (companyLinkedinUrl && companyLinkedinUrl.trim() !== "") {
    conditions.push(eq(companies.linkedinUrl, companyLinkedinUrl));
  }

  const existingCompany = await db
    .select()
    .from(companies)
    .where(or(...conditions))
    .limit(1);

  if (existingCompany.length > 0) {
    return existingCompany[0].id;
  }

  // Extraire le domaine si fourni
  const domain = companyDomain ? extractDomain(companyDomain) : null;

  // Créer une nouvelle company
  const [newCompany] = await db
    .insert(companies)
    .values({
      name: companyName,
      domain: domain || null,
      linkedinUrl: companyLinkedinUrl && companyLinkedinUrl.trim() !== "" ? companyLinkedinUrl : null,
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
  data: LinkedInEmployeeData,
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
  if (!existingLead.fullName && (data.firstName || data.lastName)) {
    updateData.fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim() || null;
  }
  if (!existingLead.position) {
    const position = extractPosition(data);
    if (position) updateData.position = position;
  }
  if (!existingLead.headline && data.headline) {
    updateData.headline = data.headline;
  }
  if (!existingLead.about && data.about) {
    updateData.about = data.about;
  }
  if (!existingLead.publicIdentifier && data.publicIdentifier) {
    updateData.publicIdentifier = data.publicIdentifier;
  }
  if (!existingLead.objectUrn && data.objectUrn) {
    updateData.objectUrn = data.objectUrn;
  }
  if (!existingLead.profilePicture) {
    const profilePicture = extractProfilePictureUrl(data);
    if (profilePicture) updateData.profilePicture = profilePicture;
  }
  if (existingLead.connectionsCount === null && data.connectionsCount !== undefined) {
    updateData.connectionsCount = data.connectionsCount;
  }
  if (existingLead.followerCount === null && data.followerCount !== undefined) {
    updateData.followerCount = data.followerCount;
  }
  if (!existingLead.registeredAt && data.registeredAt) {
    const registeredAt = parseRegisteredAt(data.registeredAt);
    if (registeredAt) updateData.registeredAt = registeredAt;
  }
  if (existingLead.openToWork === null && data.openToWork !== undefined) {
    updateData.openToWork = data.openToWork;
  }
  if (existingLead.verified === null && data.verified !== undefined) {
    updateData.verified = data.verified;
  }

  // Localisation
  if (data.location?.parsed) {
    const parsed = data.location.parsed;
    if (!existingLead.city && parsed.city) {
      updateData.city = parsed.city;
    }
    if (!existingLead.state && parsed.state) {
      updateData.state = parsed.state;
    }
    if (!existingLead.country && parsed.country) {
      updateData.country = parsed.country;
    }
  }

  // Champs JSON - remplacer si plus complet (on peut décider de fusionner plus tard)
  if (data.currentPosition && Array.isArray(data.currentPosition) && data.currentPosition.length > 0) {
    updateData.currentPosition = data.currentPosition;
  }
  if (data.experience && Array.isArray(data.experience) && data.experience.length > 0) {
    updateData.experience = data.experience;
  }
  if (data.education && Array.isArray(data.education) && data.education.length > 0) {
    updateData.education = data.education;
  }
  if (data.topSkills && Array.isArray(data.topSkills) && data.topSkills.length > 0) {
    updateData.topSkills = data.topSkills;
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
 * Mappe les données LinkedIn Employees vers le schéma de la DB
 */
export async function mapLinkedInEmployeesToLeads(
  apifyData: LinkedInEmployeeData[],
  collectionId: number,
  userId: number,
  companyLinkedinUrl?: string
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
      // Vérifier si le lead existe déjà dans cette collection (par linkedinUrl ou publicIdentifier)
      const conditions = [eq(leads.userId, userId)];
      if (data.linkedinUrl) conditions.push(eq(leads.linkedinUrl, data.linkedinUrl));
      if (data.publicIdentifier) conditions.push(eq(leads.publicIdentifier, data.publicIdentifier));

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
        const companyName = extractCompanyName(data);
        const companyLinkedinUrlFromData = extractCompanyLinkedinUrl(data);
        const companyId = await getOrCreateCompany(companyName, companyLinkedinUrlFromData || companyLinkedinUrl || null);
        await enrichLead(existingLead[0].lead, data, companyId);
        enriched++;
        continue;
      }

      // Créer un nouveau lead
      const companyName = extractCompanyName(data);
      const companyLinkedinUrlFromData = extractCompanyLinkedinUrl(data);
      const companyId = await getOrCreateCompany(companyName, companyLinkedinUrlFromData || companyLinkedinUrl || null);

      // Extraire le nom complet
      const fullName =
        data.firstName && data.lastName
          ? `${data.firstName} ${data.lastName}`
          : null;

      // Extraire la position
      const position = extractPosition(data);

      // Extraire la localisation
      const location = data.location?.parsed;
      const city = location?.city || null;
      const state = location?.state || null;
      const country = location?.country || null;

      // Extraire la photo de profil
      const profilePicture = extractProfilePictureUrl(data);

      // Parser registeredAt
      const registeredAt = parseRegisteredAt(data.registeredAt);

      // Créer le lead (lié via lead_collections)
      const [insertedLead] = await db.insert(leads).values({
        userId,
        companyId: companyId || null,
        personId: data.id || null,
        fullName,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        position: position || null,
        linkedinUrl: data.linkedinUrl || null,
        headline: data.headline || null,
        about: data.about || null,
        publicIdentifier: data.publicIdentifier || null,
        objectUrn: data.objectUrn || null,
        profilePicture: profilePicture || null,
        connectionsCount: data.connectionsCount || null,
        followerCount: data.followerCount || null,
        registeredAt: registeredAt || null,
        openToWork: data.openToWork !== undefined ? data.openToWork : null,
        verified: data.verified !== undefined ? data.verified : null,
        currentPosition: data.currentPosition && Array.isArray(data.currentPosition) ? data.currentPosition : null,
        experience: data.experience && Array.isArray(data.experience) ? data.experience : null,
        education: data.education && Array.isArray(data.education) ? data.education : null,
        topSkills: data.topSkills && Array.isArray(data.topSkills) ? data.topSkills : null,
        city,
        state,
        country,
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
