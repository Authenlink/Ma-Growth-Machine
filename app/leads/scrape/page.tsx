"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
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
import { Card, CardContent } from "@/components/ui/card";
import { useScroll } from "@/hooks/use-scroll";
import {
  Loader2,
  Sparkles,
  Mail,
  Share2,
  Star,
  Search,
  MailCheck,
  Users,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import {
  ScrapersFilters,
  type ScrapersFiltersState,
} from "@/components/scrapers/scrapers-filters";

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
}

const INFO_TYPE_ICONS: Record<string, LucideIcon> = {
  contact_info: Mail,
  email_finder: Mail,
  email_verify: MailCheck,
  employee_infos: Users,
  leads: UserCircle,
  social_media_posts: Share2,
  reviews: Star,
  seo: Search,
};

function ScraperTypeIcon({
  infoType,
}: {
  infoType: string | null | undefined;
}) {
  const IconComponent = (infoType && INFO_TYPE_ICONS[infoType]) || Sparkles;
  return <IconComponent className="h-5 w-5 text-primary" aria-hidden />;
}

function getProviderColor(provider: string): string {
  let hash = 0;
  for (let i = 0; i < provider.length; i++) hash += provider.charCodeAt(i);
  return `hsl(${hash % 360}, 65%, 45%)`;
}

function formatCostPerThousand(value: number): string {
  return `$${value.toFixed(2)}/1k`;
}

function getPriceForThousand(scraper: Scraper): string | null {
  if (scraper.costPerThousand != null) {
    return formatCostPerThousand(scraper.costPerThousand);
  }
  if (scraper.pricingTiers && scraper.pricingTiers.length > 0) {
    return formatCostPerThousand(scraper.pricingTiers[0].costPerThousand);
  }
  return null;
}

export default function ScrapePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasScrolled = useScroll();

  const [scrapers, setScrapers] = useState<Scraper[]>([]);
  const [loadingScrapers, setLoadingScrapers] = useState(true);
  const [filters, setFilters] = useState<ScrapersFiltersState>({});

  // Scrapers filtrés (AND entre dimensions, OR à l'intérieur)
  const filteredScrapers = scrapers.filter((s) => {
    // Recherche textuelle par nom ou description
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const nameMatch = s.name.toLowerCase().includes(searchTerm);
      const descriptionMatch = (s.description || "").toLowerCase().includes(searchTerm);
      if (!nameMatch && !descriptionMatch) {
        return false;
      }
    }

    if (filters.provider?.length && !filters.provider.includes(s.provider)) {
      return false;
    }
    const source = s.source ?? "";
    if (filters.source?.length && !filters.source.includes(source)) {
      return false;
    }
    const infoType = s.infoType ?? "";
    if (filters.infoType?.length && !filters.infoType.includes(infoType)) {
      return false;
    }
    const paymentType = s.paymentType ?? "";
    if (
      filters.paymentType?.length &&
      !filters.paymentType.includes(paymentType)
    ) {
      return false;
    }
    return true;
  });

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
          <div className="mb-2">
            <h1 className="text-2xl font-bold">Scrapers</h1>
            <p className="text-muted-foreground">
              Choisissez un scraper pour commencer a recuperer des leads.
            </p>
          </div>

          <ScrapersFilters
            filters={filters}
            onFiltersChange={setFilters}
            scrapers={scrapers}
            resultCount={filteredScrapers.length}
          />

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols- xl:grid-cols-5  w-full">
            {filteredScrapers.map((scraper) => (
              <ScraperCard
                key={scraper.id}
                scraper={scraper}
                onClick={() => {
                  if (scraper.mapperType === "pagespeed-seo") {
                    router.push("/enrichment/seo");
                  } else {
                    router.push(`/leads/scrape/${scraper.id}`);
                  }
                }}
              />
            ))}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ScraperCard({
  scraper,
  onClick,
}: {
  scraper: Scraper;
  onClick: () => void;
}) {
  const providerColor = getProviderColor(scraper.provider);
  const priceLabel = getPriceForThousand(scraper);
  const providerInitial = scraper.provider.charAt(0).toUpperCase();

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 flex flex-col overflow-hidden py-0 gap-0 bg-muted border-border/60 rounded-lg"
      onClick={onClick}
    >
      <CardContent className="pt-1 px-1 pb-1 flex flex-col flex-1 min-w-0">
        {/* Inner card - main content */}
        <div className="rounded-md border bg-background p-3 flex-1 min-h-0">
          <div className="flex items-start gap-2">
            <div className="shrink-0 mt-0.5">
              <ScraperTypeIcon infoType={scraper.infoType} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate">{scraper.name}</h3>
              {scraper.toolUrl && (
                <a
                  href={scraper.toolUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-muted-foreground hover:text-primary truncate block"
                  title={scraper.toolUrl}
                >
                  {scraper.toolUrl}
                </a>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-3 mt-2">
            {scraper.description || "Aucune description disponible"}
          </p>
        </div>

        {/* Footer: provider + price */}
        <div className="flex items-center justify-between gap-2 pt-2 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-medium text-white"
              style={{ backgroundColor: providerColor }}
            >
              {providerInitial}
            </span>
            <span className="text-xs text-muted-foreground truncate capitalize">
              {scraper.provider}
            </span>
          </div>
          <span className="text-xs font-mono font-medium text-foreground shrink-0">
            {priceLabel ?? "—"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
