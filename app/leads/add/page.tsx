"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { UserPlus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useScroll } from "@/hooks/use-scroll";

interface Collection {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function AddLeadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasScrolled = useScroll();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);

  // Champs principaux
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [companyLinkedinUrl, setCompanyLinkedinUrl] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");

  // Champs supplémentaires
  const [seniority, setSeniority] = useState("");
  const [functional, setFunctional] = useState("");
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([""]);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [validated, setValidated] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchCollections = async () => {
      if (status === "authenticated") {
        try {
          const response = await fetch("/api/collections");
          if (response.ok) {
            const data = await response.json();
            setCollections(data);
            // Sélectionner la première collection par défaut si disponible
            if (data.length > 0) {
              setSelectedCollectionId(data[0].id.toString());
            }
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération des collections:",
            error,
          );
        } finally {
          setLoadingCollections(false);
        }
      }
    };

    fetchCollections();
  }, [status]);

  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, ""]);
  };

  const updatePhoneNumber = (index: number, value: string) => {
    const updated = [...phoneNumbers];
    updated[index] = value;
    setPhoneNumbers(updated);
  };

  const removePhoneNumber = (index: number) => {
    if (phoneNumbers.length > 1) {
      setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!firstName.trim()) {
      toast.error("Le prénom est obligatoire");
      return;
    }
    if (!lastName.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }
    if (!companyName.trim()) {
      toast.error("Le nom de l'entreprise est obligatoire");
      return;
    }
    if (!selectedCollectionId) {
      toast.error("Veuillez sélectionner une collection");
      return;
    }

    setIsSubmitting(true);

    try {
      // Filtrer les numéros de téléphone vides
      const filteredPhoneNumbers = phoneNumbers.filter((p) => p.trim() !== "");

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collectionId: parseInt(selectedCollectionId),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          companyName: companyName.trim(),
          companyDomain: companyDomain.trim() || undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          companyLinkedinUrl: companyLinkedinUrl.trim() || undefined,
          email: email.trim() || undefined,
          position: position.trim() || undefined,
          seniority: seniority.trim() || undefined,
          functional: functional.trim() || undefined,
          headline: headline.trim() || undefined,
          about: about.trim() || undefined,
          personalEmail: personalEmail.trim() || undefined,
          phoneNumbers: filteredPhoneNumbers.length > 0 ? filteredPhoneNumbers : undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          country: country.trim() || undefined,
          status: leadStatus.trim() || undefined,
          validated,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Lead créé avec succès");
        // Réinitialiser le formulaire
        setFirstName("");
        setLastName("");
        setCompanyName("");
        setCompanyDomain("");
        setLinkedinUrl("");
        setCompanyLinkedinUrl("");
        setEmail("");
        setPosition("");
        setSeniority("");
        setFunctional("");
        setHeadline("");
        setAbout("");
        setPersonalEmail("");
        setPhoneNumbers([""]);
        setCity("");
        setState("");
        setCountry("");
        setLeadStatus("");
        setValidated(false);
        setReason("");
        setShowMoreFields(false);
        // Optionnel : rediriger vers la liste des leads
        // router.push("/leads");
      } else {
        toast.error(data.error || "Erreur lors de la création du lead");
      }
    } catch (error) {
      console.error("Erreur lors de la création du lead:", error);
      toast.error("Erreur lors de la création du lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || loadingCollections) {
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
            <Skeleton className="h-8 w-64 mb-2" />
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
                    <Link href="/leads">Leads</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Ajouter un lead</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="mb-2">
            <h1 className="text-2xl font-bold">Ajouter un lead</h1>
            <p className="text-muted-foreground">
              Créez un nouveau lead manuellement en remplissant les informations
              ci-dessous.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Sélection de la collection */}
              <Card>
                <CardHeader>
                  <CardTitle>Collection</CardTitle>
                  <CardDescription>
                    Sélectionnez la collection dans laquelle ajouter ce lead.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="collection">Collection *</Label>
                    <Select
                      value={selectedCollectionId}
                      onValueChange={setSelectedCollectionId}
                      disabled={isSubmitting || collections.length === 0}
                    >
                      <SelectTrigger id="collection">
                        <SelectValue
                          placeholder={
                            collections.length === 0
                              ? "Aucune collection disponible"
                              : "Sélectionner une collection"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {collections.map((collection) => (
                          <SelectItem
                            key={collection.id}
                            value={collection.id.toString()}
                          >
                            {collection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {collections.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        <Link
                          href="/leads/collections/new"
                          className="text-primary hover:underline"
                        >
                          Créez une collection
                        </Link>{" "}
                        avant d&apos;ajouter un lead.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Section principale */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations principales</CardTitle>
                  <CardDescription>
                    Remplissez les informations essentielles du lead.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">
                        Prénom <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        disabled={isSubmitting}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">
                        Nom <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        disabled={isSubmitting}
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">
                      Nom de l&apos;entreprise{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      disabled={isSubmitting}
                      placeholder="Acme Inc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyDomain">
                      Domaine de l&apos;entreprise
                      <span className="text-muted-foreground ml-2 text-xs">
                        (Très important)
                      </span>
                    </Label>
                    <Input
                      id="companyDomain"
                      type="text"
                      value={companyDomain}
                      onChange={(e) => setCompanyDomain(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="acme.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Le domaine de l&apos;entreprise est très important pour
                      l&apos;enrichissement des données.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="linkedinUrl">LinkedIn URL (personne)</Label>
                      <Input
                        id="linkedinUrl"
                        type="url"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="https://linkedin.com/in/johndoe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyLinkedinUrl">
                        LinkedIn URL (entreprise)
                      </Label>
                      <Input
                        id="companyLinkedinUrl"
                        type="url"
                        value={companyLinkedinUrl}
                        onChange={(e) => setCompanyLinkedinUrl(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="https://linkedin.com/company/acme"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="john.doe@acme.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Poste</Label>
                      <Input
                        id="position"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="CEO"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section "Voir plus" */}
              <Collapsible open={showMoreFields} onOpenChange={setShowMoreFields}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Informations supplémentaires</CardTitle>
                          <CardDescription>
                            Ajoutez des informations complémentaires sur le
                            lead.
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="seniority">Seniorité</Label>
                          <Input
                            id="seniority"
                            value={seniority}
                            onChange={(e) => setSeniority(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="Senior"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="functional">Fonctionnel</Label>
                          <Input
                            id="functional"
                            value={functional}
                            onChange={(e) => setFunctional(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="Sales"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="headline">Titre LinkedIn</Label>
                        <Input
                          id="headline"
                          value={headline}
                          onChange={(e) => setHeadline(e.target.value)}
                          disabled={isSubmitting}
                          placeholder="CEO at Acme Inc."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="about">À propos</Label>
                        <Textarea
                          id="about"
                          value={about}
                          onChange={(e) => setAbout(e.target.value)}
                          disabled={isSubmitting}
                          placeholder="Description du profil..."
                          rows={4}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="personalEmail">Email personnel</Label>
                        <Input
                          id="personalEmail"
                          type="email"
                          value={personalEmail}
                          onChange={(e) => setPersonalEmail(e.target.value)}
                          disabled={isSubmitting}
                          placeholder="john.doe@gmail.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Numéros de téléphone</Label>
                        {phoneNumbers.map((phone, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              type="tel"
                              value={phone}
                              onChange={(e) =>
                                updatePhoneNumber(index, e.target.value)
                              }
                              disabled={isSubmitting}
                              placeholder="+33 6 12 34 56 78"
                            />
                            {phoneNumbers.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => removePhoneNumber(index)}
                                disabled={isSubmitting}
                              >
                                Supprimer
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addPhoneNumber}
                          disabled={isSubmitting}
                          className="w-full"
                        >
                          Ajouter un numéro
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          <Label htmlFor="state">État/Région</Label>
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

                      <div className="space-y-2">
                        <Label htmlFor="leadStatus">Statut</Label>
                        <Input
                          id="leadStatus"
                          value={leadStatus}
                          onChange={(e) => setLeadStatus(e.target.value)}
                          disabled={isSubmitting}
                          placeholder="Nouveau"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="validated"
                          checked={validated}
                          onChange={(e) => setValidated(e.target.checked)}
                          disabled={isSubmitting}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="validated" className="cursor-pointer">
                          Lead validé
                        </Label>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reason">Raison</Label>
                        <Textarea
                          id="reason"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          disabled={isSubmitting}
                          placeholder="Raison de validation ou notes..."
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Bouton de soumission */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !selectedCollectionId ||
                    collections.length === 0 ||
                    !firstName.trim() ||
                    !lastName.trim() ||
                    !companyName.trim()
                  }
                  className="w-full md:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Créer le lead
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
