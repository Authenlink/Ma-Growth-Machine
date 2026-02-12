"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Lead {
  id: number;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  company: {
    id: number;
    name: string;
    website: string | null;
  } | null;
}

interface LeadsFieldProps {
  id: string;
  label: string;
  value: number[]; // Array of lead IDs
  onChange: (value: number[]) => void;
  collectionId: number | ""; // Collection ID from form data
  required?: boolean;
  helpText?: string;
  disabled?: boolean;
  /** "no_email" = leads sans email (Bulk Email Finder), "has_company" = leads avec entreprise (SEO Local) */
  filterMode?: "no_email" | "has_company";
}

export function LeadsField({
  id,
  label,
  value,
  onChange,
  collectionId,
  required = false,
  helpText,
  disabled = false,
  filterMode = "no_email",
}: LeadsFieldProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Filtrer selon le mode: no_email = leads sans email, has_company = leads avec entreprise
  const filteredByMode =
    filterMode === "has_company"
      ? leads.filter((lead) => lead.company != null)
      : leads.filter((lead: Lead) => !lead.email);

  // Filtrer les leads qui ont un domaine disponible (pour has_company, on veut company avec nom au minimum)
  const leadsWithDomain = filteredByMode.filter((lead) => {
    if (!lead.company?.name) return false;
    return lead.company?.website && lead.company.website.trim() !== "";
  });

  const leadsWithoutDomain = filteredByMode.filter((lead) => {
    if (!lead.company?.name) return true;
    return !lead.company?.website || lead.company.website.trim() === "";
  });

  // Charger les leads de la collection
  useEffect(() => {
    const fetchLeads = async () => {
      if (typeof collectionId !== "number" || !collectionId) {
        setLeads([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/collections/${collectionId}/leads`);
        if (response.ok) {
          const data = await response.json();
          setLeads(data.data || data);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des leads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [collectionId]);

  // Filtrer les leads selon la recherche (prioriser ceux avec domaine)
  const filteredLeads = filteredByMode.filter((lead) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const fullName = lead.fullName || `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
    const companyName = lead.company?.name || "";
    return (
      fullName.toLowerCase().includes(searchLower) ||
      companyName.toLowerCase().includes(searchLower) ||
      (lead.firstName && lead.firstName.toLowerCase().includes(searchLower)) ||
      (lead.lastName && lead.lastName.toLowerCase().includes(searchLower))
    );
  });
  
  // Séparer les leads avec et sans domaine pour l'affichage
  const filteredWithDomain = filteredLeads.filter((lead) => {
    if (!lead.company?.name) return false;
    return lead.company?.website && lead.company.website.trim() !== "";
  });

  const filteredWithoutDomain = filteredLeads.filter((lead) => {
    if (!lead.company?.name) return true;
    return !lead.company?.website || lead.company.website.trim() === "";
  });

  // Afficher d'abord les leads avec domaine, puis ceux sans domaine
  const displayLimit = showAll ? filteredLeads.length : 20;
  const leadsToShow = [
    ...filteredWithDomain.slice(0, displayLimit),
    ...(showAll ? filteredWithoutDomain : filteredWithoutDomain.slice(0, Math.max(0, displayLimit - filteredWithDomain.length)))
  ];
  const hasMore = filteredLeads.length > displayLimit;

  const handleToggle = (leadId: number) => {
    if (value.includes(leadId)) {
      onChange(value.filter((id) => id !== leadId));
    } else {
      onChange([...value, leadId]);
    }
  };

  const selectedLeads = filteredByMode.filter((lead) => value.includes(lead.id));

  if (typeof collectionId !== "number" || !collectionId) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>
            Veuillez d'abord sélectionner une collection pour charger les leads.
          </span>
        </div>
        {helpText && (
          <p className="text-sm text-muted-foreground">{helpText}</p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <p className="text-sm text-muted-foreground">Chargement des leads...</p>
      </div>
    );
  }

  if (filteredByMode.length === 0) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>
            {filterMode === "has_company"
              ? "Aucun lead avec entreprise trouvé dans cette collection."
              : "Aucun lead sans email trouvé dans cette collection."}
          </span>
        </div>
        {helpText && (
          <p className="text-sm text-muted-foreground">{helpText}</p>
        )}
      </div>
    );
  }

  // Avertir si certains leads n'ont pas de domaine
  const selectedLeadsWithoutDomain = leadsWithoutDomain.filter((lead) =>
    value.includes(lead.id)
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        placeholder="Rechercher un lead..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={disabled}
      />
      {filteredLeads.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-2">
          Aucun résultat trouvé
        </p>
      ) : (
        <>
          {selectedLeadsWithoutDomain.length > 0 && (
            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Attention : {selectedLeadsWithoutDomain.length} lead(s) sélectionné(s) sans domaine disponible
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Ces leads n'ont pas d'entreprise avec un website. Vous devrez les entrer manuellement avec un domaine dans le champ texte ci-dessous.
                  </p>
                </div>
              </div>
            </div>
          )}
          {leadsWithoutDomain.length > 0 && filteredWithDomain.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2 mb-1">
              Leads avec domaine disponible :
            </p>
          )}
          <div className="flex flex-col gap-2 mt-3 max-h-60 overflow-y-auto">
            {leadsToShow.map((lead) => {
              const fullName = lead.fullName || `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Sans nom";
              const isSelected = value.includes(lead.id);
              const hasDomain = lead.company?.website && lead.company.website.trim() !== "";
              const hasName = lead.firstName && lead.lastName;
              return (
                <Button
                  key={lead.id}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToggle(lead.id)}
                  disabled={disabled}
                  className={`justify-start text-left h-auto py-2 ${!hasDomain || !hasName ? "opacity-60" : ""}`}
                >
                  <div className="flex flex-col items-start w-full">
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium">{fullName}</span>
                      {!hasDomain && (
                        <Badge variant="outline" className="text-xs">
                          Pas de domaine
                        </Badge>
                      )}
                      {!hasName && (
                        <Badge variant="outline" className="text-xs">
                          Nom incomplet
                        </Badge>
                      )}
                    </div>
                    {lead.company && (
                      <span className="text-xs text-muted-foreground">
                        {lead.company.name}
                        {!hasDomain && " (pas de website)"}
                      </span>
                    )}
                    {!lead.company && (
                      <span className="text-xs text-muted-foreground">
                        Pas d'entreprise associée
                      </span>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
          {hasMore && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              disabled={disabled}
              className="mt-2"
            >
              {showAll
                ? "Voir moins"
                : `Voir plus (${filteredLeads.length - displayLimit} autres)`}
            </Button>
          )}
        </>
      )}
      {selectedLeads.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            {selectedLeads.length} lead(s) sélectionné(s) :
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedLeads.map((lead) => {
              const fullName = lead.fullName || `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Sans nom";
              return (
                <Badge
                  key={lead.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {fullName}
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((id) => id !== lead.id))}
                    disabled={disabled}
                    className="hover:text-destructive ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}
      {helpText && (
        <p className="text-sm text-muted-foreground mt-1">{helpText}</p>
      )}
    </div>
  );
}
