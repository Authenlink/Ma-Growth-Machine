"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

interface Collection {
  id: number;
  name: string;
}

interface LeadsFiltersProps {
  collections: Collection[];
  filters: {
    collectionId?: string;
    companyName?: string;
    leadName?: string;
    seniority?: string;
    functional?: string;
    position?: string;
    status?: string;
    validated?: string;
  };
  onFiltersChange: (filters: LeadsFiltersProps["filters"]) => void;
  resultCount?: number;
}

export function LeadsFilters({
  collections,
  filters,
  onFiltersChange,
  resultCount,
}: LeadsFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  // Synchroniser les filtres locaux avec les props
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: string, value: string | undefined) => {
    const newFilters = { ...localFilters };
    // "all" est utilisé pour représenter "tous" / valeur vide
    if (value === "all" || value === "" || value === undefined) {
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
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="filter-company-name" className="text-xs mb-1.5 block">
            Nom d&apos;entreprise
          </Label>
          <Input
            id="filter-company-name"
            placeholder="Rechercher une entreprise..."
            value={localFilters.companyName || ""}
            onChange={(e) =>
              handleFilterChange("companyName", e.target.value || undefined)
            }
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="filter-lead-name" className="text-xs mb-1.5 block">
            Nom du lead
          </Label>
          <Input
            id="filter-lead-name"
            placeholder="Rechercher un lead..."
            value={localFilters.leadName || ""}
            onChange={(e) =>
              handleFilterChange("leadName", e.target.value || undefined)
            }
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="filter-collection" className="text-xs mb-1.5 block">
            Collection
          </Label>
          <Select
            value={localFilters.collectionId || "all"}
            onValueChange={(value) =>
              handleFilterChange("collectionId", value)
            }
          >
            <SelectTrigger id="filter-collection">
              <SelectValue placeholder="Toutes les collections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les collections</SelectItem>
              {collections.map((collection) => (
                <SelectItem key={collection.id} value={collection.id.toString()}>
                  {collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* Compteur de résultats */}
      {resultCount !== undefined && (
        <div className="text-sm text-muted-foreground">
          {resultCount} lead{resultCount !== 1 ? "s" : ""} trouvé
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
          <div className="rounded-lg border bg-card p-4">
            <FieldGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field>
                <FieldLabel htmlFor="filter-seniority">Seniority</FieldLabel>
                <Input
                  id="filter-seniority"
                  placeholder="Ex: Director, Manager..."
                  value={localFilters.seniority || ""}
                  onChange={(e) =>
                    handleFilterChange("seniority", e.target.value || undefined)
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="filter-functional">Functional</FieldLabel>
                <Input
                  id="filter-functional"
                  placeholder="Ex: sales, marketing..."
                  value={localFilters.functional || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "functional",
                      e.target.value || undefined
                    )
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="filter-position">Position</FieldLabel>
                <Input
                  id="filter-position"
                  placeholder="Ex: CEO, CTO..."
                  value={localFilters.position || ""}
                  onChange={(e) =>
                    handleFilterChange("position", e.target.value || undefined)
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="filter-status">Status</FieldLabel>
                <Input
                  id="filter-status"
                  placeholder="Statut du lead..."
                  value={localFilters.status || ""}
                  onChange={(e) =>
                    handleFilterChange("status", e.target.value || undefined)
                  }
                />
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="filter-validated" className="mb-0">Validé</FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Filtrer par statut de validation
                  </p>
                </div>
                <Select
                  value={localFilters.validated || "all"}
                  onValueChange={(value) =>
                    handleFilterChange(
                      "validated",
                      value
                    )
                  }
                >
                  <SelectTrigger id="filter-validated">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="true">Validé</SelectItem>
                    <SelectItem value="false">Non validé</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
