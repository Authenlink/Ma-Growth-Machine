"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { RefreshCw, Image as ImageIcon, Palette, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  generateRandomGradient,
  generateGradient,
  type Gradient,
} from "@/lib/gradient-generator";
import { cn } from "@/lib/utils";

export interface BackgroundSelectorProps {
  images?: string[];
  backgroundType: "image" | "gradient" | null;
  backgroundImageIndex?: number | null;
  backgroundGradient?: Gradient | null;
  onBackgroundTypeChange: (type: "image" | "gradient" | null) => void;
  onBackgroundImageIndexChange: (index: number | null) => void;
  onBackgroundGradientChange: (gradient: Gradient | null) => void;
  showPreview?: boolean;
}

export function BackgroundSelector({
  images = [],
  backgroundType,
  backgroundImageIndex,
  backgroundGradient,
  onBackgroundTypeChange,
  onBackgroundImageIndexChange,
  onBackgroundGradientChange,
  showPreview = true,
}: BackgroundSelectorProps) {
  const [currentGradient, setCurrentGradient] = useState<Gradient | null>(
    backgroundGradient || null
  );
  const [editingColor, setEditingColor] = useState<"color1" | "color2" | null>(null);
  const [colorInputValue, setColorInputValue] = useState("");

  // Générer un gradient initial si aucun n'existe
  useEffect(() => {
    if (backgroundType === "gradient" && !currentGradient) {
      const newGradient = generateRandomGradient();
      setCurrentGradient(newGradient);
      onBackgroundGradientChange(newGradient);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundType]);

  // Synchroniser le gradient avec les props
  useEffect(() => {
    if (backgroundGradient && backgroundGradient !== currentGradient) {
      setCurrentGradient(backgroundGradient);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundGradient]);

  const handleGradientRetry = () => {
    const newGradient = generateRandomGradient();
    setCurrentGradient(newGradient);
    onBackgroundGradientChange(newGradient);
    setEditingColor(null);
  };

  const handleColorChange = (color: string, colorKey: "color1" | "color2") => {
    if (!currentGradient) return;

    // Valider le format HEX
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(color)) return;

    // Extraire la direction du CSS actuel (format: linear-gradient(direction, color1, color2))
    const directionMatch = currentGradient.css.match(
      /linear-gradient\(([^,]+),/,
    );
    const direction = directionMatch?.[1]?.trim() || "to right";

    const newGradient = generateGradient(
      colorKey === "color1" ? color : currentGradient.color1,
      colorKey === "color2" ? color : currentGradient.color2,
      direction,
    );

    setCurrentGradient(newGradient);
    onBackgroundGradientChange(newGradient);
  };

  const handleColorInputChange = (
    value: string,
    colorKey: "color1" | "color2",
  ) => {
    setColorInputValue(value);
    // Normaliser la valeur : ajouter # si absent, convertir en majuscules
    let hexValue = value.trim();
    if (!hexValue.startsWith("#")) {
      hexValue = `#${hexValue}`;
    }
    // Valider le format avant d'appliquer
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexRegex.test(hexValue)) {
      handleColorChange(hexValue.toUpperCase(), colorKey);
    }
  };

  const startEditingColor = (colorKey: "color1" | "color2") => {
    setEditingColor(colorKey);
    setColorInputValue(currentGradient?.[colorKey] || "");
  };

  const stopEditingColor = () => {
    setEditingColor(null);
    setColorInputValue("");
  };

  const handleImageSelect = (index: number) => {
    onBackgroundImageIndexChange(index);
    onBackgroundTypeChange("image");
  };

  const handleGradientSelect = () => {
    if (!currentGradient) {
      const newGradient = generateRandomGradient();
      setCurrentGradient(newGradient);
      onBackgroundGradientChange(newGradient);
    }
    onBackgroundTypeChange("gradient");
  };


  return (
    <div className="space-y-6">
      {/* Radio buttons pour choisir le type */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Label className="text-sm font-medium">Type de background</Label>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant={backgroundType === "image" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (images.length > 0) {
                handleImageSelect(backgroundImageIndex ?? 0);
              }
            }}
            disabled={images.length === 0}
            className="flex-1 sm:flex-initial"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Image
            {images.length === 0 && (
              <span className="ml-2 text-xs opacity-70">(Aucune image)</span>
            )}
          </Button>
          <Button
            type="button"
            variant={backgroundType === "gradient" ? "default" : "outline"}
            size="sm"
            onClick={handleGradientSelect}
            className="flex-1 sm:flex-initial"
          >
            <Palette className="h-4 w-4 mr-2" />
            Gradient
          </Button>
        </div>
      </div>

      {/* Sélection d'image */}
      {backgroundType === "image" && images.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Sélectionner une image</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((image, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleImageSelect(index)}
                className={cn(
                  "relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                  backgroundImageIndex === index
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50",
                )}
              >
                <Image
                  src={image}
                  alt={`Image ${index + 1}`}
                  fill
                  className="object-cover"
                />
                {backgroundImageIndex === index && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Générateur de gradient */}
      {backgroundType === "gradient" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Label className="text-sm font-medium">Aperçu du gradient</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGradientRetry}
              className="gap-2 w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Nouveau gradient
            </Button>
          </div>
          {currentGradient && (
            <div
              className="w-full aspect-video rounded-lg border-2 border-muted-foreground/25 transition-all"
              style={{
                background: currentGradient.css,
              }}
            />
          )}
          {currentGradient && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-end">
                {/* Couleur 1 */}
                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Couleur 1
                  </Label>
                  <div className="flex gap-2 items-center">
                    <div className="relative">
                      <input
                        type="color"
                        value={currentGradient.color1}
                        onChange={(e) =>
                          handleColorChange(e.target.value, "color1")
                        }
                        className="w-12 h-12 rounded border-2 border-border cursor-pointer"
                        title="Cliquez pour changer la couleur"
                      />
                    </div>
                    {editingColor === "color1" ? (
                      <div className="flex-1 flex gap-1 items-center">
                        <Input
                          type="text"
                          value={colorInputValue}
                          onChange={(e) =>
                            handleColorInputChange(e.target.value, "color1")
                          }
                          placeholder="#000000"
                          className="h-10 text-sm font-mono"
                          onBlur={stopEditingColor}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              stopEditingColor();
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={stopEditingColor}
                          className="h-10 px-2"
                        >
                          ✓
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditingColor("color1")}
                        className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent transition-colors text-sm font-mono min-h-[40px]"
                      >
                        <span className="flex-1 text-left">
                          {currentGradient.color1}
                        </span>
                        <Edit2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-center sm:justify-start">
                  <span className="text-muted-foreground text-lg font-bold">→</span>
                </div>

                {/* Couleur 2 */}
                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Couleur 2
                  </Label>
                  <div className="flex gap-2 items-center">
                    <div className="relative">
                      <input
                        type="color"
                        value={currentGradient.color2}
                        onChange={(e) =>
                          handleColorChange(e.target.value, "color2")
                        }
                        className="w-12 h-12 rounded border-2 border-border cursor-pointer"
                        title="Cliquez pour changer la couleur"
                      />
                    </div>
                    {editingColor === "color2" ? (
                      <div className="flex-1 flex gap-1 items-center">
                        <Input
                          type="text"
                          value={colorInputValue}
                          onChange={(e) =>
                            handleColorInputChange(e.target.value, "color2")
                          }
                          placeholder="#000000"
                          className="h-10 text-sm font-mono"
                          onBlur={stopEditingColor}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              stopEditingColor();
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={stopEditingColor}
                          className="h-10 px-2"
                        >
                          ✓
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditingColor("color2")}
                        className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent transition-colors text-sm font-mono min-h-[40px]"
                      >
                        <span className="flex-1 text-left">
                          {currentGradient.color2}
                        </span>
                        <Edit2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
