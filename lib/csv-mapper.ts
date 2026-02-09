import { ApifyLeadData } from "./apify-mapper";

/**
 * Type pour les données CSV brutes (colonnes du fichier CSV)
 */
export interface CSVLeadData {
  // Informations personnelles
  fullName?: string;
  personId?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  linkedinUrl?: string;
  seniority?: string;
  functional?: string; // Format: "['sales']" ou similaire

  // Contact
  email?: string;
  personal_email?: string;
  phone_numbers?: string; // Peut être une string JSON array ou une string simple
  city?: string;
  state?: string;
  country?: string;

  // Informations entreprise (préfixe "organization")
  organizationName?: string;
  organizationWebsite?: string;
  organizationLinkedinUrl?: string;
  organizationFoundedYear?: string | number;
  organizationIndustry?: string;
  organizationSize?: string;
  organizationDescription?: string;
  organizationSpecialities?: string;
  organizationCity?: string;
  organizationState?: string;
  organizationCountry?: string;

  // Champs marketing (optionnels)
  status?: string;
  validated?: string | boolean;
  reason?: string;
  companyLinedinPost?: string;
  personLinkedinPost?: string;
  iceBreaker?: string;

  // Autres champs possibles
  [key: string]: unknown;
}

/**
 * Parse phone_numbers qui peut être une string JSON array ou une string simple
 */
function parsePhoneNumbers(phoneNumbers?: string): string[] | null {
  if (!phoneNumbers || phoneNumbers.trim() === "") {
    return null;
  }

  try {
    // Essayer de parser comme JSON d'abord
    const parsed = JSON.parse(phoneNumbers);
    if (Array.isArray(parsed)) {
      return parsed.filter((p) => p && typeof p === "string");
    }
  } catch {
    // Si ce n'est pas du JSON valide, traiter comme une string simple
    return phoneNumbers.trim() ? [phoneNumbers.trim()] : null;
  }

  return null;
}

/**
 * Parse validated qui peut être une string "true"/"false" ou un boolean
 */
function parseValidated(validated?: string | boolean): boolean {
  if (typeof validated === "boolean") return validated;
  if (typeof validated === "string") {
    return validated.toLowerCase() === "true" || validated === "1";
  }
  return false;
}

/**
 * Transforme les données CSV en format Apify compatible
 */
export function mapCSVDataToApifyFormat(
  csvData: CSVLeadData[]
): ApifyLeadData[] {
  return csvData.map((row) => {
    const apifyData: ApifyLeadData & { personalEmail?: string; phoneNumbers?: string[] } = {
      // Informations personnelles
      firstName: row.firstName?.trim() || undefined,
      lastName: row.lastName?.trim() || undefined,
      fullName: row.fullName?.trim() || undefined,
      position: row.position?.trim() || undefined,
      linkedinUrl: row.linkedinUrl?.trim() || undefined,
      seniority: row.seniority?.trim() || undefined,
      functional: row.functional?.trim() || undefined,

      // Informations entreprise (mapping du préfixe "organization" vers "org")
      orgName: row.organizationName?.trim() || undefined,
      orgWebsite: row.organizationWebsite?.trim() || undefined,
      orgLinkedinUrl: row.organizationLinkedinUrl?.trim() || undefined,
      orgFoundedYear: row.organizationFoundedYear || undefined,
      orgIndustry: row.organizationIndustry?.trim() || undefined,
      orgSize: row.organizationSize?.trim() || undefined,
      orgDescription: row.organizationDescription?.trim() || undefined,
      orgCity: row.organizationCity?.trim() || undefined,
      orgState: row.organizationState?.trim() || undefined,
      orgCountry: row.organizationCountry?.trim() || undefined,

      // Contact
      email: row.email?.trim() || undefined,
      city: row.city?.trim() || undefined,
      state: row.state?.trim() || undefined,
      country: row.country?.trim() || undefined,
    };

    // Gérer phone_numbers (peut être un array ou une string)
    const phoneNumbers = parsePhoneNumbers(row.phone_numbers);
    if (phoneNumbers && phoneNumbers.length > 0) {
      // Si c'est un array, prendre le premier élément comme phone (format Apify)
      apifyData.phone = phoneNumbers[0];
      // Stocker aussi comme phoneNumbers pour le mapper Apify
      apifyData.phoneNumbers = phoneNumbers;
    }

    // Gérer personalEmail (stocké séparément pour le mapper Apify)
    if (row.personal_email?.trim()) {
      apifyData.personalEmail = row.personal_email.trim();
    }

    // Gérer les champs marketing si présents
    if (row.status?.trim()) {
      (apifyData as any).status = row.status.trim();
    }
    if (row.validated !== undefined) {
      (apifyData as any).validated = parseValidated(row.validated);
    }
    if (row.reason?.trim()) {
      (apifyData as any).reason = row.reason.trim();
    }

    return apifyData;
  });
}
