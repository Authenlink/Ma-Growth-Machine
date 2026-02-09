"use client";

import Link from "next/link";
import {
  Mail,
  Linkedin,
  Building2,
  MapPin,
  User,
  Briefcase,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cleanIndustry } from "@/lib/utils";

interface LeadDetail {
  id: number;
  personId: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  linkedinUrl: string | null;
  seniority: string | null;
  functional: string | null;
  email: string | null;
  personalEmail: string | null;
  phoneNumbers: string[] | null;
  city: string | null;
  state: string | null;
  country: string | null;
  companyLinkedinPost: string | null;
  personLinkedinPost: string | null;
  iceBreaker: string | null;
  status: string | null;
  validated: boolean;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
  company: {
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
  } | null;
  collection: {
    id: number;
    name: string;
  };
}

interface InformationTabProps {
  lead: LeadDetail;
}

export function InformationTab({ lead }: InformationTabProps) {
  const getLocation = () => {
    const parts = [];
    if (lead.city) parts.push(lead.city);
    if (lead.state) parts.push(lead.state);
    if (lead.country) parts.push(lead.country);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const location = getLocation();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lead.linkedinUrl && (
              <div className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={lead.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Profil LinkedIn
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {lead.seniority && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <span className="text-sm text-muted-foreground">
                    Seniority:{" "}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {lead.seniority}
                  </Badge>
                </div>
              </div>
            )}
            {lead.functional && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <span className="text-sm text-muted-foreground">
                    Functional:{" "}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {lead.functional}
                  </Badge>
                </div>
              </div>
            )}
            {lead.personId && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Person ID:{" "}
                  <span className="text-foreground">{lead.personId}</span>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={`mailto:${lead.email}`}
                  className="text-sm text-primary hover:underline"
                >
                  {lead.email}
                </a>
              </div>
            )}
            {lead.personalEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={`mailto:${lead.personalEmail}`}
                  className="text-sm text-primary hover:underline"
                >
                  {lead.personalEmail}{" "}
                  <span className="text-muted-foreground">(personnel)</span>
                </a>
              </div>
            )}
            {lead.phoneNumbers && lead.phoneNumbers.length > 0 && (
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm text-muted-foreground">
                    Téléphones:{" "}
                  </span>
                  <div className="mt-1 space-y-1">
                    {lead.phoneNumbers.map((phone, index) => (
                      <div key={index} className="text-sm">
                        {phone}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{location}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Marketing */}
        {(lead.iceBreaker || lead.companyLinkedinPost || lead.personLinkedinPost || lead.status || lead.reason) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Marketing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.iceBreaker && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground mb-1 block">
                    Ice Breaker:
                  </span>
                  <p className="text-sm">{lead.iceBreaker}</p>
                </div>
              )}
              {lead.companyLinkedinPost && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground mb-1 block">
                    Status LinkedIn Entreprise:
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {lead.companyLinkedinPost}
                  </Badge>
                </div>
              )}
              {lead.personLinkedinPost && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground mb-1 block">
                    Status LinkedIn Personne:
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {lead.personLinkedinPost}
                  </Badge>
                </div>
              )}
              {lead.status && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Status:{" "}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {lead.status}
                  </Badge>
                </div>
              )}
              {lead.reason && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground mb-1 block">
                    Raison:
                  </span>
                  <p className="text-sm">{lead.reason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Entreprise */}
        {lead.company && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Entreprise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{lead.company.name}</h4>
                {lead.company.industry && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {cleanIndustry(lead.company.industry)}
                    {lead.company.size && ` • ${lead.company.size}`}
                  </p>
                )}
                {lead.company.description && (
                  <p className="text-sm mb-2">{lead.company.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {lead.company.website && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={lead.company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        Site web
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  {lead.company.linkedinUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={lead.company.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        LinkedIn
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  <Button variant="default" size="sm" asChild>
                    <Link href={`/companies/${lead.company.id}`}>
                      Voir l'entreprise
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Collection et Métadonnées */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Métadonnées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">
                Collection:{" "}
              </span>
              <Badge variant="outline" className="text-xs">
                {lead.collection.name}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">
                Créé le{" "}
                {new Date(lead.createdAt).toLocaleDateString("fr-FR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            {lead.updatedAt && lead.updatedAt !== lead.createdAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Modifié le{" "}
                  {new Date(lead.updatedAt).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}