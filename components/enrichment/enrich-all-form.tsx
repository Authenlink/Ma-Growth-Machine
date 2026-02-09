"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface EnrichAllFormProps {
  maxPosts?: number;
  postedDateLimit?: string;
  forceEnrichment?: boolean;
  onSubmit: (data: {
    maxPosts: number;
    postedDateLimit?: string;
    forceEnrichment: boolean;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export function EnrichAllForm({
  maxPosts: initialMaxPosts = 10,
  postedDateLimit: initialPostedDateLimit,
  forceEnrichment: initialForceEnrichment = false,
  onSubmit,
  isSubmitting = false,
}: EnrichAllFormProps) {
  const [maxPosts, setMaxPosts] = useState(initialMaxPosts);
  const [postedDateLimit, setPostedDateLimit] = useState(initialPostedDateLimit || "");
  const [forceEnrichment, setForceEnrichment] = useState(initialForceEnrichment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      maxPosts,
      postedDateLimit: postedDateLimit || undefined,
      forceEnrichment,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tout enrichir</CardTitle>
        <CardDescription>
          Lancez les deux scrapers en même temps avec les mêmes paramètres
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxPosts">
              Nombre maximum de posts
            </Label>
            <Input
              id="maxPosts"
              type="number"
              min={1}
              max={1000}
              value={maxPosts}
              onChange={(e) => setMaxPosts(parseInt(e.target.value) || 1)}
              required
            />
            <p className="text-sm text-muted-foreground">
              Nombre maximum de posts à récupérer (1-1000)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postedDateLimit">
              Date limite (optionnel)
            </Label>
            <Input
              id="postedDateLimit"
              type="date"
              value={postedDateLimit}
              onChange={(e) => setPostedDateLimit(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Ne récupérer que les posts après cette date
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="forceEnrichment"
              checked={forceEnrichment}
              onCheckedChange={setForceEnrichment}
            />
            <Label htmlFor="forceEnrichment" className="cursor-pointer">
              Forcer l'enrichissement
            </Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Ré-enrichir même si déjà enrichi
          </p>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enrichissement en cours...
              </>
            ) : (
              "Lancer les deux enrichissements"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
