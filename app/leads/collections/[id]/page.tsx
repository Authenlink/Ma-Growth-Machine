"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, use, useCallback } from "react";
import {
  LayoutGrid,
  Table2,
  ArrowLeft,
  FolderOpen,
  Plus,
  Users,
  ShieldCheck,
  Copy,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { useScroll } from "@/hooks/use-scroll";
import { EmptyState } from "@/components/empty-state";
import { DuplicatesCard } from "@/components/leads/duplicates-card";
import { LeadsFilters } from "@/components/leads/leads-filters";
import { LeadsCardView } from "@/components/leads/leads-card-view";
import { LeadsTableView } from "@/components/leads/leads-table-view";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";

interface Collection {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Lead {
  id: number;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  email: string | null;
  emailVerifyEmaillist?: string | null;
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
  } | null;
  createdAt: Date;
}

interface CollectionData {
  collection: Collection;
  leads: {
    data: Lead[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  };
}

type ViewMode = "cards" | "table";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default function CollectionDetailPage({ params }: Props) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasScrolled = useScroll();
  const [collectionData, setCollectionData] = useState<CollectionData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<{
    collectionId?: string;
    companyName?: string;
    leadName?: string;
    seniority?: string;
    functional?: string;
    position?: string;
    status?: string;
    validated?: string;
    sourceTypes?: string[];
    scoreCategory?: string;
  }>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<number | null>(null);
  const [deletingLead, setDeletingLead] = useState(false);
  const [verifyingEmails, setVerifyingEmails] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyStats, setVerifyStats] = useState<{
    totalWithEmail: number;
    verifiedCount: number;
    unverifiedCount: number;
    estimatedCostUnverified: number;
    estimatedCostAll: number;
  } | null>(null);
  const [loadingVerifyStats, setLoadingVerifyStats] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Charger la collection et ses leads avec pagination et filtres
  const fetchCollectionData = useCallback(
    async (page: number = 1) => {
      if (status !== "authenticated") return;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", "50");
        if (filters.sourceTypes?.length) {
          filters.sourceTypes.forEach((t) => params.append("sourceTypes", t));
        }
        if (filters.scoreCategory) {
          params.append("scoreCategory", filters.scoreCategory);
        }

        const response = await fetch(
          `/api/collections/${id}?${params.toString()}`,
        );
        if (response.ok) {
          const data = await response.json();
          setCollectionData(data);
          setCurrentPage(page);
        } else if (response.status === 404) {
          router.push("/leads/collections");
        } else {
          console.error("Erreur lors de la récupération de la collection");
        }
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de la collection:",
          error,
        );
      } finally {
        setLoading(false);
      }
    },
    [status, id, router, filters.sourceTypes, filters.scoreCategory],
  );

  useEffect(() => {
    fetchCollectionData(1); // Reset to first page when filters change
  }, [fetchCollectionData]);

  // Filtrer les leads selon les critères (filtrage côté client pour la pagination)
  const getFilteredLeads = () => {
    if (!collectionData) return [];

    return collectionData.leads.data.filter((lead) => {
      if (
        filters.companyName &&
        lead.company?.name
          .toLowerCase()
          .includes(filters.companyName.toLowerCase()) === false
      ) {
        return false;
      }
      if (filters.leadName) {
        const fullName =
          lead.fullName ||
          `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
        if (!fullName.toLowerCase().includes(filters.leadName.toLowerCase())) {
          return false;
        }
      }
      if (filters.seniority && lead.seniority !== filters.seniority) {
        return false;
      }
      if (filters.functional && lead.functional !== filters.functional) {
        return false;
      }
      if (
        filters.position &&
        lead.position
          ?.toLowerCase()
          .includes(filters.position.toLowerCase()) === false
      ) {
        return false;
      }
      if (filters.status && lead.status !== filters.status) {
        return false;
      }
      if (
        filters.validated &&
        lead.validated !== (filters.validated === "true")
      ) {
        return false;
      }
      return true;
    });
  };

  const handlePageChange = (page: number) => {
    fetchCollectionData(page);
  };

  const handleDeleteLead = (leadId: number) => {
    setLeadToDelete(leadId);
    setDeleteDialogOpen(true);
  };

  const handleOpenVerifyDialog = async () => {
    setVerifyDialogOpen(true);
    setLoadingVerifyStats(true);
    setVerifyStats(null);
    try {
      const response = await fetch(
        `/api/collections/${id}/verify-emails-apify`,
      );
      const data = await response.json();
      if (response.ok) {
        setVerifyStats({
          totalWithEmail: data.totalWithEmail ?? 0,
          verifiedCount: data.verifiedCount ?? 0,
          unverifiedCount: data.unverifiedCount ?? 0,
          estimatedCostUnverified:
            (data.unverifiedCount ?? 0) * (data.costPerLead ?? 0.001),
          estimatedCostAll:
            (data.totalWithEmail ?? 0) * (data.costPerLead ?? 0.001),
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement des stats:", error);
      toast.error("Erreur lors du chargement des statistiques");
    } finally {
      setLoadingVerifyStats(false);
    }
  };

  const handleVerifyEmails = async (force: boolean) => {
    setVerifyDialogOpen(false);
    setVerifyingEmails(true);
    try {
      const response = await fetch(
        `/api/collections/${id}/verify-emails-apify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        },
      );
      const data = await response.json();

      if (response.ok) {
        const m = data.metrics || {};
        toast.success(
          `Vérification terminée : ${m.enriched ?? 0} emails vérifiés${m.estimatedCostUsd != null ? ` (~$${m.estimatedCostUsd})` : ""}`,
        );
        fetchCollectionData(currentPage);
      } else {
        toast.error(data.error || "Erreur lors de la vérification des emails");
      }
    } catch (error) {
      console.error("Erreur lors de la vérification:", error);
      toast.error("Erreur de connexion lors de la vérification des emails");
    } finally {
      setVerifyingEmails(false);
    }
  };

  const confirmDeleteLead = async () => {
    if (!leadToDelete) return;

    setDeletingLead(true);
    try {
      const response = await fetch(`/api/leads/${leadToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Lead supprimé avec succès");
        // Rafraîchir les données
        fetchCollectionData(currentPage);
      } else {
        const error = await response.json();
        toast.error(error.error || "Erreur lors de la suppression du lead");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression du lead");
    } finally {
      setDeletingLead(false);
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
    }
  };

  // Skeleton pendant le chargement
  if (status === "loading" || loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex h-dvh flex-col overflow-hidden">
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
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4 pt-6 overflow-hidden">
            <Skeleton className="h-8 w-64 shrink-0" />
            <Skeleton className="h-12 w-full shrink-0 rounded-xl" />
            <Skeleton className="min-h-0 flex-1 w-full rounded-xl" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!session || !collectionData) {
    return null;
  }

  const filteredLeads = getFilteredLeads();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex h-dvh flex-col overflow-hidden">
        <header
          className={`flex h-16 shrink-0 items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 ${
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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link href="/leads/collections">Collections</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {collectionData.collection.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4 pt-6 overflow-hidden">
          {/* Header aligné avec Tous les leads */}
          <div className="flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild size="sm" className="gap-2 -ml-2">
                <Link href="/leads/collections">
                  <ArrowLeft className="h-4 w-4" />
                  Retour aux collections
                </Link>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold">
                  {collectionData.collection.name}
                </h1>
                <p className="text-muted-foreground">
                  {collectionData.leads.pagination.totalItems} lead
                  {collectionData.leads.pagination.totalItems !== 1 ? "s" : ""}{" "}
                  dans cette collection
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Cards
              </Button>
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
                variant="outline"
                size="sm"
                onClick={handleOpenVerifyDialog}
                disabled={
                  verifyingEmails ||
                  collectionData.leads.pagination.totalItems === 0
                }
                className="gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                {verifyingEmails
                  ? "Vérification en cours..."
                  : "Vérifier les emails"}
              </Button>
              <Button asChild size="sm" className="gap-2">
                <Link
                  href={`/leads/scrape?collectionId=${collectionData.collection.id}`}
                >
                  <Plus className="h-4 w-4" />
                  Ajouter des leads
                </Link>
              </Button>
            </div>
          </div>

          {/* Infos collection sur une ligne */}
          <Card className="shrink-0">
            <CardContent className="py-3 px-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {collectionData.collection.name}
                  </span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <span className="max-w-[200px] truncate text-sm text-muted-foreground">
                  {collectionData.collection.description || "Aucune description"}
                </span>
                <Separator orientation="vertical" className="h-4" />
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  {collectionData.leads.pagination.totalItems} leads
                </Badge>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-sm text-muted-foreground">
                  Créée le{" "}
                  {new Date(
                    collectionData.collection.createdAt,
                  ).toLocaleDateString("fr-FR")}
                </span>
                <div className="ml-auto">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Copy className="h-4 w-4" />
                        Vérifier les doublons
                      </Button>
                    </SheetTrigger>
                    <SheetContent
                      side="right"
                      className="sm:max-w-md overflow-y-auto"
                    >
                      <SheetTitle className="sr-only">
                        Vérifier les doublons
                      </SheetTitle>
                      <div className="pt-2">
                        <DuplicatesCard
                          collectionId={collectionData.collection.id}
                          onCleaned={() => {
                            fetchCollectionData(1);
                          }}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section leads */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 min-w-0">
            {collectionData.leads.data.length === 0 ? (
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <EmptyState
                  title="Aucun lead dans cette collection"
                  description="Commencez par scraper des leads pour cette collection."
                  actionLabel="Scraper des leads"
                  actionHref={`/leads/scrape?collectionId=${collectionData.collection.id}`}
                  icon={FolderOpen}
                />
              </div>
            ) : (
              <>
                <div className="shrink-0 space-y-2">
                  <LeadsFilters
                    collections={[]}
                    folders={[]}
                    filters={filters}
                    onFiltersChange={setFilters}
                    resultCount={collectionData.leads.pagination.totalItems}
                  />
                </div>

                {filteredLeads.length === 0 ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center">
                    <EmptyState
                      title="Aucun lead trouvé"
                      description="Aucun lead ne correspond à vos critères de recherche. Essayez de modifier vos filtres."
                      icon={FolderOpen}
                    />
                  </div>
                ) : (
                  <>
                    <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/80 scrollbar-table">
                      {viewMode === "cards" ? (
                        <LeadsCardView
                          leads={filteredLeads}
                          onDeleteLead={handleDeleteLead}
                        />
                      ) : (
                        <LeadsTableView
                          leads={filteredLeads}
                          onDeleteLead={handleDeleteLead}
                        />
                      )}
                    </div>

                    {collectionData.leads.pagination.totalPages > 1 && (
                      <div className="shrink-0 space-y-4 pt-2">
                        <PaginationInfo
                          currentPage={currentPage}
                          totalItems={
                            collectionData.leads.pagination.totalItems
                          }
                          itemsPerPage={collectionData.leads.pagination.limit}
                          itemName="leads"
                        />
                        <Pagination
                          currentPage={currentPage}
                          totalPages={
                            collectionData.leads.pagination.totalPages
                          }
                          onPageChange={handlePageChange}
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Dialog de confirmation de suppression */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer ce lead ? Cette action est
                irréversible et supprimera également tous les posts LinkedIn
                associés à ce lead.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingLead}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={confirmDeleteLead}
                disabled={deletingLead}
              >
                {deletingLead ? "Suppression..." : "Supprimer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de vérification des emails */}
        <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vérifier les emails</DialogTitle>
              <DialogDescription>
                {loadingVerifyStats ? (
                  "Chargement des statistiques..."
                ) : verifyStats ? (
                  <>
                    {verifyStats.totalWithEmail === 0 ? (
                      <span>Aucun lead avec email dans cette collection.</span>
                    ) : (
                      <>
                        <span className="block mb-2">
                          {verifyStats.verifiedCount} lead
                          {verifyStats.verifiedCount !== 1 ? "s" : ""} déjà
                          vérifié
                          {verifyStats.verifiedCount !== 1 ? "s" : ""},{" "}
                          {verifyStats.unverifiedCount} non vérifié
                          {verifyStats.unverifiedCount !== 1 ? "s" : ""}.
                        </span>
                        <span className="block text-sm">
                          Choisissez quels emails vérifier (~$0.001 par email).
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  "Erreur lors du chargement."
                )}
              </DialogDescription>
            </DialogHeader>
            {verifyStats && verifyStats.totalWithEmail > 0 && (
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {verifyStats.unverifiedCount > 0 && (
                  <Button
                    onClick={() => handleVerifyEmails(false)}
                    disabled={verifyingEmails}
                    className="w-full sm:w-auto"
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Vérifier uniquement les {verifyStats.unverifiedCount} non
                    vérifiés (~$
                    {verifyStats.estimatedCostUnverified.toFixed(2)})
                  </Button>
                )}
                <Button
                  variant={verifyStats.unverifiedCount > 0 ? "outline" : "default"}
                  onClick={() => handleVerifyEmails(true)}
                  disabled={verifyingEmails}
                  className="w-full sm:w-auto"
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Vérifier tous les {verifyStats.totalWithEmail} (~$
                  {verifyStats.estimatedCostAll.toFixed(2)})
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
