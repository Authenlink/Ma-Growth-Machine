"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScraperForm } from "@/components/scraper-form";

interface Collection {
  id: number;
  name: string;
  description: string | null;
}

interface Scraper {
  id: number;
  name: string;
  description: string | null;
  provider: string;
  mapperType?: string;
  formConfig: {
    fields: Array<{
      id: string;
      type: "number" | "switch" | "multiselect" | "select" | "text" | "collection" | "company" | "leads";
      label: string;
      [key: string]: unknown;
    }>;
    sections: Array<{
      title: string;
      description?: string;
      fields: string[];
    }>;
  };
}

interface ScrapeEmployeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  companyName: string;
  companyLinkedinUrl: string | null;
  employeesScraped: boolean;
  employeesScrapedAt: Date | null;
  scraperId: number;
}

export function ScrapeEmployeesDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  companyLinkedinUrl,
  employeesScraped,
  employeesScrapedAt,
  scraperId,
}: ScrapeEmployeesDialogProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [scraper, setScraper] = useState<Scraper | null>(null);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [loadingScraper, setLoadingScraper] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Charger les collections et le scraper
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        // Charger les collections
        try {
          const response = await fetch("/api/collections");
          if (response.ok) {
            const data = await response.json();
            setCollections(data);
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des collections:", error);
        } finally {
          setLoadingCollections(false);
        }

        // Charger le scraper
        try {
          const response = await fetch(`/api/scrapers/${scraperId}`);
          if (response.ok) {
            const data = await response.json();
            setScraper(data);
          }
        } catch (error) {
          console.error("Erreur lors de la récupération du scraper:", error);
        } finally {
          setLoadingScraper(false);
        }
      };
      fetchData();
    }
  }, [open, scraperId]);

  // Calculer si le scraping a été fait récemment (moins d'un mois)
  const isRecentlyScraped = employeesScrapedAt
    ? new Date().getTime() - new Date(employeesScrapedAt).getTime() < 30 * 24 * 60 * 60 * 1000
    : false;

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSubmit = async (formData: Record<string, unknown>) => {
    if (!formData.collectionId || formData.collectionId === "") {
      toast.error("Veuillez sélectionner une collection");
      return;
    }

    if (!companyLinkedinUrl) {
      toast.error("Cette entreprise n'a pas d'URL LinkedIn");
      return;
    }

    setIsScraping(true);

    try {
      const response = await fetch("/api/scraping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scraperId,
          collectionId: formData.collectionId,
          companyLinkedinUrl: companyLinkedinUrl,
          // Exclure collectionId et companyId des paramètres de scraping
          ...Object.fromEntries(
            Object.entries(formData).filter(
              ([key]) => key !== "collectionId" && key !== "companyId"
            )
          ),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Scraping terminé : ${data.metrics.created} employés créés${data.metrics.enriched ? `, ${data.metrics.enriched} enrichis` : ""}`
        );
        onOpenChange(false);
        // Rafraîchir la page pour mettre à jour les informations de l'entreprise
        window.location.reload();
      } else {
        toast.error(data.error || "Erreur lors du scraping");
      }
    } catch (error) {
      console.error("Erreur lors du scraping:", error);
      toast.error("Erreur de connexion lors du scraping");
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scraper les employés de {companyName}</DialogTitle>
          <DialogDescription>
            Configurez les paramètres pour scraper les employés de cette entreprise LinkedIn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avertissement si déjà scrapé */}
          {employeesScraped && (
            <Card className={isRecentlyScraped ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950" : "border-blue-500 bg-blue-50 dark:bg-blue-950"}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className={`h-5 w-5 mt-0.5 ${isRecentlyScraped ? "text-yellow-600 dark:text-yellow-400" : "text-blue-600 dark:text-blue-400"}`} />
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-1 ${isRecentlyScraped ? "text-yellow-900 dark:text-yellow-100" : "text-blue-900 dark:text-blue-100"}`}>
                      {isRecentlyScraped ? "Scraping récent détecté" : "Scraping déjà effectué"}
                    </h4>
                    <p className={`text-sm ${isRecentlyScraped ? "text-yellow-800 dark:text-yellow-200" : "text-blue-800 dark:text-blue-200"}`}>
                      {isRecentlyScraped ? (
                        <>
                          Les employés de cette entreprise ont été scrapés récemment le{" "}
                          <strong>{formatDate(employeesScrapedAt)}</strong>. Vous pouvez tout de même
                          relancer le scraping pour mettre à jour les données.
                        </>
                      ) : (
                        <>
                          Les employés de cette entreprise ont déjà été scrapés le{" "}
                          <strong>{formatDate(employeesScrapedAt)}</strong>. Les nouveaux leads seront
                          enrichis s'ils existent déjà dans la collection sélectionnée.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulaire de scraping */}
          {loadingScraper || !scraper ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScraperForm
              formConfig={scraper.formConfig}
              collections={collections}
              onSubmit={handleSubmit}
              isSubmitting={isScraping}
              formRef={formRef}
              initialValues={{
                companyLinkedinUrl: companyLinkedinUrl || "",
              }}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isScraping}
          >
            Annuler
          </Button>
          <Button
            onClick={() => {
              if (formRef.current) {
                formRef.current.requestSubmit();
              }
            }}
            disabled={isScraping || loadingScraper || !scraper || loadingCollections}
          >
            {isScraping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scraping en cours...
              </>
            ) : (
              "Lancer le scraping"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
