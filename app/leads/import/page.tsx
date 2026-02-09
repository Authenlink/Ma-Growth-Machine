"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";
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
import { useScroll } from "@/hooks/use-scroll";

interface Collection {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ImportResult {
  success: boolean;
  created: number;
  skipped: number;
  errors: number;
  message?: string;
}

export default function ImportLeadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasScrolled = useScroll();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier que c'est un fichier CSV
      if (!file.name.toLowerCase().endsWith(".csv")) {
        toast.error("Veuillez sélectionner un fichier CSV (.csv)");
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Veuillez sélectionner un fichier CSV");
      return;
    }

    if (!selectedCollectionId) {
      toast.error("Veuillez sélectionner une collection");
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("collectionId", selectedCollectionId);

      const response = await fetch("/api/leads/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setImportResult(data);
        toast.success(data.message || "Import réussi");
        // Réinitialiser le fichier sélectionné
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast.error(data.error || "Erreur lors de l'import");
        setImportResult({
          success: false,
          created: 0,
          skipped: 0,
          errors: 0,
          message: data.error || "Erreur inconnue",
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'import:", error);
      toast.error("Erreur lors de l'import du fichier");
      setImportResult({
        success: false,
        created: 0,
        skipped: 0,
        errors: 0,
        message: "Erreur de connexion",
      });
    } finally {
      setIsImporting(false);
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
                  <BreadcrumbPage>Importer des leads</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="mb-2">
            <h1 className="text-2xl font-bold">Importer des leads</h1>
            <p className="text-muted-foreground">
              Importez des leads depuis un fichier CSV exporté depuis Google
              Sheets.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Import CSV</CardTitle>
              <CardDescription>
                Sélectionnez un fichier CSV et une collection pour importer vos
                leads.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sélection de la collection */}
              <div className="space-y-2">
                <Label htmlFor="collection">Collection *</Label>
                <Select
                  value={selectedCollectionId}
                  onValueChange={setSelectedCollectionId}
                  disabled={isImporting || collections.length === 0}
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
                      <SelectItem key={collection.id} value={collection.id.toString()}>
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
                    avant d&apos;importer des leads.
                  </p>
                )}
              </div>

              {/* Upload de fichier */}
              <div className="space-y-2">
                <Label htmlFor="file">Fichier CSV *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file"
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    disabled={isImporting}
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{selectedFile.name}</span>
                      <span className="text-xs">
                        ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Le fichier doit être au format CSV avec les colonnes
                  appropriées. Taille maximale : 10MB.
                </p>
              </div>

              {/* Bouton d'import */}
              <Button
                onClick={handleImport}
                disabled={
                  isImporting ||
                  !selectedFile ||
                  !selectedCollectionId ||
                  collections.length === 0
                }
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importer les leads
                  </>
                )}
              </Button>

              {/* Résultats de l'import */}
              {importResult && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {importResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <h3 className="font-semibold">
                      {importResult.success
                        ? "Import terminé"
                        : "Erreur lors de l'import"}
                    </h3>
                  </div>
                  {importResult.success && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Créés</p>
                        <p className="text-lg font-semibold text-green-600">
                          {importResult.created}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ignorés</p>
                        <p className="text-lg font-semibold text-yellow-600">
                          {importResult.skipped}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Erreurs</p>
                        <p className="text-lg font-semibold text-red-600">
                          {importResult.errors}
                        </p>
                      </div>
                    </div>
                  )}
                  {importResult.message && (
                    <p className="text-sm text-muted-foreground">
                      {importResult.message}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations sur le format CSV */}
          <Card>
            <CardHeader>
              <CardTitle>Format CSV attendu</CardTitle>
              <CardDescription>
                Le fichier CSV doit contenir les colonnes suivantes :
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <p className="font-semibold">Informations lead :</p>
                <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                  <li>
                    <code className="bg-muted px-1 rounded">fullName</code>,{" "}
                    <code className="bg-muted px-1 rounded">firstName</code>,{" "}
                    <code className="bg-muted px-1 rounded">lastName</code>
                  </li>
                  <li>
                    <code className="bg-muted px-1 rounded">position</code>,{" "}
                    <code className="bg-muted px-1 rounded">linkedinUrl</code>
                  </li>
                  <li>
                    <code className="bg-muted px-1 rounded">email</code>,{" "}
                    <code className="bg-muted px-1 rounded">personal_email</code>
                  </li>
                  <li>
                    <code className="bg-muted px-1 rounded">phone_numbers</code>,{" "}
                    <code className="bg-muted px-1 rounded">city</code>,{" "}
                    <code className="bg-muted px-1 rounded">state</code>,{" "}
                    <code className="bg-muted px-1 rounded">country</code>
                  </li>
                </ul>
                <p className="font-semibold mt-4">Informations entreprise :</p>
                <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                  <li>
                    <code className="bg-muted px-1 rounded">organizationName</code>,{" "}
                    <code className="bg-muted px-1 rounded">organizationWebsite</code>
                  </li>
                  <li>
                    <code className="bg-muted px-1 rounded">organizationLinkedinUrl</code>,{" "}
                    <code className="bg-muted px-1 rounded">organizationIndustry</code>
                  </li>
                  <li>
                    <code className="bg-muted px-1 rounded">organizationSize</code>,{" "}
                    <code className="bg-muted px-1 rounded">organizationDescription</code>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground mt-4">
                  Note : Toutes les colonnes ne sont pas obligatoires. Les leads
                  seront créés avec les informations disponibles.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
