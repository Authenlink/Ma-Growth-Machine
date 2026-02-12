"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

interface CompaniesFiltersProps {
  filters: {
    name?: string;
    industry?: string;
    size?: string;
    country?: string;
    city?: string;
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
    const newFilters = { ...localFilters };
    if (value === "" || value === undefined) {
      delete newFilters[key as keyof typeof newFilters];
    } else {
      newFilters[key as keyof typeof newFilters] = value;
    }
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleResetFilters = () => {
    const emptyFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="space-y-4">
      {/* Filtres principaux */}
      <div className="rounded-xl border border-border/80 bg-card/30 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="filter-company-name" className="text-xs font-medium mb-1.5 block">
              Nom de l&apos;entreprise
            </Label>
            <Input
            id="filter-company-name"
            placeholder="Rechercher une entreprise..."
            value={localFilters.name || ""}
            onChange={(e) =>
              handleFilterChange("name", e.target.value || undefined)
            }
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="filter-industry" className="text-xs mb-1.5 block">
            Industrie
          </Label>
          <Input
            id="filter-industry"
            placeholder="Ex: Technology, Finance..."
            value={localFilters.industry || ""}
            onChange={(e) =>
              handleFilterChange("industry", e.target.value || undefined)
            }
          />
        </div>

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
      </div>

      {/* Compteur de résultats */}
      {resultCount !== undefined && (
        <div className="text-sm text-muted-foreground">
          {resultCount} entreprise{resultCount !== 1 ? "s" : ""} trouvée
          {resultCount !== 1 ? "s" : ""}
        </div>
      )}

      {/* Filtres avancés */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtres avancés
            {isAdvancedOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}