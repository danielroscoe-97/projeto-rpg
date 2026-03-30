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
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SidebarTranslations {
  overview: string;
  campaigns: string;
  combats: string;
  soundboard: string;
  settings: string;
}

interface DashboardSidebarProps {
  translations: SidebarTranslations;
}

const NAV_ITEMS = [
  { key: "overview" as const, href: "/app/dashboard", icon: LayoutDashboard },
  { key: "campaigns" as const, href: "/app/dashboard/campaigns", icon: Swords },
  { key: "combats" as const, href: "/app/dashboard/combats", icon: ScrollText },
  { key: "soundboard" as const, href: "/app/dashboard/soundboard", icon: Music },
  { key: "settings" as const, href: "/app/dashboard/settings", icon: Settings },
] as const;

export function DashboardSidebar({ translations: t }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/app/dashboard") {
      return pathname === "/app/dashboard";
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
        className="hidden lg:flex flex-col fixed left-0 top-[72px] bottom-0 z-30 bg-[#1a1a2e] border-r border-white/[0.08] overflow-hidden"
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.08]">
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
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-white/[0.05]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-2 space-y-1" aria-label="Dashboard navigation">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
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
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1a1a2e] border-t border-white/[0.08] px-2 pb-[env(safe-area-inset-bottom)]"
        aria-label="Dashboard navigation"
      >
        <div className="flex items-center justify-around py-1.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors min-w-[56px]",
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
