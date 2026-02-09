import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
  isArray?: boolean; // Si true, permet d'ajouter plusieurs valeurs
  onAddItem?: (value: string) => void;
  items?: string[];
  onRemoveItem?: (value: string) => void;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  helpText,
  disabled,
  isArray,
  onAddItem,
  items,
  onRemoveItem,
}: TextFieldProps) {
  const handleAdd = () => {
    if (value.trim() && onAddItem) {
      onAddItem(value.trim());
      onChange("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isArray) {
      e.preventDefault();
      handleAdd();
    }
  };

  if (isArray) {
    return (
      <Field>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <div className="flex gap-2 mt-2">
          <Input
            id={id}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleAdd}
            disabled={disabled || !value.trim()}
          >
            Ajouter
          </Button>
        </div>
        {items && items.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {items.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
              >
                {item}
                {onRemoveItem && (
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item)}
                    disabled={disabled}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {helpText && (
          <p className="text-xs text-muted-foreground mt-1">{helpText}</p>
        )}
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      {helpText && (
        <p className="text-xs text-muted-foreground mt-1">{helpText}</p>
      )}
    </Field>
  );
}
