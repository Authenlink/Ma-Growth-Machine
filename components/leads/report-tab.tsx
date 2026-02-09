"use client";

import { BarChart3 } from "lucide-react";

export function ReportTab() {
  return (
    <div className="text-center py-12">
      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">Rapport en développement</h3>
      <p className="text-muted-foreground">
        Cette section contiendra bientôt des rapports et analyses détaillés.
      </p>
    </div>
  );
}