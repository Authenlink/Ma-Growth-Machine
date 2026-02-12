"use client";

import {
  Gauge,
  LayoutList,
  TrendingDown,
  Minus,
  TrendingUp,
  Award,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FILTERABLE_SCORE_CATEGORIES,
  SCORE_CATEGORY_LABELS,
  type ScoreCategory,
} from "@/lib/score-types";

const SCORE_CATEGORY_ICONS: Record<ScoreCategory, { Icon: LucideIcon; className?: string }> = {
  "1-3": { Icon: TrendingDown, className: "text-amber-600" },
  "4-6": { Icon: Minus, className: "text-muted-foreground" },
  "7-8": { Icon: TrendingUp, className: "text-emerald-600" },
  "9-10": { Icon: Award, className: "text-amber-500" },
};

interface ScoreFilterDropdownProps {
  entityType: "lead" | "company";
  selectedCategory: string | undefined;
  onChange: (category: string | undefined) => void;
}

export function ScoreFilterDropdown({
  entityType,
  selectedCategory,
  onChange,
}: ScoreFilterDropdownProps) {
  const handleValueChange = (value: string) => {
    onChange(value === "all" ? undefined : value);
  };

  const displayLabel =
    selectedCategory && SCORE_CATEGORY_LABELS[selectedCategory as ScoreCategory]
      ? SCORE_CATEGORY_LABELS[selectedCategory as ScoreCategory]
      : "Note";

  const DisplayIcon = selectedCategory && SCORE_CATEGORY_ICONS[selectedCategory as ScoreCategory]
    ? SCORE_CATEGORY_ICONS[selectedCategory as ScoreCategory].Icon
    : Gauge;

  const displayIconClass = selectedCategory && SCORE_CATEGORY_ICONS[selectedCategory as ScoreCategory]
    ? SCORE_CATEGORY_ICONS[selectedCategory as ScoreCategory].className
    : "text-muted-foreground";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 border border-border/80">
          <DisplayIcon className={`h-4 w-4 ${displayIconClass}`} />
          {displayLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px] w-max">
        <DropdownMenuRadioGroup
          value={selectedCategory ?? "all"}
          onValueChange={handleValueChange}
        >
          <DropdownMenuRadioItem value="all" className="gap-2">
            <LayoutList className="h-4 w-4 shrink-0 text-muted-foreground" />
            Toutes
          </DropdownMenuRadioItem>
          {FILTERABLE_SCORE_CATEGORIES.map((category) => {
            const { Icon, className } = SCORE_CATEGORY_ICONS[category];
            return (
              <DropdownMenuRadioItem key={category} value={category} className="gap-2">
                <Icon className={`h-4 w-4 shrink-0 ${className ?? "text-muted-foreground"}`} />
                {SCORE_CATEGORY_LABELS[category]}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
