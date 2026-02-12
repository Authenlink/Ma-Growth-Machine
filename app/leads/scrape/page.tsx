"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useScroll } from "@/hooks/use-scroll";
import {
  Loader2,
  Sparkles,
  Mail,
  Share2,
  Star,
  LayoutGrid,
  Table2,
  ExternalLink,
  Search,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { ScrapersTableView } from "@/components/scrapers/scrapers-table-view";

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
  source?: string | null;
  infoType?: string | null;
  toolUrl?: string | null;
  paymentType?: string | null;
  costPerThousand?: number | null;
  costPerLead?: number | null;
  actorStartCost?: number | null;
  freeQuotaMonthly?: number | null;
  pricingTiers?: PricingTier[] | null;
}

type ViewMode = "cards" | "table";

const INFO_TYPE_LABELS: Record<string, { label: string; icon: typeof Mail }> = {
  contact_info: { label: "Infos contact", icon: Mail },
  social_media_posts: { label: "Posts reseaux sociaux", icon: Share2 },
  reviews: { label: "Avis", icon: Star },
  seo: { label: "SEO", icon: Search },
};

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

function formatCostPerThousand(value: number): string {
  return `$${value.toFixed(2)}/1k`;
}

function formatCurrency(value: number): string {
  if (value < 0.01) {
    return `$${value.toFixed(5)}`;
  }
  if (value < 1) {
    return `$${value.toFixed(4)}`;
  }
  return `$${value.toFixed(2)}`;
}

