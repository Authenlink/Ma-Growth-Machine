# Etape 10 - Skeletons et Loading States

Les skeletons sont des placeholders animes qui s'affichent pendant le chargement des donnees. L'approche utilisee est le **loading inline** (pas de fichier `loading.tsx`) : chaque page gere ses propres etats de chargement.

---

## 1. Composant Skeleton de base

Le composant `skeleton` a ete installe a l'etape 1. Il se trouve dans `components/ui/skeleton.tsx` :

```typescript
// components/ui/skeleton.tsx
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
```

C'est une simple `div` avec l'animation `animate-pulse` de Tailwind et un fond `bg-accent`.

---

## 2. Skeleton de la Sidebar

Le skeleton de la sidebar est integre directement dans `components/app-sidebar.tsx` (cree a l'etape 7). Il s'affiche pendant que la session NextAuth est en cours de chargement :

```typescript
// Extrait de app-sidebar.tsx
if (status === "loading") {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="space-y-2 p-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 p-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
```

Cela reproduit la structure visuelle de la sidebar :
- Header : icone + 2 lignes de texte
- Content : 5 lignes de menu
- Footer : avatar rond + nom + email

---

## 3. Skeleton de la page Dashboard

Le skeleton de page s'affiche quand `status === "loading"` dans la page. Il reproduit la structure visuelle de la page finale :

```typescript
// Extrait de app/dashboard/page.tsx
if (status === "loading") {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header skeleton */}
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-4 w-32" />
          </div>
        </header>

        {/* Contenu skeleton */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Titre */}
          <div className="mb-2">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>

          {/* Cards skeleton (grille de 3) */}
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <Skeleton className="aspect-video rounded-xl" />
            <Skeleton className="aspect-video rounded-xl" />
            <Skeleton className="aspect-video rounded-xl" />
          </div>

          {/* Contenu principal skeleton */}
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

---

## 4. Pattern general pour les loading states

Voici le pattern a suivre pour chaque page :

```typescript
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";

export default function MaPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/mon-endpoint");
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  // 1. Skeleton pendant le chargement de la session
  if (status === "loading") {
    return (
      // ... skeleton complet de la page
    );
  }

  // 2. Contenu avec skeletons inline pour les donnees
  return (
    <div>
      <h1>Ma Page</h1>

      {/* Skeleton inline pour un element specifique */}
      <div className="text-2xl font-bold">
        {loading ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          data?.count || 0
        )}
      </div>

      {/* Skeleton inline pour une liste */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <ul>
          {data?.items.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 5. Bonnes pratiques

- **Reproduire la structure visuelle** : le skeleton doit ressembler au contenu final (memes dimensions, meme disposition)
- **Utiliser `aspect-video`** pour les cards : `<Skeleton className="aspect-video rounded-xl" />`
- **Utiliser des largeurs fixes** pour le texte : `<Skeleton className="h-4 w-32" />`
- **Grouper les skeletons** dans les memes conteneurs que le contenu final (grid, flex, etc.)
- **Inclure la sidebar** dans le skeleton de page complete pour eviter un saut de layout
- **Pas de `loading.tsx`** : gerer le loading inline dans chaque page pour un controle plus fin

---

## Prochaine etape

-> [11 - Page Profil Utilisateur](./11-PAGE-PROFIL-UTILISATEUR.md)
