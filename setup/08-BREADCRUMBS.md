# Etape 8 - Breadcrumbs

Les breadcrumbs sont affiches dans le header sticky de chaque page, a cote du `SidebarTrigger`.

---

## 1. Composant Breadcrumb

Le composant `breadcrumb` a ete installe a l'etape 1 via shadcn. Il se trouve dans `components/ui/breadcrumb.tsx` et fournit les sous-composants suivants :

- `Breadcrumb` : conteneur `<nav>` principal
- `BreadcrumbList` : liste `<ol>` des items
- `BreadcrumbItem` : element `<li>` individuel
- `BreadcrumbLink` : lien cliquable (page parente)
- `BreadcrumbPage` : page actuelle (non cliquable)
- `BreadcrumbSeparator` : separateur `>` entre les items
- `BreadcrumbEllipsis` : indicateur `...` pour les longs chemins

---

## 2. Pattern d'utilisation dans le header

Voici comment integrer les breadcrumbs dans le header sticky d'une page avec sidebar :

```typescript
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

// Dans le JSX de la page :
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
          <BreadcrumbPage>Overview</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  </div>
</header>
```

---

## 3. Exemple complet : page Dashboard

Voici la page `app/dashboard/page.tsx` complete avec sidebar, header sticky, breadcrumbs :

```typescript
// app/dashboard/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
import { useScroll } from "@/hooks/use-scroll";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasScrolled = useScroll();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Skeleton de chargement (voir etape 10 pour plus de details)
  if (status === "loading") {
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
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="aspect-video rounded-xl" />
            </div>
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!session) {
    return null;
  }

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
                  <BreadcrumbPage>Overview</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="mb-2">
            <h1 className="text-2xl font-bold">
              Bienvenue, {session.user.name} !
            </h1>
            <p className="text-muted-foreground">
              Voici votre tableau de bord.
            </p>
          </div>

          {/* Contenu du dashboard - a personnaliser */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">Stat 1</h3>
              <p className="text-2xl font-bold mt-2">42</p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">Stat 2</h3>
              <p className="text-2xl font-bold mt-2">128</p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">Stat 3</h3>
              <p className="text-2xl font-bold mt-2">7</p>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

---

## 4. Breadcrumbs avec plusieurs niveaux

Pour les pages plus profondes, ajouter des items intermediaires :

```typescript
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem className="hidden md:block">
      <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator className="hidden md:block" />
    <BreadcrumbItem className="hidden md:block">
      <BreadcrumbLink href="/settings">Parametres</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator className="hidden md:block" />
    <BreadcrumbItem>
      <BreadcrumbPage>Profil</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

> **Note** : Les classes `hidden md:block` masquent les breadcrumbs intermediaires sur mobile, ne laissant visible que la page actuelle. C'est un pattern responsive classique.

---

## Prochaine etape

-> [09 - Toasts](./09-TOASTS.md)
