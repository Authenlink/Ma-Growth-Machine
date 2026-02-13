"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
  useSidebar,
} from "@/components/ui/sidebar";

function isItemActive(
  pathname: string,
  item: { url: string; items?: { url: string }[] }
): boolean {
  const itemPath = item.url.split("?")[0]
  if (pathname === itemPath || pathname.startsWith(itemPath + "/")) return true
  if (
    item.items?.some((sub) => {
      const subPath = sub.url.split("?")[0]
      return pathname === subPath || pathname.startsWith(subPath + "/")
    })
  )
    return true
  return false
}

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
  const pathname = usePathname()
  const { state, setOpen, setOpenMobile, isMobile } = useSidebar()

  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!pathname) return
    setOpenItems((prev) => {
      const next = { ...prev }
      items.forEach((item) => {
        if (item.items?.length && isItemActive(pathname, item)) {
          next[item.title] = true
        }
      })
      return next
    })
  }, [pathname, items])

  const handleNavClick = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false)
    } else {
      setOpen(false)
    }
  }, [setOpen, setOpenMobile, isMobile])

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          // Items sans sous-items : lien direct
          if (!item.items || item.items.length === 0) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} asChild>
                  <Link href={item.url} onClick={handleNavClick}>
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
              open={openItems[item.title] ?? false}
              onOpenChange={(open) => {
                if (state === "collapsed") {
                  // When collapsed, always open sidebar and expand this item
                  setOpen(true)
                  setOpenItems((prev) => ({ ...prev, [item.title]: true }))
                  return
                }
                setOpenItems((prev) => ({ ...prev, [item.title]: open }))
              }}
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
                          <Link href={subItem.url} onClick={handleNavClick}>
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
