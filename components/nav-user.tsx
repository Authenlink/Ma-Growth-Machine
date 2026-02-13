"use client";

import Link from "next/link";
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
  const { isMobile, setOpen, setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };
  const { theme, setTheme } = useTheme();

  const handleSignOut = () => {
    // Use current origin to avoid localhost redirect in production
    const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";
    signOut({ callbackUrl });
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
              <DropdownMenuItem asChild>
                <Link href="/profile" onClick={handleNavClick}>
                  <User />
                  Profil
                </Link>
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
