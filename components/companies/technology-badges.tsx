"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { parseTechnologies, type TechnologyItem } from "@/lib/technology-mapper";
import { Code2 } from "lucide-react";

interface TechnologyBadgesProps {
  technologies: string | null | undefined;
  /** Nombre max de badges à afficher avant "+N" */
  maxVisible?: number;
  /** Taille: sm | md */
  size?: "sm" | "md";
  className?: string;
}

const SIMPLE_ICONS_CDN = "https://cdn.simpleicons.org";

function TechBadge({
  item,
  size = "md",
}: {
  item: TechnologyItem;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const badgeClass = size === "sm" ? "text-xs gap-1 px-1.5 py-0" : "text-xs gap-1.5 px-2 py-0.5";

  const content = (
    <Badge
      variant="secondary"
      className={`${badgeClass} font-normal bg-muted/80 hover:bg-muted transition-colors border border-border/60`}
    >
      {item.iconSlug ? (
        <img
          src={`${SIMPLE_ICONS_CDN}/${item.iconSlug}`}
          alt=""
          className={`${sizeClass} rounded-sm object-contain`}
        />
      ) : (
        <Code2 className={`${sizeClass} text-muted-foreground`} />
      )}
      <span className="truncate max-w-[120px]">{item.name}</span>
    </Badge>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-medium">{item.name}</p>
          {item.iconSlug && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Technologie détectée
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TechnologyBadges({
  technologies,
  maxVisible = 6,
  size = "md",
  className = "",
}: TechnologyBadgesProps) {
  const items = parseTechnologies(technologies);
  if (items.length === 0) return null;

  const visible = items.slice(0, maxVisible);
  const remaining = items.length - maxVisible;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {visible.map((item, index) => (
        <TechBadge key={`${item.name}-${index}`} item={item} size={size} />
      ))}
      {remaining > 0 && (
        <Badge
          variant="outline"
          className={
            size === "sm"
              ? "text-xs px-1.5 py-0 font-normal"
              : "text-xs px-2 py-0.5 font-normal"
          }
        >
          +{remaining}
        </Badge>
      )}
    </div>
  );
}