export default function ScrapePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasScrolled = useScroll();

  const [scrapers, setScrapers] = useState<Scraper[]>([]);
  const [loadingScrapers, setLoadingScrapers] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Grouper les scrapers par infoType
  const groupedScrapers = scrapers.reduce<Record<string, Scraper[]>>(
    (acc, scraper) => {
      const key = scraper.infoType || "other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(scraper);
      return acc;
    },
    {},
  );

  const filteredScrapers =
    filterType === "all" ? scrapers : groupedScrapers[filterType] || [];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchScrapers = async () => {
      if (status === "authenticated") {
        try {
          const response = await fetch("/api/scrapers");
          if (response.ok) {
            const data = await response.json();
            setScrapers(data);
          }
        } catch (error) {
          console.error("Erreur lors de la recuperation des scrapers:", error);
        } finally {
          setLoadingScrapers(false);
        }
      }
    };

    fetchScrapers();
  }, [status]);

  if (status === "loading" || loadingScrapers) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!session) {
    return null;
  }

  // Si aucun scraper disponible, afficher un etat vide
  if (scrapers.length === 0 && !loadingScrapers) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header
            className={`sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 ${
              hasScrolled ? "border-b" : ""
            }`}
          >
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Scraping</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
            <EmptyState
              title="Aucun scraper disponible"
              description="Aucun scraper n'est actuellement configure. Contactez l'administrateur pour ajouter des scrapers."
              icon={Sparkles}
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header
          className={`sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 ${
            hasScrolled ? "border-b" : ""
          }`}
        >
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Scraping</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 pt-6 overflow-x-hidden">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold">Scrapers</h1>
              <p className="text-muted-foreground">
                Choisissez un scraper pour commencer a recuperer des leads.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="gap-2"
              >
                <Table2 className="h-4 w-4" />
                Table
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Cards
              </Button>
            </div>
          </div>

          {/* Filtres par type */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filterType === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilterType("all")}
            >
              Tous ({scrapers.length})
            </Badge>
            {Object.entries(INFO_TYPE_LABELS).map(([key, { label }]) => {
              const count = groupedScrapers[key]?.length ?? 0;
              if (count === 0) return null;
              return (
                <Badge
                  key={key}
                  variant={filterType === key ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFilterType(key)}
                >
                  {label} ({count})
                </Badge>
              );
            })}
            {(groupedScrapers.other?.length ?? 0) > 0 && (
              <Badge
                variant={filterType === "other" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFilterType("other")}
              >
                Autres ({groupedScrapers.other.length})
              </Badge>
            )}
          </div>

          {/* Vue Table */}
          {viewMode === "table" ? (
            <ScrapersTableView scrapers={filteredScrapers} />
          ) : (
            /* Vue Cards */
            <>
              {filterType === "all" ? (
                <div className="space-y-8">
                  {Object.entries(groupedScrapers)
                    .sort(([a], [b]) => {
                      const order = [
                        "contact_info",
                        "social_media_posts",
                        "reviews",
                        "seo",
                        "other",
                      ];
                      return order.indexOf(a) - order.indexOf(b);
                    })
                    .map(([infoType, items]) => {
                      const meta = INFO_TYPE_LABELS[infoType];
                      return (
                        <div key={infoType}>
                          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            {meta ? (
                              <>
                                <meta.icon className="h-4 w-4" />
                                {meta.label}
                              </>
                            ) : (
                              "Autres"
                            )}
                          </h2>
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {items.map((scraper) => (
                              <ScraperCard
                                key={scraper.id}
                                scraper={scraper}
                                onClick={() =>
                                  router.push(`/leads/scrape/${scraper.id}`)
                                }
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredScrapers.map((scraper) => (
                    <ScraperCard
                      key={scraper.id}
                      scraper={scraper}
                      onClick={() => router.push(`/leads/scrape/${scraper.id}`)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// --- Card component with enriched pricing info ---

function ScraperCard({
  scraper,
  onClick,
}: {
  scraper: Scraper;
  onClick: () => void;
}) {
  const paymentMeta = scraper.paymentType
    ? PAYMENT_TYPE_LABELS[scraper.paymentType]
    : null;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 flex flex-col"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <CardTitle className="text-base truncate">{scraper.name}</CardTitle>
          </div>
          {scraper.toolUrl && (
            <a
              href={scraper.toolUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-primary transition-colors shrink-0"
              title="Ouvrir l'outil"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
        <CardDescription className="line-clamp-2">
          {scraper.description || "Aucune description disponible"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0 mt-auto">
        {/* Badges: payment type + provider */}
        <div className="flex flex-wrap gap-1.5">
          {paymentMeta && (
            <Badge variant={paymentMeta.variant} className="text-xs">
              {paymentMeta.label}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs capitalize">
            {scraper.provider}
          </Badge>
          {scraper.source && scraper.source !== scraper.provider && (
            <Badge variant="outline" className="text-xs capitalize">
              {scraper.source}
            </Badge>
          )}
        </div>

        {/* Pricing info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {scraper.costPerThousand != null && (
            <span>
              <span className="font-medium text-foreground font-mono">
                {formatCostPerThousand(scraper.costPerThousand)}
              </span>
            </span>
          )}
          {scraper.costPerLead != null && (
            <span>
              <span className="font-medium text-foreground font-mono">
                {formatCurrency(scraper.costPerLead)}
              </span>
              /lead
            </span>
          )}
          {scraper.actorStartCost != null && (
            <span>
              Start:{" "}
              <span className="font-medium text-foreground font-mono">
                {formatCurrency(scraper.actorStartCost)}
              </span>
            </span>
          )}
          {scraper.freeQuotaMonthly != null && (
            <span>
              <span className="font-medium text-foreground">
                {scraper.freeQuotaMonthly.toLocaleString("fr-FR")}
              </span>
              /mois
            </span>
          )}
        </div>

        {/* Pricing tiers */}
        {scraper.pricingTiers && scraper.pricingTiers.length > 0 && (
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground border-t pt-2">
            {scraper.pricingTiers.map((tier, i) => (
              <div key={i} className="flex justify-between">
                <span className="truncate mr-2">{tier.name}</span>
                <span className="font-mono font-medium text-foreground whitespace-nowrap">
                  {formatCostPerThousand(tier.costPerThousand)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action button */}
        <div className="flex items-center justify-end pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            Utiliser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
