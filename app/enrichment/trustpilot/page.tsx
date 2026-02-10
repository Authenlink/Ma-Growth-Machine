"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star,
} from "lucide-react";
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
import { useScroll } from "@/hooks/use-scroll";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Collection {
  id: number;
  name: string;
  description: string | null;
}

interface Lead {
  id: number;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  company: {
    id: number;
    name: string;
    website: string | null;
    domain?: string | null;
  } | null;
}

interface Company {
  id: number;
  name: string;
  website: string | null;
  domain?: string | null;
}

type SingleSelectValue =
  | { type: "lead"; id: number }
  | { type: "company"; id: number }
  | null;

function singleValueToOption(v: SingleSelectValue): string {
  if (!v) return "";
  return v.type === "lead" ? `lead:${v.id}` : `company:${v.id}`;
}

function optionToSingleValue(s: string): SingleSelectValue {
  if (!s) return null;
  const [type, idStr] = s.split(":");
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return null;
  if (type === "lead") return { type: "lead", id };
  if (type === "company") return { type: "company", id };
  return null;
}

function hasDomain(c: { website?: string | null; domain?: string | null }): boolean {
  return !!(
    (c.domain && c.domain.trim()) ||
    (c.website && c.website.trim())
  );
}

function TrustpilotReviewsPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasScrolled = useScroll();

  const [mode, setMode] = useState<"single" | "collection">("single");
  const [singleValue, setSingleValue] = useState<SingleSelectValue>(null);
  const [collectionId, setCollectionId] = useState<number | null>(null);
  const [maxItems, setMaxItems] = useState(100);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [preselectedCompany, setPreselectedCompany] = useState<Company | null>(
    null
  );
  const [collectionLeads, setCollectionLeads] = useState<
    Array<{
      company: { id: number; website: string | null; domain?: string | null } | null;
    }>
  >([]);

  const [loading, setLoading] = useState(true);
  const [loadingCollectionLeads, setLoadingCollectionLeads] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [result, setResult] = useState<{
    status: "idle" | "success" | "error";
    metrics?: {
      scraped: number;
      created: number;
      skipped: number;
      withoutDomain: number;
      errors: number;
    };
    error?: string;
    warnings?: {
      withoutDomainCount: number;
      withoutDomainMessage: string;
    };
  }>({ status: "idle" });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const companyIdParam = searchParams.get("companyId");
    const leadIdParam = searchParams.get("leadId");
    if (companyIdParam) {
      const id = parseInt(companyIdParam, 10);
      if (!isNaN(id)) {
        setMode("single");
        setSingleValue({ type: "company", id });
        setCollectionId(null);
        fetch(`/api/companies/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((c) => c && setPreselectedCompany(c))
          .catch(() => {});
      }
    } else if (leadIdParam) {
      const id = parseInt(leadIdParam, 10);
      if (!isNaN(id)) {
        setMode("single");
        setSingleValue({ type: "lead", id });
        setCollectionId(null);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      if (status !== "authenticated") return;
      try {
        const [collectionsRes, leadsRes, companiesRes] = await Promise.all([
          fetch("/api/collections"),
          fetch("/api/leads?limit=500"),
          fetch("/api/companies?limit=500"),
        ]);

        if (collectionsRes.ok) setCollections(await collectionsRes.json());
        if (leadsRes.ok) {
          const data = await leadsRes.json();
          setLeads(data.data ?? data);
        }
        if (companiesRes.ok) {
          const data = await companiesRes.json();
          setCompanies(data.data ?? data);
        }
      } catch (err) {
        console.error(err);
        toast.error("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [status]);

  useEffect(() => {
    if (!collectionId || status !== "authenticated") {
      setCollectionLeads([]);
      return;
    }
    setLoadingCollectionLeads(true);
    fetch(`/api/collections/${collectionId}/leads`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setCollectionLeads(d.data ?? []))
      .catch(() => setCollectionLeads([]))
      .finally(() => setLoadingCollectionLeads(false));
  }, [collectionId, status]);

  const leadsWithDomain = leads.filter(
    (l) => l.company && hasDomain(l.company)
  );
  const companiesWithDomain = companies.filter(hasDomain);

  const companyOptions = [...companiesWithDomain];
  if (
    preselectedCompany &&
    singleValue?.type === "company" &&
    singleValue.id === preselectedCompany.id &&
    !companyOptions.some((c) => c.id === preselectedCompany.id)
  ) {
    companyOptions.push(preselectedCompany);
  }

  const singleOptions = [
    ...leadsWithDomain.map((l) => ({
      value: `lead:${l.id}`,
      label: `${l.fullName || [l.firstName, l.lastName].filter(Boolean).join(" ") || `Lead #${l.id}`} - ${l.company?.name ?? ""}`,
    })),
    ...companyOptions.map((c) => ({
      value: `company:${c.id}`,
      label: c.name,
    })),
  ];

  const collectionWithDomain = collectionLeads.filter(
    (l) => l.company && hasDomain(l.company)
  );
  const collectionWithoutDomain =
    collectionLeads.length - collectionWithDomain.length;

  const canSubmit =
    mode === "single"
      ? singleValue !== null
      : collectionId !== null && collectionLeads.length > 0;

  const getSelectedCompany = (): { website?: string | null; domain?: string | null } | null => {
    if (!singleValue) return null;
    if (singleValue.type === "lead") {
      const lead = leads.find((l) => l.id === singleValue.id);
      return lead?.company ?? null;
    }
    return companies.find((c) => c.id === singleValue.id) ?? preselectedCompany;
  };
  const hasDomainWarning =
    mode === "single" && singleValue
      ? !getSelectedCompany() || !hasDomain(getSelectedCompany()!)
      : false;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsScraping(true);
    setResult({ status: "idle" });

    try {
      const body: Record<string, unknown> = {
        mode,
        maxItems,
      };

      if (mode === "single" && singleValue) {
        if (singleValue.type === "lead") body.leadId = singleValue.id;
        else body.companyId = singleValue.id;
      } else if (mode === "collection" && collectionId) {
        body.collectionId = collectionId;
      }

      const res = await fetch("/api/trustpilot-reviews/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          status: "success",
          metrics: data.metrics,
          warnings: data.warnings,
        });
        toast.success(
          `Scraping terminé : ${data.metrics.created} avis créés`
        );
      } else {
        setResult({
          status: "error",
          error: data.error || "Erreur lors du scraping",
          metrics: data.metrics,
        });
        toast.error(data.error || "Erreur lors du scraping");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setResult({ status: "error", error: msg });
      toast.error(msg);
    } finally {
      setIsScraping(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!session) return null;

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
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/enrichment">Enrichissement</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Avis Trustpilot</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="mb-2">
            <h1 className="text-2xl font-bold">Avis Trustpilot</h1>
            <p className="text-muted-foreground">
              Scrapez les avis Trustpilot de vos entreprises pour enrichir vos
              données. Un domaine (website) est requis pour chaque entreprise.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres</CardTitle>
                  <CardDescription>
                    Choisissez une entreprise ou une collection à enrichir.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="mode-select">Mode</Label>
                    <Select
                      value={mode}
                      onValueChange={(v) => {
                        setMode(v as "single" | "collection");
                        setSingleValue(null);
                        setCollectionId(null);
                        setResult({ status: "idle" });
                      }}
                    >
                      <SelectTrigger id="mode-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">
                          Une entreprise
                        </SelectItem>
                        <SelectItem value="collection">
                          Toute une collection
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {mode === "single" && (
                    <div className="space-y-2">
                      <Label htmlFor="single-select">Lead ou entreprise</Label>
                      <Combobox
                        options={singleOptions}
                        value={singleValueToOption(singleValue)}
                        onValueChange={(v) =>
                          setSingleValue(optionToSingleValue(v))
                        }
                        placeholder="Rechercher un lead ou une entreprise..."
                        searchPlaceholder="Tapez pour rechercher..."
                        emptyMessage="Aucun lead ou entreprise avec domaine trouvé"
                        filterFunction={(opt, search) => {
                          if (!search) return true;
                          const s = search.toLowerCase();
                          return opt.label.toLowerCase().includes(s);
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        {leadsWithDomain.length} lead(s) et{" "}
                        {companiesWithDomain.length} entreprise(s) avec domaine
                        disponibles
                      </p>
                      {hasDomainWarning && (
                        <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                          <AlertCircle className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            Cette entreprise n&apos;a pas de domaine (website).
                            Le scraping Trustpilot ne pourra pas fonctionner.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {mode === "collection" && (
                    <div className="space-y-2">
                      <Label htmlFor="collection-select">Collection</Label>
                      <Select
                        value={collectionId?.toString() ?? ""}
                        onValueChange={(v) => {
                          setCollectionId(v ? parseInt(v) : null);
                          setResult({ status: "idle" });
                        }}
                      >
                        <SelectTrigger id="collection-select">
                          <SelectValue placeholder="Choisir une collection" />
                        </SelectTrigger>
                        <SelectContent>
                          {collections.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {collectionId && loadingCollectionLeads && (
                        <p className="text-sm text-muted-foreground">
                          Chargement des leads...
                        </p>
                      )}
                      {collectionId &&
                        !loadingCollectionLeads &&
                        collectionLeads.length > 0 && (
                          <div className="flex items-start gap-2 rounded-md border border-muted p-3">
                            <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm">
                                {collectionWithDomain.length} entreprise(s) avec
                                domaine seront scrapées
                              </p>
                              {collectionWithoutDomain > 0 && (
                                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                                  {collectionWithoutDomain} lead(s) sans
                                  domaine seront ignorés
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="max-items">Nombre max d&apos;avis par entreprise</Label>
                    <Input
                      id="max-items"
                      type="number"
                      min={10}
                      max={500}
                      value={maxItems}
                      onChange={(e) =>
                        setMaxItems(parseInt(e.target.value, 10) || 100)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Défaut : 100. Le scraper récupère jusqu&apos;à 200 avis
                      par page Trustpilot.
                    </p>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit || isScraping}
                    size="lg"
                    className="w-full"
                  >
                    {isScraping ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scraping en cours...
                      </>
                    ) : (
                      <>
                        <Star className="mr-2 h-4 w-4" />
                        Lancer le scraping
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle>Statut</CardTitle>
                  <CardDescription>
                    Résultat du scraping Trustpilot
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {result.status === "idle" && !isScraping && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Configurez les paramètres et lancez un scraping.
                      </p>
                    </div>
                  )}

                  {isScraping && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                      <p className="text-sm font-medium mb-2">
                        Scraping en cours...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cela peut prendre quelques secondes par entreprise.
                      </p>
                    </div>
                  )}

                  {result.status === "success" &&
                    result.metrics &&
                    !isScraping && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">
                            Scraping terminé avec succès
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Entreprises scrapées:
                            </span>
                            <span className="font-medium">
                              {result.metrics.scraped}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Avis créés:
                            </span>
                            <span className="font-medium">
                              {result.metrics.created}
                            </span>
                          </div>
                          {result.metrics.skipped > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Avis déjà existants:
                              </span>
                              <span className="font-medium">
                                {result.metrics.skipped}
                              </span>
                            </div>
                          )}
                          {result.metrics.withoutDomain > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Sans domaine:
                              </span>
                              <span className="font-medium text-yellow-600 dark:text-yellow-400">
                                {result.metrics.withoutDomain}
                              </span>
                            </div>
                          )}
                          {result.metrics.errors > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Erreurs:
                              </span>
                              <span className="font-medium text-red-600 dark:text-red-400">
                                {result.metrics.errors}
                              </span>
                            </div>
                          )}
                        </div>
                        {result.warnings?.withoutDomainMessage && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 pt-2 border-t">
                            {result.warnings.withoutDomainMessage}
                          </p>
                        )}
                      </div>
                    )}

                  {result.status === "error" && !isScraping && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <XCircle className="h-5 w-5" />
                        <span className="font-medium">Erreur</span>
                      </div>
                      {result.error && (
                        <p className="text-sm text-muted-foreground">
                          {result.error}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function TrustpilotReviewsPage() {
  return (
    <Suspense fallback={
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    }>
      <TrustpilotReviewsPageContent />
    </Suspense>
  );
}
