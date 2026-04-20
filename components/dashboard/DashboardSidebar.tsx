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
  Ellipsis,
  Plus,
  UserPlus,
  BookOpen,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface SidebarTranslations {
  overview: string;
  campaigns: string;
  combats: string;
  characters: string;
  compendium: string;
  soundboard: string;
  presets: string;
  settings: string;
  profile: string;
  nav_label: string;
  more: string;
  new_combat?: string;
  invite_player?: string;
  quick_actions?: string;
}

interface DashboardSidebarProps {
  translations: SidebarTranslations;
  hasDmAccess?: boolean;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

const NAV_ITEMS_DESKTOP_BASE = [
  { key: "overview" as const, href: "/app/dashboard", icon: LayoutDashboard, dmOnly: false },
  { key: "campaigns" as const, href: "/app/dashboard/campaigns", icon: Swords, dmOnly: false },
  { key: "combats" as const, href: "/app/dashboard/combats", icon: ScrollText, dmOnly: false },
  { key: "characters" as const, href: "/app/dashboard/characters", icon: Users, dmOnly: false },
  { key: "compendium" as const, href: "/app/compendium", icon: BookOpen, dmOnly: false },
  { key: "soundboard" as const, href: "/app/dashboard/soundboard", icon: Music, dmOnly: false },
  { key: "presets" as const, href: "/app/dashboard/presets", icon: Package, dmOnly: true },
  { key: "settings" as const, href: "/app/dashboard/settings", icon: Settings, dmOnly: false },
];

const NAV_ITEMS_MOBILE_PRIMARY = [
  { key: "overview" as const, href: "/app/dashboard", icon: LayoutDashboard },
  { key: "campaigns" as const, href: "/app/dashboard/campaigns", icon: Swords },
  { key: "combats" as const, href: "/app/dashboard/combats", icon: ScrollText },
] as const;

const NAV_ITEMS_MOBILE_MORE_BASE = [
  { key: "characters" as const, href: "/app/dashboard/characters", icon: Users, dmOnly: false },
  { key: "compendium" as const, href: "/app/compendium", icon: BookOpen, dmOnly: false },
  { key: "soundboard" as const, href: "/app/dashboard/soundboard", icon: Music, dmOnly: false },
  { key: "presets" as const, href: "/app/dashboard/presets", icon: Package, dmOnly: true },
  { key: "settings" as const, href: "/app/dashboard/settings", icon: Settings, dmOnly: false },
];

export function DashboardSidebar({ translations: t, hasDmAccess = false, collapsed: controlledCollapsed, onCollapse }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const collapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = useCallback((val: boolean) => {
    if (onCollapse) onCollapse(val);
    else setInternalCollapsed(val);
  }, [onCollapse]);

  const navItemsDesktop = NAV_ITEMS_DESKTOP_BASE.filter(
    (item) => !item.dmOnly || hasDmAccess
  );

  const mobileMoreItems = NAV_ITEMS_MOBILE_MORE_BASE.filter(
    (item) => !item.dmOnly || hasDmAccess
  );

  // P3: Close "More" popup on route change (browser back/forward)
  useEffect(() => { setMoreOpen(false) }, [pathname]);

  // P2: Close "More" popup on Escape key
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [moreOpen]);

  // D1: Close popup when focus leaves the popup area
  const handlePopupBlur = useCallback((e: React.FocusEvent) => {
    const popup = e.currentTarget;
    if (e.relatedTarget && !popup.contains(e.relatedTarget as Node)) {
      setMoreOpen(false);
    }
  }, []);

  const isActive = (href: string) => {
    if (href === "/app/dashboard") {
      return pathname === "/app/dashboard";
    }
    if (href === "/app/dashboard/settings") {
      return pathname.startsWith("/app/dashboard/settings") || pathname === "/app/settings";
    }
    if (href === "/app/dashboard/presets") {
      return pathname.startsWith("/app/dashboard/presets") || pathname.startsWith("/app/presets");
    }
    if (href === "/app/compendium") {
      return pathname.startsWith("/app/compendium");
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
            onClick={() => setCollapsed(!collapsed)}
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

        {/* JO-15: Quick Actions — visible only expanded + DM access */}
        {hasDmAccess && !collapsed && (
          <div className="px-2 pb-3 space-y-1 border-t border-white/[0.06] pt-3" data-tour-id="dash-sidebar-actions">
            <Link
              href="/app/combat/new"
              data-testid="sidebar-new-combat"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-400/10 transition-colors"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{t.new_combat ?? "New Combat"}</span>
            </Link>
            <Link
              href="/app/dashboard/campaigns"
              data-testid="sidebar-invite-player"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
            >
              <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{t.invite_player ?? "Invite Player"}</span>
            </Link>
          </div>
        )}
      </motion.aside>

      {/* Mobile Bottom Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-white/[0.08] px-2 pb-[env(safe-area-inset-bottom)]"
        aria-label={t.nav_label}
        data-testid="bottom-nav"
        data-tour-id="dash-bottom-nav"
      >
        {/* "More" overflow menu */}
        <AnimatePresence>
          {moreOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-30"
                onClick={() => setMoreOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.01 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                id="more-menu"
                role="menu"
                onBlur={handlePopupBlur}
                className="absolute bottom-full left-2 right-2 mb-1 bg-surface-secondary border border-white/[0.08] rounded-xl shadow-xl z-40 overflow-hidden"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
              >
                {/* JO-15: Quick actions in mobile More menu */}
                {hasDmAccess && (
                  <>
                    <Link
                      href="/app/combat/new"
                      role="menuitem"
                      onClick={() => setMoreOpen(false)}
                      data-testid="mobile-new-combat"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-amber-400 hover:bg-amber-400/10 transition-colors"
                    >
                      <Plus className="w-5 h-5" aria-hidden="true" />
                      {t.new_combat ?? "New Combat"}
                    </Link>
                    <Link
                      href="/app/dashboard/campaigns"
                      role="menuitem"
                      onClick={() => setMoreOpen(false)}
                      data-testid="mobile-invite-player"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
                    >
                      <UserPlus className="w-5 h-5" aria-hidden="true" />
                      {t.invite_player ?? "Invite Player"}
                    </Link>
                    <div className="border-t border-white/[0.06]" />
                  </>
                )}
                {mobileMoreItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setMoreOpen(false)}
                      data-testid={`nav-${item.key}`}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                        active
                          ? "text-amber-400 bg-amber-400/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                      {t[item.key]}
                    </Link>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-around py-1.5">
          {NAV_ITEMS_MOBILE_PRIMARY.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                data-testid={`nav-${item.key}`}
                onClick={() => setMoreOpen(false)}
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

          {/* More button */}
          <button
            type="button"
            onClick={() => setMoreOpen((prev) => !prev)}
            data-testid="nav-more"
            aria-controls="more-menu"
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 rounded-lg text-xs font-medium transition-colors min-w-[56px] min-h-[44px] justify-center",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
              mobileMoreItems.some((item) => isActive(item.href))
                ? "text-amber-400"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-expanded={moreOpen}
            aria-label={t.more}
          >
            <Ellipsis className="w-5 h-5" aria-hidden="true" />
            <span className="truncate">{t.more}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
