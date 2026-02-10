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
  Search,
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
  } | null;
}

interface Company {
  id: number;
  name: string;
  website: string | null;
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

function SeoInsightsPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasScrolled = useScroll();

  const [mode, setMode] = useState<"single" | "collection">("single");
  const [singleValue, setSingleValue] = useState<SingleSelectValue>(null);
  const [collectionId, setCollectionId] = useState<number | null>(null);
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");

  const [collections, setCollections] = useState<Collection[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [preselectedCompany, setPreselectedCompany] = useState<Company | null>(
    null,
  );
  const [collectionLeads, setCollectionLeads] = useState<
    Array<{
      company: { id: number; website: string | null } | null;
    }>
  >([]);

  const [loading, setLoading] = useState(true);
  const [loadingCollectionLeads, setLoadingCollectionLeads] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    status: "idle" | "success" | "error";
    metrics?: {
      analyzed: number;
      skipped: number;
      withoutWebsite: number;
      errors: number;
    };
    error?: string;
    warnings?: {
      withoutWebsiteCount: number;
      withoutWebsiteMessage: string;
    };
  }>({ status: "idle" });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Pré-sélectionner depuis l'URL (?companyId= ou ?leadId=)
  useEffect(() => {
    const companyIdParam = searchParams.get("companyId");
    const leadIdParam = searchParams.get("leadId");
    if (companyIdParam) {
      const id = parseInt(companyIdParam, 10);
      if (!isNaN(id)) {
        setMode("single");
        setSingleValue({ type: "company", id });
        setCollectionId(null);
        // Charger l'entreprise si elle n'est pas dans la liste (ex: pagination)
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

  const leadsWithWebsite = leads.filter(
    (l) => l.company?.website && l.company.website.trim() !== "",
  );
  const companiesWithWebsite = companies.filter(
    (c) => c.website && c.website.trim() !== "",
  );

  // Inclure l'entreprise pré-sélectionnée (ex: depuis la page company) si absente de la liste
  const companyOptions = [...companiesWithWebsite];
  if (
    preselectedCompany &&
    singleValue?.type === "company" &&
    singleValue.id === preselectedCompany.id &&
    !companyOptions.some((c) => c.id === preselectedCompany.id)
  ) {
    companyOptions.push(preselectedCompany);
  }

  const singleOptions = [
    ...leadsWithWebsite.map((l) => ({
      value: `lead:${l.id}`,
      label: `${l.fullName || [l.firstName, l.lastName].filter(Boolean).join(" ") || `Lead #${l.id}`} - ${l.company?.name ?? ""}`,
    })),
    ...companyOptions.map((c) => ({
      value: `company:${c.id}`,
      label: c.name,
    })),
  ];

  const collectionWithWebsite = collectionLeads.filter(
    (l) => l.company?.website && l.company.website.trim() !== "",
  );
  const collectionWithoutWebsite =
    collectionLeads.length - collectionWithWebsite.length;

  const canSubmit =
    mode === "single"
      ? singleValue !== null
      : collectionId !== null && collectionLeads.length > 0;

  const hasWebsiteWarning =
    mode === "single" && singleValue
      ? singleValue.type === "lead"
        ? !leads.find((l) => l.id === singleValue.id)?.company?.website
        : !companies.find((c) => c.id === singleValue.id)?.website
      : false;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsAnalyzing(true);
    setResult({ status: "idle" });

    try {
      const body: Record<string, unknown> = {
        mode,
        strategy,
      };

      if (mode === "single" && singleValue) {
        if (singleValue.type === "lead") body.leadId = singleValue.id;
        else body.companyId = singleValue.id;
      } else if (mode === "collection" && collectionId) {
        body.collectionId = collectionId;
      }

      const res = await fetch("/api/seo-insights/analyze", {
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
          `Analyse terminée : ${data.metrics.analyzed} site(s) analysé(s)`,
        );
      } else {
        setResult({
          status: "error",
          error: data.error || "Erreur lors de l'analyse",
          metrics: data.metrics,
        });
        toast.error(data.error || "Erreur lors de l'analyse");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setResult({ status: "error", error: msg });
      toast.error(msg);
    } finally {
      setIsAnalyzing(false);
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
                  <BreadcrumbPage>Analyse SEO</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="mb-2">
            <h1 className="text-2xl font-bold">Analyse SEO</h1>
            <p className="text-muted-foreground">
              Analysez le SEO des sites web de vos leads et entreprises via
              Google PageSpeed Insights.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres</CardTitle>
                  <CardDescription>
                    Choisissez un lead, une entreprise ou une collection à
                    analyser.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="mode-select">Mode d&apos;analyse</Label>
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
                          Un lead ou une entreprise
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
                        emptyMessage="Aucun lead ou entreprise avec website trouvé"
                        filterFunction={(opt, search) => {
                          if (!search) return true;
                          const s = search.toLowerCase();
                          return opt.label.toLowerCase().includes(s);
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        {leadsWithWebsite.length} lead(s) et{" "}
                        {companiesWithWebsite.length} entreprise(s) avec website
                        disponibles
                      </p>
                      {hasWebsiteWarning && (
                        <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                          <AlertCircle className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            L&apos;élément sélectionné n&apos;a pas de website
                            valide. Seuls les leads et entreprises avec website
                            sont affichés.
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
                                {collectionWithWebsite.length} lead(s) avec
                                website seront analysés
                              </p>
                              {collectionWithoutWebsite > 0 && (
                                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                                  {collectionWithoutWebsite} lead(s) sans
                                  website seront ignorés
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="strategy-select">Stratégie</Label>
                    <Select
                      value={strategy}
                      onValueChange={(v) =>
                        setStrategy(v as "mobile" | "desktop")
                      }
                    >
                      <SelectTrigger id="strategy-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mobile">Mobile</SelectItem>
                        <SelectItem value="desktop">Desktop</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Mobile simule un appareil mobile, Desktop un navigateur
                      desktop
                    </p>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit || isAnalyzing}
                    size="lg"
                    className="w-full"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Lancer l&apos;analyse SEO
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
                    Résultat de l&apos;analyse SEO
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {result.status === "idle" && !isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Configurez les paramètres et lancez une analyse.
                      </p>
                    </div>
                  )}

                  {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                      <p className="text-sm font-medium mb-2">
                        Analyse en cours...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cela peut prendre quelques secondes par site.
                      </p>
                    </div>
                  )}

                  {result.status === "success" &&
                    result.metrics &&
                    !isAnalyzing && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">
                            Analyse terminée avec succès
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Analysés:
                            </span>
                            <span className="font-medium">
                              {result.metrics.analyzed}
                            </span>
                          </div>
                          {result.metrics.withoutWebsite > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Sans website:
                              </span>
                              <span className="font-medium text-yellow-600 dark:text-yellow-400">
                                {result.metrics.withoutWebsite}
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
                        {result.warnings?.withoutWebsiteMessage && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 pt-2 border-t">
                            {result.warnings.withoutWebsiteMessage}
                          </p>
                        )}
                      </div>
                    )}

                  {result.status === "error" && !isAnalyzing && (
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

export default function SeoInsightsPage() {
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
      <SeoInsightsPageContent />
    </Suspense>
  );
}
