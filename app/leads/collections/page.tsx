"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FolderOpen,
  Folder,
  Plus,
  Trash2,
  FolderPlus,
} from "lucide-react";
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
import { useScroll } from "@/hooks/use-scroll";
import { EmptyState } from "@/components/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CollectionsTableView } from "@/components/leads/collections-table-view";

interface Collection {
  id: number;
  name: string;
  description: string | null;
  folderId: number | null;
  createdAt: Date;
  updatedAt: Date;
  leadCount?: number;
}

interface FolderWithCollections {
  id: number;
  name: string;
  description: string | null;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  collections: Collection[];
}

export default function CollectionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasScrolled = useScroll();
  const [folders, setFolders] = useState<FolderWithCollections[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [deletingCollectionId, setDeletingCollectionId] = useState<number | null>(
    null
  );
  const [showDeleteCollectionDialog, setShowDeleteCollectionDialog] =
    useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchFolders = async () => {
      if (status === "authenticated") {
        try {
          const response = await fetch("/api/folders");
          if (response.ok) {
            const data = await response.json();
            setFolders(data);
            // Sélectionner le premier dossier par défaut au chargement initial
            setSelectedFolderId((prev) => (prev ?? data[0]?.id ?? null));
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération des dossiers:",
            error,
          );
        } finally {
          setLoadingFolders(false);
        }
      }
    };

    fetchFolders();
  }, [status]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      toast.error("Le nom du dossier est requis");
      return;
    }
    setIsCreatingFolder(true);
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          description: newFolderDescription.trim() || null,
        }),
      });
      if (response.ok) {
        const folder = await response.json();
        const newFolderWithCollections = { ...folder, collections: [] };
        setFolders((prev) => [...prev, newFolderWithCollections]);
        setSelectedFolderId(folder.id);
        setShowNewFolderDialog(false);
        setNewFolderName("");
        setNewFolderDescription("");
        toast.success("Dossier créé avec succès");
      } else {
        const data = await response.json();
        toast.error(data.error || "Erreur lors de la création");
      }
    } catch {
      toast.error("Erreur lors de la création du dossier");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteCollection = async (id: number) => {
    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Collection supprimée avec succès");
        setFolders((prev) =>
          prev.map((folder) => ({
            ...folder,
            collections: folder.collections.filter((c) => c.id !== id),
          })),
        );
        setShowDeleteCollectionDialog(false);
        setDeletingCollectionId(null);
      } else {
        const data = await response.json();
        toast.error(data.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  if (status === "loading" || loadingFolders) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex gap-2 px-4">
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
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
                  <BreadcrumbPage>Collections</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Collections</h1>
              <p className="text-muted-foreground">
                Organisez vos leads en dossiers et collections.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowNewFolderDialog(true)}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Nouveau dossier
              </Button>
              <Button asChild>
                <Link href="/leads/collections/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle collection
                </Link>
              </Button>
            </div>
          </div>

          {folders.length === 0 ? (
            <EmptyState
              title="Aucun dossier"
              description="Créez un dossier pour organiser vos collections et commencer à gérer vos leads."
              actionLabel="Créer un dossier"
              onAction={() => setShowNewFolderDialog(true)}
              icon={FolderOpen}
            />
          ) : (
            <div className="space-y-6">
              {/* Cartes des dossiers */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {folders.map((folder) => (
                  <Card
                    key={folder.id}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      selectedFolderId === folder.id
                        ? "ring-2 ring-primary border-primary"
                        : ""
                    }`}
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div>
                            <CardTitle className="text-lg">
                              {folder.name}
                            </CardTitle>
                            {folder.description && (
                              <CardDescription className="mt-0.5 line-clamp-2">
                                {folder.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground shrink-0">
                          {folder.collections.length} collection
                          {folder.collections.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              {/* Table des collections du dossier sélectionné */}
              {selectedFolderId && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    Collections
                    {(() => {
                      const folder = folders.find(
                        (f) => f.id === selectedFolderId
                      );
                      return folder ? ` — ${folder.name}` : "";
                    })()}
                  </h3>
                  <CollectionsTableView
                    collections={
                      folders.find((f) => f.id === selectedFolderId)
                        ?.collections ?? []
                    }
                    onDeleteClick={(collection) => {
                      setDeletingCollectionId(collection.id);
                      setShowDeleteCollectionDialog(true);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarInset>

      <Dialog
        open={showDeleteCollectionDialog}
        onOpenChange={setShowDeleteCollectionDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la collection ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Les leads resteront intacts mais
              seront retirés de cette collection.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteCollectionDialog(false);
                setDeletingCollectionId(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deletingCollectionId &&
                handleDeleteCollection(deletingCollectionId)
              }
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <form onSubmit={handleCreateFolder}>
            <DialogHeader>
              <DialogTitle>Nouveau dossier</DialogTitle>
              <DialogDescription>
                Créez un dossier pour organiser vos collections.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="folder-name">Nom</Label>
                <Input
                  id="folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Mon dossier"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="folder-description">Description (optionnel)</Label>
                <Input
                  id="folder-description"
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  placeholder="Description du dossier"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName("");
                  setNewFolderDescription("");
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isCreatingFolder}>
                {isCreatingFolder ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
