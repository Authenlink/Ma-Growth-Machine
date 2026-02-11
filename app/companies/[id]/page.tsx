"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building2,
  Globe,
  Linkedin,
  MapPin,
  Calendar,
  Users as UsersIcon,
  ExternalLink,
  ArrowLeft,
  Briefcase,
  Search,
  Pencil,
  Star,
  Loader2,
  Smartphone,
  Monitor,
  Gauge,
  CircleDot,
  ShieldCheck,
  FileSearch,
} from "lucide-react";
import { cleanIndustry } from "@/lib/utils";
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
import { Skeleton } from "@/components/ui/skeleton";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScroll } from "@/hooks/use-scroll";
import { LeadsCardView } from "@/components/leads/leads-card-view";
import { toast } from "sonner";
import { ScrapeEmployeesDialog } from "@/components/companies/scrape-employees-dialog";
import { EditCompanySheet } from "@/components/companies/edit-company-sheet";

interface Company {
  id: number;
  name: string;
  website: string | null;
  domain: string | null;
  linkedinUrl: string | null;
  foundedYear: number | null;
  industry: string | null;
  size: string | null;
  description: string | null;
  specialities: string[] | null;
  city: string | null;
  state: string | null;
  country: string | null;
  employeesScraped: boolean;
  employeesScrapedAt: Date | null;
  seoScore: number | null;
  seoScoreMobile: number | null;
  seoScoreDesktop: number | null;
  seoData: {
    score?: number;
    strategy?: string;
    audits?: Record<string, { score?: number; title?: string }>;
  } | null;
  pageSpeedData?: {
    mobile?: {
      performance: number;
      accessibility: number;
      bestPractices: number;
      seo: number;
      audits?: Record<string, { score?: number; title?: string }>;
    };
    desktop?: {
      performance: number;
      accessibility: number;
      bestPractices: number;
      seo: number;
      audits?: Record<string, { score?: number; title?: string }>;
    };
  } | null;
  seoAnalyzedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CompanyLead {
  id: number;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  email: string | null;
  linkedinUrl: string | null;
  seniority: string | null;
  functional: string | null;
  status: string | null;
  validated: boolean;
  city: string | null;
  state: string | null;
  country: string | null;
  company: {
    id: number;
    name: string;
    website: string | null;
    industry: string | null;
    size: string | null;
  } | null;
  collections: {
    id: number;
    name: string;
  }[];
  collection: {
    id: number;
    name: string;
  } | null; // Pour la compatibilité
  createdAt: Date;
}

export default function CompanyDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const hasScrolled = useScroll();
  const [company, setCompany] = useState<Company | null>(null);
  const [leads, setLeads] = useState<CompanyLead[]>([]);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrapeDialogOpen, setScrapeDialogOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [scraperId, setScraperId] = useState<number | null>(null);
  const [trustpilotReviews, setTrustpilotReviews] = useState<
    Array<{
      id: number;
      rating: number;
      publishedDate: string | null;
      title: string | null;
      body: string | null;
      createdAt: string;
    }>
  >([]);
  const [trustpilotStats, setTrustpilotStats] = useState<{
    count: number;
    averageRating: number;
  }>({ count: 0, averageRating: 0 });
  const [hasMoreTrustpilot, setHasMoreTrustpilot] = useState(false);
  const [loadingTrustpilot, setLoadingTrustpilot] = useState(false);
  const [loadingMoreTrustpilot, setLoadingMoreTrustpilot] = useState(false);
  const [scrapingTrustpilot, setScrapingTrustpilot] = useState(false);

