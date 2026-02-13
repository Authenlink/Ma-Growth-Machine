import {
  Mail,
  MailCheck,
  Share2,
  Star,
  Search,
  Users,
  UserCircle,
  Sparkles,
  Cloud,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export type FilterOption = {
  value: string;
  label: string;
  Icon?: LucideIcon;
  iconClassName?: string;
};

/**
 * Info type (info_type column) - labels and icons for scrapers filter
 */
export const INFO_TYPE_OPTIONS: Record<string, Omit<FilterOption, "value">> = {
  email_finder: { label: "Email finder", Icon: Mail, iconClassName: "text-sky-600 dark:text-sky-400" },
  email_verify: { label: "Vérification email", Icon: MailCheck, iconClassName: "text-teal-600 dark:text-teal-400" },
  employee_infos: { label: "Infos employés", Icon: Users, iconClassName: "text-indigo-600 dark:text-indigo-400" },
  leads: { label: "Leads", Icon: UserCircle, iconClassName: "text-blue-600 dark:text-blue-400" },
  reviews: { label: "Avis", Icon: Star, iconClassName: "text-amber-600 dark:text-amber-400" },
  seo: { label: "SEO", Icon: Search, iconClassName: "text-emerald-600 dark:text-emerald-400" },
  social_media_posts: { label: "Posts réseaux", Icon: Share2, iconClassName: "text-indigo-600 dark:text-indigo-400" },
  contact_info: { label: "Infos contact", Icon: Mail, iconClassName: "text-sky-600 dark:text-sky-400" },
};

export function getInfoTypeOption(value: string): FilterOption {
  const opt = INFO_TYPE_OPTIONS[value];
  return opt
    ? { value, ...opt }
    : { value, label: value, Icon: Sparkles, iconClassName: "text-muted-foreground" };
}

/**
 * Provider - labels and icons for scrapers filter
 */
export const PROVIDER_OPTIONS: Record<string, Omit<FilterOption, "value">> = {
  apify: { label: "Apify", Icon: Cloud, iconClassName: "text-blue-600 dark:text-blue-400" },
  emaillistverify: { label: "EmailListVerify", Icon: Mail, iconClassName: "text-emerald-600 dark:text-emerald-400" },
  google: { label: "Google", Icon: Search, iconClassName: "text-amber-600 dark:text-amber-400" },
};

export function getProviderOption(value: string): FilterOption {
  const opt = PROVIDER_OPTIONS[value];
  return opt
    ? { value, ...opt }
    : { value, label: value, Icon: Cloud, iconClassName: "text-muted-foreground" };
}

/**
 * Source - labels and icons for scrapers filter
 */
export const SOURCE_OPTIONS: Record<string, Omit<FilterOption, "value">> = {
  apollo: { label: "Apollo", Icon: UserCircle, iconClassName: "text-purple-600 dark:text-purple-400" },
  "leads-finder": { label: "Leads Finder", Icon: UserCircle, iconClassName: "text-blue-600 dark:text-blue-400" },
  linkedin: { label: "LinkedIn", Icon: Share2, iconClassName: "text-[#0A66C2]" },
  email: { label: "Email", Icon: Mail, iconClassName: "text-sky-600 dark:text-sky-400" },
  trustpilot: { label: "Trustpilot", Icon: Star, iconClassName: "text-[#00b67a]" },
  emaillistverify: { label: "EmailListVerify", Icon: MailCheck, iconClassName: "text-emerald-600 dark:text-emerald-400" },
  apify: { label: "Apify", Icon: Cloud, iconClassName: "text-blue-600 dark:text-blue-400" },
  google: { label: "Google", Icon: Search, iconClassName: "text-amber-600 dark:text-amber-400" },
};

export function getSourceOption(value: string): FilterOption {
  const opt = SOURCE_OPTIONS[value];
  return opt
    ? { value, ...opt }
    : { value, label: value, Icon: Sparkles, iconClassName: "text-muted-foreground" };
}

/**
 * Payment type - labels and icons for scrapers filter
 */
export const PAYMENT_TYPE_OPTIONS: Record<string, Omit<FilterOption, "value">> = {
  pay_per_event: { label: "Pay per event", Icon: CreditCard, iconClassName: "text-muted-foreground" },
  pay_per_result: { label: "Pay per result", Icon: CreditCard, iconClassName: "text-muted-foreground" },
  pay_per_posts: { label: "Pay per post", Icon: CreditCard, iconClassName: "text-muted-foreground" },
  pay_per_reviews: { label: "Pay per review", Icon: CreditCard, iconClassName: "text-muted-foreground" },
  free_tier: { label: "Gratuit", Icon: Sparkles, iconClassName: "text-emerald-600 dark:text-emerald-400" },
};

export function getPaymentTypeOption(value: string): FilterOption {
  const opt = PAYMENT_TYPE_OPTIONS[value];
  return opt
    ? { value, ...opt }
    : { value, label: value, Icon: CreditCard, iconClassName: "text-muted-foreground" };
}
