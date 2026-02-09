# Etape 6 - Themes (White, Light, Dark)

L'application supporte 3 themes via `next-themes` et des variables CSS en oklch.

---

## 1. globals.css complet

Remplacer le contenu de `app/globals.css` par :

```css
/* app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-4xl: calc(var(--radius) + 16px);
}

/* ============================================================
   THEME WHITE (defaut / :root)
   Theme blanc pur, neutre
   ============================================================ */
:root,
.white {
  --radius: 0.65rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 285.823);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.723 0.219 149.579);
  --primary-foreground: oklch(0.97 0.014 254.604);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.809 0.105 251.813);
  --chart-2: oklch(0.623 0.214 259.815);
  --chart-3: oklch(0.546 0.245 262.881);
  --chart-4: oklch(0.488 0.243 264.376);
  --chart-5: oklch(0.424 0.199 265.638);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.141 0.005 285.823);
  --sidebar-primary: oklch(0.546 0.245 262.881);
  --sidebar-primary-foreground: oklch(0.97 0.014 254.604);
  --sidebar-accent: oklch(0.967 0.001 286.375);
  --sidebar-accent-foreground: oklch(0.21 0.006 285.885);
  --sidebar-border: oklch(0.92 0.004 286.32);
  --sidebar-ring: oklch(0.708 0 0);
}

/* ============================================================
   THEME LIGHT
   Theme clair avec une teinte chaude subtile
   ============================================================ */
.light {
  --radius: 0.65rem;
  --background: oklch(0.98 0.008 75);
  --foreground: oklch(0.18 0.008 75);
  --card: oklch(0.95 0.015 75);
  --card-foreground: oklch(0.18 0.008 75);
  --popover: oklch(0.96 0.012 75);
  --popover-foreground: oklch(0.18 0.008 75);
  --primary: oklch(0.55 0.15 150);
  --primary-foreground: oklch(0.98 0.01 150);
  --secondary: oklch(0.93 0.02 75);
  --secondary-foreground: oklch(0.25 0.01 75);
  --muted: oklch(0.92 0.015 75);
  --muted-foreground: oklch(0.45 0.012 75);
  --accent: oklch(0.91 0.022 75);
  --accent-foreground: oklch(0.25 0.01 75);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.87 0.012 75);
  --input: oklch(0.87 0.012 75);
  --ring: oklch(0.55 0.15 150);
  --chart-1: oklch(0.55 0.15 150);
  --chart-2: oklch(0.50 0.14 160);
  --chart-3: oklch(0.45 0.13 170);
  --chart-4: oklch(0.40 0.12 180);
  --chart-5: oklch(0.35 0.11 190);
  --sidebar: oklch(0.94 0.018 75);
  --sidebar-foreground: oklch(0.18 0.008 75);
  --sidebar-primary: oklch(0.55 0.15 150);
  --sidebar-primary-foreground: oklch(0.98 0.01 150);
  --sidebar-accent: oklch(0.91 0.02 75);
  --sidebar-accent-foreground: oklch(0.25 0.01 75);
  --sidebar-border: oklch(0.87 0.015 75);
  --sidebar-ring: oklch(0.55 0.15 150);
}

/* ============================================================
   THEME DARK
   Theme sombre
   ============================================================ */
.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.21 0.006 285.885);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.21 0.006 285.885);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.723 0.219 149.579);
  --primary-foreground: oklch(0.97 0.014 254.604);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --accent: oklch(0.274 0.006 286.033);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.809 0.105 251.813);
  --chart-2: oklch(0.623 0.214 259.815);
  --chart-3: oklch(0.546 0.245 262.881);
  --chart-4: oklch(0.488 0.243 264.376);
  --chart-5: oklch(0.424 0.199 265.638);
  --sidebar: oklch(0.21 0.006 285.885);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.623 0.214 259.815);
  --sidebar-primary-foreground: oklch(0.97 0.014 254.604);
  --sidebar-accent: oklch(0.274 0.006 286.033);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.439 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### Descriptions des themes :
- **White** (`:root`, `.white`) : Fond blanc pur, couleur primaire verte, style minimal
- **Light** (`.light`) : Fond legerement chaud (teinte beige subtile), cartes avec contraste visible, primaire vert
- **Dark** (`.dark`) : Fond sombre, texte clair, adapte pour usage nocturne

---

## 2. Theme Provider

Creer `components/theme-provider.tsx` :

```typescript
// components/theme-provider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

---

## 3. Integration dans le Root Layout

Creer `app/layout.tsx` :

```typescript
// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mon Application",
  description: "Description de mon application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>{children}</Providers>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Points cles :
- `attribute="class"` : les themes sont appliques via une classe CSS sur `<html>`
- `defaultTheme="light"` : theme par defaut
- `enableSystem` : permet de detecter le theme systeme
- `suppressHydrationWarning` : evite les warnings d'hydratation lies au theme
- `<Toaster />` : place dans le layout pour etre disponible partout

---

## 4. Comment le theme est change

Le theme est change dans le composant `NavUser` (menu bas de la sidebar) via un radio group :

```typescript
// Extrait de nav-user.tsx (sera cree a l'etape 7)
const { theme, setTheme } = useTheme();

// Dans le dropdown menu :
<DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
  <DropdownMenuRadioItem value="white">
    <Sun className="h-4 w-4 mr-2" />
    White
  </DropdownMenuRadioItem>
  <DropdownMenuRadioItem value="light">
    <Circle className="h-4 w-4 mr-2" />
    Light
  </DropdownMenuRadioItem>
  <DropdownMenuRadioItem value="dark">
    <Moon className="h-4 w-4 mr-2" />
    Dark
  </DropdownMenuRadioItem>
</DropdownMenuRadioGroup>
```

Le theme est persiste dans un cookie par `next-themes` et s'applique automatiquement au rechargement.

---

## Prochaine etape

-> [07 - Sidebar](./07-SIDEBAR.md)
