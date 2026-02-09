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
import { ScrapeEmployeesDialog } from "@/components/companies/scrape-employees-dialog";

interface Company {
  id: number;
  name: string;
  website: string | null;
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
  collection: {
    id: number;
    name: string;
  };
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
  const [scraperId, setScraperId] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
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
        } catch (error) {
          console.error("Erreur:", error);
          setError("Erreur lors de la récupération de l'entreprise");
        } finally {
          setLoadingCompany(false);
        }
      }
    };

    fetchCompany();
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
              (s: { mapperType: string }) => s.mapperType === "linkedin-company-employees"
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
                  <CardTitle className="text-3xl mb-2">{company.name}</CardTitle>
                  {company.industry && (
                    <CardDescription className="text-base">
                      {cleanIndustry(company.industry)}
                      {company.size && ` • ${company.size}`}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
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
              <TabsTrigger value="leads">
                Leads ({leads.length})
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
                          <span className="text-muted-foreground">Fondée en: </span>
                          {company.foundedYear}
                        </span>
                      </div>
                    )}
                    {company.industry && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">
                          <span className="text-muted-foreground">Industrie: </span>
                          {cleanIndustry(company.industry)}
                        </span>
                      </div>
                    )}
                    {company.size && (
                      <div className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">
                          <span className="text-muted-foreground">Taille: </span>
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
                            {company.description}
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
                              {company.specialities.map((speciality, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {speciality}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                )}

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
                        {new Date(company.createdAt).toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {company.updatedAt &&
                      company.updatedAt !== company.createdAt && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground">
                            Modifiée le{" "}
                            {new Date(company.updatedAt).toLocaleDateString("fr-FR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
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
          </Tabs>
        </div>
      </SidebarInset>
      </SidebarProvider>

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
