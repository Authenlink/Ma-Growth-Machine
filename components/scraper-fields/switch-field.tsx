import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SwitchFieldProps {
  id: string;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  defaultValue?: boolean;
  helpText?: string;
  disabled?: boolean;
}

export function SwitchField({
  id,
  label,
  value,
  onChange,
  defaultValue,
  helpText,
  disabled,
}: SwitchFieldProps) {
  return (
    <Field>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor={id}>{label}</Label>
          {helpText && (
            <p className="text-xs text-muted-foreground">{helpText}</p>
          )}
        </div>
        <Switch
          id={id}
          checked={value}
          onCheckedChange={onChange}
          disabled={disabled}
        />
      </div>
    </Field>
  );
}
