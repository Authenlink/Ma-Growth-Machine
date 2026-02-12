"use client";

import { useState } from "react";
import { Copy, Trash2, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DuplicatesData {
  byEmail: {
    groupsCount: number;
    totalDuplicates: number;
    groups: { email: string; leadIds: number[]; count: number }[];
  };
  byCompany: {
    groupsCount: number;
    totalDuplicates: number;
    groups: {
      companyId: number;
      companyName: string;
      leadIds: number[];
      count: number;
    }[];
  };
  totalLeads: number;
}

interface DuplicatesCardProps {
  collectionId: number;
  onCleaned?: () => void;
}

export function DuplicatesCard({ collectionId, onCleaned }: DuplicatesCardProps) {
  const [data, setData] = useState<DuplicatesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [strategyToClean, setStrategyToClean] = useState<
    "byEmail" | "byCompany" | null
  >(null);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}/duplicates`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de l'analyse");
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleCleanClick = (strategy: "byEmail" | "byCompany") => {
    setStrategyToClean(strategy);
    setConfirmOpen(true);
  };

  const confirmClean = async () => {
    if (!strategyToClean) return;
    setCleaning(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}/clean-duplicates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: strategyToClean }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Erreur lors du nettoyage");
      }
      toast.success(json.message ?? "Doublons nettoyés");
      setData(null);
      setConfirmOpen(false);
      setStrategyToClean(null);
      onCleaned?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setCleaning(false);
    }
  };

  const hasDuplicates =
    data &&
    (data.byEmail.totalDuplicates > 0 || data.byCompany.totalDuplicates > 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Doublons
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!data ? (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Vérifiez si des leads ont le même email ou appartiennent à la
                même entreprise dans cette collection. Vous pourrez ensuite
                nettoyer pour ne garder qu&apos;un lead par critère.
              </p>
              <Button
                variant="outline"
                onClick={fetchDuplicates}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Vérifier les doublons
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Doublons par email
                  </p>
                  <p className="text-2xl font-bold">
                    {data.byEmail.totalDuplicates}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.byEmail.groupsCount} groupe(s) avec le même email
                  </p>
                  {data.byEmail.totalDuplicates > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-1"
                      onClick={() => handleCleanClick("byEmail")}
                    >
                      <Trash2 className="h-3 w-3" />
                      Nettoyer
                    </Button>
                  )}
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Doublons par entreprise
                  </p>
                  <p className="text-2xl font-bold">
                    {data.byCompany.totalDuplicates}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.byCompany.groupsCount} entreprise(s) avec plusieurs
                    leads
                  </p>
                  {data.byCompany.totalDuplicates > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-1"
                      onClick={() => handleCleanClick("byCompany")}
                    >
                      <Trash2 className="h-3 w-3" />
                      Nettoyer
                    </Button>
                  )}
                </div>
              </div>

              {!hasDuplicates ? (
                <p className="text-sm text-muted-foreground">
                  Aucun doublon détecté dans cette collection.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Le nettoyage retire les doublons de la collection (un lead est
                  gardé par email/entreprise selon le critère choisi). Les leads
                  supprimés restent dans votre base mais ne sont plus dans cette
                  collection.
                </p>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDuplicates}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Actualiser l&apos;analyse
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le nettoyage</AlertDialogTitle>
            <AlertDialogDescription>
              {strategyToClean === "byCompany"
                ? "Vous allez retirer de cette collection les leads en doublon par entreprise. Un seul lead sera conservé par entreprise (priorité : avec email, puis validé, puis le plus récent). Les leads retirés resteront dans votre base mais ne seront plus dans cette collection."
                : "Vous allez retirer de cette collection les leads en doublon par email. Un seul lead sera conservé par email (priorité : validé, puis le plus récent). Les leads retirés resteront dans votre base mais ne seront plus dans cette collection."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cleaning}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmClean();
              }}
              disabled={cleaning}
              className="gap-2"
            >
              {cleaning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {cleaning ? "Nettoyage..." : "Nettoyer les doublons"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
