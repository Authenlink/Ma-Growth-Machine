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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { SourcesFilterDropdown } from "@/components/sources-filter-dropdown";
import { ScoreFilterDropdown } from "@/components/score-filter-dropdown";
import { VerifiedEmailFilterDropdown } from "@/components/verified-email-filter-dropdown";

interface Collection {
  id: number;
  name: string;
  folderId?: number | null;
  folderName?: string | null;
  isDefault?: boolean;
}

interface Folder {
  id: number;
  name: string;
}

interface LeadsFiltersProps {
  collections: Collection[];
  folders: Folder[];
  filters: {
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
    verifiedEmail?: string;
  };
  onFiltersChange: (filters: LeadsFiltersProps["filters"]) => void;
  resultCount?: number;
}

export function LeadsFilters({
  collections,
  folders = [],
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
    if (key === "sourceTypes" || key === "scoreCategory" || key === "verifiedEmail") return;
    const newFilters = { ...localFilters };
    // "all" est utilisé pour représenter "tous" / valeur vide
    if (value === "all" || value === "" || value === undefined) {
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

  // Collections filtrées par dossier sélectionné
  const selectedFolderId = localFilters.folderId
    ? parseInt(localFilters.folderId)
    : null;
  const filteredCollections =
    selectedFolderId && !isNaN(selectedFolderId)
      ? collections.filter(
          (c) => c.folderId !== null && c.folderId === selectedFolderId
        )
      : collections;

  const handleFolderChange = (value: string) => {
    const newFilters = { ...localFilters };
    if (value === "all" || value === "") {
      delete newFilters.folderId;
      delete newFilters.collectionId; // Réinitialiser la collection si on change de dossier
    } else {
      newFilters.folderId = value;
      delete newFilters.collectionId; // Réinitialiser car les collections changent
    }
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className="space-y-4">
      {/* Une seule ligne : Filtres avancés, Dossier, Collection, Nom entreprise, Nom lead, Sources, Note, Email vérifié */}
      <div className="rounded-xl border border-border/80 bg-card/30 p-4">
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
          <Select
            value={localFilters.folderId || "all"}
            onValueChange={handleFolderChange}
          >
            <SelectTrigger id="filter-folder" size="sm" className="h-8 min-w-[140px]">
              <SelectValue placeholder="Tous les dossiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les dossiers</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id.toString()}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={
              localFilters.collectionId &&
              filteredCollections.some(
                (c) => c.id.toString() === localFilters.collectionId
              )
                ? localFilters.collectionId
                : "all"
            }
            onValueChange={(value) =>
              handleFilterChange("collectionId", value)
            }
          >
            <SelectTrigger id="filter-collection" size="sm" className="h-8 min-w-[140px]">
              <SelectValue placeholder="Toutes les collections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les collections</SelectItem>
              {filteredCollections.map((collection) => (
                <SelectItem
                  key={collection.id}
                  value={collection.id.toString()}
                >
                  {collection.folderName
                    ? `${collection.name} (${collection.folderName})${collection.isDefault ? " — par défaut" : ""}`
                    : `${collection.name}${collection.isDefault ? " — par défaut" : ""}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id="filter-company-name"
            placeholder="Nom entreprise..."
            className="h-8 w-[160px] min-w-[140px]"
            value={localFilters.companyName || ""}
            onChange={(e) =>
              handleFilterChange("companyName", e.target.value || undefined)
            }
          />
          <Input
            id="filter-lead-name"
            placeholder="Nom lead..."
            className="h-8 w-[160px] min-w-[140px]"
            value={localFilters.leadName || ""}
            onChange={(e) =>
              handleFilterChange("leadName", e.target.value || undefined)
            }
          />
          <SourcesFilterDropdown
            selectedSourceTypes={filters.sourceTypes ?? []}
            onChange={handleSourceTypesChange}
          />
          <ScoreFilterDropdown
            entityType="lead"
            selectedCategory={filters.scoreCategory}
            onChange={handleScoreCategoryChange}
          />
          <VerifiedEmailFilterDropdown
            selectedFilter={filters.verifiedEmail as "verified" | "unverified" | "all" | undefined}
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
      </div>

      {/* Compteur de résultats */}
      {resultCount !== undefined && (
        <div className="text-sm text-muted-foreground">
          {resultCount} lead{resultCount !== 1 ? "s" : ""} trouvé
          {resultCount !== 1 ? "s" : ""}
        </div>
      )}

      {/* Panneau Filtres avancés expandable */}
      <div className="flex flex-col gap-4">
        {isAdvancedOpen && (
          <div className="rounded-xl border border-border/80 bg-card/30 p-4 w-full">
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
        )}
      </div>
    </div>
  );
}
