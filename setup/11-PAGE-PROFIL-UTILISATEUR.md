# Etape 11 - Page Profil Utilisateur

La page profil permet a l'utilisateur de voir et modifier ses informations de base et de choisir un background (gradient ou image) pour son profil.

---

## 1. Generateur de gradients

Creer `lib/gradient-generator.ts` :

```typescript
// lib/gradient-generator.ts

export interface Gradient {
  color1: string;
  color2: string;
  css: string;
}

// Palette de couleurs vives predefinies
const VIBRANT_COLORS = [
  "#FF6B6B", // Rouge corail
  "#4ECDC4", // Turquoise
  "#45B7D1", // Bleu ciel
  "#FFA07A", // Saumon
  "#98D8C8", // Vert menthe
  "#F7DC6F", // Jaune dore
  "#BB8FCE", // Violet clair
  "#85C1E2", // Bleu clair
  "#F8B739", // Orange
  "#52BE80", // Vert emeraude
  "#EC7063", // Rose saumon
  "#5DADE2", // Bleu azur
  "#F39C12", // Orange vif
  "#58D68D", // Vert lime
  "#AF7AC5", // Violet
  "#76D7C4", // Cyan
  "#F1948A", // Rose
  "#85C1E9", // Bleu poudre
  "#F4D03F", // Jaune vif
  "#82E0AA", // Vert pomme
  "#D7BDE2", // Lavande
  "#AED6F1", // Bleu pastel
  "#F9E79F", // Jaune pale
  "#A9DFBF", // Vert pastel
  "#F5B7B1", // Rose peche
  "#A3E4D7", // Turquoise pastel
  "#FAD7A0", // Peche
  "#D5A6BD", // Mauve
];

// Directions de gradient possibles
const GRADIENT_DIRECTIONS = [
  "to right",
  "to bottom",
  "to bottom right",
  "to bottom left",
  "135deg",
  "45deg",
];

/**
 * Genere un gradient aleatoire avec deux couleurs vives
 */
export function generateRandomGradient(): Gradient {
  const color1Index = Math.floor(Math.random() * VIBRANT_COLORS.length);
  let color2Index = Math.floor(Math.random() * VIBRANT_COLORS.length);

  // S'assurer que les deux couleurs sont differentes
  while (color2Index === color1Index) {
    color2Index = Math.floor(Math.random() * VIBRANT_COLORS.length);
  }

  const color1 = VIBRANT_COLORS[color1Index];
  const color2 = VIBRANT_COLORS[color2Index];

  const direction =
    GRADIENT_DIRECTIONS[
      Math.floor(Math.random() * GRADIENT_DIRECTIONS.length)
    ];

  const css = `linear-gradient(${direction}, ${color1}, ${color2})`;

  return { color1, color2, css };
}

/**
 * Genere un gradient avec des couleurs specifiques
 */
export function generateGradient(
  color1: string,
  color2: string,
  direction: string = "to right"
): Gradient {
  const css = `linear-gradient(${direction}, ${color1}, ${color2})`;
  return { color1, color2, css };
}
```

---

## 2. Composant BackgroundSelector

Creer `components/background-selector.tsx` :

