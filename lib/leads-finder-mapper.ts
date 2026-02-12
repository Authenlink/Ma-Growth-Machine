import { ApifyLeadData } from "./apify-mapper";
import { mapApifyDataToLeads } from "./apify-mapper";

/**
 * Normalise les données Leads Finder (snake_case possible) vers ApifyLeadData (camelCase)
 */
function normalizeLeadsFinderData(raw: Record<string, unknown>): ApifyLeadData {
  const data: ApifyLeadData = {};

  // Person info - handle both snake_case and camelCase (Leads Finder: first_name, job_title, linkedin)
  data.firstName = (raw.first_name ?? raw.firstName) as string | undefined;
  data.lastName = (raw.last_name ?? raw.lastName) as string | undefined;
  data.fullName = (raw.full_name ?? raw.fullName) as string | undefined;
  data.position = (raw.position ?? raw.job_title ?? raw.title) as string | undefined;
  data.linkedinUrl = (raw.linkedin ?? raw.linkedin_url ?? raw.linkedinUrl) as string | undefined;
  data.headline = (raw.headline ?? raw.headLine) as string | undefined;
  data.seniority = (raw.seniority ?? raw.seniority_level) as string | undefined;
  data.functional = Array.isArray(raw.functional_level)
    ? (raw.functional_level as string[]).join(", ")
    : (raw.functional ?? raw.functional_level) as string | undefined;

  // Company info (org prefix) - Leads Finder: company_name, company_website, company_size (number)
  data.orgName = (raw.org_name ?? raw.orgName ?? raw.company_name ?? raw.companyName) as string | undefined;
  data.orgWebsite = (raw.org_website ?? raw.orgWebsite ?? raw.company_website ?? raw.companyWebsite ?? raw.website) as string | undefined;
  data.orgLinkedinUrl = (raw.org_linkedin_url ?? raw.orgLinkedinUrl ?? raw.company_linkedin ?? raw.company_linkedin_url) as string | undefined;
  data.orgIndustry = (raw.org_industry ?? raw.orgIndustry ?? raw.company_industry ?? raw.industry) as string | undefined;
  const rawSize = raw.org_size ?? raw.orgSize ?? raw.company_size ?? raw.size;
  data.orgSize = rawSize != null ? String(rawSize) : undefined;
  data.orgDomain = (raw.org_domain ?? raw.orgDomain ?? raw.company_domain ?? raw.companyDomain) as string | undefined;
  data.orgTechnologies = (raw.org_technologies ?? raw.orgTechnologies ?? raw.company_technologies ?? raw.companyTechnologies) as string | undefined;
  data.orgDescription = (raw.org_description ?? raw.orgDescription ?? raw.company_description) as string | undefined;
  data.orgCity = (raw.org_city ?? raw.orgCity ?? raw.company_city) as string | undefined;
  data.orgState = (raw.org_state ?? raw.orgState ?? raw.company_state) as string | undefined;
  data.orgCountry = (raw.org_country ?? raw.orgCountry ?? raw.company_country) as string | undefined;
  data.orgFoundedYear = (raw.org_founded_year ?? raw.orgFoundedYear ?? raw.founded_year) as string | number | undefined;

  // Contact
  data.email = (raw.email ?? raw.business_email ?? raw.work_email) as string | undefined;
  data.personalEmail = (raw.personal_email ?? raw.personalEmail) as string | undefined;
  data.emailCertainty = (raw.email_certainty ?? raw.emailCertainty ?? raw.email_status) as string | undefined;
  if (raw.phone ?? raw.phone_numbers ?? raw.mobile ?? raw.mobile_number) {
    const phone = raw.phone ?? raw.phone_numbers ?? raw.mobile ?? raw.mobile_number;
    if (Array.isArray(phone)) {
      data.phoneNumbers = phone.filter((p): p is string => typeof p === "string");
      data.phone = data.phoneNumbers[0];
    } else if (typeof phone === "string") {
      data.phone = phone;
      data.phoneNumbers = [phone];
    }
  }
  data.city = (raw.city ?? raw.contact_city) as string | undefined;
  data.state = (raw.state ?? raw.contact_state) as string | undefined;
  data.country = (raw.country ?? raw.contact_country ?? raw.contact_location) as string | undefined;

  // Copy any remaining fields that might be useful
  Object.keys(raw).forEach((key) => {
    if (!(key in data) && raw[key] !== undefined && raw[key] !== null) {
      (data as Record<string, unknown>)[key] = raw[key];
    }
  });

  return data;
}

/**
 * Mappe les données Leads Finder vers les leads en DB
 */
export async function mapLeadsFinderDataToLeads(
  leadsFinderData: Record<string, unknown>[],
  collectionId: number,
  userId: number
): Promise<{ created: number; skipped: number; errors: number }> {
  const normalizedData: ApifyLeadData[] = leadsFinderData.map((item) =>
    normalizeLeadsFinderData(item)
  );
  return mapApifyDataToLeads(normalizedData, collectionId, userId);
}
