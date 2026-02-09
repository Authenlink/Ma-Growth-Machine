"use client";

import { Badge } from "@/components/ui/badge";

interface EnrichmentStatusBadgeProps {
  status: string | null;
  type: "company" | "person";
}

export function EnrichmentStatusBadge({
  status,
  type,
}: EnrichmentStatusBadgeProps) {
  if (status === null) {
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        Non enrichi
      </Badge>
    );
  }

  if (status === "enriched") {
    return (
      <Badge variant="success">
        Enrichi
      </Badge>
    );
  }

  if (status === "no-posts") {
    return (
      <Badge variant="warning">
        Aucun post
      </Badge>
    );
  }

  // Statut inconnu
  return (
    <Badge variant="outline">
      {status}
    </Badge>
  );
}
