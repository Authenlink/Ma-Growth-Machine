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

  const headerCellClass =
    "h-10 px-3 text-left align-middle font-medium text-xs border-r border-border last:border-r-0 sticky top-0 bg-muted z-[2]";
  const stickyHeaderClass = `${headerCellClass} left-0 z-[3] min-w-[200px] border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]`;
  const cellClass =
    "px-3 py-2 align-middle text-sm border-r border-border last:border-r-0";
  const getStickyCellClass = (isEvenRow: boolean) =>
    `${cellClass} sticky left-0 z-[1] min-w-[200px] border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] ${isEvenRow ? "bg-muted" : "bg-background"}`;

  return (
    <div className="rounded-md border max-w-full max-h-[calc(100vh-250px)] overflow-auto">
      <div className="min-w-fit">
        <table className="w-full border-collapse min-w-max">
          <thead>
            <tr className="border-b border-border">
              <th className={stickyHeaderClass}>Nom</th>
              <th className={headerCellClass}>Industrie</th>
              <th className={headerCellClass}>Taille</th>
              <th className={headerCellClass}>Localisation</th>
              <th className={headerCellClass}>Fondation</th>
              <th className={headerCellClass}>Site web</th>
              <th className={headerCellClass}>LinkedIn</th>
              <th className={headerCellClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company, index) => {
              const location = getLocation(company);
              const foundedInfo = getFoundedInfo(company);

              return (
                <tr
                  key={company.id}
                  className="border-b border-border transition-colors hover:bg-muted/50 cursor-pointer even:bg-muted/30"
                  onClick={() =>
                    (window.location.href = `/companies/${company.id}`)
                  }
                >
                  <td className={getStickyCellClass(index % 2 === 1)}>
                    <Link
                      href={`/companies/${company.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium hover:underline text-primary"
                    >
                      {company.name}
                    </Link>
                  </td>
                  <td className={cellClass}>
                    <span className="text-sm">
                      {cleanIndustry(company.industry) || "—"}
                    </span>
                  </td>
                  <td className={cellClass}>
                    <span className="text-sm flex items-center gap-1">
                      {company.size && (
                        <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      {company.size || "—"}
                    </span>
                  </td>
                  <td className={cellClass}>
                    <span className="text-sm flex items-center gap-1">
                      {location !== "—" && (
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      {location}
                    </span>
                  </td>
                  <td className={cellClass}>
                    <span className="text-sm flex items-center gap-1">
                      {foundedInfo !== "—" && (
                        <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      {foundedInfo}
                    </span>
                  </td>
                  <td className={cellClass}>
                    {company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-3 w-3 shrink-0" />
                        Site web
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={cellClass}>
                    {company.linkedinUrl ? (
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
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={cellClass}>
                    <Link
                      href={`/companies/${company.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-primary transition-colors"
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
