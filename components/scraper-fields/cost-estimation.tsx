"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Gift } from "lucide-react";

interface PricingTier {
  name: string;
  costPerThousand: number;
  costPerLead: number;
}

interface CostEstimationProps {
  paymentType: string | null;
  costPerThousand: number | null;
  costPerLead: number | null;
  actorStartCost: number | null;
  freeQuotaMonthly: number | null;
  pricingTiers: PricingTier[] | null;
  quantity: number;
  selectedTierName?: string;
}

function formatCost(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) {
    return `$${value.toFixed(4)}`;
  }
  if (value < 1) {
    return `$${value.toFixed(3)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatUnitCost(value: number): string {
  if (value === 0) return "$0";
  if (value < 0.001) {
    return `$${value.toFixed(5)}`;
  }
  if (value < 0.01) {
    return `$${value.toFixed(4)}`;
  }
  return `$${value.toFixed(3)}`;
}

function getPaymentTypeLabel(paymentType: string): string {
  switch (paymentType) {
    case "pay_per_event":
      return "résultat";
    case "pay_per_result":
      return "résultat";
    case "pay_per_posts":
      return "post";
    case "pay_per_reviews":
      return "avis";
    default:
      return "résultat";
  }
}

export function CostEstimation({
  paymentType,
  costPerThousand,
  costPerLead,
  actorStartCost,
  freeQuotaMonthly,
  pricingTiers,
  quantity,
  selectedTierName,
}: CostEstimationProps) {
  const estimation = useMemo(() => {
    // Free tier
    if (paymentType === "free_tier") {
      return {
        type: "free" as const,
        freeQuotaMonthly: freeQuotaMonthly || 0,
      };
    }

    // Determine effective cost per lead
    let effectiveCostPerLead: number | null = null;
    let effectiveCostPerThousand: number | null = null;
    let tierName: string | null = null;

    // If pricing tiers exist and a tier is selected, use that tier
    if (pricingTiers && pricingTiers.length > 0 && selectedTierName) {
      const matchedTier = pricingTiers.find(
        (tier) => tier.name === selectedTierName,
      );
      if (matchedTier) {
        effectiveCostPerLead = matchedTier.costPerLead;
        effectiveCostPerThousand = matchedTier.costPerThousand;
        tierName = matchedTier.name;
      }
    }

    // If no tier matched, try default pricingTiers (first one) if costPerLead is null
    if (
      effectiveCostPerLead === null &&
      pricingTiers &&
      pricingTiers.length > 0 &&
      !costPerLead
    ) {
      effectiveCostPerLead = pricingTiers[0].costPerLead;
      effectiveCostPerThousand = pricingTiers[0].costPerThousand;
      tierName = pricingTiers[0].name;
    }

    // Fallback to direct costPerLead
    if (effectiveCostPerLead === null) {
      effectiveCostPerLead = costPerLead;
      effectiveCostPerThousand = costPerThousand;
    }

    // No pricing data available
    if (effectiveCostPerLead === null || effectiveCostPerLead === 0) {
      return null;
    }

    const startCost = actorStartCost || 0;
    const totalCost = quantity * effectiveCostPerLead + startCost;

    return {
      type: "paid" as const,
      unitCost: effectiveCostPerLead,
      costPerThousand: effectiveCostPerThousand,
      startCost,
      totalCost,
      tierName,
      quantity,
    };
  }, [
    paymentType,
    costPerThousand,
    costPerLead,
    actorStartCost,
    freeQuotaMonthly,
    pricingTiers,
    quantity,
    selectedTierName,
  ]);

  // Don't render if no estimation possible
  if (!estimation) return null;

  const unitLabel = paymentType ? getPaymentTypeLabel(paymentType) : "résultat";

  if (estimation.type === "free") {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <CardContent className="flex items-center gap-3 py-3 px-4">
          <Gift className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Gratuit
            </p>
            {estimation.freeQuotaMonthly > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400">
                Quota mensuel : {estimation.freeQuotaMonthly.toLocaleString()}{" "}
                requêtes/mois
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Coût estimé
              </p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                ~{formatCost(estimation.totalCost)}
              </p>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {estimation.quantity.toLocaleString()} {unitLabel}
              {estimation.quantity > 1 ? "s" : ""} x{" "}
              {formatUnitCost(estimation.unitCost)}/{unitLabel}
              {estimation.startCost > 0 && (
                <> + {formatCost(estimation.startCost)} (démarrage)</>
              )}
            </p>
            {estimation.tierName && (
              <p className="text-xs text-blue-500 dark:text-blue-500">
                Tarif : {estimation.tierName}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
