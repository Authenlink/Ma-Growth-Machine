"use client";

import { Badge } from "@/components/ui/badge";
import { Globe, Linkedin, ExternalLink, MapPin, Users, Calendar } from "lucide-react";
import Link from "next/link";
import { cleanIndustry } from "@/lib/utils";

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

interface CompaniesTableViewProps {
  companies: Company[];
}

export function CompaniesTableView({ companies }: CompaniesTableViewProps) {
  const getLocation = (company: Company) => {
    const parts = [];
    if (company.city) parts.push(company.city);
    if (company.state) parts.push(company.state);
    if (company.country) parts.push(company.country);
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  const getFoundedInfo = (company: Company) => {
    if (company.foundedYear) {
      return company.foundedYear.toString();
    }
    return "—";
  };

  if (companies.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune entreprise trouvée
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
              Industrie
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-sm">
              Taille
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-sm">
              Localisation
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-sm">
              Fondation
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-sm">
              Site web
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-sm">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => {
            const location = getLocation(company);
            const foundedInfo = getFoundedInfo(company);

            return (
              <tr
                key={company.id}
                className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={() => window.location.href = `/companies/${company.id}`}
              >
                <td className="p-4 align-middle">
                  <Link
                    href={`/companies/${company.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium hover:underline text-primary"
                  >
                    {company.name}
                  </Link>
                </td>
                <td className="p-4 align-middle">
                  <div className="text-sm">{cleanIndustry(company.industry) || "—"}</div>
                </td>
                <td className="p-4 align-middle">
                  <div className="text-sm flex items-center gap-1">
                    {company.size && <Users className="h-3 w-3 text-muted-foreground" />}
                    {company.size || "—"}
                  </div>
                </td>
                <td className="p-4 align-middle">
                  <div className="text-sm flex items-center gap-1">
                    {location !== "—" && <MapPin className="h-3 w-3 text-muted-foreground" />}
                    {location}
                  </div>
                </td>
                <td className="p-4 align-middle">
                  <div className="text-sm flex items-center gap-1">
                    {foundedInfo !== "—" && <Calendar className="h-3 w-3 text-muted-foreground" />}
                    {foundedInfo}
                  </div>
                </td>
                <td className="p-4 align-middle">
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Globe className="h-3 w-3" />
                      Site web
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-4 align-middle">
                  <div className="flex items-center gap-2">
                    {company.linkedinUrl && (
                      <a
                        href={company.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="LinkedIn"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    <Link
                      href={`/companies/${company.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Voir les détails"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
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