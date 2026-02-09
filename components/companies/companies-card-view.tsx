"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Linkedin, MapPin, Users, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
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

interface CompaniesCardViewProps {
  companies: Company[];
}

export function CompaniesCardView({ companies }: CompaniesCardViewProps) {
  const router = useRouter();

  const getLocation = (company: Company) => {
    const parts = [];
    if (company.city) parts.push(company.city);
    if (company.state) parts.push(company.state);
    if (company.country) parts.push(company.country);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const getFoundedInfo = (company: Company) => {
    if (company.foundedYear) {
      const currentYear = new Date().getFullYear();
      const age = currentYear - company.foundedYear;
      return `${company.foundedYear} (${age} ans)`;
    }
    return null;
  };

  if (companies.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune entreprise trouvée
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {companies.map((company) => {
        const location = getLocation(company);
        const foundedInfo = getFoundedInfo(company);

        return (
          <Card
            key={company.id}
            className="hover:shadow-md transition-shadow cursor-pointer h-full"
            onClick={() => router.push(`/companies/${company.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">
                    {company.name}
                  </h3>
                  {company.industry && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {cleanIndustry(company.industry)}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Description */}
              {company.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {company.description}
                </p>
              )}

              {/* Informations clés */}
              <div className="space-y-2">
                {/* Taille et année de fondation */}
                <div className="flex items-center gap-4 text-sm">
                  {company.size && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{company.size}</span>
                    </div>
                  )}
                  {foundedInfo && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{foundedInfo}</span>
                    </div>
                  )}
                </div>

                {/* Localisation */}
                {location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">{location}</p>
                  </div>
                )}

                {/* Liens */}
                <div className="space-y-1.5">
                  {company.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-primary hover:underline truncate"
                      >
                        Site web
                      </a>
                    </div>
                  )}
                  {company.linkedinUrl && (
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a
                        href={company.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-primary hover:underline truncate"
                      >
                        LinkedIn
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Badges pour spécialités */}
              {company.specialities && company.specialities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                  {company.specialities.slice(0, 3).map((speciality, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {speciality}
                    </Badge>
                  ))}
                  {company.specialities.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{company.specialities.length - 3}
                    </Badge>
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
