"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
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
import { useScroll } from "@/hooks/use-scroll";

interface Collection {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function ExportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasScrolled = useScroll();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

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
          toast.error("Erreur lors du chargement des collections");
        } finally {
          setLoadingCollections(false);
        }
      }
    };

    fetchCollections();
  }, [status]);

  const handleExport = async () => {
    if (!selectedCollectionId) {
      toast.error("Veuillez sélectionner une collection");
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch(
        `/api/collections/${selectedCollectionId}/export`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de l'export");
      }

      // Créer un blob à partir de la réponse avec le type MIME correct
      const blob = await response.blob();
      const csvBlob = new Blob([blob], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(csvBlob);
      const a = document.createElement("a");
      a.href = url;

      // Récupérer le nom du fichier depuis les headers ou utiliser un nom par défaut
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `collection-${selectedCollectionId}-${Date.now()}.csv`;
      if (contentDisposition) {
        // Essayer d'abord le format RFC 5987 (filename*=UTF-8'')
        const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
        if (filenameStarMatch) {
          filename = decodeURIComponent(filenameStarMatch[1]);
        } else {
          // Sinon utiliser le format standard
          const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
      }
      
      // S'assurer que le nom de fichier se termine par .csv
      if (!filename.toLowerCase().endsWith(".csv")) {
        filename += ".csv";
      }
      
      a.download = filename;
      a.style.display = "none";

      document.body.appendChild(a);
      a.click();
      
      // Nettoyer après un court délai pour s'assurer que le téléchargement démarre
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

      toast.success("Export réussi ! Le fichier CSV a été téléchargé.");
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de l'export",
      );
    } finally {
      setIsExporting(false);
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
                    <Link href="/actions">Actions</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Export données</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="mb-2">
            <h1 className="text-2xl font-bold">Exporter des données</h1>
            <p className="text-muted-foreground">
              Exportez tous les leads d&apos;une collection au format CSV.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Export CSV</CardTitle>
              <CardDescription>
                Sélectionnez une collection pour exporter tous ses leads au
                format CSV.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sélection de la collection */}
              <div className="space-y-2">
                <Label htmlFor="collection">Collection *</Label>
                <Select
                  value={selectedCollectionId}
                  onValueChange={setSelectedCollectionId}
                  disabled={isExporting || collections.length === 0}
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
                      href="/leads/collections"
                      className="text-primary hover:underline"
                    >
                      Créez une collection
                    </Link>{" "}
                    avant d&apos;exporter des leads.
                  </p>
                )}
              </div>

              {/* Bouton d'export */}
              <Button
                onClick={handleExport}
                disabled={
                  isExporting || !selectedCollectionId || collections.length === 0
                }
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Export en cours...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Exporter en CSV
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Informations sur l'export */}
          <Card>
            <CardHeader>
              <CardTitle>Informations sur l&apos;export</CardTitle>
              <CardDescription>
                Le fichier CSV contiendra tous les champs disponibles pour
                chaque lead.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <p className="font-semibold">Champs inclus dans l&apos;export :</p>
                <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                  <li>
                    Informations personnelles : nom complet, prénom, nom,
                    position, LinkedIn, seniorité, fonction
                  </li>
                  <li>
                    Contact : email, email personnel, numéros de téléphone,
                    ville, état, pays
                  </li>
                  <li>
                    Informations entreprise : nom, site web, LinkedIn, industrie,
                    taille, localisation
                  </li>
                  <li>
                    Contenu marketing : posts LinkedIn, icebreaker, statut,
                    validation, raison
                  </li>
                  <li>Métadonnées : collection, dates de création et mise à jour</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-4">
                  Le fichier CSV peut être ouvert dans Excel, Google Sheets ou
                  tout autre tableur.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
