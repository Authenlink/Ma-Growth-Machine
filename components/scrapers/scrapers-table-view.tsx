"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Sparkles, Minus } from "lucide-react";
import { useRouter } from "next/navigation";

interface PricingTier {
  name: string;
  costPerThousand: number;
  costPerLead: number;
}

interface Scraper {
  id: number;
  name: string;
  description: string | null;
  provider: string;
  mapperType?: string | null;
  source?: string | null;
  infoType?: string | null;
  toolUrl?: string | null;
  paymentType?: string | null;
  costPerThousand?: number | null;
  costPerLead?: number | null;
  actorStartCost?: number | null;
  freeQuotaMonthly?: number | null;
  pricingTiers?: PricingTier[] | null;
  usesAi?: boolean | null;
}

interface ScrapersTableViewProps {
  scrapers: Scraper[];
}

const PAYMENT_TYPE_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "success" }
> = {
  pay_per_event: { label: "Pay per event", variant: "secondary" },
  pay_per_result: { label: "Pay per result", variant: "secondary" },
  pay_per_posts: { label: "Pay per post", variant: "secondary" },
  pay_per_reviews: { label: "Pay per review", variant: "secondary" },
  free_tier: { label: "Gratuit", variant: "success" },
};

const INFO_TYPE_LABELS: Record<string, string> = {
  contact_info: "Infos contact",
  social_media_posts: "Posts sociaux",
  reviews: "Avis",
  seo: "SEO",
};

const MAPPER_TYPE_LABELS: Record<string, string> = {
  apify: "Apify",
  "leads-finder": "Leads Finder",
  "bulk-email-finder": "Bulk Email",
  "email-verify": "Email Verify",
  "trustpilot-reviews": "Trustpilot",
  "pagespeed-seo": "PageSpeed",
  "seo-local-ranking": "SEO Local",
  "linkedin-company-posts": "LinkedIn Posts",
  "linkedin-profile-posts": "LinkedIn Profile",
  "linkedin-company-employees": "LinkedIn Employees",
};

function formatCurrency(value: number): string {
  if (value < 0.01) {
    return `$${value.toFixed(5)}`;
  }
  if (value < 1) {
    return `$${value.toFixed(4)}`;
  }
  return `$${value.toFixed(2)}`;
}

function formatCostPerThousand(value: number): string {
  return `$${value.toFixed(2)}/1k`;
}

