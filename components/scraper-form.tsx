"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { NumberField } from "./scraper-fields/number-field";
import { SwitchField } from "./scraper-fields/switch-field";
import { SelectField } from "./scraper-fields/select-field";
import { TextField } from "./scraper-fields/text-field";
import { MultiselectField } from "./scraper-fields/multiselect-field";
import { CollectionField } from "./scraper-fields/collection-field";
import { FolderCollectionField } from "./scraper-fields/folder-collection-field";
import { CompanyField } from "./scraper-fields/company-field";
import { LeadsField } from "./scraper-fields/leads-field";
import { CostEstimation } from "./scraper-fields/cost-estimation";
import { getOptionsFromSource } from "@/lib/scrapers/constants";

interface Collection {
  id: number;
  name: string;
  description: string | null;
  folderId?: number | null;
}

interface Folder {
  id: number;
  name: string;
  description: string | null;
  collections: Collection[];
}

interface Company {
  id: number;
  name: string;
  linkedinUrl: string | null;
}

interface FormField {
  id: string;
  type:
    | "number"
    | "switch"
    | "multiselect"
    | "select"
    | "text"
    | "collection"
    | "company"
    | "leads"
    | "folder_collection";
  label: string;
  required?: boolean;
  min?: number;
  max?: number;
  defaultValue?: unknown;
  options?: string[];
  optionsSource?: string;
  optionLabels?: Record<string, string>;
  placeholder?: string;
  helpText?: string;
}

interface FormSection {
  title: string;
  description?: string;
  fields: string[];
}

interface FormConfig {
  fields: FormField[];
  sections: FormSection[];
}

interface PricingTier {
  name: string;
  costPerThousand: number;
  costPerLead: number;
}

interface ScraperFormProps {
  formConfig: FormConfig;
  collections: Collection[];
  folders?: Folder[];
  companies?: Company[];
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting?: boolean;
  formRef?: React.RefObject<HTMLFormElement | null>;
  initialValues?: Record<string, unknown>;
  // Pricing props
  paymentType?: string | null;
  costPerThousand?: number | null;
  costPerLead?: number | null;
  actorStartCost?: number | null;
  freeQuotaMonthly?: number | null;
  pricingTiers?: PricingTier[] | null;
}

