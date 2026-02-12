import { Field, FieldLabel } from "@/components/ui/field";

interface Collection {
  id: number;
  name: string;
  description: string | null;
  folderName?: string | null;
  isDefault?: boolean;
}

interface CollectionFieldProps {
  id: string;
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  collections: Collection[];
  required?: boolean;
  helpText?: string;
  disabled?: boolean;
}

export function CollectionField({
  id,
  label,
  value,
  onChange,
  collections,
  required,
  helpText,
  disabled,
}: CollectionFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </FieldLabel>
      <select
        id={id}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        value={value}
        onChange={(e) =>
          onChange(e.target.value ? Number(e.target.value) : "")
        }
        required={required}
        disabled={disabled}
      >
        <option value="">Sélectionner une collection</option>
        {collections.map((collection) => (
          <option key={collection.id} value={collection.id}>
            {collection.folderName
              ? `${collection.name} (${collection.folderName})${collection.isDefault ? " — par défaut" : ""}`
              : `${collection.name}${collection.isDefault ? " — par défaut" : ""}`}
          </option>
        ))}
      </select>
      {helpText && (
        <p className="text-xs text-muted-foreground mt-1">{helpText}</p>
      )}
    </Field>
  );
}
