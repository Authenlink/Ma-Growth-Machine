"use client";

import { Cloud, Database, Info, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScraperFilterDropdown } from "@/components/scrapers/scraper-filter-dropdown";
import type { ScraperFilterOption } from "@/components/scrapers/scraper-filter-dropdown";
import {
  getInfoTypeOption,
  getProviderOption,
  getSourceOption,
  getPaymentTypeOption,
} from "@/lib/scraper-filter-options";

export type ScrapersFiltersState = {
  provider?: string[];
  source?: string[];
  infoType?: string[];
  paymentType?: string[];
};

interface Scraper {
  id: number;
  provider: string;
  source?: string | null;
  infoType?: string | null;
  paymentType?: string | null;
}

interface ScrapersFiltersProps {
  filters: ScrapersFiltersState;
  onFiltersChange: (filters: ScrapersFiltersState) => void;
  scrapers: Scraper[];
  resultCount: number;
}

function deriveOptions(
  values: string[],
  getOption: (v: string) => ScraperFilterOption
): ScraperFilterOption[] {
  return values
    .filter(Boolean)
    .sort()
    .map((v) => getOption(v));
}

export function ScrapersFilters({
  filters,
  onFiltersChange,
  scrapers,
  resultCount,
}: ScrapersFiltersProps) {
  const providerValues = [...new Set(scrapers.map((s) => s.provider))];
  const sourceValues = [
    ...new Set(scrapers.map((s) => s.source).filter(Boolean) as string[]),
  ];
  const infoTypeValues = [
    ...new Set(scrapers.map((s) => s.infoType).filter(Boolean) as string[]),
  ];
  const paymentTypeValues = [
    ...new Set(scrapers.map((s) => s.paymentType).filter(Boolean) as string[]),
  ];

  const providerOptions = deriveOptions(providerValues, getProviderOption);
  const sourceOptions = deriveOptions(sourceValues, getSourceOption);
  const infoTypeOptions = deriveOptions(infoTypeValues, getInfoTypeOption);
  const paymentTypeOptions = deriveOptions(
    paymentTypeValues,
    getPaymentTypeOption
  );

  const hasActiveFilter =
    (filters.provider?.length ?? 0) > 0 ||
    (filters.source?.length ?? 0) > 0 ||
    (filters.infoType?.length ?? 0) > 0 ||
    (filters.paymentType?.length ?? 0) > 0;

  const handleProviderChange = (provider: string[]) => {
    onFiltersChange({ ...filters, provider: provider.length ? provider : undefined });
  };
  const handleSourceChange = (source: string[]) => {
    onFiltersChange({ ...filters, source: source.length ? source : undefined });
  };
  const handleInfoTypeChange = (infoType: string[]) => {
    onFiltersChange({ ...filters, infoType: infoType.length ? infoType : undefined });
  };
  const handlePaymentTypeChange = (paymentType: string[]) => {
    onFiltersChange({
      ...filters,
      paymentType: paymentType.length ? paymentType : undefined,
    });
  };

  const handleReset = () => {
    onFiltersChange({});
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ScraperFilterDropdown
          label="Provider"
          icon={Cloud}
          options={providerOptions}
          selectedValues={filters.provider ?? []}
          onChange={handleProviderChange}
        />
        <ScraperFilterDropdown
          label="Source"
          icon={Database}
          options={sourceOptions}
          selectedValues={filters.source ?? []}
          onChange={handleSourceChange}
        />
        <ScraperFilterDropdown
          label="Infos"
          icon={Info}
          options={infoTypeOptions}
          selectedValues={filters.infoType ?? []}
          onChange={handleInfoTypeChange}
        />
        <ScraperFilterDropdown
          label="Payment"
          icon={CreditCard}
          options={paymentTypeOptions}
          selectedValues={filters.paymentType ?? []}
          onChange={handlePaymentTypeChange}
        />
        {hasActiveFilter && (
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <X className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        {resultCount} scraper{resultCount !== 1 ? "s" : ""} trouvé
        {resultCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