export function ScraperForm({
  formConfig,
  collections,
  folders = [],
  companies = [],
  onSubmit,
  isSubmitting = false,
  formRef,
  initialValues = {},
  paymentType,
  costPerThousand,
  costPerLead,
  actorStartCost,
  freeQuotaMonthly,
  pricingTiers,
}: ScraperFormProps) {
  // Initialiser les valeurs par défaut
  const getDefaultValue = (field: FormField): unknown => {
    // Si une valeur initiale est fournie, l'utiliser
    if (initialValues[field.id] !== undefined) {
      return initialValues[field.id];
    }
    if (field.defaultValue !== undefined) {
      return field.defaultValue;
    }
    switch (field.type) {
      case "number":
        return field.min || 0;
      case "switch":
        return false;
      case "multiselect":
      case "leads":
        return [];
      case "text":
        if (field.id.includes("Includes") || field.id.includes("City")) {
          return [];
        }
        return "";
      case "select":
      case "collection":
      case "company":
      case "folder_collection":
        return "";
      default:
        return "";
    }
  };

  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    formConfig.fields.forEach((field) => {
      initial[field.id] = getDefaultValue(field);
    });
    return initial;
  });

  // Mettre à jour formData quand initialValues change
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      setFormData((prev) => ({ ...prev, ...initialValues }));
    }
  }, [initialValues]);

  // Gérer les changements de valeur pour les champs texte qui sont des arrays
  const handleTextArrayChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleAddTextArrayItem = (fieldId: string, value: string) => {
    setFormData((prev) => {
      const current = (prev[fieldId] as string[]) || [];
      if (!current.includes(value)) {
        return { ...prev, [fieldId]: [...current, value] };
      }
      return prev;
    });
  };

  const handleRemoveTextArrayItem = (fieldId: string, value: string) => {
    setFormData((prev) => {
      const current = (prev[fieldId] as string[]) || [];
      return { ...prev, [fieldId]: current.filter((item) => item !== value) };
    });
  };

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault();
    }

    // Préparer les données pour la soumission
    const submitData: Record<string, unknown> = { ...formData };

    // Nettoyer les champs input temporaires
    Object.keys(submitData).forEach((key) => {
      if (key.endsWith("_input")) {
        delete submitData[key];
      }
    });

    // Nettoyer les arrays vides pour les champs multiselect et text array
    formConfig.fields.forEach((field) => {
      if (field.type === "multiselect") {
        if (
          !submitData[field.id] ||
          (submitData[field.id] as string[]).length === 0
        ) {
          // Ne pas inclure les arrays vides pour les multiselect
          delete submitData[field.id];
        }
      } else if (
        field.type === "text" &&
        (field.id.includes("Includes") || field.id.includes("City"))
      ) {
        if (
          !submitData[field.id] ||
          (submitData[field.id] as string[]).length === 0
        ) {
          // Ne pas inclure les arrays vides
          delete submitData[field.id];
        }
      }
    });

    onSubmit(submitData);
  };

  const getFieldById = (id: string): FormField | undefined => {
    return formConfig.fields.find((f) => f.id === id);
  };

  const getFieldOptions = (field: FormField): string[] => {
    if (field.options) {
      return field.options;
    }
    if (field.optionsSource) {
      return getOptionsFromSource(field.optionsSource);
    }
    return [];
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id];

    switch (field.type) {
      case "number":
        return (
          <NumberField
            key={field.id}
            id={field.id}
            label={field.label}
            value={(value as number) || (field.defaultValue as number) || 0}
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, [field.id]: val }))
            }
            required={field.required}
            min={field.min}
            max={field.max}
            defaultValue={field.defaultValue as number}
            helpText={field.helpText}
            disabled={isSubmitting}
          />
        );

      case "switch":
        return (
          <SwitchField
            key={field.id}
            id={field.id}
            label={field.label}
            value={
              (value as boolean) ?? (field.defaultValue as boolean) ?? false
            }
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, [field.id]: val }))
            }
            defaultValue={field.defaultValue as boolean}
            helpText={field.helpText}
            disabled={isSubmitting}
          />
        );

      case "select":
        return (
          <SelectField
            key={field.id}
            id={field.id}
            label={field.label}
            value={(value as string) || (field.defaultValue as string) || ""}
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, [field.id]: val }))
            }
            options={getFieldOptions(field)}
            optionLabels={field.optionLabels}
            defaultValue={field.defaultValue as string}
            helpText={field.helpText}
            disabled={isSubmitting}
          />
        );

      case "multiselect":
        return (
          <MultiselectField
            key={field.id}
            id={field.id}
            label={field.label}
            value={(value as string[]) || []}
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, [field.id]: val }))
            }
            options={getFieldOptions(field)}
            helpText={field.helpText}
            disabled={isSubmitting}
          />
        );

      case "text":
        const isArrayField =
          field.id.includes("Includes") || field.id.includes("City");
        if (isArrayField) {
          const arrayValue = (value as string[]) || [];
          // Initialiser la valeur d'input si elle n'existe pas
          if (formData[`${field.id}_input`] === undefined) {
            setFormData((prev) => ({ ...prev, [`${field.id}_input`]: "" }));
          }
          const inputValue = (formData[`${field.id}_input`] as string) || "";
          return (
            <TextField
              key={field.id}
              id={field.id}
              label={field.label}
              value={inputValue}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, [`${field.id}_input`]: val }))
              }
              placeholder={field.placeholder}
              helpText={field.helpText}
              disabled={isSubmitting}
              isArray={true}
              onAddItem={(val) => {
                handleAddTextArrayItem(field.id, val);
                setFormData((prev) => ({ ...prev, [`${field.id}_input`]: "" }));
              }}
              items={arrayValue}
              onRemoveItem={(val) => handleRemoveTextArrayItem(field.id, val)}
            />
          );
        }
        return (
          <TextField
            key={field.id}
            id={field.id}
            label={field.label}
            value={(value as string) || ""}
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, [field.id]: val }))
            }
            placeholder={field.placeholder}
            helpText={field.helpText}
            disabled={isSubmitting}
          />
        );

      case "folder_collection":
        return (
          <FolderCollectionField
            key={field.id}
            id={field.id}
            label={field.label}
            folderId={(formData.folderId as number | "") || ""}
            collectionId={
              (formData.collectionId as number | "") ||
              (value as number | "") ||
              ""
            }
            onChange={(folderIdVal, collectionIdVal) =>
              setFormData((prev) => ({
                ...prev,
                folderId: folderIdVal,
                collectionId: collectionIdVal,
              }))
            }
            folders={folders}
            required={field.required}
            helpText={field.helpText}
            disabled={isSubmitting}
          />
        );

      case "collection":
        // Si folderId est défini, filtrer les collections par dossier
        const filterFolderId = formData.folderId as number | "";
        const filteredCollections =
          filterFolderId && typeof filterFolderId === "number"
            ? collections.filter((c) => c.folderId === filterFolderId)
            : collections;
        return (
          <CollectionField
            key={field.id}
            id={field.id}
            label={field.label}
            value={(value as number | "") || ""}
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, [field.id]: val }))
            }
            collections={filteredCollections}
            required={field.required}
            helpText={field.helpText}
            disabled={isSubmitting}
          />
        );

      case "company":
        return (
          <CompanyField
            key={field.id}
            id={field.id}
            label={field.label}
            value={(value as number | "") || ""}
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, [field.id]: val }))
            }
            companies={companies}
            required={field.required}
            helpText={field.helpText}
            disabled={isSubmitting}
          />
        );

      case "leads":
        // Récupérer l'ID de la collection depuis formData
        const collectionId = formData.collectionId as number | "";
        const leadsFilterMode = (field as FormField & { leadsFilterMode?: "no_email" | "has_company" }).leadsFilterMode;
        return (
          <LeadsField
            key={field.id}
            id={field.id}
            label={field.label}
            value={(value as number[]) || []}
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, [field.id]: val }))
            }
            collectionId={collectionId}
            required={field.required}
            helpText={field.helpText}
            disabled={isSubmitting}
            filterMode={leadsFilterMode}
          />
        );

      default:
        return null;
    }
  };

  // Detect the quantity field (first number field) for cost estimation
  const quantityField = formConfig.fields.find((f) => f.type === "number");
  const currentQuantity = quantityField
    ? (formData[quantityField.id] as number) ||
      (quantityField.defaultValue as number) ||
      0
    : 0;

  // Detect tier selector: if pricingTiers exist, find a select field whose options match tier names
  const selectedTierName = (() => {
    if (!pricingTiers || pricingTiers.length === 0) return undefined;
    const tierNames = pricingTiers.map((t) => t.name);
    const tierSelectField = formConfig.fields.find(
      (f) =>
        f.type === "select" &&
        f.options?.some((opt) => tierNames.includes(opt)),
    );
    if (tierSelectField) {
      return (
        (formData[tierSelectField.id] as string) ||
        (tierSelectField.defaultValue as string) ||
        undefined
      );
    }
    return undefined;
  })();

  // Check if we have any pricing data to show
  const hasPricingData =
    paymentType === "free_tier" ||
    (costPerThousand !== null && costPerThousand !== undefined) ||
    (pricingTiers && pricingTiers.length > 0);

  return (
    <form id="scraper-form" ref={formRef} onSubmit={handleSubmit}>
      <div className="space-y-4">
        {formConfig.sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              {section.description && (
                <CardDescription>{section.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <FieldGroup>
                {section.fields.map((fieldId) => {
                  const field = getFieldById(fieldId);
                  if (!field) return null;
                  return renderField(field);
                })}
              </FieldGroup>
            </CardContent>
          </Card>
        ))}

        {hasPricingData && (
          <CostEstimation
            paymentType={paymentType ?? null}
            costPerThousand={costPerThousand ?? null}
            costPerLead={costPerLead ?? null}
            actorStartCost={actorStartCost ?? null}
            freeQuotaMonthly={freeQuotaMonthly ?? null}
            pricingTiers={pricingTiers ?? null}
            quantity={currentQuantity}
            selectedTierName={selectedTierName}
          />
        )}
      </div>
    </form>
  );
}
