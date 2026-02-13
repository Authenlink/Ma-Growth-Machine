"use client";

import {
  Globe,
  Linkedin,
  ExternalLink,
  MapPin,
  Users,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { cleanIndustry } from "@/lib/utils";
import { TechnologyBadges } from "./technology-badges";
import { cn } from "@/lib/utils";

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
  technologies: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  createdAt: Date;
}

interface CompaniesTableViewProps {
  companies: Company[];
}

function getLocation(company: Company): string {
  const parts = [];
  if (company.city) parts.push(company.city);
  if (company.state) parts.push(company.state);
  if (company.country) parts.push(company.country);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function getFoundedInfo(company: Company): string {
  return company.foundedYear?.toString() ?? "—";
}

export function CompaniesTableView({ companies }: CompaniesTableViewProps) {
  if (companies.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune entreprise trouvée
      </div>
    );
  }

  const headerCellClass =
    "h-10 px-3 text-left align-middle font-medium text-xs border-r border-border last:border-r-0 sticky top-0 bg-muted z-[2]";
  const stickyCol = "sticky left-0 z-[3] min-w-[180px] border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]";
  const cellClass =
    "px-3 py-2 align-middle text-sm border-r border-border last:border-r-0 whitespace-nowrap";
  const getStickyCellClass = (isEvenRow: boolean) =>
    `${cellClass} sticky left-0 z-[1] min-w-[180px] border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] ${isEvenRow ? "bg-muted" : "bg-background"}`;

  return (
    <div className="w-full min-w-0">
      <div className="min-w-max">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className={cn(headerCellClass, stickyCol)}>Entreprise</th>
              <th className={headerCellClass}>Industrie</th>
              <th className={headerCellClass}>Taille</th>
              <th className={headerCellClass}>Localisation</th>
              <th className={headerCellClass}>Fondée</th>
              <th className={headerCellClass}>Liens</th>
              <th className={headerCellClass}>Technologies</th>
              <th className={headerCellClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company, index) => {
              const location = getLocation(company);
              const foundedInfo = getFoundedInfo(company);
              const isEvenRow = index % 2 === 1;

              return (
                <tr
                  key={company.id}
                  className="border-b border-border transition-colors hover:bg-muted/50 cursor-pointer even:bg-muted/30"
                  onClick={() => (window.location.href = `/companies/${company.id}`)}
                >
                  <td className={getStickyCellClass(isEvenRow)}>
                    <Link
                      href={`/companies/${company.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium hover:underline text-primary block truncate"
                    >
                      {company.name}
                    </Link>
                  </td>
                  <td className={cellClass}>
                    <span className="text-sm truncate block max-w-[150px]">
                      {cleanIndustry(company.industry) || "—"}
                    </span>
                  </td>
                  <td className={cellClass}>
                    <span className="text-sm flex items-center gap-1.5">
                      {company.size && (
                        <Users className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {company.size || "—"}
                    </span>
                  </td>
                  <td className={cellClass}>
                    <span className="text-sm flex items-center gap-1.5 truncate max-w-[180px] block">
                      {location !== "—" && (
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {location}
                    </span>
                  </td>
                  <td className={cellClass}>
                    <span className="text-sm flex items-center gap-1.5">
                      {foundedInfo !== "—" && (
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {foundedInfo}
                    </span>
                  </td>
                  <td className={cellClass}>
                    <div className="flex items-center gap-1">
                      {company.website ? (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary hover:underline p-1 rounded hover:bg-primary/10 transition-colors"
                          title="Site web"
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground/50 p-1">
                          <Globe className="h-4 w-4" />
                        </span>
                      )}
                      {company.linkedinUrl ? (
                        <a
                          href={company.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#0A66C2] hover:opacity-80 p-1 rounded hover:bg-[#0A66C2]/10 transition-colors"
                          title="LinkedIn"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground/50 p-1">
                          <Linkedin className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={cellClass}>
                    {company.technologies ? (
                      <div className="flex flex-nowrap items-center gap-1 overflow-x-auto max-w-[200px]">
                        <TechnologyBadges
                          technologies={company.technologies}
                          maxVisible={4}
                          size="sm"
                          className="flex-nowrap shrink-0"
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={cellClass}>
                    <Link
                      href={`/companies/${company.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Voir les détails"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
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
