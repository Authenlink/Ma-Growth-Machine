"use client";

import { Button } from "@/components/ui/button";
import { FolderOpen, Pencil, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  folderId: number | null;
  createdAt: Date;
  updatedAt: Date;
  leadCount?: number;
}

interface CollectionsTableViewProps {
  collections: Collection[];
  onDeleteClick?: (collection: Collection) => void;
}

export function CollectionsTableView({
  collections,
  onDeleteClick,
}: CollectionsTableViewProps) {
  const formatDate = (date: Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (collections.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune collection dans ce dossier
      </div>
    );
  }

  const headerCellClass =
    "h-10 px-4 py-2 text-left align-middle font-medium text-sm border-b border-border sticky top-0 bg-background z-[2]";
  const stickyHeaderClass = `${headerCellClass} sticky left-0 z-[3] min-w-[200px] border-r border-border`;
  const cellClass =
    "px-4 py-2 align-middle text-sm";
  const getStickyCellClass = () =>
    `${cellClass} sticky left-0 z-[1] min-w-[200px] border-r border-border bg-background`;

  return (
    <div className="w-full min-w-0 rounded-md border max-h-[calc(100vh-350px)] overflow-auto">
      <div className="min-w-max">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className={stickyHeaderClass}>Nom</th>
              <th className={headerCellClass}>Description</th>
              <th className={headerCellClass}>Leads</th>
              <th className={headerCellClass}>Date création</th>
              <th className={headerCellClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <tr
                key={collection.id}
                className="border-b border-border hover:bg-muted/50"
              >
                <td className={getStickyCellClass()}>
                  <Link
                    href={`/leads/collections/${collection.id}`}
                    className="font-medium hover:underline text-primary"
                  >
                    {collection.name}
                  </Link>
                </td>
                <td className={cellClass}>
                  <span className="text-sm line-clamp-2">
                    {collection.description || "—"}
                  </span>
                </td>
                <td className={cellClass}>
                  <span className="text-sm font-medium tabular-nums">
                    {collection.leadCount ?? 0}
                  </span>
                </td>
                <td className={cellClass}>
                  <span className="text-sm">
                    {formatDate(collection.createdAt)}
                  </span>
                </td>
                <td className={cellClass}>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={`/leads/collections/${collection.id}`}
                        className="gap-1"
                      >
                        <FolderOpen className="h-4 w-4" />
                        Voir
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={`/leads/scrape?collectionId=${collection.id}`}
                        className="gap-1"
                      >
                        <Sparkles className="h-4 w-4" />
                        Scraper
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={(e) => {
                        e.preventDefault();
                        toast.info("Édition à venir");
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {onDeleteClick && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground gap-1"
                        onClick={(e) => {
                          e.preventDefault();
                          onDeleteClick(collection);
                        }}
                        title="Supprimer cette collection"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
