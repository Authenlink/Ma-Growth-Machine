"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ScraperFilterOption = {
  value: string;
  label: string;
  Icon?: LucideIcon;
  iconClassName?: string;
};

interface ScraperFilterDropdownProps {
  label: string;
  icon: LucideIcon;
  options: ScraperFilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

export function ScraperFilterDropdown({
  label,
  icon: Icon,
  options,
  selectedValues,
  onChange,
}: ScraperFilterDropdownProps) {
  const handleToggle = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, value]);
    } else {
      onChange(selectedValues.filter((v) => v !== value));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 border border-border/80">
          <Icon className="h-4 w-4" />
          {label}
          {selectedValues.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {selectedValues.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[240px] w-max">
        {options.map((opt, index) => {
          const isLast = index === options.length - 1;
          const OptionIcon = opt.Icon;
          return (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={selectedValues.includes(opt.value)}
              onCheckedChange={(checked) =>
                handleToggle(opt.value, checked === true)
              }
              className={`gap-2 whitespace-nowrap ${!isLast ? "border-b border-border/30" : ""}`}
            >
              {OptionIcon && (
                <OptionIcon
                  className={`h-4 w-4 shrink-0 ${opt.iconClassName ?? "text-muted-foreground"}`}
                />
              )}
              {opt.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
