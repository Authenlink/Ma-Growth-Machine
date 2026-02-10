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
  Plus,
  X,
  FolderPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cleanIndustry } from "@/lib/utils";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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
  collections: {
    id: number;
    name: string;
  }[];
  collection: {
    id: number;
    name: string;
  } | null; // Pour la compatibilité
}

interface InformationTabProps {
  lead: LeadDetail;
  onLeadUpdate?: (updatedLead: LeadDetail) => void;
}

export function InformationTab({ lead, onLeadUpdate }: InformationTabProps) {
  const [collections, setCollections] = useState<{ id: number; name: string }[]>(lead.collections || []);
  const [availableCollections, setAvailableCollections] = useState<{ id: number; name: string }[]>([]);
  const [addCollectionDialogOpen, setAddCollectionDialogOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Récupérer les collections disponibles
  const fetchAvailableCollections = async () => {
    try {
      const response = await fetch("/api/collections");
      if (response.ok) {
        const allCollections = await response.json();
        // Filtrer les collections qui ne sont pas déjà associées au lead
        const currentCollectionIds = collections.map(c => c.id);
        const available = allCollections.filter((c: { id: number }) => !currentCollectionIds.includes(c.id));
        setAvailableCollections(available);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des collections:", error);
    }
  };

  // Ajouter une collection au lead
  const addCollectionToLead = async () => {
    if (!selectedCollectionId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/leads/${lead.id}/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: parseInt(selectedCollectionId) }),
      });

      if (response.ok) {
        const addedCollection = availableCollections.find(c => c.id === parseInt(selectedCollectionId));
        if (addedCollection) {
          const newCollections = [...collections, addedCollection];
          setCollections(newCollections);
          setAvailableCollections(prev => prev.filter(c => c.id !== parseInt(selectedCollectionId)));
          setSelectedCollectionId("");
          setAddCollectionDialogOpen(false);
          toast.success("Collection ajoutée au lead");

          // Notifier le parent
          if (onLeadUpdate) {
            onLeadUpdate({ ...lead, collections: newCollections });
          }
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Erreur lors de l'ajout de la collection");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'ajout de la collection");
    } finally {
      setLoading(false);
    }
  };

  // Supprimer une collection du lead
  const removeCollectionFromLead = async (collectionId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leads/${lead.id}/collections/${collectionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const removedCollection = collections.find(c => c.id === collectionId);
        const newCollections = collections.filter(c => c.id !== collectionId);
        setCollections(newCollections);

        if (removedCollection) {
          setAvailableCollections(prev => [...prev, removedCollection]);
        }

        toast.success("Collection retirée du lead");

        // Notifier le parent
        if (onLeadUpdate) {
          onLeadUpdate({ ...lead, collections: newCollections });
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Erreur lors de la suppression de la collection");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la suppression de la collection");
    } finally {
      setLoading(false);
    }
  };
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

        {/* Collections et Métadonnées */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5" />
              Collections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Collections associées ({collections.length})
                </span>
                <Dialog open={addCollectionDialogOpen} onOpenChange={setAddCollectionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchAvailableCollections}
                      className="gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Ajouter
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter à une collection</DialogTitle>
                      <DialogDescription>
                        Sélectionnez une collection pour ajouter ce lead.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une collection" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCollections.map((collection) => (
                            <SelectItem key={collection.id} value={collection.id.toString()}>
                              {collection.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={addCollectionToLead}
                        disabled={!selectedCollectionId || loading}
                      >
                        {loading ? "Ajout..." : "Ajouter"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {collections.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {collections.map((collection) => (
                    <Badge key={collection.id} variant="outline" className="text-xs gap-1 pr-1">
                      {collection.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeCollectionFromLead(collection.id)}
                        disabled={loading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune collection associée
                </p>
              )}
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