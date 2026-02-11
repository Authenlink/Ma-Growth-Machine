"use client";

import { useEffect, useState, useCallback } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
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
import { EmptyState } from "@/components/empty-state";
import { CompaniesFilters } from "@/components/companies/companies-filters";
import { CompaniesCardView } from "@/components/companies/companies-card-view";
import { CompaniesTableView } from "@/components/companies/companies-table-view";
import { Pagination, PaginationInfo } from "@/components/ui/pagination";
import Link from "next/link";

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
  createdAt: Date;
}

type ViewMode = "cards" | "table";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<{
    totalItems: number;
    totalPages: number;
    limit: number;
  } | null>(null);
  const [filters, setFilters] = useState<{
    name?: string;
    industry?: string;
    size?: string;
    country?: string;
    city?: string;
  }>({});

  // Charger les entreprises avec filtres et pagination
  const fetchCompanies = useCallback(async (page: number = 1) => {
    setLoadingCompanies(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });
      params.append("page", page.toString());
      params.append("limit", "50");

      const response = await fetch(`/api/companies?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.data);
        setPagination(data.pagination);
        setCurrentPage(page);
      } else {
        console.error("Erreur lors de la récupération des entreprises");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des entreprises:", error);
    } finally {
      setLoadingCompanies(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCompanies(1); // Reset to first page when filters change
  }, [fetchCompanies]);

  const handlePageChange = (page: number) => {
    fetchCompanies(page);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
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
                  <BreadcrumbPage>Entreprises</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-6 overflow-x-hidden">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold">Entreprises</h1>
              <p className="text-muted-foreground">
                Gérez votre base de données d&apos;entreprises.
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

          <div className="space-y-4">
            <CompaniesFilters
              filters={filters}
              onFiltersChange={setFilters}
              resultCount={pagination?.totalItems || 0}
            />

            {loadingCompanies ? (
              <div className="space-y-4">
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
            ) : companies.length === 0 ? (
              <EmptyState
                title="Aucune entreprise trouvée"
                description={
                  Object.keys(filters).length > 0
                    ? "Aucune entreprise ne correspond à vos critères de recherche. Essayez de modifier vos filtres."
                    : "Vous n'avez pas encore d'entreprises dans votre base de données. Les entreprises seront automatiquement ajoutées lorsque vous importerez des leads."
                }
                icon={Table2}
              />
            ) : (
              <>
                {viewMode === "cards" ? (
                  <CompaniesCardView companies={companies} />
                ) : (
                  <CompaniesTableView companies={companies} />
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="mt-6 space-y-4">
                    <PaginationInfo
                      currentPage={currentPage}
                      totalItems={pagination.totalItems}
                      itemsPerPage={pagination.limit}
                      itemName="entreprises"
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
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}