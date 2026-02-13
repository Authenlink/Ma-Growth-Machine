"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { SourcesFilterDropdown } from "@/components/sources-filter-dropdown";
import { ScoreFilterDropdown } from "@/components/score-filter-dropdown";
import { VerifiedEmailFilterDropdown } from "@/components/verified-email-filter-dropdown";

interface CompaniesFiltersProps {
  filters: {
    name?: string;
    industry?: string;
    size?: string;
    country?: string;
    city?: string;
    sourceTypes?: string[];
    scoreCategory?: string;
    verifiedEmail?: string;
  };
  onFiltersChange: (filters: CompaniesFiltersProps["filters"]) => void;
  resultCount?: number;
}

export function CompaniesFilters({
  filters,
  onFiltersChange,
  resultCount,
}: CompaniesFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  // Synchroniser les filtres locaux avec les props
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: string, value: string | undefined) => {
    if (
      key === "sourceTypes" ||
      key === "scoreCategory" ||
      key === "verifiedEmail"
    )
      return;
    const newFilters = { ...localFilters };
    if (value === "" || value === undefined) {
      delete newFilters[key as keyof typeof newFilters];
    } else {
      (newFilters as Record<string, string | undefined>)[key] = value;
    }
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSourceTypesChange = (sourceTypes: string[]) => {
    const newFilters = { ...localFilters };
    if (sourceTypes.length === 0) {
      delete newFilters.sourceTypes;
    } else {
      newFilters.sourceTypes = sourceTypes;
    }
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleScoreCategoryChange = (scoreCategory: string | undefined) => {
    const newFilters = { ...localFilters };
    if (!scoreCategory) {
      delete newFilters.scoreCategory;
    } else {
      newFilters.scoreCategory = scoreCategory;
    }
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleVerifiedEmailChange = (verifiedEmail: string | undefined) => {
    const newFilters = { ...localFilters };
    if (!verifiedEmail) {
      delete newFilters.verifiedEmail;
    } else {
      newFilters.verifiedEmail = verifiedEmail;
    }
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleResetFilters = () => {
    const emptyFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters =
    Object.keys(filters).length > 0 ||
    (filters.sourceTypes?.length ?? 0) > 0 ||
    !!filters.scoreCategory;

  return (
    <div className="space-y-4">
      {/* Une seule ligne : Filtres avancés, Nom entreprise, Industrie, Sources, Note, Email vérifié */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 border border-border/80"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
        >
          <Filter className="h-4 w-4" />
          Filtres avancés
          {isAdvancedOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        <Input
          id="filter-company-name"
          placeholder="Nom entreprise..."
          className="h-8 w-[160px] min-w-[140px]"
          value={localFilters.name || ""}
          onChange={(e) =>
            handleFilterChange("name", e.target.value || undefined)
          }
        />
        <Input
          id="filter-industry"
          placeholder="Industrie..."
          className="h-8 w-[160px] min-w-[140px]"
          value={localFilters.industry || ""}
          onChange={(e) =>
            handleFilterChange("industry", e.target.value || undefined)
          }
        />
        <SourcesFilterDropdown
          selectedSourceTypes={filters.sourceTypes ?? []}
          onChange={handleSourceTypesChange}
        />
        <ScoreFilterDropdown
          entityType="company"
          selectedCategory={filters.scoreCategory}
          onChange={handleScoreCategoryChange}
        />
        <VerifiedEmailFilterDropdown
          selectedFilter={
            filters.verifiedEmail as
              | "verified"
              | "unverified"
              | "all"
              | undefined
          }
          onChange={handleVerifiedEmailChange}
        />
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Compteur de résultats */}
      {resultCount !== undefined && (
        <div className="text-sm text-muted-foreground">
          {resultCount} entreprise{resultCount !== 1 ? "s" : ""} trouvée
          {resultCount !== 1 ? "s" : ""}
        </div>
      )}

      {/* Panneau Filtres avancés expandable */}
      <div className="flex flex-col gap-4">
        {isAdvancedOpen && (
          <div className="rounded-xl border border-border/80 bg-card/30 p-4 w-full">
            <FieldGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field>
                <FieldLabel htmlFor="filter-size">Taille</FieldLabel>
                <Input
                  id="filter-size"
                  placeholder="Ex: 1-10, 11-50..."
                  value={localFilters.size || ""}
                  onChange={(e) =>
                    handleFilterChange("size", e.target.value || undefined)
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="filter-country">Pays</FieldLabel>
                <Input
                  id="filter-country"
                  placeholder="Ex: France, États-Unis..."
                  value={localFilters.country || ""}
                  onChange={(e) =>
                    handleFilterChange("country", e.target.value || undefined)
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="filter-city">Ville</FieldLabel>
                <Input
                  id="filter-city"
                  placeholder="Ex: Paris, New York..."
                  value={localFilters.city || ""}
                  onChange={(e) =>
                    handleFilterChange("city", e.target.value || undefined)
                  }
                />
              </Field>
            </FieldGroup>
          </div>
        )}
      </div>
    </div>
  );
}
