"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Users, Building2, FolderOpen, DollarSign } from "lucide-react";
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
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useScroll } from "@/hooks/use-scroll";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardStats {
  leads: number;
  companies: number;
  collections: number;
}

interface ChartData {
  date: string;
  leads: number;
  companies: number;
}

interface SpendingSummary {
  totalCostUsd: number;
  totalRuns: number;
}

interface ChartSpendingData {
  date: string;
  costUsd: number;
  runs: number;
  succeeded: number;
  failed: number;
}

const chartConfig = {
  leads: {
    label: "Leads",
    color: "var(--chart-1)",
  },
  companies: {
    label: "Entreprises",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const spendingChartConfig = {
  costUsd: {
    label: "Coût (USD)",
    color: "var(--chart-3)",
  },
  succeeded: {
    label: "Réussies",
    color: "var(--chart-4)",
  },
  failed: {
    label: "Échouées",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasScrolled = useScroll();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [timeRange, setTimeRange] = useState("7d");
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);

  const [spendingSummary, setSpendingSummary] =
    useState<SpendingSummary | null>(null);
  const [spendingPeriod, setSpendingPeriod] = useState("month");
  const [chartSpendingData, setChartSpendingData] = useState<
    ChartSpendingData[]
  >([]);
  const [spendingTimeRange, setSpendingTimeRange] = useState("7d");
  const [loadingSpending, setLoadingSpending] = useState(true);
  const [loadingSpendingChart, setLoadingSpendingChart] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchStats = async () => {
      if (status === "authenticated") {
        try {
          const response = await fetch("/api/dashboard/stats");
          if (response.ok) {
            const data = await response.json();
            setStats(data);
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des stats:", error);
        } finally {
          setLoadingStats(false);
        }
      }
    };

    fetchStats();
  }, [status]);

  useEffect(() => {
    const fetchChartData = async () => {
      if (status === "authenticated") {
        try {
          setLoadingChart(true);
          const response = await fetch(
            `/api/dashboard/chart?timeRange=${timeRange}`,
          );
          if (response.ok) {
            const data = await response.json();
            setChartData(data);
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération des données du graphique:",
            error,
          );
        } finally {
          setLoadingChart(false);
        }
      }
    };

    fetchChartData();
  }, [status, timeRange]);

  useEffect(() => {
    const fetchSpendingSummary = async () => {
      if (status === "authenticated") {
        try {
          setLoadingSpending(true);
          const response = await fetch(
            `/api/scraper-runs/summary?period=${spendingPeriod}`,
          );
          if (response.ok) {
            const data = await response.json();
            setSpendingSummary(data);
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération du total dépensé:",
            error,
          );
        } finally {
          setLoadingSpending(false);
        }
      }
    };

    fetchSpendingSummary();
  }, [status, spendingPeriod]);

  useEffect(() => {
    const fetchSpendingChartData = async () => {
      if (status === "authenticated") {
        try {
          setLoadingSpendingChart(true);
          const response = await fetch(
            `/api/dashboard/spending-chart?timeRange=${spendingTimeRange}`,
          );
          if (response.ok) {
            const data = await response.json();
            setChartSpendingData(Array.isArray(data) ? data : []);
          } else {
            setChartSpendingData([]);
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération du graphique dépenses:",
            error,
          );
        } finally {
          setLoadingSpendingChart(false);
        }
      }
    };

    fetchSpendingChartData();
  }, [status, spendingTimeRange]);

  // Skeleton pendant le chargement de la session
  if (status === "loading") {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {/* Header skeleton */}
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

          {/* Contenu skeleton */}
          <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
            {/* Titre */}
            <div className="mb-2">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>

            {/* Cards skeleton (grille de 3) */}
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="aspect-video rounded-xl" />
            </div>

            {/* Contenu principal skeleton */}
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
        {/* Header sticky avec trigger sidebar + breadcrumbs */}
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
                  <BreadcrumbPage>Overview</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Contenu de la page */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="mb-2">
            <h1 className="text-2xl font-bold">
              Bienvenue, {session.user.name} !
            </h1>
            <p className="text-muted-foreground">
              Voici votre tableau de bord.
            </p>
          </div>

          {/* Section KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Carte Leads */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.leads || 0}</div>
                )}
                <p className="text-xs text-muted-foreground">Total des leads</p>
              </CardContent>
            </Card>

            {/* Carte Companies */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Entreprises
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">
                    {stats?.companies || 0}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Total des entreprises
                </p>
              </CardContent>
            </Card>

            {/* Carte Collections */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Collections
                </CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">
                    {stats?.collections || 0}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Total des collections
                </p>
              </CardContent>
            </Card>

            {/* Carte Total dépensé */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total dépensé
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Select
                    value={spendingPeriod}
                    onValueChange={setSpendingPeriod}
                  >
                    <SelectTrigger
                      className="h-7 w-[110px] border-0 shadow-none"
                      aria-label="Période"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Jour</SelectItem>
                      <SelectItem value="week">Dernière semaine</SelectItem>
                      <SelectItem value="month">Dernier mois</SelectItem>
                      <SelectItem value="all">Tous</SelectItem>
                    </SelectContent>
                  </Select>
                  <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {loadingSpending ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">
                    {(spendingSummary?.totalCostUsd ?? 0).toFixed(2)} $
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {spendingSummary?.totalRuns != null
                    ? `${spendingSummary.totalRuns} exécution${spendingSummary.totalRuns > 1 ? "s" : ""}`
                    : "Dépenses Apify"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Section Graphiques */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="pt-0">
              <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1">
                  <CardTitle>Évolution des ajouts</CardTitle>
                  <CardDescription>
                    Nombre de leads et entreprises ajoutés chaque jour
                  </CardDescription>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger
                    className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
                    aria-label="Sélectionner une période"
                  >
                    <SelectValue placeholder="Derniers 30 jours" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="90d" className="rounded-lg">
                      Derniers 3 mois
                    </SelectItem>
                    <SelectItem value="30d" className="rounded-lg">
                      Derniers 30 jours
                    </SelectItem>
                    <SelectItem value="7d" className="rounded-lg">
                      Derniers 7 jours
                    </SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                {loadingChart ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : chartData.length === 0 ? (
                  <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                    Aucune donnée disponible
                  </div>
                ) : (
                  <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[250px] w-full"
                  >
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient
                          id="fillLeads"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--color-leads)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-leads)"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                        <linearGradient
                          id="fillCompanies"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--color-companies)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-companies)"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={32}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString("fr-FR", {
                            month: "short",
                            day: "numeric",
                          });
                        }}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) => {
                              return new Date(value).toLocaleDateString(
                                "fr-FR",
                                {
                                  month: "short",
                                  day: "numeric",
                                },
                              );
                            }}
                            indicator="dot"
                          />
                        }
                      />
                      <Area
                        dataKey="companies"
                        type="natural"
                        fill="url(#fillCompanies)"
                        stroke="var(--color-companies)"
                        strokeWidth={2}
                        stackId="a"
                      />
                      <Area
                        dataKey="leads"
                        type="natural"
                        fill="url(#fillLeads)"
                        stroke="var(--color-leads)"
                        strokeWidth={2}
                        stackId="a"
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Section Graphique dépenses */}
            <Card className="pt-0">
              <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1">
                  <CardTitle>Coûts dépensés par jour</CardTitle>
                  <CardDescription>
                    Dépenses Apify et exécutions par jour
                  </CardDescription>
                </div>
                <Select
                  value={spendingTimeRange}
                  onValueChange={setSpendingTimeRange}
                >
                  <SelectTrigger
                    className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
                    aria-label="Sélectionner une période"
                  >
                    <SelectValue placeholder="Derniers 30 jours" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="90d" className="rounded-lg">
                      Derniers 3 mois
                    </SelectItem>
                    <SelectItem value="30d" className="rounded-lg">
                      Derniers 30 jours
                    </SelectItem>
                    <SelectItem value="7d" className="rounded-lg">
                      Derniers 7 jours
                    </SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                {loadingSpendingChart ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : chartSpendingData.length === 0 ? (
                  <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                    Aucune donnée disponible
                  </div>
                ) : (
                  <ChartContainer
                    config={spendingChartConfig}
                    className="aspect-auto h-[250px] w-full"
                  >
                    <AreaChart
                      data={chartSpendingData}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient
                          id="fillSpendingCostUsd"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--color-costUsd)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-costUsd)"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                        <linearGradient
                          id="fillSpendingSucceeded"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--color-succeeded)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-succeeded)"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                        <linearGradient
                          id="fillSpendingFailed"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--color-failed)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-failed)"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <YAxis
                        yAxisId="left"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v}`}
                        domain={[0, "auto"]}
                        width={40}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        domain={[0, "auto"]}
                        width={40}
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={32}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString("fr-FR", {
                            month: "short",
                            day: "numeric",
                          });
                        }}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) => {
                              return new Date(value).toLocaleDateString(
                                "fr-FR",
                                {
                                  month: "short",
                                  day: "numeric",
                                },
                              );
                            }}
                            formatter={(value, name) => {
                              if (name === "costUsd") {
                                return [
                                  `${Number(value).toFixed(2)} $`,
                                  "Coût",
                                ];
                              }
                              const label =
                                name === "succeeded"
                                  ? "Réussies"
                                  : name === "failed"
                                    ? "Échouées"
                                    : String(name);
                              return [value, label];
                            }}
                            indicator="dot"
                          />
                        }
                      />
                      <Area
                        dataKey="failed"
                        type="natural"
                        fill="url(#fillSpendingFailed)"
                        stroke="var(--color-failed)"
                        stackId="runs"
                        yAxisId="right"
                      />
                      <Area
                        dataKey="succeeded"
                        type="natural"
                        fill="url(#fillSpendingSucceeded)"
                        stroke="var(--color-succeeded)"
                        stackId="runs"
                        yAxisId="right"
                      />
                      <Area
                        dataKey="costUsd"
                        type="natural"
                        fill="url(#fillSpendingCostUsd)"
                        stroke="var(--color-costUsd)"
                        yAxisId="left"
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
