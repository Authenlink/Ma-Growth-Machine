"use client";

import { Field, FieldLabel } from "@/components/ui/field";

interface Folder {
  id: number;
  name: string;
  description: string | null;
  collections: Array<{ id: number; name: string; description: string | null }>;
}

interface FolderCollectionFieldProps {
  id: string;
  label: string;
  folderId: number | "";
  collectionId: number | "";
  onChange: (folderId: number | "", collectionId: number | "") => void;
  folders: Folder[];
  required?: boolean;
  helpText?: string;
  disabled?: boolean;
}

export function FolderCollectionField({
  id,
  label,
  folderId,
  collectionId,
  onChange,
  folders,
  required,
  helpText,
  disabled,
}: FolderCollectionFieldProps) {
  const selectedFolder = folders.find((f) => f.id === folderId);
  const collections = selectedFolder?.collections ?? [];

  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : "";
    onChange(val, ""); // Reset collection when folder changes
  };

  const handleCollectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : "";
    onChange(folderId, val);
  };

  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </FieldLabel>
      <div className="space-y-3">
        <select
          id={`${id}-folder`}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          value={folderId}
          onChange={handleFolderChange}
          required={required}
          disabled={disabled}
        >
          <option value="">Sélectionner un dossier</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
        <select
          id={id}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          value={collectionId}
          onChange={handleCollectionChange}
          required={required}
          disabled={disabled || !folderId}
        >
          <option value="">
            {folderId
              ? "Sélectionner une collection"
              : "Sélectionnez d'abord un dossier"}
          </option>
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name}
            </option>
          ))}
        </select>
      </div>
      {helpText && (
        <p className="text-xs text-muted-foreground mt-1">{helpText}</p>
      )}
    </Field>
  );
}
