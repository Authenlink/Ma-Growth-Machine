"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useScroll } from "@/hooks/use-scroll";

export default function AddCompanyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasScrolled = useScroll();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);

  // Champs principaux
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [domain, setDomain] = useState("");

  // Champs supplémentaires
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [description, setDescription] = useState("");
  const [specialitiesText, setSpecialitiesText] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Le nom de l'entreprise est obligatoire");
      return;
    }

    setIsSubmitting(true);

    try {
      const specialities = specialitiesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const response = await fetch("/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          website: website.trim() || null,
          domain: domain.trim() || null,
          linkedinUrl: linkedinUrl.trim() || null,
          foundedYear: foundedYear.trim()
            ? parseInt(foundedYear, 10)
            : null,
          industry: industry.trim() || null,
          size: size.trim() || null,
          description: description.trim() || null,
          specialities: specialities.length > 0 ? specialities : null,
          city: city.trim() || null,
          state: state.trim() || null,
          country: country.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.company) {
        toast.success("Entreprise créée avec succès");
        router.push(`/companies/${data.company.id}`);
      } else {
        toast.error(data.error || "Erreur lors de la création de l'entreprise");
      }
    } catch (error) {
      console.error("Erreur lors de la création de l'entreprise:", error);
      toast.error("Erreur lors de la création de l'entreprise");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <Skeleton className="h-6 w-6" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Skeleton className="h-4 w-32" />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
            <Skeleton className="mb-2 h-8 w-64" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header
          className={`sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 ${
            hasScrolled ? "border-b" : ""
          }`}
        >
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link href="/companies">Entreprises</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Ajouter une entreprise</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="mb-2">
            <h1 className="text-2xl font-bold">Ajouter une entreprise</h1>
            <p className="text-muted-foreground">
              Créez une nouvelle entreprise manuellement en remplissant les
              informations ci-dessous.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Section principale */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations principales</CardTitle>
                  <CardDescription>
                    Remplissez les informations essentielles de l&apos;entreprise.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nom de l&apos;entreprise{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={isSubmitting}
                      placeholder="Acme Inc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">
                      Site web
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Très important)
                      </span>
                    </Label>
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
                    <Label htmlFor="domain">
                      Domaine
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Très important)
                      </span>
                    </Label>
                    <Input
                      id="domain"
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="acme.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Le site web et le domaine sont très importants pour
                      l&apos;enrichissement des données et la recherche
                      d&apos;emails.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Section "Voir plus" */}
              <Collapsible open={showMoreFields} onOpenChange={setShowMoreFields}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer transition-colors hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Informations supplémentaires</CardTitle>
                          <CardDescription>
                            Ajoutez des informations complémentaires sur
                            l&apos;entreprise.
                          </CardDescription>
                        </div>
                        {showMoreFields ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4 pt-0">
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

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                      </div>

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

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Bouton de soumission */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="w-full md:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Building2 className="mr-2 h-4 w-4" />
                      Créer l&apos;entreprise
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
