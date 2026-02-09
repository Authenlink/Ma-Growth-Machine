"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

interface Company {
  id: number;
  name: string;
  linkedinUrl: string | null;
}

interface CompanyFieldProps {
  id: string;
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  companies: Company[];
  required?: boolean;
  helpText?: string;
  disabled?: boolean;
}

export function CompanyField({
  id,
  label,
  value,
  onChange,
  companies,
  required = false,
  helpText,
  disabled = false,
}: CompanyFieldProps) {
  // Filtrer uniquement les entreprises avec linkedinUrl
  const companiesWithLinkedin = companies.filter((c) => c.linkedinUrl);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select
        value={value === "" ? undefined : value.toString()}
        onValueChange={(val) => onChange(val ? parseInt(val) : "")}
        disabled={disabled || companiesWithLinkedin.length === 0}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Choisir une entreprise" />
        </SelectTrigger>
        <SelectContent>
          {companiesWithLinkedin.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Aucune entreprise avec URL LinkedIn disponible
            </div>
          ) : (
            companiesWithLinkedin.map((company) => (
              <SelectItem key={company.id} value={company.id.toString()}>
                {company.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {companiesWithLinkedin.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>
            Aucune entreprise avec URL LinkedIn disponible. Vous pouvez saisir directement l'URL LinkedIn dans le champ ci-dessous.
          </span>
        </div>
      )}
      {helpText && (
        <p className="text-sm text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}
