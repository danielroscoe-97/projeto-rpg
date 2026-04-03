"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Swords,
  ScrollText,
  Music,
  Settings,
  Users,
  Package,
  PanelLeftClose,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SidebarTranslations {
  overview: string;
  campaigns: string;
  combats: string;
  characters: string;
  soundboard: string;
  presets: string;
  settings: string;
  profile: string;
  nav_label: string;
}

interface DashboardSidebarProps {
  translations: SidebarTranslations;
  hasDmAccess?: boolean;
}

const NAV_ITEMS_DESKTOP_BASE = [
  { key: "overview" as const, href: "/app/dashboard", icon: LayoutDashboard, dmOnly: false },
  { key: "campaigns" as const, href: "/app/dashboard/campaigns", icon: Swords, dmOnly: false },
  { key: "combats" as const, href: "/app/dashboard/combats", icon: ScrollText, dmOnly: false },
  { key: "characters" as const, href: "/app/dashboard/characters", icon: Users, dmOnly: false },
  { key: "soundboard" as const, href: "/app/dashboard/soundboard", icon: Music, dmOnly: false },
  { key: "presets" as const, href: "/app/presets", icon: Package, dmOnly: true },
  { key: "settings" as const, href: "/app/settings", icon: Settings, dmOnly: false },
];

const NAV_ITEMS_MOBILE = [
  { key: "overview" as const, href: "/app/dashboard", icon: LayoutDashboard },
  { key: "campaigns" as const, href: "/app/dashboard/campaigns", icon: Swords },
  { key: "combats" as const, href: "/app/dashboard/combats", icon: ScrollText },
  { key: "characters" as const, href: "/app/dashboard/characters", icon: Users },
  { key: "soundboard" as const, href: "/app/dashboard/soundboard", icon: Music },
  { key: "settings" as const, href: "/app/settings", icon: Settings },
] as const;

export function DashboardSidebar({ translations: t, hasDmAccess = false }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navItemsDesktop = NAV_ITEMS_DESKTOP_BASE.filter(
    (item) => !item.dmOnly || hasDmAccess
  );

  const isActive = (href: string) => {
    if (href === "/app/dashboard") {
      return pathname === "/app/dashboard";
    }
    if (href === "/app/settings") {
      return pathname === "/app/settings" || pathname.startsWith("/app/dashboard/settings");
    }
    if (href === "/app/presets") {
      return pathname.startsWith("/app/presets");
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden lg:flex flex-col fixed left-0 top-[72px] bottom-0 z-30 bg-background border-r border-white/[0.08] overflow-hidden"
        data-testid="sidebar"
        data-tour-id="dash-sidebar"
      >
        {/* Brand */}
        <div className={cn("flex items-center justify-between px-4 py-4 border-b border-white/[0.08]", collapsed && "justify-center px-2")}>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/brand/logo-icon.svg" alt="" width={20} height={20} className="pointer-events-none shrink-0 drop-shadow-[0_0_6px_rgba(212,168,83,0.3)]" aria-hidden="true" />
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-sm font-bold text-amber-400 tracking-wide whitespace-nowrap"
                >
                  Pocket DM
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-white/[0.05]"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-2 space-y-1" aria-label={t.nav_label}>
          {navItemsDesktop.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                data-testid={`nav-${item.key}`}
                data-tour-id={item.key === "combats" ? "dash-nav-combats" : item.key === "soundboard" ? "dash-nav-soundboard" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
                  active
                    ? "bg-amber-400/10 text-amber-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
                  collapsed && "justify-center px-2"
                )}
                aria-current={active ? "page" : undefined}
                title={collapsed ? t[item.key] : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {t[item.key]}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>
      </motion.aside>

      {/* Mobile Bottom Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-white/[0.08] px-2 pb-[env(safe-area-inset-bottom)]"
        aria-label={t.nav_label}
        data-testid="bottom-nav"
        data-tour-id="dash-bottom-nav"
      >
        <div className="flex items-center justify-around py-1.5">
          {NAV_ITEMS_MOBILE.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                data-testid={`nav-${item.key}`}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 rounded-lg text-xs font-medium transition-colors min-w-[56px] min-h-[44px] justify-center",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
                  active
                    ? "text-amber-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="truncate">{t[item.key]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
