"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Linkedin, Building2, MapPin, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cleanIndustry } from "@/lib/utils";

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
  } | null; // Pour la compatibilité
  createdAt: Date;
}

interface LeadsCardViewProps {
  leads: Lead[];
  onDeleteLead?: (leadId: number) => void;
}

export function LeadsCardView({ leads, onDeleteLead }: LeadsCardViewProps) {
  const router = useRouter();

  const getDisplayName = (lead: Lead) => {
    if (lead.fullName) return lead.fullName;
    if (lead.firstName && lead.lastName) {
      return `${lead.firstName} ${lead.lastName}`;
    }
    if (lead.firstName) return lead.firstName;
    if (lead.lastName) return lead.lastName;
    return "Nom non disponible";
  };

  const getLocation = (lead: Lead) => {
    const parts = [];
    if (lead.city) parts.push(lead.city);
    if (lead.state) parts.push(lead.state);
    if (lead.country) parts.push(lead.country);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const getInitials = (lead: Lead) => {
    const displayName = getDisplayName(lead);
    return displayName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  };

  const handleCompanyClick = (e: React.MouseEvent, companyId: number) => {
    e.stopPropagation();
    router.push(`/companies/${companyId}`);
  };

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun lead trouvé
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {leads.map((lead) => {
        const displayName = getDisplayName(lead);
        const location = getLocation(lead);

        return (
          <div key={lead.id} className="relative group">
            <Link href={`/leads/${lead.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {getInitials(lead)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {displayName}
                        </h3>
                        {lead.position && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {lead.position}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {lead.validated && (
                        <Badge variant="success" className="shrink-0">
                          Validé
                        </Badge>
                      )}
                      {onDeleteLead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDeleteLead(lead.id);
                          }}
                          title="Supprimer ce lead"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Entreprise */}
                  {lead.company && (
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={(e) =>
                            handleCompanyClick(e, lead.company!.id)
                          }
                          className="text-sm font-medium truncate hover:underline text-primary block text-left w-full"
                        >
                          {lead.company.name}
                        </button>
                        {lead.company.industry && (
                          <p className="text-xs text-muted-foreground">
                            {cleanIndustry(lead.company.industry)}
                            {lead.company.size && ` • ${lead.company.size}`}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Localisation */}
                  {location && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        {location}
                      </p>
                    </div>
                  )}

                  {/* Contact */}
                  <div className="space-y-1.5">
                    {lead.email && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `mailto:${lead.email}`;
                          }}
                          className="text-sm text-primary hover:underline truncate text-left"
                        >
                          {lead.email}
                        </button>
                        {lead.emailVerifyEmaillist && (
                          <Badge
                            variant={
                              ["ok", "ok_for_all"].includes(lead.emailVerifyEmaillist)
                                ? "success"
                                : ["email_disabled", "dead_server", "invalid_mx", "disposable", "spamtrap"].includes(
                                    lead.emailVerifyEmaillist
                                  )
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-[10px] px-1.5 py-0"
                          >
                            {lead.emailVerifyEmaillist === "ok"
                              ? "OK"
                              : lead.emailVerifyEmaillist === "email_disabled"
                                ? "Invalide"
                                : lead.emailVerifyEmaillist}
                          </Badge>
                        )}
                      </div>
                    )}
                    {lead.linkedinUrl && (
                      <div className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              lead.linkedinUrl!,
                              "_blank",
                              "noopener,noreferrer",
                            );
                          }}
                          className="text-sm text-primary hover:underline truncate text-left"
                        >
                          LinkedIn
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
