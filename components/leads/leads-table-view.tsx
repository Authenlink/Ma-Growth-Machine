"use client";

import { Badge } from "@/components/ui/badge";
import { Mail, Linkedin, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cleanIndustry } from "@/lib/utils";

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
  collection: {
    id: number;
    name: string;
  };
  createdAt: Date;
}

interface LeadsTableViewProps {
  leads: Lead[];
}

export function LeadsTableView({ leads }: LeadsTableViewProps) {
  const getDisplayName = (lead: Lead) => {
    if (lead.fullName) return lead.fullName;
    if (lead.firstName && lead.lastName) {
      return `${lead.firstName} ${lead.lastName}`;
    }
    if (lead.firstName) return lead.firstName;
    if (lead.lastName) return lead.lastName;
    return "—";
  };

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun lead trouvé
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="h-12 px-4 text-left align-middle font-medium text-sm">
              Nom
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-sm">
              Position
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-sm">
              Entreprise
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-sm">
              Email
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-sm">
              Seniority
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-sm">
              Functional
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-sm">
              Status
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-sm">
              Validé
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-sm">
              Collection
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-sm">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const displayName = getDisplayName(lead);

            return (
              <tr
                key={lead.id}
                className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={() => window.location.href = `/leads/${lead.id}`}
              >
                <td className="p-4 align-middle">
                  <Link
                    href={`/leads/${lead.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium hover:underline text-primary"
                  >
                    {displayName}
                  </Link>
                </td>
                <td className="p-4 align-middle">
                  <div className="text-sm">{lead.position || "—"}</div>
                </td>
                <td className="p-4 align-middle">
                  <div className="space-y-1">
                    {lead.company ? (
                      <>
                        <Link
                          href={`/companies/${lead.company.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-sm hover:underline text-primary block"
                        >
                          {lead.company.name}
                        </Link>
                        {lead.company.industry && (
                          <div className="text-xs text-muted-foreground">
                            {cleanIndustry(lead.company.industry)}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td className="p-4 align-middle">
                  {lead.email ? (
                    <a
                      href={`mailto:${lead.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3" />
                      {lead.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-4 align-middle">
                  {lead.seniority ? (
                    <Badge variant="outline" className="text-xs">
                      {lead.seniority}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-4 align-middle">
                  {lead.functional ? (
                    <Badge variant="outline" className="text-xs">
                      {lead.functional}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-4 align-middle">
                  {lead.status ? (
                    <Badge variant="secondary" className="text-xs">
                      {lead.status}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-4 align-middle">
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
                <td className="p-4 align-middle">
                  <Badge variant="outline" className="text-xs">
                    {lead.collection.name}
                  </Badge>
                </td>
                <td className="p-4 align-middle">
                  <div className="flex items-center gap-2">
                    {lead.linkedinUrl && (
                      <a
                        href={lead.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground"
                        title="Voir sur LinkedIn"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
