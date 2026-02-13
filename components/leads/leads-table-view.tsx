"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Mail, Linkedin, Trash2, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import Link from "next/link";
import { cleanIndustry } from "@/lib/utils";

interface Lead {
  id: number;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  email: string | null;
  emailCertainty?: string | null;
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

interface LeadsTableViewProps {
  leads: Lead[];
  onDeleteLead?: (leadId: number) => void;
}

export function LeadsTableView({ leads, onDeleteLead }: LeadsTableViewProps) {
  const getDisplayName = (lead: Lead) => {
    if (lead.fullName) return lead.fullName;
    if (lead.firstName && lead.lastName) {
      return `${lead.firstName} ${lead.lastName}`;
    }
    if (lead.firstName) return lead.firstName;
    if (lead.lastName) return lead.lastName;
    return "—";
  };

  const getLocation = (lead: Lead) => {
    const parts = [];
    if (lead.city) parts.push(lead.city);
    if (lead.state) parts.push(lead.state);
    if (lead.country) parts.push(lead.country);
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  const formatDate = (date: Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun lead trouvé
      </div>
    );
  }

  const headerCellClass =
    "h-10 px-3 text-left align-middle font-medium text-xs border-r border-border last:border-r-0 sticky top-0 bg-muted z-[2]";
  const stickyHeaderClass = `${headerCellClass} left-0 z-[3] min-w-[180px] border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]`;
  const cellClass =
    "px-3 py-2 align-middle text-sm border-r border-border last:border-r-0";
  const getStickyCellClass = (isEvenRow: boolean) =>
    `${cellClass} sticky left-0 z-[1] min-w-[180px] border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] ${isEvenRow ? "bg-muted" : "bg-background"}`;

  return (
    <div className="w-full min-w-0">
      <div className="min-w-max">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className={stickyHeaderClass}>Nom</th>
              <th className={headerCellClass}>Position</th>
              <th className={headerCellClass}>Entreprise</th>
              <th className={headerCellClass}>Industrie</th>
              <th className={headerCellClass}>Taille</th>
              <th className={headerCellClass}>Email</th>
              <th className={headerCellClass}>Email vérifié</th>
              <th className={headerCellClass}>Localisation</th>
              <th className={headerCellClass}>Seniority</th>
              <th className={headerCellClass}>Functional</th>
              <th className={headerCellClass}>Status</th>
              <th className={headerCellClass}>Validé</th>
              <th className={headerCellClass}>LinkedIn</th>
              <th className={headerCellClass}>Collection</th>
              <th className={headerCellClass}>Date création</th>
              <th className={headerCellClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, index) => {
              const displayName = getDisplayName(lead);
              const location = getLocation(lead);

              return (
                <tr
                  key={lead.id}
                  className="border-b border-border transition-colors hover:bg-muted/50 cursor-pointer even:bg-muted/30"
                  onClick={() => (window.location.href = `/leads/${lead.id}`)}
                >
                  <td className={getStickyCellClass(index % 2 === 1)}>
                    <Link
                      href={`/leads/${lead.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium hover:underline text-primary"
                    >
                      {displayName}
                    </Link>
                  </td>
                  <td className={cellClass}>
                    <span className="text-sm">{lead.position || "—"}</span>
                  </td>
                  <td className={cellClass}>
                    {lead.company ? (
                      <Link
                        href={`/companies/${lead.company.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-sm hover:underline text-primary"
                      >
                        {lead.company.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={cellClass}>
                    <span className="text-sm">
                      {cleanIndustry(lead.company?.industry ?? null) ?? "—"}
                    </span>
                  </td>
                  <td className={cellClass}>
                    <span className="text-sm">{lead.company?.size || "—"}</span>
                  </td>
                  <td className={cellClass}>
                    {lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3 shrink-0" />
                        {lead.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={cellClass}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1.5">
                            {lead.emailVerifyEmaillist ? (
                              ["ok", "ok_for_all", "valid"].includes(lead.emailVerifyEmaillist) ? (
                                <Badge variant="success" className="text-xs gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Oui
                                </Badge>
                              ) : ["invalid", "email_disabled", "dead_server", "invalid_mx", "disposable", "spamtrap", "invalid_syntax"].includes(lead.emailVerifyEmaillist) ? (
                                <Badge variant="destructive" className="text-xs gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Non
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  {lead.emailVerifyEmaillist}
                                </Badge>
                              )
                            ) : (
                              <span className="text-muted-foreground inline-flex items-center gap-1">
                                <HelpCircle className="h-3.5 w-3.5" />
                                Non vérifié
                              </span>
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p>
                            {lead.emailVerifyEmaillist
                              ? `Statut: ${lead.emailVerifyEmaillist}`
                              : "Aucune vérification"}
                          </p>
                          {lead.emailCertainty && (
                            <p className="text-muted-foreground mt-1">
                              Certitude: {lead.emailCertainty}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className={cellClass}>
                    <span className="text-sm">{location}</span>
                  </td>
                  <td className={cellClass}>
                    {lead.seniority ? (
                      <Badge variant="outline" className="text-xs">
                        {lead.seniority}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={cellClass}>
                    {lead.functional ? (
                      <Badge variant="outline" className="text-xs">
                        {lead.functional}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={cellClass}>
                    {lead.status ? (
                      <Badge variant="secondary" className="text-xs">
                        {lead.status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={cellClass}>
                    {lead.validated ? (
                      <Badge variant="success" className="text-xs">
                        Oui
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Non
                      </Badge>
                    )}
                  </td>
                  <td className={cellClass}>
                    {lead.linkedinUrl ? (
                      <a
                        href={lead.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Voir sur LinkedIn"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={cellClass}>
                    <div className="flex flex-wrap gap-1">
                      {lead.collections && lead.collections.length > 0 ? (
                        lead.collections.slice(0, 2).map((collection) => (
                          <Badge
                            key={collection.id}
                            variant="outline"
                            className="text-xs"
                          >
                            {collection.name}
                          </Badge>
                        ))
                      ) : lead.collection ? (
                        <Badge variant="outline" className="text-xs">
                          {lead.collection.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Aucune
                        </span>
                      )}
                      {lead.collections && lead.collections.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{lead.collections.length - 2}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className={cellClass}>
                    <span className="text-sm">
                      {formatDate(lead.createdAt)}
                    </span>
                  </td>
                  <td className={cellClass}>
                    {onDeleteLead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLead(lead.id);
                        }}
                        title="Supprimer ce lead"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
