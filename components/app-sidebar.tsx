"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderOpen,
  Zap,
  Settings,
  Sparkles,
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
  useSidebar,
} from "@/components/ui/sidebar";

// ============================================================
// ITEMS DE NAVIGATION - Growth Machine
// ============================================================
const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Scraping",
    url: "/leads/scrape",
    icon: Sparkles,
    isActive: false,
  },
  {
    title: "Leads",
    url: "/leads",
    icon: Users,
    items: [
      { title: "Tous les leads", url: "/leads" },
      { title: "Importer des leads", url: "/leads/import" },
      { title: "Ajouter un lead", url: "/leads/add" },
    ],
  },
  {
    title: "Entreprises",
    url: "/companies",
    icon: Building2,
    items: [
      { title: "Toutes les entreprises", url: "/companies" },
      { title: "Ajouter une entreprise", url: "/companies/add" },
    ],
  },
  {
    title: "Collections",
    url: "/leads/collections",
    icon: FolderOpen,
  },
  {
    title: "Enrichissement",
    url: "/enrichment",
    icon: Zap,
    items: [
      { title: "Enrichir leads", url: "/enrichment?tab=lead" },
      { title: "Enrichir entreprise", url: "/enrichment?tab=company" },
      { title: "Vérifier emails", url: "/enrichment?tab=verify-emails" },
      { title: "Analyse SEO", url: "/enrichment/seo" },
      { title: "Avis Trustpilot", url: "/enrichment/trustpilot" },
    ],
  },
  // {
  //   title: "Campagnes",
  //   url: "/campaigns",
  //   icon: Target,
  //   items: [
  //     { title: "Toutes les campagnes", url: "/campaigns" },
  //     { title: "Nouvelle campagne", url: "/campaigns/new" },
  //     { title: "Rapports", url: "/campaigns/reports" },
  //     { title: "Performances", url: "/campaigns/analytics" },
  //   ],
  // },
  // {
  //   title: "IceBreakers",
  //   url: "/icebreakers",
  //   icon: MessageSquare,
  //   items: [
  //     { title: "Générer pour liste", url: "/icebreakers/generate" },
  //     { title: "Templates", url: "/icebreakers/templates" },
  //     { title: "Historique", url: "/icebreakers/history" },
  //   ],
  // },
  {
    title: "Actions",
    url: "/actions",
    icon: Settings,
    items: [{ title: "Export données", url: "/actions/export" }],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
    <SidebarWithNav
      user={user}
      backgroundGradient={backgroundGradient}
      collapsible="icon"
      {...props}
    />
  );
}

function SidebarWithNav(
  props: React.ComponentProps<typeof Sidebar> & {
    user: { name: string; email: string; avatar: string };
    backgroundGradient: {
      color1: string;
      color2: string;
      css: string;
    } | null;
  }
) {
  const { user, backgroundGradient, ...sidebarProps } = props;
  const { setOpen, setOpenMobile, isMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  return (
    <Sidebar collapsible="icon" {...sidebarProps}>
      {/* Header : Logo + Nom de l'app */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" onClick={handleNavClick}>
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
                  <span className="truncate font-semibold">Growth Machine</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Lead Generation Platform
                  </span>
                </div>
              </Link>
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
        <NavUser user={user} backgroundGradient={backgroundGradient} />
      </SidebarFooter>
    </Sidebar>
  );
}
