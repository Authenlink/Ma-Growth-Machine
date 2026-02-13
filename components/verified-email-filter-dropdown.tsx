"use client";

import { ShieldCheck, ShieldX, Shield, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type VerifiedEmailFilter = "verified" | "unverified" | "all";

const VERIFIED_EMAIL_OPTIONS = {
  all: { label: "Tous", Icon: Shield, className: "text-muted-foreground" },
  verified: { label: "Vérifié", Icon: ShieldCheck, className: "text-emerald-600" },
  unverified: { label: "Non vérifié", Icon: ShieldX, className: "text-red-500" },
} as const;

interface VerifiedEmailFilterDropdownProps {
  selectedFilter: VerifiedEmailFilter | undefined;
  onChange: (filter: VerifiedEmailFilter | undefined) => void;
}

export function VerifiedEmailFilterDropdown({
  selectedFilter,
  onChange,
}: VerifiedEmailFilterDropdownProps) {
  const handleValueChange = (value: string) => {
    onChange(value === "all" ? undefined : value as VerifiedEmailFilter);
  };

  const currentFilter = selectedFilter ?? "all";
  const { label, Icon, className } = VERIFIED_EMAIL_OPTIONS[currentFilter];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-2 border border-border/80 ${
            selectedFilter ? "bg-accent/50" : ""
          }`}
        >
          <Icon className={`h-4 w-4 ${className}`} />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px] w-max">
        <DropdownMenuRadioGroup
          value={currentFilter}
          onValueChange={handleValueChange}
        >
          {Object.entries(VERIFIED_EMAIL_OPTIONS).map(([value, { label, Icon, className }]) => (
            <DropdownMenuRadioItem key={value} value={value} className="gap-2">
              <Icon className={`h-4 w-4 shrink-0 ${className}`} />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}