  const fetchCompany = async () => {
    if (status === "authenticated" && params.id) {
      try {
        const response = await fetch(`/api/companies/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setCompany(data);
        } else if (response.status === 404) {
          setError("Entreprise non trouvée");
        } else {
          setError("Erreur lors de la récupération de l'entreprise");
        }
      } catch (err) {
        console.error("Erreur:", err);
        setError("Erreur lors de la récupération de l'entreprise");
      } finally {
        setLoadingCompany(false);
      }
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && params.id) {
      setLoadingCompany(true);
      fetchCompany();
    }
  }, [status, params.id]);

  // Récupérer le scraper LinkedIn Company Employees
  useEffect(() => {
    const fetchScraper = async () => {
      if (status === "authenticated") {
        try {
          const response = await fetch("/api/scrapers");
          if (response.ok) {
            const scrapers = await response.json();
            const employeesScraper = scrapers.find(
              (s: { mapperType: string }) =>
                s.mapperType === "linkedin-company-employees",
            );
            if (employeesScraper) {
              setScraperId(employeesScraper.id);
            }
          }
        } catch (error) {
          console.error("Erreur lors de la récupération du scraper:", error);
        }
      }
    };
    fetchScraper();
  }, [status]);

  useEffect(() => {
    const fetchLeads = async () => {
      if (status === "authenticated" && params.id) {
        try {
          const response = await fetch(`/api/companies/${params.id}/leads`);
          if (response.ok) {
            const data = await response.json();
            setLeads(data);
          }
        } catch (error) {
          console.error("Erreur:", error);
        } finally {
          setLoadingLeads(false);
        }
      }
    };

    fetchLeads();
  }, [status, params.id]);

  const fetchTrustpilotReviews = async (options?: {
    limit?: number;
    offset?: number;
    append?: boolean;
  }) => {
    if (!params.id) return;
    const limit = options?.limit ?? 3;
    const offset = options?.offset ?? 0;
    const append = options?.append ?? false;

    if (append) {
      setLoadingMoreTrustpilot(true);
    } else {
      setLoadingTrustpilot(true);
    }

    try {
      const response = await fetch(
        `/api/companies/${params.id}/trustpilot-reviews?limit=${limit}&offset=${offset}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setTrustpilotReviews((prev) => [...prev, ...(data.data ?? [])]);
        } else {
          setTrustpilotReviews(data.data ?? []);
        }
        setTrustpilotStats(data.stats ?? { count: 0, averageRating: 0 });
        setHasMoreTrustpilot(data.hasMore ?? false);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des avis Trustpilot:", err);
    } finally {
      setLoadingTrustpilot(false);
      setLoadingMoreTrustpilot(false);
    }
  };

  const loadMoreTrustpilot = () => {
    fetchTrustpilotReviews({
      limit: 10,
      offset: trustpilotReviews.length,
      append: true,
    });
  };

  useEffect(() => {
    if (status === "authenticated" && params.id) {
      fetchTrustpilotReviews({ limit: 3 });
    }
  }, [status, params.id]);

  const handleScrapeTrustpilot = async () => {
    if (!company) return;
    const hasDomain = !!(company.domain?.trim() || company.website?.trim());
    if (!hasDomain) {
      toast.error(
        "Cette entreprise n'a pas de domaine (website). Ajoutez un website ou un domaine pour scraper les avis Trustpilot.",
      );
      return;
    }
    setScrapingTrustpilot(true);
    try {
      const res = await fetch("/api/trustpilot-reviews/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "single",
          companyId: company.id,
          maxItems: 100,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${data.metrics.created} avis créés`);
        fetchTrustpilotReviews();
        fetchCompany();
      } else {
        toast.error(data.error || "Erreur lors du scraping");
      }
    } catch (err) {
      toast.error("Erreur lors du scraping Trustpilot");
    } finally {
      setScrapingTrustpilot(false);
    }
  };

  const getLocation = () => {
    if (!company) return null;
    const parts = [];
    if (company.city) parts.push(company.city);
    if (company.state) parts.push(company.state);
    if (company.country) parts.push(company.country);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  if (status === "loading" || loadingCompany) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <Skeleton className="h-6 w-6" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Skeleton className="h-4 w-32" />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!session) {
    return null;
  }

  if (error || !company) {
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
                    <BreadcrumbPage>Entreprise</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {error || "Entreprise non trouvée"}
              </p>
              <Button asChild>
                <Link href="/leads">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour aux leads
                </Link>
              </Button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const location = getLocation();

  return (
    <>
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
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink asChild>
                      <Link href="/leads">Leads</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{company.name}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
            <div className="mb-4">
              <Button variant="ghost" size="sm" asChild className="mb-4">
                <Link href="/leads">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour aux leads
                </Link>
              </Button>
            </div>

            {/* En-tête */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-3xl mb-2">
                      {company.name}
                    </CardTitle>
                    <CardDescription className="text-base flex flex-wrap items-center gap-x-3 gap-y-1">
                      {company.industry && (
                        <span>
                          {cleanIndustry(company.industry)}
                          {company.size && ` • ${company.size}`}
                        </span>
                      )}
                      {trustpilotStats.count > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {trustpilotStats.count} avis • Note moyenne:{" "}
                          {(Number(trustpilotStats.averageRating) || 0).toFixed(
                            1,
                          )}
                          /5
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditSheetOpen(true)}
                      className="gap-1"
                    >
                      <Pencil className="h-4 w-4" />
                      Modifier
                    </Button>
                    {company.website && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        >
                          <Globe className="h-4 w-4" />
                          Site web
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    {company.linkedinUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={company.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        >
                          <Linkedin className="h-4 w-4" />
                          LinkedIn
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    {company.linkedinUrl && scraperId && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setScrapeDialogOpen(true)}
                        className="flex items-center gap-1"
                      >
                        <UsersIcon className="h-4 w-4" />
                        Scraper les employés
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Tabs defaultValue="info" className="w-full">
              <TabsList>
                <TabsTrigger value="info">Informations</TabsTrigger>
                <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
                <TabsTrigger value="trustpilot">
                  Avis Trustpilot ({trustpilotStats.count})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Informations générales */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Informations générales
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {company.foundedYear && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm">
                            <span className="text-muted-foreground">
                              Fondée en:{" "}
                            </span>
                            {company.foundedYear}
                          </span>
                        </div>
                      )}
                      {company.industry && (
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm">
                            <span className="text-muted-foreground">
                              Industrie:{" "}
                            </span>
                            {cleanIndustry(company.industry)}
                          </span>
                        </div>
                      )}
                      {company.size && (
                        <div className="flex items-center gap-2">
                          <UsersIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm">
                            <span className="text-muted-foreground">
                              Taille:{" "}
                            </span>
                            {company.size}
                          </span>
                        </div>
                      )}
                      {location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm">{location}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Description et spécialités */}
                  {(company.description || company.specialities) && (
                    <Card>
                      <CardHeader>
                        <CardTitle>À propos</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {company.description && (
                          <div>
                            <p className="text-sm whitespace-pre-wrap">
                              {company.description.replace(/\\+/g, "\n")}
                            </p>
                          </div>
                        )}
                        {company.specialities &&
                          company.specialities.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground mb-2 block">
                                Spécialités:
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {company.specialities.map(
                                  (speciality, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {speciality}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  )}

                  {/* SEO / PageSpeed */}
                  {company.pageSpeedData ||
                  company.seoScore != null ||
                  company.seoData ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Search className="h-5 w-5" />
                          PageSpeed Insights
                        </CardTitle>
                        <CardDescription>
                          Performance, Accessibilité, Bonnes pratiques, SEO
                          {company.seoAnalyzedAt && (
                            <span className="block mt-1 text-xs">
                              Dernière analyse:{" "}
                              {new Date(
                                company.seoAnalyzedAt,
                              ).toLocaleDateString("fr-FR", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {company.pageSpeedData &&
                        (company.pageSpeedData.mobile ||
                          company.pageSpeedData.desktop) ? (
                          <>
                            <Tabs
                              defaultValue={
                                company.pageSpeedData.mobile
                                  ? "mobile"
                                  : "desktop"
                              }
                              className="w-full"
                            >
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger
                                  value="mobile"
                                  disabled={!company.pageSpeedData.mobile}
                                  className="gap-1.5"
                                >
                                  <Smartphone className="h-4 w-4" />
                                  Mobile
                                </TabsTrigger>
                                <TabsTrigger
                                  value="desktop"
                                  disabled={!company.pageSpeedData.desktop}
                                  className="gap-1.5"
                                >
                                  <Monitor className="h-4 w-4" />
                                  Desktop
                                </TabsTrigger>
                              </TabsList>
                              {(company.pageSpeedData.mobile ? ["mobile"] : [])
                                .concat(
                                  company.pageSpeedData.desktop
                                    ? ["desktop"]
                                    : [],
                                )
                                .map((tab) => {
                                  const data =
                                    company.pageSpeedData![
                                      tab as "mobile" | "desktop"
                                    ]!;
                                  const scoreColor = (s: number) =>
                                    s >= 90
                                      ? "text-green-600 dark:text-green-400"
                                      : s >= 50
                                        ? "text-yellow-600 dark:text-yellow-400"
                                        : "text-red-600 dark:text-red-400";
                                  const categories = [
                                    {
                                      key: "performance",
                                      label: "Performance",
                                      value: data.performance,
                                      icon: Gauge,
                                    },
                                    {
                                      key: "accessibility",
                                      label: "Accessibilité",
                                      value: data.accessibility,
                                      icon: CircleDot,
                                    },
                                    {
                                      key: "bestPractices",
                                      label: "Bonnes pratiques",
                                      value: data.bestPractices,
                                      icon: ShieldCheck,
                                    },
                                    {
                                      key: "seo",
                                      label: "SEO",
                                      value: data.seo,
                                      icon: FileSearch,
                                    },
                                  ];
                                  return (
                                    <TabsContent
                                      key={tab}
                                      value={tab}
                                      className="space-y-4 mt-4"
                                    >
                                      <div className="grid grid-cols-2 gap-3">
                                        {categories.map(
                                          ({
                                            key,
                                            label,
                                            value,
                                            icon: Icon,
                                          }) => (
                                            <div
                                              key={key}
                                              className="flex items-center justify-between rounded-lg border p-3"
                                            >
                                              <div className="flex items-center gap-2">
                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">
                                                  {label}
                                                </span>
                                              </div>
                                              <span
                                                className={`text-lg font-bold ${scoreColor(value)}`}
                                              >
                                                {value}
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                      {data.audits &&
                                        Object.keys(data.audits).length > 0 && (
                                          <div className="space-y-2">
                                            <span className="text-sm font-medium text-muted-foreground">
                                              Audits SEO
                                            </span>
                                            <ul className="space-y-1 text-sm">
                                              {Object.entries(data.audits).map(
                                                ([id, audit]) => (
                                                  <li
                                                    key={id}
                                                    className="flex items-center justify-between gap-2"
                                                  >
                                                    <span>
                                                      {audit.title || id}
                                                    </span>
                                                    <Badge
                                                      variant={
                                                        audit.score === 1
                                                          ? "default"
                                                          : "secondary"
                                                      }
                                                      className="text-xs"
                                                    >
                                                      {audit.score === 1
                                                        ? "OK"
                                                        : `${Math.round((audit.score ?? 0) * 100)}%`}
                                                    </Badge>
                                                  </li>
                                                ),
                                              )}
                                            </ul>
                                          </div>
                                        )}
                                    </TabsContent>
                                  );
                                })}
                            </Tabs>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-4">
                              {company.seoScore != null && (
                                <div className="flex flex-col">
                                  <span className="text-3xl font-bold">
                                    {Math.round(company.seoScore)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    / 100
                                  </span>
                                </div>
                              )}
                              {company.seoScoreMobile != null &&
                                company.seoScoreDesktop != null && (
                                  <div className="flex gap-4 text-sm text-muted-foreground">
                                    <span>
                                      Mobile:{" "}
                                      {Math.round(company.seoScoreMobile)}
                                    </span>
                                    <span>
                                      Desktop:{" "}
                                      {Math.round(company.seoScoreDesktop)}
                                    </span>
                                  </div>
                                )}
                            </div>
                            {company.seoData?.audits &&
                              Object.keys(company.seoData.audits).length >
                                0 && (
                                <div className="space-y-2">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Audits principaux
                                  </span>
                                  <ul className="space-y-1 text-sm">
                                    {Object.entries(company.seoData.audits).map(
                                      ([id, audit]) => (
                                        <li
                                          key={id}
                                          className="flex items-center justify-between gap-2"
                                        >
                                          <span>{audit.title || id}</span>
                                          <Badge
                                            variant={
                                              audit.score === 1
                                                ? "default"
                                                : "secondary"
                                            }
                                            className="text-xs"
                                          >
                                            {audit.score === 1
                                              ? "OK"
                                              : `${Math.round((audit.score ?? 0) * 100)}%`}
                                          </Badge>
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              )}
                          </>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/enrichment/seo?companyId=${company.id}`}
                            className="gap-1"
                          >
                            <Search className="h-3 w-3" />
                            Réanalyser
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ) : company.website ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Search className="h-5 w-5" />
                          PageSpeed Insights
                        </CardTitle>
                        <CardDescription>
                          Analysez le site web (Performance, Accessibilité,
                          Bonnes pratiques, SEO)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/enrichment/seo?companyId=${company.id}`}
                            className="gap-1"
                          >
                            <Search className="h-3 w-3" />
                            Analyser le SEO
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ) : null}

                  {/* Métadonnées */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Métadonnées
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          Créée le{" "}
                          {new Date(company.createdAt).toLocaleDateString(
                            "fr-FR",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </span>
                      </div>
                      {company.updatedAt &&
                        company.updatedAt !== company.createdAt && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-muted-foreground">
                              Modifiée le{" "}
                              {new Date(company.updatedAt).toLocaleDateString(
                                "fr-FR",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="leads" className="mt-4">
                {loadingLeads ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-64 rounded-lg" />
                    ))}
                  </div>
                ) : leads.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">
                        Aucun lead associé à cette entreprise.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <LeadsCardView leads={leads} />
                )}
              </TabsContent>

              <TabsContent value="trustpilot" className="mt-4">
                {loadingTrustpilot ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        {trustpilotStats.count > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-5 w-5 ${
                                    i <
                                    Math.round(trustpilotStats.averageRating)
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-muted-foreground/30"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium">
                              {(
                                Number(trustpilotStats.averageRating) || 0
                              ).toFixed(1)}
                              /5
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({trustpilotStats.count} avis)
                            </span>
                          </div>
                        )}
                        {trustpilotStats.count === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Aucun avis pour le moment
                          </p>
                        )}
                      </div>
                      {(company.domain?.trim() || company.website?.trim()) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleScrapeTrustpilot}
                          disabled={scrapingTrustpilot}
                        >
                          {scrapingTrustpilot ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Scraping...
                            </>
                          ) : (
                            <>
                              <Star className="mr-2 h-4 w-4" />
                              Scraper les avis
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    {!(company.domain?.trim() || company.website?.trim()) && (
                      <Card>
                        <CardContent className="py-6">
                          <p className="text-sm text-muted-foreground">
                            Cette entreprise n&apos;a pas de domaine (website).
                            Ajoutez un website ou un domaine pour pouvoir
                            scraper les avis Trustpilot.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => setEditSheetOpen(true)}
                          >
                            Modifier l&apos;entreprise
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                    {trustpilotReviews.length === 0 &&
                      (company.domain?.trim() || company.website?.trim()) && (
                        <Card>
                          <CardContent className="py-12 text-center">
                            <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">
                              Aucun avis Trustpilot pour cette entreprise.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleScrapeTrustpilot}
                              disabled={scrapingTrustpilot}
                            >
                              {scrapingTrustpilot ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Scraping...
                                </>
                              ) : (
                                <>
                                  <Star className="mr-2 h-4 w-4" />
                                  Scraper les avis
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    {trustpilotReviews.length > 0 && (
                      <div className="space-y-4">
                        <p className="text-sm font-medium text-muted-foreground">
                          {trustpilotReviews.length === 1
                            ? "Dernier avis"
                            : trustpilotReviews.length <= 3
                              ? `Derniers avis (${trustpilotReviews.length} sur ${trustpilotStats.count})`
                              : `Avis affichés (${trustpilotReviews.length} sur ${trustpilotStats.count})`}
                        </p>
                        {trustpilotReviews.map((review) => (
                          <Card key={review.id}>
                            <CardContent className="pt-6">
                              <div className="flex items-start gap-3">
                                <div className="flex items-center gap-1 shrink-0">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < review.rating
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-muted-foreground/30"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {review.title && (
                                    <p className="font-medium mb-1">
                                      {review.title}
                                    </p>
                                  )}
                                  {review.body && (
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                      {review.body}
                                    </p>
                                  )}
                                  {review.publishedDate && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {new Date(
                                        review.publishedDate,
                                      ).toLocaleDateString("fr-FR", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {hasMoreTrustpilot && (
                          <div className="flex justify-center pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={loadMoreTrustpilot}
                              disabled={loadingMoreTrustpilot}
                            >
                              {loadingMoreTrustpilot ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Chargement...
                                </>
                              ) : (
                                `Voir plus (${trustpilotStats.count - trustpilotReviews.length} restants)`
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>

      {/* Sheet pour modifier l'entreprise */}
      {company && (
        <EditCompanySheet
          company={company}
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
          onSuccess={fetchCompany}
        />
      )}

      {/* Dialog pour scraper les employés */}
      {company && scraperId && (
        <ScrapeEmployeesDialog
          open={scrapeDialogOpen}
          onOpenChange={setScrapeDialogOpen}
          companyId={company.id}
          companyName={company.name}
          companyLinkedinUrl={company.linkedinUrl}
          employeesScraped={company.employeesScraped}
          employeesScrapedAt={company.employeesScrapedAt}
          scraperId={scraperId}
        />
      )}
    </>
  );
}
