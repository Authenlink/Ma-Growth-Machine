"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  Mail,
  Building2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ArrowLeft,
  Search,
  AlertCircle,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
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
import { cleanIndustry } from "@/lib/utils";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScroll } from "@/hooks/use-scroll";
import { InformationTab } from "@/components/leads/information-tab";
import { SocialMediaTab } from "@/components/leads/social-media-tab";
import { ReportTab } from "@/components/leads/report-tab";
import { EditLeadSheet } from "@/components/leads/edit-lead-sheet";
import { toast } from "sonner";

interface LinkedInPost {
  id: number;
  postUrl: string;
  postedDate: Date | null;
  author: string | null;
  text: string | null;
  reactions: number | null;
  like: number | null;
}

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
  emailCertainty: string | null;
  emailVerifyEmaillist: string | null;
  emailVerifyEmaillistAt: Date | null;
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
  companyPosts: LinkedInPost[];
  leadPosts: LinkedInPost[];
  company: {
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

export default function LeadDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const hasScrolled = useScroll();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [findingEmail, setFindingEmail] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const fetchLead = useCallback(async () => {
    if (status === "authenticated" && params.id) {
      try {
        const response = await fetch(`/api/leads/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setLead(data);
        } else if (response.status === 404) {
          setError("Lead non trouvé");
        } else {
          setError("Erreur lors de la récupération du lead");
        }
      } catch (err) {
        console.error("Erreur:", err);
        setError("Erreur lors de la récupération du lead");
      } finally {
        setLoading(false);
      }
    }
  }, [status, params.id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && params.id) {
      setLoading(true);
      fetchLead();
    }
  }, [status, params.id, fetchLead]);

  const getDisplayName = () => {
    if (!lead) return "";
    if (lead.fullName) return lead.fullName;
    if (lead.firstName && lead.lastName) {
      return `${lead.firstName} ${lead.lastName}`;
    }
    if (lead.firstName) return lead.firstName;
    if (lead.lastName) return lead.lastName;
    return "Nom non disponible";
  };

  const handleFindEmail = async () => {
    if (!lead) return;

    // Vérifier qu'on a le prénom et le nom
    if (!lead.firstName || !lead.lastName) {
      toast.error(
        "Le lead doit avoir un prénom et un nom pour trouver l'email",
      );
      return;
    }

    // Vérifier qu'on a un domaine
    const domain =
      lead.company?.domain ||
      (lead.company?.website
        ? extractDomainFromWebsite(lead.company.website)
        : null);
    if (!domain) {
      toast.error(
        "Le lead n'a pas de domaine disponible. Veuillez ajouter un domaine à l'entreprise associée.",
      );
      return;
    }

    setFindingEmail(true);
    try {
      const response = await fetch(`/api/leads/${lead.id}/find-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        if (data.email) {
          toast.success(
            `Email trouvé : ${data.email}${data.emailCertainty ? ` (certitude: ${data.emailCertainty})` : ""}`,
          );
          // Rafraîchir les données du lead
          const refreshResponse = await fetch(`/api/leads/${lead.id}`);
          if (refreshResponse.ok) {
            const refreshedLead = await refreshResponse.json();
            setLead(refreshedLead);
          }
        } else if (data.notFound) {
          // Cas où le scraper a fonctionné mais n'a pas trouvé d'email
          toast.warning(
            data.message || "Aucun email trouvé pour ce lead. Le scraper a bien fonctionné mais n'a pas pu trouver d'email correspondant.",
          );
        } else {
          toast.info("Aucun email trouvé pour ce lead");
        }
      } else {
        if (data.needsDomain) {
          toast.error(data.error || "Le lead n'a pas de domaine disponible");
        } else {
          toast.error(data.error || "Erreur lors de la recherche d'email");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la recherche d'email:", error);
      toast.error("Erreur de connexion lors de la recherche d'email");
    } finally {
      setFindingEmail(false);
    }
  };

  const extractDomainFromWebsite = (website: string | null): string | null => {
    if (!website) return null;
    try {
      const url = new URL(website);
      return url.hostname.replace(/^www\./, "");
    } catch {
      return website.replace(/^www\./, "").split("/")[0];
    }
  };

  const handleVerifyEmail = async () => {
    if (!lead?.email) return;

    setVerifyingEmail(true);
    try {
      const response = await fetch(
        `/api/leads/${lead.id}/verify-email-apify`,
        { method: "POST" },
      );
      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Email vérifié : ${data.result || "OK"}${data.emailCertainty ? ` (${data.emailCertainty})` : ""}`,
        );
        const refreshResponse = await fetch(`/api/leads/${lead.id}`);
        if (refreshResponse.ok) {
          const refreshedLead = await refreshResponse.json();
          setLead(refreshedLead);
        }
      } else {
        toast.error(data.error || "Erreur lors de la vérification de l'email");
      }
    } catch (error) {
      console.error("Erreur lors de la vérification:", error);
      toast.error("Erreur de connexion lors de la vérification");
    } finally {
      setVerifyingEmail(false);
    }
  };

  const getEmailVerifyBadgeVariant = (status: string | null) => {
    if (!status) return "outline";
    const ok = ["ok", "ok_for_all", "valid"];
    const invalid = [
      "email_disabled",
      "dead_server",
      "invalid_mx",
      "disposable",
      "spamtrap",
      "invalid_syntax",
      "invalid",
    ];
    if (ok.includes(status)) return "success";
    if (invalid.includes(status)) return "destructive";
    return "secondary";
  };

  const getEmailVerifyLabel = (status: string | null) => {
    if (!status) return null;
    const labels: Record<string, string> = {
      ok: "Délivrable",
      ok_for_all: "Accepte tout",
      valid: "Délivrable",
      email_disabled: "Désactivé",
      dead_server: "Serveur mort",
      invalid_mx: "MX invalide",
      disposable: "Jetable",
      spamtrap: "Spamtrap",
      smtp_protocol: "SMTP inconnu",
      antispam_system: "Anti-spam",
      invalid_syntax: "Syntaxe invalide",
      invalid: "Invalide",
      unknown: "Inconnu",
      error_credit: "Crédits insuffisants",
    };
    return labels[status] || status;
  };

  if (status === "loading" || loading) {
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
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!session) {
    return null;
  }

  if (error || !lead) {
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
                    <BreadcrumbPage>Détail</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {error || "Lead non trouvé"}
              </p>
              <Button asChild>
                <Link href="/leads">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour aux leads
                </Link>
              </Button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const displayName = getDisplayName();

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
                  <BreadcrumbPage>{displayName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="mb-4">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href="/leads">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour aux leads
              </Link>
            </Button>
          </div>

          {/* En-tête */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-3xl">{displayName}</CardTitle>
                    {lead.validated ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Validé
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Non validé
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditSheetOpen(true)}
                      className="gap-1 ml-auto"
                    >
                      <Pencil className="h-4 w-4" />
                      Modifier
                    </Button>
                  </div>
                  {lead.position && (
                    <CardDescription className="text-base mt-2">
                      {lead.position}
                    </CardDescription>
                  )}
                  {lead.company && (
                    <div className="flex items-center gap-2 mt-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <Link
                        href={`/companies/${lead.company.id}`}
                        className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        {lead.company.name}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                      {lead.company.industry && (
                        <span className="text-sm text-muted-foreground">
                          • {cleanIndustry(lead.company.industry)}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Bouton trouver l'email */}
                  {!lead.email && (
                    <div className="mt-4">
                      {(() => {
                        const hasName = lead.firstName && lead.lastName;
                        const domain =
                          lead.company?.domain ||
                          (lead.company?.website
                            ? extractDomainFromWebsite(lead.company.website)
                            : null);
                        const canFindEmail = hasName && domain;

                        if (!canFindEmail) {
                          return (
                            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                  Impossible de trouver l&apos;email
                                </p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                  {!hasName &&
                                    "Le lead doit avoir un prénom et un nom. "}
                                  {!domain &&
                                    "Veuillez ajouter un domaine à l'entreprise associée ou mettre à jour le website de l'entreprise."}
                                </p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <Button
                            onClick={handleFindEmail}
                            disabled={findingEmail}
                            className="gap-2"
                          >
                            <Search className="h-4 w-4" />
                            {findingEmail
                              ? "Recherche en cours..."
                              : "Trouver l'email"}
                          </Button>
                        );
                      })()}
                    </div>
                  )}
                  {lead.email && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {lead.email}
                      </a>
                      {lead.emailCertainty && (
                        <Badge variant="outline" className="text-xs">
                          {lead.emailCertainty}
                        </Badge>
                      )}
                      {lead.emailVerifyEmaillist && (
                        <Badge
                          variant={getEmailVerifyBadgeVariant(lead.emailVerifyEmaillist) as "outline" | "secondary" | "destructive" | "success"}
                          className="text-xs gap-1"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {getEmailVerifyLabel(lead.emailVerifyEmaillist)}
                          {lead.emailVerifyEmaillistAt && (
                            <span className="text-muted-foreground font-normal">
                              ({new Date(lead.emailVerifyEmaillistAt).toLocaleDateString("fr-FR")})
                            </span>
                          )}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleVerifyEmail}
                        disabled={verifyingEmail}
                        className="gap-1"
                      >
                        <ShieldCheck className="h-3 w-3" />
                        {verifyingEmail ? "Vérification..." : "Vérifier l'email"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Onglets */}
          <Tabs defaultValue="information" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="information">Informations</TabsTrigger>
              <TabsTrigger value="social">Réseaux sociaux</TabsTrigger>
              <TabsTrigger value="report">Report</TabsTrigger>
            </TabsList>

            <TabsContent value="information">
              <InformationTab lead={lead} onLeadUpdate={(updatedLead) => setLead(updatedLead as LeadDetail)} />
            </TabsContent>

            <TabsContent value="social">
              <SocialMediaTab
                companyPosts={lead.companyPosts}
                leadPosts={lead.leadPosts}
                companyName={lead.company?.name}
                personName={
                  lead.fullName || `${lead.firstName} ${lead.lastName}`.trim()
                }
              />
            </TabsContent>

            <TabsContent value="report">
              <ReportTab />
            </TabsContent>
          </Tabs>
        </div>

        {lead && (
          <EditLeadSheet
            lead={lead}
            open={editSheetOpen}
            onOpenChange={setEditSheetOpen}
            onSuccess={fetchLead}
          />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
