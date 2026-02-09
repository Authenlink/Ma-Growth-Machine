"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Zap, FolderOpen, Users, User, Building2, AlertCircle } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScroll } from "@/hooks/use-scroll";
import { EmptyState } from "@/components/empty-state";
import { EnrichmentForm } from "@/components/enrichment/enrichment-form";
import { EnrichAllForm } from "@/components/enrichment/enrich-all-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Scraper {
  id: number;
  name: string;
  description: string | null;
  provider: string;
  mapperType?: string;
}

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
  companyLinkedinPost: string | null;
  personLinkedinPost: string | null;
  company: {
    id: number;
    name: string;
    linkedinUrl: string | null;
  } | null;
}

interface Company {
  id: number;
  name: string;
  linkedinUrl: string | null;
}

export default function EnrichmentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasScrolled = useScroll();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [scrapers, setScrapers] = useState<Scraper[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingScrapers, setSubmittingScrapers] = useState<Set<number>>(new Set());
  const [collectionLeads, setCollectionLeads] = useState<Array<{
    id: number;
    linkedinUrl: string | null;
    company: { linkedinUrl: string | null } | null;
  }>>([]);
  const [loadingCollectionLeads, setLoadingCollectionLeads] = useState(false);
  
  // Récupérer le paramètre tab depuis l'URL
  const [activeTab, setActiveTab] = useState<"lead" | "company" | "collection">("lead");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Lire le paramètre tab depuis l'URL au chargement
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "lead" || tab === "company" || tab === "collection") {
        setActiveTab(tab);
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (status === "authenticated") {
        try {
          // Récupérer les scrapers d'enrichissement
          const scrapersResponse = await fetch("/api/scrapers");
          if (scrapersResponse.ok) {
            const scrapersData = await scrapersResponse.json();
            // Filtrer uniquement les scrapers d'enrichissement LinkedIn
            // Utiliser mapperType pour un filtrage plus fiable
            const enrichmentScrapers = scrapersData.filter(
              (s: Scraper) =>
                s.mapperType === "linkedin-company-posts" ||
                s.mapperType === "linkedin-profile-posts" ||
                (s.name.includes("LinkedIn") && s.name.includes("Posts"))
            );
            setScrapers(enrichmentScrapers);
          } else {
            console.error("Erreur lors de la récupération des scrapers:", scrapersResponse.status);
          }

          // Récupérer les collections
          const collectionsResponse = await fetch("/api/collections");
          if (collectionsResponse.ok) {
            const collectionsData = await collectionsResponse.json();
            setCollections(collectionsData);
          }

          // Récupérer les leads
          const leadsResponse = await fetch("/api/leads");
          if (leadsResponse.ok) {
            const leadsData = await leadsResponse.json();
            setLeads(leadsData.data);
          }

          // Récupérer les entreprises
          const companiesResponse = await fetch("/api/companies");
          if (companiesResponse.ok) {
            const companiesData = await companiesResponse.json();
            setCompanies(companiesData.data || companiesData);
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des données:", error);
          toast.error("Erreur lors du chargement des données");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [status]);

  // Charger les leads de la collection sélectionnée
  useEffect(() => {
    const fetchCollectionLeads = async () => {
      if (selectedCollectionId && status === "authenticated") {
        setLoadingCollectionLeads(true);
        try {
          const response = await fetch(`/api/collections/${selectedCollectionId}/leads`);
          if (response.ok) {
            const data = await response.json();
            setCollectionLeads(data.data || []);
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des leads de la collection:", error);
        } finally {
          setLoadingCollectionLeads(false);
        }
      } else {
        setCollectionLeads([]);
      }
    };

    fetchCollectionLeads();
  }, [selectedCollectionId, status]);

  const handleEnrichLead = async (data: {
    scraperId: number;
    maxPosts: number;
    postedDateLimit?: string;
    forceEnrichment: boolean;
  }) => {
    if (!selectedLeadId) {
      toast.error("Veuillez sélectionner un lead");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/leads/${selectedLeadId}/enrich`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(
          `Enrichissement réussi ! ${result.metrics.created} posts créés.`
        );
        // Rafraîchir les données
        const leadsResponse = await fetch("/api/leads");
        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          setLeads(leadsData.data);
        }
      } else {
        if (result.alreadyEnriched) {
          toast.warning(result.error);
        } else {
          toast.error(result.error || "Erreur lors de l'enrichissement");
        }
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'enrichissement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnrichCollection = async (data: {
    scraperId: number;
    maxPosts: number;
    postedDateLimit?: string;
    forceEnrichment: boolean;
  }) => {
    if (!selectedCollectionId) {
      toast.error("Veuillez sélectionner une collection");
      return;
    }

    // Marquer ce scraper comme en cours de soumission
    setSubmittingScrapers((prev) => new Set(prev).add(data.scraperId));
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/collections/${selectedCollectionId}/enrich`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(
          `Enrichissement terminé pour ${scrapers.find(s => s.id === data.scraperId)?.name || 'scraper'} ! ${result.metrics.enriched} leads enrichis, ${result.metrics.skipped} ignorés.`
        );
        // Rafraîchir les données
        const leadsResponse = await fetch("/api/leads");
        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          setLeads(leadsData.data);
        }
      } else {
        toast.error(result.error || "Erreur lors de l'enrichissement");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'enrichissement");
    } finally {
      setSubmittingScrapers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.scraperId);
        // Ne mettre isSubmitting à false que si aucun scraper n'est en cours
        if (newSet.size === 0) {
          setIsSubmitting(false);
        }
        return newSet;
      });
    }
  };

  const handleEnrichAllCollection = async (commonData: {
    maxPosts: number;
    postedDateLimit?: string;
    forceEnrichment: boolean;
  }) => {
    if (!selectedCollectionId) {
      toast.error("Veuillez sélectionner une collection");
      return;
    }

    const collectionScrapers = getScrapersForContext("collection");
    if (collectionScrapers.length === 0) {
      toast.error("Aucun scraper disponible");
      return;
    }

    setIsSubmitting(true);
    setSubmittingScrapers(new Set(collectionScrapers.map(s => s.id)));

    try {
      // Lancer tous les scrapers en parallèle
      const promises = collectionScrapers.map((scraper) =>
        fetch(`/api/collections/${selectedCollectionId}/enrich`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scraperId: scraper.id,
            ...commonData,
          }),
        }).then(async (response) => {
          const result = await response.json();
          return { scraper, response, result };
        })
      );

      const results = await Promise.allSettled(promises);

      let successCount = 0;
      let errorCount = 0;

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          const { scraper, response, result: data } = result.value;
          if (response.ok) {
            successCount++;
            toast.success(
              `${scraper.name} : ${data.metrics.enriched} leads enrichis`
            );
          } else {
            errorCount++;
            toast.error(`${scraper.name} : ${data.error || "Erreur"}`);
          }
        } else {
          errorCount++;
          toast.error(
            `${collectionScrapers[index].name} : Erreur lors de l'enrichissement`
          );
        }
      });

      if (successCount > 0) {
        // Rafraîchir les données
        const leadsResponse = await fetch("/api/leads");
        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          setLeads(leadsData.data);
        }
      }

      if (successCount === collectionScrapers.length) {
        toast.success("Tous les enrichissements sont terminés avec succès !");
      } else if (errorCount > 0) {
        toast.warning(`${successCount} enrichissement(s) réussi(s), ${errorCount} erreur(s)`);
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'enrichissement");
    } finally {
      setIsSubmitting(false);
      setSubmittingScrapers(new Set());
    }
  };

  const handleEnrichCompany = async (data: {
    scraperId: number;
    maxPosts: number;
    postedDateLimit?: string;
    forceEnrichment: boolean;
  }) => {
    if (!selectedCompanyId) {
      toast.error("Veuillez sélectionner une entreprise");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/enrich`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(
          `Enrichissement réussi ! ${result.metrics.created} posts créés pour ${result.metrics.leadsUpdated} leads.`
        );
        // Rafraîchir les données
        const leadsResponse = await fetch("/api/leads");
        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          setLeads(leadsData.data);
        }
      } else {
        toast.error(result.error || "Erreur lors de l'enrichissement");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'enrichissement");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
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
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!session) {
    return null;
  }

  // Filtrer les scrapers selon le type
  const getScrapersForContext = (context: "lead" | "company" | "collection") => {
    const allEnrichmentScrapers = scrapers.filter(
      (s) =>
        s.mapperType === "linkedin-company-posts" ||
        s.mapperType === "linkedin-profile-posts" ||
        (s.name.includes("LinkedIn") && s.name.includes("Posts"))
    );

    if (context === "lead") {
      // Pour un lead, seulement les posts de profil (linkedin-profile-posts)
      return allEnrichmentScrapers.filter((s) =>
        s.mapperType === "linkedin-profile-posts" || s.name.includes("Profile")
      );
    } else if (context === "company") {
      // Pour une entreprise, seulement les posts d'entreprise (linkedin-company-posts)
      return allEnrichmentScrapers.filter((s) =>
        s.mapperType === "linkedin-company-posts" || s.name.includes("Company")
      );
    } else {
      // Pour une collection, les deux types
      return allEnrichmentScrapers;
    }
  };

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
                  <BreadcrumbPage>Enrichissement</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="mb-2">
            <h1 className="text-2xl font-bold">Enrichissement</h1>
            <p className="text-muted-foreground">
              Enrichissez vos leads avec des posts LinkedIn.
            </p>
          </div>

          {collections.length === 0 ? (
            <EmptyState
              title="Aucune collection"
              description="Pour enrichir des leads, vous devez d'abord créer une collection et y ajouter des leads."
              actionLabel="Créer une collection"
              actionHref="/leads/collections/new"
              icon={FolderOpen}
            />
          ) : scrapers.length === 0 ? (
            <EmptyState
              title="Aucun scraper d'enrichissement"
              description="Les scrapers d'enrichissement LinkedIn ne sont pas encore configurés. Veuillez exécuter le script de seed des scrapers."
              icon={Zap}
            />
          ) : (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "lead" | "company" | "collection")} className="w-full">
              <TabsList>
                <TabsTrigger value="lead">
                  <User className="mr-2 h-4 w-4" />
                  Enrichir un lead
                </TabsTrigger>
                <TabsTrigger value="company">
                  <Building2 className="mr-2 h-4 w-4" />
                  Enrichir une entreprise
                </TabsTrigger>
                <TabsTrigger value="collection">
                  <Users className="mr-2 h-4 w-4" />
                  Enrichir une collection
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lead" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sélectionner un lead</label>
                  <Combobox
                    options={leads.map((lead) => {
                      const displayName =
                        lead.fullName ||
                        (lead.firstName && lead.lastName
                          ? `${lead.firstName} ${lead.lastName}`
                          : lead.firstName || lead.lastName || `Lead #${lead.id}`);
                      return {
                        value: lead.id.toString(),
                        label: `${displayName}${lead.company ? ` - ${lead.company.name}` : ""}`,
                      };
                    })}
                    value={selectedLeadId?.toString()}
                    onValueChange={(value) => setSelectedLeadId(value ? parseInt(value) : null)}
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
                </div>

                {selectedLeadId && (() => {
                  const selectedLead = leads.find((l) => l.id === selectedLeadId);
                  const leadsScrapers = getScrapersForContext("lead");
                  
                  return (
                    <div className="grid gap-4 md:grid-cols-1">
                      {leadsScrapers.map((scraper) => {
                        const isProfilePostsScraper = scraper.mapperType === "linkedin-profile-posts";
                        const hasLinkedinUrl = selectedLead?.linkedinUrl != null;
                        const canEnrich = !isProfilePostsScraper || hasLinkedinUrl;
                        const warningMessage = isProfilePostsScraper && !hasLinkedinUrl
                          ? "Ce lead n'a pas d'URL LinkedIn et ne peut pas être enrichi avec des posts de profil"
                          : undefined;

                        return (
                          <EnrichmentForm
                            key={scraper.id}
                            scraperId={scraper.id}
                            scraperName={scraper.name}
                            onSubmit={handleEnrichLead}
                            isSubmitting={isSubmitting}
                            disabled={!canEnrich}
                            warningMessage={warningMessage}
                          />
                        );
                      })}
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="company" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sélectionner une entreprise</label>
                  <Combobox
                    options={companies
                      .filter((company) => company.linkedinUrl)
                      .map((company) => ({
                        value: company.id.toString(),
                        label: company.name,
                      }))}
                    value={selectedCompanyId?.toString()}
                    onValueChange={(value) => setSelectedCompanyId(value ? parseInt(value) : null)}
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
                </div>

                {selectedCompanyId && (() => {
                  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
                  const companyScrapers = getScrapersForContext("company");
                  
                  return (
                    <div className="grid gap-4 md:grid-cols-1">
                      {companyScrapers.map((scraper) => {
                        const isCompanyPostsScraper = scraper.mapperType === "linkedin-company-posts";
                        const hasLinkedinUrl = selectedCompany?.linkedinUrl != null;
                        const canEnrich = !isCompanyPostsScraper || hasLinkedinUrl;
                        const warningMessage = isCompanyPostsScraper && !hasLinkedinUrl
                          ? "Cette entreprise n'a pas d'URL LinkedIn et ne peut pas être enrichie avec des posts d'entreprise"
                          : undefined;

                        return (
                          <EnrichmentForm
                            key={scraper.id}
                            scraperId={scraper.id}
                            scraperName={scraper.name}
                            onSubmit={handleEnrichCompany}
                            isSubmitting={isSubmitting}
                            disabled={!canEnrich}
                            warningMessage={warningMessage}
                          />
                        );
                      })}
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="collection" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sélectionner une collection</label>
                  <Select
                    value={selectedCollectionId?.toString() || ""}
                    onValueChange={(value) => setSelectedCollectionId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une collection" />
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map((collection) => (
                        <SelectItem key={collection.id} value={collection.id.toString()}>
                          {collection.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCollectionId && (() => {
                  const collectionScrapers = getScrapersForContext("collection");
                  
                  // Compter les leads avec/sans URL LinkedIn selon le type de scraper
                  const profilePostsScraper = collectionScrapers.find(s => s.mapperType === "linkedin-profile-posts");
                  const companyPostsScraper = collectionScrapers.find(s => s.mapperType === "linkedin-company-posts");
                  
                  const totalLeads = collectionLeads.length;
                  const leadsWithoutProfileUrl = profilePostsScraper 
                    ? collectionLeads.filter(l => !l.linkedinUrl).length 
                    : 0;
                  const leadsWithoutCompanyUrl = companyPostsScraper 
                    ? collectionLeads.filter(l => !l.company?.linkedinUrl).length 
                    : 0;
                  
                  return (
                    <>
                      {/* Messages d'avertissement pour les leads sans URL LinkedIn */}
                      {totalLeads > 0 && (
                        <>
                          {profilePostsScraper && leadsWithoutProfileUrl > 0 && (
                            <div className="mb-4 flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                              <AlertCircle className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                  {leadsWithoutProfileUrl} lead(s) sans URL LinkedIn
                                </p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                  Seuls les {totalLeads - leadsWithoutProfileUrl} lead(s) avec une URL LinkedIn seront enrichis avec des posts de profil.
                                </p>
                              </div>
                            </div>
                          )}
                          {companyPostsScraper && leadsWithoutCompanyUrl > 0 && (
                            <div className="mb-4 flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                              <AlertCircle className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                  {leadsWithoutCompanyUrl} lead(s) sans URL LinkedIn d'entreprise
                                </p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                  Seuls les {totalLeads - leadsWithoutCompanyUrl} lead(s) avec une entreprise ayant une URL LinkedIn seront enrichis avec des posts d'entreprise.
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      
                      {collectionScrapers.length > 1 && (
                        <div className="mb-4">
                          <EnrichAllForm
                            onSubmit={handleEnrichAllCollection}
                            isSubmitting={isSubmitting}
                          />
                        </div>
                      )}
                      <div className="grid gap-4 md:grid-cols-2">
                        {collectionScrapers.map((scraper) => (
                          <EnrichmentForm
                            key={scraper.id}
                            scraperId={scraper.id}
                            scraperName={scraper.name}
                            onSubmit={handleEnrichCollection}
                            isSubmitting={submittingScrapers.has(scraper.id) || isSubmitting}
                          />
                        ))}
                      </div>
                    </>
                  );
                })()}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
