"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Globe, Linkedin, MapPin, Users, Calendar, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
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

interface CompaniesCardViewProps {
  companies: Company[];
}

function getInitials(name: string): string {
  return name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function getLocation(company: Company): string | null {
  const parts = [];
  if (company.city) parts.push(company.city);
  if (company.state) parts.push(company.state);
  if (company.country) parts.push(company.country);
  return parts.length > 0 ? parts.join(", ") : null;
}

function getFoundedInfo(company: Company): string | null {
  if (company.foundedYear) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - company.foundedYear;
    return `${company.foundedYear} (${age} ans)`;
  }
  return null;
}

export function CompaniesCardView({ companies }: CompaniesCardViewProps) {
  const router = useRouter();

  if (companies.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune entreprise trouvée
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {companies.map((company) => {
        const location = getLocation(company);
        const foundedInfo = getFoundedInfo(company);

        return (
          <Card
            key={company.id}
            className={cn(
              "group cursor-pointer overflow-hidden",
              "border-border/80 bg-card/50 backdrop-blur-sm",
              "hover:border-primary/30 hover:bg-card/80 hover:shadow-lg",
              "transition-all duration-200 ease-out"
            )}
            onClick={() => router.push(`/companies/${company.id}`)}
          >
            {/* En-tête avec initiales */}
            <div className="h-16 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/50 flex items-center px-5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary font-semibold text-sm">
                  {getInitials(company.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                    {company.name}
                  </h3>
                  {company.industry && (
                    <p className="text-xs text-muted-foreground truncate">
                      {cleanIndustry(company.industry)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <CardContent className="p-5 space-y-4">
              {/* Description */}
              {company.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {company.description}
                </p>
              )}

              {/* Technologies */}
              {company.technologies && (
                <TechnologyBadges
                  technologies={company.technologies}
                  maxVisible={5}
                  size="sm"
                />
              )}

              {/* Infos clés */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {company.size && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    {company.size}
                  </span>
                )}
                {foundedInfo && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {foundedInfo}
                  </span>
                )}
                {location && (
                  <span className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{location}</span>
                  </span>
                )}
              </div>

              {/* Liens */}
              <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Site
                  </a>
                )}
                {company.linkedinUrl && (
                  <a
                    href={company.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-xs text-[#0A66C2] hover:underline"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                  </a>
                )}
              </div>

              {/* Spécialités */}
              {company.specialities && company.specialities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {company.specialities.slice(0, 3).map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                  {company.specialities.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{company.specialities.length - 3}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
