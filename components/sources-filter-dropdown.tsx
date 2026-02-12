"use client";

import {
  Database,
  Building2,
  UserCircle,
  Gauge,
  Star,
  MailCheck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FILTERABLE_SOURCE_TYPES,
  SOURCE_TYPE_LABELS,
} from "@/lib/source-types";

const SOURCE_TYPE_ICONS: Record<string, { Icon: LucideIcon; className?: string }> = {
  "linkedin-company-posts": {
    Icon: Building2,
    className: "text-[#0A66C2]",
  },
  "linkedin-profile-posts": {
    Icon: UserCircle,
    className: "text-[#0A66C2]",
  },
  "pagespeed-seo": {
    Icon: Gauge,
    className: "text-amber-600",
  },
  "trustpilot-reviews": {
    Icon: Star,
    className: "text-[#00b67a]",
  },
  "email-verify": {
    Icon: MailCheck,
    className: "text-emerald-600",
  },
};

interface SourcesFilterDropdownProps {
  selectedSourceTypes: string[];
  onChange: (sourceTypes: string[]) => void;
}

export function SourcesFilterDropdown({
  selectedSourceTypes,
  onChange,
}: SourcesFilterDropdownProps) {
  const handleToggle = (mapperType: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedSourceTypes, mapperType]);
    } else {
      onChange(selectedSourceTypes.filter((t) => t !== mapperType));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 border border-border/80">
          <Database className="h-4 w-4" />
          Sources
          {selectedSourceTypes.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {selectedSourceTypes.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[240px] w-max">
        {FILTERABLE_SOURCE_TYPES.map((mapperType, index) => {
          const { Icon, className } = SOURCE_TYPE_ICONS[mapperType] ?? {};
          const isLast = index === FILTERABLE_SOURCE_TYPES.length - 1;
          return (
            <DropdownMenuCheckboxItem
              key={mapperType}
              checked={selectedSourceTypes.includes(mapperType)}
              onCheckedChange={(checked) =>
                handleToggle(mapperType, checked === true)
              }
              className={`gap-2 whitespace-nowrap ${!isLast ? "border-b border-border/30" : ""}`}
            >
              {Icon && (
                <Icon
                  className={`h-4 w-4 shrink-0 ${className ?? "text-muted-foreground"}`}
                />
              )}
              {SOURCE_TYPE_LABELS[mapperType] ?? mapperType}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
