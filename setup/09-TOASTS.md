# Etape 9 - Toasts

Les toasts sont des notifications temporaires qui apparaissent en bas a droite de l'ecran. Le systeme utilise le composant `toast` de shadcn avec un hook custom `useToast`.

---

## 1. Composants installes

Les composants suivants ont ete installes a l'etape 1 via `npx shadcn@latest add toast` :

- `components/ui/toast.tsx` : composants de base (Toast, ToastTitle, ToastDescription, ToastClose, ToastAction, ToastViewport)
- `components/ui/toaster.tsx` : composant qui rend les toasts actifs
- `hooks/use-toast.ts` : hook de gestion d'etat des toasts

---

## 2. Integration dans le Root Layout

Le composant `<Toaster />` est deja integre dans `app/layout.tsx` (fait a l'etape 6) :

```typescript
// app/layout.tsx (extrait)
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider ...>
          <Providers>{children}</Providers>
          <Toaster />   {/* <-- Place ici, disponible sur toutes les pages */}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## 3. Utilisation dans les composants

### Import

```typescript
import { useToast } from "@/hooks/use-toast";
```

### Toast de succes

```typescript
const { toast } = useToast();

toast({
  title: "Succes",
  description: "Vos modifications ont ete enregistrees.",
});
```

### Toast d'erreur (destructive)

```typescript
const { toast } = useToast();

toast({
  title: "Erreur",
  description: "Une erreur s'est produite. Veuillez reessayer.",
  variant: "destructive",
});
```

### Toast avec action

```typescript
const { toast } = useToast();

toast({
  title: "Element supprime",
  description: "L'element a ete supprime avec succes.",
  action: (
    <ToastAction altText="Annuler" onClick={() => handleUndo()}>
      Annuler
    </ToastAction>
  ),
});
```

---

## 4. Exemple concret dans une page

```typescript
"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function ExemplePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nouveau nom" }),
      });

      if (response.ok) {
        toast({
          title: "Profil mis a jour",
          description: "Vos informations ont ete enregistrees.",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder les modifications.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur reseau",
        description: "Verifiez votre connexion internet.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleSave} disabled={isLoading}>
      {isLoading ? "Sauvegarde..." : "Sauvegarder"}
    </Button>
  );
}
```

---

## 5. Configuration du hook

Le hook `use-toast.ts` est genere par shadcn. Les parametres par defaut :

- `TOAST_LIMIT = 1` : un seul toast visible a la fois
- `TOAST_REMOVE_DELAY = 1000000` : duree avant suppression automatique

Pour modifier ces valeurs, editer directement `hooks/use-toast.ts`.

---

## Prochaine etape

-> [10 - Skeletons](./10-SKELETONS.md)
