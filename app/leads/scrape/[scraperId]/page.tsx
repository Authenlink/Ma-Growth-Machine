"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
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
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { ScraperForm } from "@/components/scraper-form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Collection {
  id: number;
  name: string;
  description: string | null;
}

interface Lead {
  id: number;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  linkedinUrl: string | null;
  company: {
    id: number;
    name: string;
  } | null;
}

interface Company {
  id: number;
  name: string;
  linkedinUrl: string | null;
}

interface Scraper {
  id: number;
  name: string;
  description: string | null;
  provider: string;
  mapperType?: string;
  formConfig: {
    fields: Array<{
      id: string;
      type: "number" | "switch" | "multiselect" | "select" | "text" | "collection" | "company" | "leads";
      label: string;
      [key: string]: unknown;
    }>;
    sections: Array<{
      title: string;
      description?: string;
      fields: string[];
    }>;
  };
}

interface ScrapingMetrics {
  totalFound: number;
  created: number;
  skipped: number;
  errors: number;
}

export default function ScraperFormPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const hasScrolled = useScroll();

  const scraperId = params.scraperId
    ? parseInt(params.scraperId as string)
    : null;

  const [scraper, setScraper] = useState<Scraper | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingScraper, setLoadingScraper] = useState(true);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Enrichment state
  const [enrichmentType, setEnrichmentType] = useState<
    "lead" | "company" | "collection" | null
  >(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    null,
  );
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    number | null
  >(null);

  // Enrichment form state
  const [maxPosts, setMaxPosts] = useState(10);
  const [postedDateLimit, setPostedDateLimit] = useState("");
  const [forceEnrichment, setForceEnrichment] = useState(false);

  // Scraping state
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingStatus, setScrapingStatus] = useState<
    "idle" | "running" | "success" | "error"
  >("idle");
  const [scrapingMetrics, setScrapingMetrics] =
    useState<ScrapingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  // Check if scraper is an enrichment scraper
  const isEnrichmentScraper =
    scraper?.mapperType === "linkedin-company-posts" ||
    scraper?.mapperType === "linkedin-profile-posts";
  const isProfilePostsScraper =
    scraper?.mapperType === "linkedin-profile-posts";
  const isCompanyPostsScraper =
    scraper?.mapperType === "linkedin-company-posts";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (!scraperId || isNaN(scraperId)) {
      toast.error("ID de scraper invalide");
      router.push("/leads/scrape");
      return;
    }

    const fetchScraper = async () => {
      if (status === "authenticated") {
        try {
          const response = await fetch(`/api/scrapers/${scraperId}`);
          if (response.ok) {
            const data = await response.json();
            setScraper(data);
          } else {
            toast.error("Scraper non trouvé");
            router.push("/leads/scrape");
          }
        } catch (error) {
          console.error("Erreur lors de la récupération du scraper:", error);
          toast.error("Erreur lors de la récupération du scraper");
          router.push("/leads/scrape");
        } finally {
          setLoadingScraper(false);
        }
      }
    };

    fetchScraper();
  }, [scraperId, status, router]);

  useEffect(() => {
    const fetchCollections = async () => {
      if (status === "authenticated") {
        try {
          const response = await fetch("/api/collections");
          if (response.ok) {
            const data = await response.json();
            setCollections(data);
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération des collections:",
            error,
          );
        } finally {
          setLoadingCollections(false);
        }
      }
    };

    fetchCollections();
  }, [status]);

  useEffect(() => {
    const fetchLeads = async () => {
      if (
        status === "authenticated" &&
        isEnrichmentScraper &&
        isProfilePostsScraper
      ) {
        setLoadingLeads(true);
        try {
          const response = await fetch("/api/leads");
          if (response.ok) {
            const data = await response.json();
            // Récupérer tous les leads pour permettre la recherche et afficher le compteur
            const allLeads = data.data || data;
            setLeads(allLeads);
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des leads:", error);
        } finally {
          setLoadingLeads(false);
        }
      }
    };

    fetchLeads();
  }, [status, isEnrichmentScraper, isProfilePostsScraper]);

  useEffect(() => {
    const fetchCompanies = async () => {
      // Charger les entreprises si c'est un scraper d'enrichissement company posts
      // ou si le scraper a un champ de type "company"
      const hasCompanyField = scraper?.formConfig?.fields?.some(
        (field) => field.type === "company"
      );
      
      if (
        status === "authenticated" &&
        ((isEnrichmentScraper && isCompanyPostsScraper) || hasCompanyField)
      ) {
        setLoadingCompanies(true);
        try {
          const response = await fetch("/api/companies");
          if (response.ok) {
            const data = await response.json();
            // Récupérer toutes les entreprises pour permettre la recherche et afficher le compteur
            const allCompanies = data.data || data;
            setCompanies(allCompanies);
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des companies:", error);
        } finally {
          setLoadingCompanies(false);
        }
      }
    };

    fetchCompanies();
  }, [status, isEnrichmentScraper, isCompanyPostsScraper, scraper]);

  const handleEnrichmentSubmit = async () => {
    if (!scraperId) {
      toast.error("ID de scraper invalide");
      return;
    }

    // Validation
    if (!enrichmentType) {
      toast.error("Veuillez sélectionner un type d'enrichissement");
      return;
    }

    if (enrichmentType === "lead" && !selectedLeadId) {
      toast.error("Veuillez sélectionner un lead");
      return;
    }

    if (enrichmentType === "company" && !selectedCompanyId) {
      toast.error("Veuillez sélectionner une entreprise");
      return;
    }

    if (enrichmentType === "collection" && !selectedCollectionId) {
      toast.error("Veuillez sélectionner une collection");
      return;
    }

    setIsScraping(true);
    setScrapingStatus("running");
    setScrapingMetrics(null);
    setErrorMessage(null);
    setRunId(null);

    try {
      let url = "";
      let id = 0;

      if (enrichmentType === "lead") {
        url = `/api/leads/${selectedLeadId}/enrich`;
        id = selectedLeadId!;
      } else if (enrichmentType === "company") {
        url = `/api/companies/${selectedCompanyId}/enrich`;
        id = selectedCompanyId!;
      } else {
        url = `/api/collections/${selectedCollectionId}/enrich`;
        id = selectedCollectionId!;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scraperId,
          maxPosts,
          postedDateLimit: postedDateLimit || undefined,
          forceEnrichment,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setScrapingStatus("success");
        // Adapt metrics format for enrichment
        setScrapingMetrics({
          totalFound: data.metrics?.total || data.metrics?.created || 0,
          created: data.metrics?.created || data.metrics?.enriched || 0,
          skipped: data.metrics?.skipped || 0,
          errors: data.metrics?.errors || 0,
        });
        toast.success(
          `Enrichissement terminé : ${data.metrics?.created || data.metrics?.enriched || 0} posts créés`,
        );
      } else {
        setScrapingStatus("error");
        setErrorMessage(data.error || "Erreur lors de l'enrichissement");
        toast.error(data.error || "Erreur lors de l'enrichissement");
      }
    } catch (error) {
      console.error("Erreur lors de l'enrichissement:", error);
      setScrapingStatus("error");
      setErrorMessage("Erreur de connexion lors de l'enrichissement");
      toast.error("Erreur de connexion lors de l'enrichissement");
    } finally {
      setIsScraping(false);
    }
  };

  const handleSubmit = async (formData: Record<string, unknown>) => {
    if (!scraperId) {
      toast.error("ID de scraper invalide");
      return;
    }

    // If enrichment scraper, use enrichment handler
    if (isEnrichmentScraper) {
      await handleEnrichmentSubmit();
      return;
    }

    const collectionId = formData.collectionId;
    if (!collectionId || typeof collectionId !== "number") {
      toast.error("Veuillez sélectionner une collection");
      return;
    }

    if (collections.length === 0) {
      toast.error("Vous devez créer au moins une collection avant de scraper");
      return;
    }

    setIsScraping(true);
    setScrapingStatus("running");
    setScrapingMetrics(null);
    setErrorMessage(null);
    setRunId(null);

    try {
      const response = await fetch("/api/scraping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scraperId,
          collectionId,
          ...formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setScrapingStatus("success");
        setScrapingMetrics(data.metrics);
        setRunId(data.runId);
        toast.success(
          `Scraping terminé : ${data.metrics.created} leads créés, ${data.metrics.skipped} ignorés`,
        );
      } else {
        setScrapingStatus("error");
        setErrorMessage(data.error || "Erreur lors du scraping");
        setRunId(data.runId || null);
        toast.error(data.error || "Erreur lors du scraping");
      }
    } catch (error) {
      console.error("Erreur lors du scraping:", error);
      setScrapingStatus("error");
      setErrorMessage("Erreur de connexion lors du scraping");
      toast.error("Erreur de connexion lors du scraping");
    } finally {
      setIsScraping(false);
    }
  };

  // Vérifier si le scraper a un champ de type "company"
  const hasCompanyField = scraper?.formConfig?.fields?.some(
    (field) => field.type === "company"
  );

  if (
    status === "loading" ||
    loadingScraper ||
    loadingCollections ||
    (isEnrichmentScraper && (loadingLeads || loadingCompanies)) ||
    (hasCompanyField && loadingCompanies)
  ) {
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

  if (!scraper) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="ml-2">Scraper non trouvé</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // For non-enrichment scrapers, require at least one collection
  if (!isEnrichmentScraper && collections.length === 0) {
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
                    <BreadcrumbLink asChild>
                      <Link href="/leads/scrape">Scraping</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{scraper.name}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
            <Card>
              <CardHeader>
                <CardTitle>Aucune collection disponible</CardTitle>
                <CardDescription>
                  Vous devez créer au moins une collection avant de pouvoir
                  scraper des leads.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/leads/collections/new">
                    Créer une collection
                  </Link>
                </Button>
              </CardContent>
            </Card>
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
                  <BreadcrumbLink asChild>
                    <Link href="/leads/scrape">Scraping</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{scraper.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="mb-2">
            <h1 className="text-2xl font-bold">{scraper.name}</h1>
            <p className="text-muted-foreground">
              {scraper.description ||
                "Configurez les paramètres et lancez un scraping de leads."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Colonne principale : Formulaire */}
            <div className="md:col-span-2">
              {isEnrichmentScraper ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Paramètres de scraping</CardTitle>
                    <CardDescription>
                      Configurez le nombre de posts et la date limite.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Type d'enrichissement */}
                    <div className="space-y-2">
                      <Label htmlFor="enrichmentType">
                        Type d'enrichissement *
                      </Label>
                      <Select
                        value={enrichmentType || ""}
                        onValueChange={(value) => {
                          setEnrichmentType(
                            value as "lead" | "company" | "collection",
                          );
                          // Reset selections when type changes
                          setSelectedLeadId(null);
                          setSelectedCompanyId(null);
                          setSelectedCollectionId(null);
                        }}
                      >
                        <SelectTrigger id="enrichmentType">
                          <SelectValue placeholder="Choisir un type d'enrichissement" />
                        </SelectTrigger>
                        <SelectContent>
                          {isProfilePostsScraper && (
                            <>
                              <SelectItem value="lead">
                                Enrichir un lead
                              </SelectItem>
                              <SelectItem value="collection">
                                Enrichir une collection
                              </SelectItem>
                            </>
                          )}
                          {isCompanyPostsScraper && (
                            <>
                              <SelectItem value="company">
                                Enrichir une entreprise
                              </SelectItem>
                              <SelectItem value="collection">
                                Enrichir une collection
                              </SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Select conditionnel selon le type */}
                    {enrichmentType === "lead" && (
                      <div className="space-y-2">
                        <Label htmlFor="leadSelect">
                          Sélectionner un lead *
                        </Label>
                        <Combobox
                          options={leads.map((lead) => {
                            const displayName =
                              lead.fullName ||
                              (lead.firstName && lead.lastName
                                ? `${lead.firstName} ${lead.lastName}`
                                : lead.firstName ||
                                  lead.lastName ||
                                  `Lead #${lead.id}`);
                            return {
                              value: lead.id.toString(),
                              label: `${displayName}${lead.company ? ` - ${lead.company.name}` : ""}`,
                            };
                          })}
                          value={selectedLeadId?.toString()}
                          onValueChange={(value) =>
                            setSelectedLeadId(value ? parseInt(value) : null)
                          }
                          placeholder="Rechercher un lead..."
                          searchPlaceholder="Tapez pour rechercher..."
                          emptyMessage="Aucun lead trouvé"
                          filterFunction={(option, search) => {
                            if (!search) return true;
                            const searchLower = search.toLowerCase();
                            const lead = leads.find((l) => l.id.toString() === option.value);
                            if (!lead) return false;
                            const fullName =
                              lead.fullName ||
                              (lead.firstName && lead.lastName
                                ? `${lead.firstName} ${lead.lastName}`
                                : lead.firstName || lead.lastName || "");
                            const companyName = lead.company?.name || "";
                            return (
                              fullName.toLowerCase().includes(searchLower) ||
                              (lead.firstName && lead.firstName.toLowerCase().includes(searchLower)) ||
                              (lead.lastName && lead.lastName.toLowerCase().includes(searchLower)) ||
                              companyName.toLowerCase().includes(searchLower)
                            );
                          }}
                        />
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {leads.filter((l) => l.linkedinUrl).length} leads éligibles sur {leads.length} total
                          </Badge>
                        </div>
                        {(() => {
                          const selectedLead = selectedLeadId ? leads.find((l) => l.id === selectedLeadId) : null;
                          const hasLinkedinUrl = selectedLead?.linkedinUrl != null;
                          if (selectedLeadId && !hasLinkedinUrl) {
                            return (
                              <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                                <AlertCircle className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                  Ce lead n'a pas d'URL LinkedIn et ne peut pas être enrichi avec des posts de profil
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    {enrichmentType === "company" && (
                      <div className="space-y-2">
                        <Label htmlFor="companySelect">
                          Sélectionner une entreprise *
                        </Label>
                        <Combobox
                          options={companies
                            .filter((company) => company.linkedinUrl)
                            .map((company) => ({
                              value: company.id.toString(),
                              label: company.name,
                            }))}
                          value={selectedCompanyId?.toString()}
                          onValueChange={(value) =>
                            setSelectedCompanyId(value ? parseInt(value) : null)
                          }
                          placeholder="Rechercher une entreprise..."
                          searchPlaceholder="Tapez pour rechercher..."
                          emptyMessage="Aucune entreprise trouvée"
                          filterFunction={(option, search) => {
                            if (!search) return true;
                            const searchLower = search.toLowerCase();
                            const company = companies.find((c) => c.id.toString() === option.value);
                            return company?.name.toLowerCase().includes(searchLower) || false;
                          }}
                        />
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {companies.filter((c) => c.linkedinUrl).length} entreprises éligibles sur {companies.length} total
                          </Badge>
                          {companies.filter((c) => c.linkedinUrl).length === 0 && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <AlertCircle className="h-3 w-3" />
                              Aucune entreprise avec URL LinkedIn disponible
                            </span>
                          )}
                        </div>
                        {(() => {
                          const selectedCompany = selectedCompanyId ? companies.find((c) => c.id === selectedCompanyId) : null;
                          const hasLinkedinUrl = selectedCompany?.linkedinUrl != null;
                          if (selectedCompanyId && !hasLinkedinUrl) {
                            return (
                              <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                                <AlertCircle className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                  Cette entreprise n'a pas d'URL LinkedIn et ne peut pas être enrichie avec des posts d'entreprise
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    {enrichmentType === "collection" && (
                      <div className="space-y-2">
                        <Label htmlFor="collectionSelect">
                          Sélectionner une collection *
                        </Label>
                        <Select
                          value={selectedCollectionId?.toString() || ""}
                          onValueChange={(value) =>
                            setSelectedCollectionId(parseInt(value))
                          }
                        >
                          <SelectTrigger id="collectionSelect">
                            <SelectValue placeholder="Choisir une collection" />
                          </SelectTrigger>
                          <SelectContent>
                            {collections.map((collection) => (
                              <SelectItem
                                key={collection.id}
                                value={collection.id.toString()}
                              >
                                {collection.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Paramètres de scraping */}
                    <div className="space-y-2">
                      <Label htmlFor="maxPosts">
                        Nombre maximum de posts *
                      </Label>
                      <Input
                        id="maxPosts"
                        type="number"
                        min={1}
                        max={1000}
                        value={maxPosts}
                        onChange={(e) =>
                          setMaxPosts(parseInt(e.target.value) || 1)
                        }
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        Nombre maximum de posts à récupérer (1-1000)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postedDateLimit">
                        Date limite (optionnel)
                      </Label>
                      <Input
                        id="postedDateLimit"
                        type="text"
                        placeholder="YYYY-MM-DD ou timestamp"
                        value={postedDateLimit}
                        onChange={(e) => setPostedDateLimit(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Ne récupérer que les posts après cette date (format ISO
                        ou timestamp)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="forceEnrichment"
                          checked={forceEnrichment}
                          onCheckedChange={setForceEnrichment}
                        />
                        <Label
                          htmlFor="forceEnrichment"
                          className="cursor-pointer"
                        >
                          Forcer l'enrichissement
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ré-enrichir même si déjà enrichi
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <ScraperForm
                  formConfig={scraper.formConfig}
                  collections={collections}
                  companies={companies}
                  onSubmit={handleSubmit}
                  isSubmitting={isScraping}
                  formRef={formRef}
                />
              )}
              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  disabled={(() => {
                    if (isScraping) return true;
                    if (isEnrichmentScraper) {
                      // Validation des prérequis pour l'enrichissement
                      if (enrichmentType === "lead" && selectedLeadId) {
                        const selectedLead = leads.find((l) => l.id === selectedLeadId);
                        if (isProfilePostsScraper && !selectedLead?.linkedinUrl) {
                          return true; // Désactiver si pas d'URL LinkedIn pour Profile Posts
                        }
                      }
                      if (enrichmentType === "company" && selectedCompanyId) {
                        const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
                        if (isCompanyPostsScraper && !selectedCompany?.linkedinUrl) {
                          return true; // Désactiver si pas d'URL LinkedIn pour Company Posts
                        }
                      }
                      // Désactiver si aucun type sélectionné ou si le type nécessite une sélection mais aucune n'est faite
                      if (!enrichmentType) return true;
                      if (enrichmentType === "lead" && !selectedLeadId) return true;
                      if (enrichmentType === "company" && !selectedCompanyId) return true;
                      if (enrichmentType === "collection" && !selectedCollectionId) return true;
                    }
                    return false;
                  })()}
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    if (isEnrichmentScraper) {
                      handleEnrichmentSubmit();
                    } else if (formRef.current) {
                      formRef.current.requestSubmit();
                    }
                  }}
                >
                  {isScraping ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEnrichmentScraper
                        ? "Enrichissement en cours..."
                        : "Scraping en cours..."}
                    </>
                  ) : isEnrichmentScraper ? (
                    "Lancer l'enrichissement"
                  ) : (
                    "Lancer le scraping"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isScraping}
                  size="lg"
                >
                  Annuler
                </Button>
              </div>
            </div>

            {/* Colonne latérale : Statut */}
            <div className="md:col-span-1">
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle>
                    Statut{" "}
                    {isEnrichmentScraper
                      ? "de l'enrichissement"
                      : "du scraping"}
                  </CardTitle>
                  <CardDescription>
                    Suivez l'avancement{" "}
                    {isEnrichmentScraper
                      ? "de votre enrichissement"
                      : "de votre scraping"}
                    .
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {scrapingStatus === "idle" && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Aucun{" "}
                        {isEnrichmentScraper ? "enrichissement" : "scraping"} en
                        cours. Configurez les paramètres et lancez{" "}
                        {isEnrichmentScraper
                          ? "un enrichissement"
                          : "un scraping"}
                        .
                      </p>
                    </div>
                  )}

                  {scrapingStatus === "running" && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                      <p className="text-sm font-medium mb-2">
                        {isEnrichmentScraper ? "Enrichissement" : "Scraping"} en
                        cours...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cela peut prendre plusieurs minutes selon le nombre de
                        résultats.
                      </p>
                      {runId && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Run ID: {runId}
                        </p>
                      )}
                    </div>
                  )}

                  {scrapingStatus === "success" && scrapingMetrics && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">
                          {isEnrichmentScraper ? "Enrichissement" : "Scraping"}{" "}
                          terminé avec succès
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Total trouvé:
                          </span>
                          <span className="font-medium">
                            {scrapingMetrics.totalFound}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Créés:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {scrapingMetrics.created}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Ignorés (doublons):
                          </span>
                          <span className="font-medium text-yellow-600 dark:text-yellow-400">
                            {scrapingMetrics.skipped}
                          </span>
                        </div>
                        {scrapingMetrics.errors > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Erreurs:
                            </span>
                            <span className="font-medium text-red-600 dark:text-red-400">
                              {scrapingMetrics.errors}
                            </span>
                          </div>
                        )}
                      </div>
                      {runId && (
                        <p className="text-xs text-muted-foreground pt-2 border-t">
                          Run ID: {runId}
                        </p>
                      )}
                    </div>
                  )}

                  {scrapingStatus === "error" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <XCircle className="h-5 w-5" />
                        <span className="font-medium">
                          Erreur lors{" "}
                          {isEnrichmentScraper
                            ? "de l'enrichissement"
                            : "du scraping"}
                        </span>
                      </div>
                      {errorMessage && (
                        <p className="text-sm text-muted-foreground">
                          {errorMessage}
                        </p>
                      )}
                      {runId && (
                        <p className="text-xs text-muted-foreground">
                          Run ID: {runId}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
