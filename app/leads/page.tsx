"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { FolderOpen, LayoutGrid, Table2 } from "lucide-react";
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
import { LeadsFilters } from "@/components/leads/leads-filters";
import { LeadsCardView } from "@/components/leads/leads-card-view";
import { LeadsTableView } from "@/components/leads/leads-table-view";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";

interface Collection {
  id: number;
  name: string;
  description: string | null;
  folderId?: number | null;
  folderName?: string | null;
  isDefault?: boolean;
}

interface Folder {
  id: number;
  name: string;
  description: string | null;
}

interface Lead {
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
  } | null;
  createdAt: Date;
}

type ViewMode = "cards" | "table";

export default function LeadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasScrolled = useScroll();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<{
    totalItems: number;
    totalPages: number;
    limit: number;
  } | null>(null);
  const [filters, setFilters] = useState<{
    collectionId?: string;
    folderId?: string;
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Charger les collections (avec nom du dossier) et en déduire les dossiers
  useEffect(() => {
    const fetchData = async () => {
      if (status === "authenticated") {
        try {
          const response = await fetch("/api/collections");
          if (response.ok) {
            const data = await response.json();
            setCollections(data);

            // Déduire les dossiers uniques depuis les collections
            const folderMap = new Map<
              number,
              { id: number; name: string; description: string | null }
            >();
            data.forEach(
              (c: {
                folderId: number | null;
                folderName: string | null;
                description: string | null;
              }) => {
                if (c.folderId && !folderMap.has(c.folderId)) {
                  folderMap.set(c.folderId, {
                    id: c.folderId,
                    name: c.folderName || "Sans dossier",
                    description: null,
                  });
                }
              }
            );
            setFolders(Array.from(folderMap.values()));
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération des données:",
            error
          );
        } finally {
          setLoadingCollections(false);
        }
      }
    };

    fetchData();
  }, [status]);

  // Charger les leads avec filtres et pagination
  const fetchLeads = useCallback(async (page: number = 1) => {
    if (status !== "authenticated") return;

    setLoadingLeads(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else if (value) {
          params.append(key, value);
        }
      });
      params.append("page", page.toString());
      params.append("limit", "50");

      const response = await fetch(`/api/leads?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data.data);
        setPagination(data.pagination);
        setCurrentPage(page);
      } else {
        console.error("Erreur lors de la récupération des leads");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des leads:", error);
    } finally {
      setLoadingLeads(false);
    }
  }, [status, filters]);

  useEffect(() => {
    fetchLeads(1); // Reset to first page when filters change
  }, [fetchLeads]);

  const handlePageChange = (page: number) => {
    fetchLeads(page);
  };

  // Skeleton pendant le chargement
  if (status === "loading" || loadingCollections) {
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
                <BreadcrumbItem>
                  <BreadcrumbPage>Leads</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4 pt-6 overflow-hidden">
          <div className="flex shrink-0 items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Leads</h1>
              <p className="text-muted-foreground">
                Gérez vos leads organisés par collection.
              </p>
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
            </div>
          </div>

          {collections.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <EmptyState
                title="Aucune collection"
                description="Pour commencer à gérer vos leads, vous devez d'abord créer une collection. Les leads seront ensuite organisés dans vos collections."
                actionLabel="Créer une collection"
                actionHref="/leads/collections/new"
                icon={FolderOpen}
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4 min-w-0">
              <div className="shrink-0 space-y-2">
                <LeadsFilters
                  collections={collections}
                  folders={folders}
                  filters={filters}
                  onFiltersChange={setFilters}
                  resultCount={pagination?.totalItems || 0}
                />
              </div>

              {loadingLeads ? (
                <div className="flex min-h-0 flex-1 overflow-auto rounded-xl border border-border/80 scrollbar-table">
                  <div className="w-full space-y-4">
                    {viewMode === "cards" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                          <Skeleton key={i} className="h-64 rounded-lg" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full rounded-md" />
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full rounded-md" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : leads.length === 0 ? (
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  <EmptyState
                    title="Aucun lead trouvé"
                    description={
                      Object.keys(filters).length > 0
                        ? "Aucun lead ne correspond à vos critères de recherche. Essayez de modifier vos filtres."
                        : "Vous n'avez pas encore de leads. Commencez par scraper des leads dans une collection."
                    }
                    icon={FolderOpen}
                  />
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/80 scrollbar-table">
                    {viewMode === "cards" ? (
                      <LeadsCardView leads={leads} />
                    ) : (
                      <LeadsTableView leads={leads} />
                    )}
                  </div>

                  {pagination && pagination.totalPages > 1 && (
                    <div className="shrink-0 space-y-4 pt-2">
                      <PaginationInfo
                        currentPage={currentPage}
                        totalItems={pagination.totalItems}
                        itemsPerPage={pagination.limit}
                        itemName="leads"
                      />
                      <Pagination
                        currentPage={currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={handlePageChange}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