```typescript
// components/background-selector.tsx
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
}

export function BackgroundSelector({
  images = [],
  backgroundType,
  backgroundImageIndex,
  backgroundGradient,
  onBackgroundTypeChange,
  onBackgroundImageIndexChange,
  onBackgroundGradientChange,
}: BackgroundSelectorProps) {
  const [currentGradient, setCurrentGradient] = useState<Gradient | null>(
    backgroundGradient || null
  );
  const [editingColor, setEditingColor] = useState<"color1" | "color2" | null>(null);
  const [colorInputValue, setColorInputValue] = useState("");

  // Generer un gradient initial si aucun n'existe
  useEffect(() => {
    if (backgroundType === "gradient" && !currentGradient) {
      const newGradient = generateRandomGradient();
      setCurrentGradient(newGradient);
      onBackgroundGradientChange(newGradient);
    }
  }, [backgroundType]);

  // Synchroniser le gradient avec les props
  useEffect(() => {
    if (backgroundGradient && backgroundGradient !== currentGradient) {
      setCurrentGradient(backgroundGradient);
    }
  }, [backgroundGradient]);

  const handleGradientRetry = () => {
    const newGradient = generateRandomGradient();
    setCurrentGradient(newGradient);
    onBackgroundGradientChange(newGradient);
    setEditingColor(null);
  };

  const handleColorChange = (color: string, colorKey: "color1" | "color2") => {
    if (!currentGradient) return;

    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(color)) return;

    const directionMatch = currentGradient.css.match(
      /linear-gradient\(([^,]+),/
    );
    const direction = directionMatch?.[1]?.trim() || "to right";

    const newGradient = generateGradient(
      colorKey === "color1" ? color : currentGradient.color1,
      colorKey === "color2" ? color : currentGradient.color2,
      direction
    );

    setCurrentGradient(newGradient);
    onBackgroundGradientChange(newGradient);
  };

  const handleColorInputChange = (
    value: string,
    colorKey: "color1" | "color2"
  ) => {
    setColorInputValue(value);
    let hexValue = value.trim();
    if (!hexValue.startsWith("#")) {
      hexValue = `#${hexValue}`;
    }
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
      {/* Choix du type de background */}
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

      {/* Selection d'image */}
      {backgroundType === "image" && images.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Selectionner une image</Label>
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
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                )}
              >
                <Image
                  src={image}
                  alt={`Image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generateur de gradient */}
      {backgroundType === "gradient" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Label className="text-sm font-medium">Apercu du gradient</Label>
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

          {/* Apercu */}
          {currentGradient && (
            <div
              className="w-full aspect-video rounded-lg border-2 border-muted-foreground/25 transition-all"
              style={{ background: currentGradient.css }}
            />
          )}

          {/* Color pickers */}
          {currentGradient && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-end">
                {/* Couleur 1 */}
                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Couleur 1
                  </Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={currentGradient.color1}
                      onChange={(e) => handleColorChange(e.target.value, "color1")}
                      className="w-12 h-12 rounded border-2 border-border cursor-pointer"
                    />
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
                            if (e.key === "Enter") stopEditingColor();
                          }}
                          autoFocus
                        />
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
                        <Edit2 className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>

                <span className="text-muted-foreground text-lg font-bold text-center">
                  →
                </span>

                {/* Couleur 2 */}
                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Couleur 2
                  </Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={currentGradient.color2}
                      onChange={(e) => handleColorChange(e.target.value, "color2")}
                      className="w-12 h-12 rounded border-2 border-border cursor-pointer"
                    />
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
                            if (e.key === "Enter") stopEditingColor();
                          }}
                          autoFocus
                        />
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
                        <Edit2 className="h-3 w-3 text-muted-foreground" />
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
```

---

## 3. API Route Profil Utilisateur

Creer `app/api/user/profile/route.ts` :

```typescript
// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET : Recuperer le profil de l'utilisateur connecte
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(session.user.id)))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: "Utilisateur non trouve" },
        { status: 404 }
      );
    }

    const userData = user[0];

    return NextResponse.json({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      image: userData.image,
      bio: userData.bio,
      location: userData.location,
      website: userData.website,
      banner: userData.banner,
      backgroundType: userData.backgroundType,
      backgroundGradient: userData.backgroundGradient,
      createdAt: userData.createdAt,
    });
  } catch (error) {
    console.error("Erreur profil GET:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}

// PUT : Mettre a jour le profil
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      bio,
      location,
      website,
      banner,
      backgroundType,
      backgroundGradient,
    } = body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;
    if (banner !== undefined) updateData.banner = banner;
    if (backgroundType !== undefined) updateData.backgroundType = backgroundType;
    if (backgroundGradient !== undefined)
      updateData.backgroundGradient = backgroundGradient;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, parseInt(session.user.id)));

    return NextResponse.json({ message: "Profil mis a jour" });
  } catch (error) {
    console.error("Erreur profil PUT:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
```

---

## 4. Page Profil

Creer `app/profile/page.tsx` :

```typescript
// app/profile/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BackgroundSelector } from "@/components/background-selector";
import { useToast } from "@/hooks/use-toast";
import { useScroll } from "@/hooks/use-scroll";
import { Edit2, Save, X } from "lucide-react";
import type { Gradient } from "@/lib/gradient-generator";

interface UserProfile {
  id: number;
  name: string | null;
  email: string;
  image: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  banner: string | null;
  backgroundType: "image" | "gradient" | null;
  backgroundGradient: Gradient | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const hasScrolled = useScroll();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    location: "",
    website: "",
    banner: "",
    backgroundType: null as "image" | "gradient" | null,
    backgroundGradient: null as Gradient | null,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          setFormData({
            name: data.name || "",
            bio: data.bio || "",
            location: data.location || "",
            website: data.website || "",
            banner: data.banner || "",
            backgroundType: data.backgroundType,
            backgroundGradient: data.backgroundGradient,
          });
        }
      } catch (error) {
        console.error("Erreur chargement profil:", error);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setProfile((prev) => (prev ? { ...prev, ...formData } : null));
        setEditing(false);
        toast({
          title: "Profil mis a jour",
          description: "Vos informations ont ete enregistrees.",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur reseau.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        bio: profile.bio || "",
        location: profile.location || "",
        website: profile.website || "",
        banner: profile.banner || "",
        backgroundType: profile.backgroundType,
        backgroundGradient: profile.backgroundGradient,
      });
    }
    setEditing(false);
  };

  if (status === "loading" || loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-4 w-32" />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!session || !profile) return null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header
          className={`sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 ${
            hasScrolled ? "border-b" : ""
          }`}
        >
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Mon Profil</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 pt-6 max-w-4xl">
          {/* Banner / Background */}
          <div
            className="h-48 rounded-xl border overflow-hidden"
            style={
              formData.backgroundType === "gradient" && formData.backgroundGradient
                ? { background: formData.backgroundGradient.css }
                : formData.backgroundType === "image" && formData.banner
                ? {
                    backgroundImage: `url(${formData.banner})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : { background: "var(--muted)" }
            }
          >
            <div className="flex items-end h-full p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-4 border-background">
                  <AvatarImage src={profile.image || ""} />
                  <AvatarFallback
                    className="text-2xl text-white font-bold"
                    style={
                      formData.backgroundGradient
                        ? { background: formData.backgroundGradient.css }
                        : undefined
                    }
                  >
                    {(profile.name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-background/80 backdrop-blur rounded-lg px-4 py-2">
                  <h1 className="text-xl font-bold">{profile.name}</h1>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            )}
          </div>

          {/* Informations */}
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Vos informations de profil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                {editing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                ) : (
                  <p className="text-sm">{profile.name || "Non renseigne"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                {editing ? (
                  <Input
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    placeholder="Parlez de vous..."
                  />
                ) : (
                  <p className="text-sm">{profile.bio || "Non renseigne"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Localisation</Label>
                {editing ? (
                  <Input
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Paris, France"
                  />
                ) : (
                  <p className="text-sm">{profile.location || "Non renseigne"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Site web</Label>
                {editing ? (
                  <Input
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    placeholder="https://monsite.com"
                  />
                ) : (
                  <p className="text-sm">{profile.website || "Non renseigne"}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Background Selector (en mode edition uniquement) */}
          {editing && (
            <Card>
              <CardHeader>
                <CardTitle>Background du profil</CardTitle>
                <CardDescription>
                  Choisissez un gradient ou une image pour votre banniere
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BackgroundSelector
                  images={formData.banner ? [formData.banner] : []}
                  backgroundType={formData.backgroundType}
                  backgroundImageIndex={formData.banner ? 0 : null}
                  backgroundGradient={formData.backgroundGradient}
                  onBackgroundTypeChange={(type) =>
                    setFormData({ ...formData, backgroundType: type })
                  }
                  onBackgroundImageIndexChange={() => {}}
                  onBackgroundGradientChange={(gradient) =>
                    setFormData({ ...formData, backgroundGradient: gradient })
                  }
                />
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

---

## 5. Fonctionnalites de la page profil

- **Affichage** : banniere avec gradient ou image, avatar, nom, email
- **Mode edition** : toggle pour editer les champs (nom, bio, localisation, website)
- **Background selector** : apparait en mode edition, permet de choisir entre gradient et image
- **Gradient** : genere aleatoirement a l'inscription, modifiable avec color pickers
- **Avatar fallback** : affiche l'initiale du nom sur un fond gradient si pas de photo
- **Toast** : notification de succes/erreur apres sauvegarde
- **Skeleton** : affiche pendant le chargement du profil

---

## Prochaine etape

-> [12 - Checklist Finale](./12-CHECKLIST-FINALE.md)
