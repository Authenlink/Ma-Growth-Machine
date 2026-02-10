"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface CompanyDetail {
  id: number;
  name: string;
  website: string | null;
  domain: string | null;
  linkedinUrl: string | null;
  foundedYear: number | null;
  industry: string | null;
  size: string | null;
  description: string | null;
  specialities: string[] | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

interface EditCompanySheetProps {
  company: CompanyDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditCompanySheet({
  company,
  open,
  onOpenChange,
  onSuccess,
}: EditCompanySheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [domain, setDomain] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [description, setDescription] = useState("");
  const [specialitiesText, setSpecialitiesText] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    if (open && company) {
      setName(company.name ?? "");
      setWebsite(company.website ?? "");
      setDomain(company.domain ?? "");
      setLinkedinUrl(company.linkedinUrl ?? "");
      setFoundedYear(company.foundedYear?.toString() ?? "");
      setIndustry(company.industry ?? "");
      setSize(company.size ?? "");
      setDescription(company.description ?? "");
      setSpecialitiesText(
        company.specialities && company.specialities.length > 0
          ? company.specialities.join(", ")
          : ""
      );
      setCity(company.city ?? "");
      setState(company.state ?? "");
      setCountry(company.country ?? "");
    }
  }, [open, company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const specialities = specialitiesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const response = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "",
          website: website.trim() || null,
          domain: domain.trim() || null,
          linkedinUrl: linkedinUrl.trim() || null,
          foundedYear: foundedYear.trim() ? parseInt(foundedYear, 10) : null,
          industry: industry.trim() || null,
          size: size.trim() || null,
          description: description.trim() || null,
          specialities: specialities.length > 0 ? specialities : null,
          city: city.trim() || null,
          state: state.trim() || null,
          country: country.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }

      toast.success("Modifications enregistrées");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Modifier l&apos;entreprise</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {/* Informations générales */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Informations générales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Acme Inc."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Site web</Label>
                  <Input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="https://acme.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domaine</Label>
                  <Input
                    id="domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="acme.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">URL LinkedIn</Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="https://linkedin.com/company/acme"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="foundedYear">Année de fondation</Label>
                    <Input
                      id="foundedYear"
                      type="number"
                      value={foundedYear}
                      onChange={(e) => setFoundedYear(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="2020"
                      min={1800}
                      max={2100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industrie</Label>
                    <Input
                      id="industry"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Technologie"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="size">Taille</Label>
                  <Input
                    id="size"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="51-200 employés"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Description et spécialités */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">À propos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Description de l'entreprise..."
                    rows={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialities">
                    Spécialités (séparées par des virgules)
                  </Label>
                  <Input
                    id="specialities"
                    value={specialitiesText}
                    onChange={(e) => setSpecialitiesText(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="SaaS, Marketing, Sales"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Localisation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Localisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Paris"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Région</Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Île-de-France"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="France"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <SheetFooter className="border-t p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
