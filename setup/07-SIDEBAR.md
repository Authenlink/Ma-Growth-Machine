# Etape 7 - Sidebar

La sidebar utilise le composant sidebar de shadcn/ui. Elle comprend un header (logo), un menu de navigation collapsible, et un menu utilisateur en bas avec theme switcher et logout.

---

## 1. Installation

Le composant sidebar a deja ete installe a l'etape 1. Si ce n'est pas le cas :

```bash
npx shadcn@latest add sidebar
```

Cela cree `components/ui/sidebar.tsx` avec tous les sous-composants (SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarInset, SidebarTrigger, SidebarRail, SidebarMenu, etc.).

---

## 2. Hook use-scroll

Creer `hooks/use-scroll.ts` pour afficher une bordure sur le header quand on scrolle :

```typescript
// hooks/use-scroll.ts
import { useState, useEffect } from "react";

export function useScroll() {
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setHasScrolled(scrollTop > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return hasScrolled;
}
```

---

## 3. Composant NavMain (navigation)

Creer `components/nav-main.tsx` :

```typescript
// components/nav-main.tsx
"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          // Items sans sous-items : lien direct
          if (!item.items || item.items.length === 0) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} asChild>
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          // Items avec sous-items : menu collapsible
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          <Link href={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
```

### Fonctionnement :
- Les items sans `items` enfants sont des liens directs
- Les items avec `items` enfants sont des menus collapsibles avec chevron
- `isActive: true` ouvre le sous-menu par defaut
- `tooltip` affiche le titre quand la sidebar est collapsed

---

## 4. Composant NavUser (menu utilisateur en bas)

Creer `components/nav-user.tsx` :

```typescript
// components/nav-user.tsx
"use client";

import { signOut } from "next-auth/react";
import {
  ChevronsUpDown,
  Circle,
  LogOut,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function NavUser({
  user,
  backgroundGradient,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  backgroundGradient?: {
    color1: string;
    color2: string;
    css: string;
  } | null;
}) {
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback
                  className="rounded-lg text-white font-semibold"
                  style={
                    backgroundGradient
                      ? { background: backgroundGradient.css }
                      : undefined
                  }
                >
                  {getInitials(user.name || "U")}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.name || "User"}
                </span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* En-tete avec avatar */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback
                    className="rounded-lg text-white font-semibold"
                    style={
                      backgroundGradient
                        ? { background: backgroundGradient.css }
                        : undefined
                    }
                  >
                    {getInitials(user.name || "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.name || "User"}
                  </span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Theme switcher */}
            <DropdownMenuGroup>
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
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Liens */}
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => (window.location.href = "/profile")}
              >
                <User />
                Profil
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Deconnexion */}
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
```

### Fonctionnalites du NavUser :
- **Avatar** avec fallback gradient (les initiales s'affichent sur un fond gradient si pas de photo)
- **Theme switcher** : 3 options radio (White, Light, Dark)
- **Lien Profil** : redirige vers `/profile`
- **Logout** : deconnecte et redirige vers `/login`
- **Responsive** : le dropdown s'ouvre en bas sur mobile, a droite sur desktop

---

## 5. Composant AppSidebar (sidebar principale)

Creer `components/app-sidebar.tsx` :

```typescript
// components/app-sidebar.tsx
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  User,
  Settings,
} from "lucide-react";
import { useSession } from "next-auth/react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// ============================================================
// ITEMS DE NAVIGATION - A personnaliser selon ton projet
// ============================================================
const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Mon compte",
    url: "/profile",
    icon: User,
  },
  // Ajouter d'autres items ici, exemple avec sous-menu :
  // {
  //   title: "Parametres",
  //   url: "/settings",
  //   icon: Settings,
  //   items: [
  //     { title: "General", url: "/settings/general" },
  //     { title: "Securite", url: "/settings/security" },
  //   ],
  // },
];

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { data: session, status } = useSession();
  const [backgroundGradient, setBackgroundGradient] = useState<{
    color1: string;
    color2: string;
    css: string;
  } | null>(null);

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  // Charger le gradient de l'utilisateur pour l'avatar
  useEffect(() => {
    const loadUserGradient = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          if (data.backgroundType === "gradient" && data.backgroundGradient) {
            setBackgroundGradient(data.backgroundGradient);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement du gradient:", error);
      }
    };

    if (session?.user) {
      loadUserGradient();
    }
  }, [session]);

  // Skeleton pendant le chargement de la session
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

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Header : Logo + Nom de l'app */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="Mon App"
                    width={36}
                    height={36}
                    className="rounded-md"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Mon Application</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Dashboard
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Contenu : Navigation */}
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>

      {/* Footer : Menu utilisateur */}
      <SidebarFooter>
        <NavUser
          user={user}
          backgroundGradient={backgroundGradient}
        />
      </SidebarFooter>

      {/* Rail : handle pour collapse/expand */}
      <SidebarRail />
    </Sidebar>
  );
}
```

### Structure de la sidebar :

```
Sidebar (collapsible="icon")
├── SidebarHeader
│   └── Logo + Nom de l'application
├── SidebarContent
│   └── NavMain (items de navigation)
│       ├── Liens directs (Dashboard, Mon compte)
│       └── Menus collapsibles (avec sous-items)
├── SidebarFooter
│   └── NavUser (menu utilisateur)
│       ├── Avatar avec gradient fallback
│       ├── Nom + Email
│       └── Dropdown : Theme switcher, Profil, Logout
└── SidebarRail (handle de redimensionnement)
```

---

## 6. Integration dans une page

Voici le pattern pour integrer la sidebar dans une page :

```typescript
// Exemple : app/dashboard/page.tsx (simplifie)
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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

  if (status === "loading" || !session) {
    return null; // ou un skeleton (voir etape 10)
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header sticky avec trigger sidebar + breadcrumbs */}
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
            {/* Breadcrumbs ici (voir etape 8) */}
          </div>
        </header>

        {/* Contenu de la page */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <h1 className="text-2xl font-bold">
            Bienvenue, {session.user.name} !
          </h1>
          {/* Contenu... */}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### Points cles de l'integration :
- `SidebarProvider` wrappe toute la page (sidebar + contenu)
- `AppSidebar` est place en premier enfant
- `SidebarInset` contient le contenu principal
- `SidebarTrigger` dans le header permet de toggler la sidebar (aussi avec `Cmd/Ctrl + B`)
- Le header est `sticky` avec un backdrop blur
- `hasScrolled` ajoute une `border-b` quand l'utilisateur scrolle
- La sidebar est `collapsible="icon"` : elle se reduit en icones seulement

---

## Prochaine etape

-> [08 - Breadcrumbs](./08-BREADCRUMBS.md)
