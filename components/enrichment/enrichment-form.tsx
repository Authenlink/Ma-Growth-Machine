"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, AlertCircle } from "lucide-react";
import { CostEstimation } from "@/components/scraper-fields/cost-estimation";

interface PricingTier {
  name: string;
  costPerThousand: number;
  costPerLead: number;
}

interface EnrichmentFormProps {
  scraperId: number;
  scraperName: string;
  maxPosts?: number;
  postedDateLimit?: string;
  forceEnrichment?: boolean;
  onSubmit: (data: {
    scraperId: number;
    maxPosts: number;
    postedDateLimit?: string;
    forceEnrichment: boolean;
  }) => Promise<void>;
  isSubmitting?: boolean;
  disabled?: boolean;
  warningMessage?: string;
  // Pricing props
  paymentType?: string | null;
  costPerThousand?: number | null;
  costPerLead?: number | null;
  actorStartCost?: number | null;
  freeQuotaMonthly?: number | null;
  pricingTiers?: PricingTier[] | null;
}

export function EnrichmentForm({
  scraperId,
  scraperName,
  maxPosts: initialMaxPosts = 10,
  postedDateLimit: initialPostedDateLimit,
  forceEnrichment: initialForceEnrichment = false,
  onSubmit,
  isSubmitting = false,
  disabled = false,
  warningMessage,
  paymentType,
  costPerThousand,
  costPerLead,
  actorStartCost,
  freeQuotaMonthly,
  pricingTiers,
}: EnrichmentFormProps) {
  const [maxPosts, setMaxPosts] = useState(initialMaxPosts);
  const [postedDateLimit, setPostedDateLimit] = useState(
    initialPostedDateLimit || "",
  );
  const [forceEnrichment, setForceEnrichment] = useState(
    initialForceEnrichment,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      scraperId,
      maxPosts,
      postedDateLimit: postedDateLimit || undefined,
      forceEnrichment,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{scraperName}</CardTitle>
        <CardDescription>
          Configurez les paramètres d&apos;enrichissement pour ce scraper
        </CardDescription>
      </CardHeader>
      <CardContent>
        {warningMessage && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
            <AlertCircle className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {warningMessage}
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxPosts">Nombre maximum de posts</Label>
            <Input
              id="maxPosts"
              type="number"
              min={1}
              max={1000}
              value={maxPosts}
              onChange={(e) => setMaxPosts(parseInt(e.target.value) || 1)}
              required
              disabled={disabled}
            />
            <p className="text-sm text-muted-foreground">
              Nombre maximum de posts à récupérer (1-1000)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postedDateLimit">Date limite (optionnel)</Label>
            <Input
              id="postedDateLimit"
              type="date"
              value={postedDateLimit}
              onChange={(e) => setPostedDateLimit(e.target.value)}
              disabled={disabled}
            />
            <p className="text-sm text-muted-foreground">
              Ne récupérer que les posts après cette date
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="forceEnrichment"
              checked={forceEnrichment}
              onCheckedChange={setForceEnrichment}
              disabled={disabled}
            />
            <Label htmlFor="forceEnrichment" className="cursor-pointer">
              Forcer l&apos;enrichissement
            </Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Ré-enrichir même si déjà enrichi
          </p>

          {(paymentType === "free_tier" ||
            costPerThousand ||
            (pricingTiers && pricingTiers.length > 0)) && (
            <CostEstimation
              paymentType={paymentType ?? null}
              costPerThousand={costPerThousand ?? null}
              costPerLead={costPerLead ?? null}
              actorStartCost={actorStartCost ?? null}
              freeQuotaMonthly={freeQuotaMonthly ?? null}
              pricingTiers={pricingTiers ?? null}
              quantity={maxPosts}
            />
          )}

          <Button
            type="submit"
            disabled={isSubmitting || disabled}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enrichissement en cours...
              </>
            ) : (
              "Lancer l'enrichissement"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
