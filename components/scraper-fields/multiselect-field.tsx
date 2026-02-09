"use client";

import { useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MultiselectFieldProps {
  id: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
  helpText?: string;
  disabled?: boolean;
  searchable?: boolean;
}

export function MultiselectField({
  id,
  label,
  value,
  onChange,
  options,
  helpText,
  disabled,
  searchable = true,
}: MultiselectFieldProps) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filteredOptions = searchable
    ? options.filter((option) =>
        option.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const displayLimit = showAll ? filteredOptions.length : 20;
  const optionsToShow = filteredOptions.slice(0, displayLimit);
  const hasMore = filteredOptions.length > displayLimit;

  const handleToggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {searchable && (
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
          className="mt-2"
        />
      )}
      {filteredOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-2">
          Aucun résultat trouvé
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mt-3">
            {optionsToShow.map((option) => (
              <Button
                key={option}
                type="button"
                variant={value.includes(option) ? "default" : "outline"}
                size="sm"
                onClick={() => handleToggle(option)}
                disabled={disabled}
              >
                {option}
              </Button>
            ))}
          </div>
          {hasMore && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              disabled={disabled}
              className="mt-2"
            >
              {showAll
                ? "Voir moins"
                : `Voir plus (${filteredOptions.length - displayLimit} autres)`}
            </Button>
          )}
        </>
      )}
      {value.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            {value.length} élément(s) sélectionné(s) :
          </p>
          <div className="flex flex-wrap gap-2">
            {value.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
              >
                {item}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== item))}
                  disabled={disabled}
                  className="hover:text-destructive"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
      {helpText && (
        <p className="text-xs text-muted-foreground mt-1">{helpText}</p>
      )}
    </Field>
  );
}