export function ScrapersTableView({ scrapers }: ScrapersTableViewProps) {
  const router = useRouter();

  if (scrapers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun scraper trouve
      </div>
    );
  }

  const headerCellClass =
    "h-10 px-3 text-left align-middle font-medium text-xs border-r border-border last:border-r-0 sticky top-0 bg-muted z-[2] whitespace-nowrap";
  const stickyHeaderClass = `${headerCellClass} left-0 z-[3] min-w-[180px] max-w-[220px] border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]`;
  const cellClass =
    "px-3 py-2.5 align-middle text-sm border-r border-border last:border-r-0";
  const getStickyCellClass = (isEvenRow: boolean) =>
    `${cellClass} sticky left-0 z-[1] min-w-[180px] max-w-[220px] border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] ${isEvenRow ? "bg-muted/50" : "bg-background"}`;

  return (
    <div className="w-full min-w-0 rounded-md border max-h-[calc(100vh-250px)] overflow-auto">
      <div className="min-w-max">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className={stickyHeaderClass}>Nom</th>
              <th className={headerCellClass} title="Utilise l'IA (ChatGPT)">
                IA
              </th>
              <th className={headerCellClass}>Description</th>
              <th className={headerCellClass}>Catégorie</th>
              <th className={headerCellClass}>Type</th>
              <th className={headerCellClass}>Provider</th>
              <th className={headerCellClass}>Source</th>
              <th className={headerCellClass}>Paiement</th>
              <th className={headerCellClass}>Cout / 1k</th>
              <th className={headerCellClass}>Cout / lead</th>
              <th className={headerCellClass}>Actor start</th>
              <th className={headerCellClass}>Quota gratuit</th>
              <th className={headerCellClass}>Options tarifaires</th>
              <th className={headerCellClass}>Lien outil</th>
              <th className={headerCellClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {scrapers.map((scraper, index) => {
              const paymentMeta = scraper.paymentType
                ? PAYMENT_TYPE_LABELS[scraper.paymentType]
                : null;
              const infoTypeLabel = scraper.infoType
                ? INFO_TYPE_LABELS[scraper.infoType] || scraper.infoType
                : null;

              return (
                <tr
                  key={scraper.id}
                  className="border-b border-border transition-colors hover:bg-muted/50 cursor-pointer even:bg-muted/30"
                  onClick={() => router.push(`/leads/scrape/${scraper.id}`)}
                >
                  {/* Nom (sticky) */}
                  <td className={getStickyCellClass(index % 2 === 1)}>
                    <span className="font-medium text-primary hover:underline block">
                      {scraper.name}
                    </span>
                  </td>

                  {/* IA */}
                  <td className={cellClass}>
                    {scraper.usesAi ? (
                      <Sparkles
                        className="h-4 w-4 text-primary"
                        title="Scraper IA"
                      />
                    ) : (
                      <Minus
                        className="h-4 w-4 text-muted-foreground/50"
                        title="Sans IA"
                      />
                    )}
                  </td>

                  {/* Description */}
                  <td className={`${cellClass} max-w-[280px]`}>
                    {scraper.description ? (
                      <span
                        className="text-muted-foreground line-clamp-2 text-xs block"
                        title={scraper.description}
                      >
                        {scraper.description}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Catégorie (infoType) */}
                  <td className={cellClass}>
                    {infoTypeLabel ? (
                      <Badge
                        variant="outline"
                        className="text-xs whitespace-nowrap"
                      >
                        {infoTypeLabel}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Type (mapperType) */}
                  <td className={cellClass}>
                    {scraper.mapperType ? (
                      <Badge
                        variant="outline"
                        className="text-xs whitespace-nowrap"
                      >
                        {MAPPER_TYPE_LABELS[scraper.mapperType] ||
                          scraper.mapperType}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Provider */}
                  <td className={cellClass}>
                    <span className="text-sm capitalize">
                      {scraper.provider}
                    </span>
                  </td>

                  {/* Source */}
                  <td className={cellClass}>
                    {scraper.source ? (
                      <span className="text-sm capitalize">
                        {scraper.source}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Type de paiement */}
                  <td className={cellClass}>
                    {paymentMeta ? (
                      <Badge
                        variant={paymentMeta.variant}
                        className="text-xs whitespace-nowrap"
                      >
                        {paymentMeta.label}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Cout / 1k */}
                  <td className={cellClass}>
                    {scraper.costPerThousand != null ? (
                      <span className="text-sm font-mono">
                        {formatCostPerThousand(scraper.costPerThousand)}
                      </span>
                    ) : scraper.pricingTiers &&
                      scraper.pricingTiers.length > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        Voir options
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Cout / lead */}
                  <td className={cellClass}>
                    {scraper.costPerLead != null ? (
                      <span className="text-sm font-mono">
                        {formatCurrency(scraper.costPerLead)}
                      </span>
                    ) : scraper.pricingTiers &&
                      scraper.pricingTiers.length > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        Voir options
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Actor start cost */}
                  <td className={cellClass}>
                    {scraper.actorStartCost != null ? (
                      <span className="text-sm font-mono">
                        {formatCurrency(scraper.actorStartCost)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Quota gratuit */}
                  <td className={cellClass}>
                    {scraper.freeQuotaMonthly != null ? (
                      <span className="text-sm">
                        {scraper.freeQuotaMonthly.toLocaleString("fr-FR")}/mois
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Options tarifaires (pricingTiers) */}
                  <td className={cellClass}>
                    {scraper.pricingTiers && scraper.pricingTiers.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {scraper.pricingTiers.map((tier, i) => (
                          <span key={i} className="text-xs whitespace-nowrap">
                            {tier.name}:{" "}
                            <span className="font-mono">
                              {formatCostPerThousand(tier.costPerThousand)}
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Lien outil */}
                  <td className={cellClass}>
                    {scraper.toolUrl ? (
                      <a
                        href={scraper.toolUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title={scraper.toolUrl}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className={cellClass}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/leads/scrape/${scraper.id}`);
                      }}
                    >
                      Utiliser
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
