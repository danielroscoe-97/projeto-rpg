"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Swords,
  ScrollText,
  Music,
  Settings,
  Users,
  Package,
  PanelLeftClose,
  BookOpen,
  Search,
  Plus,
  UserPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SidebarSection } from "./SidebarSection";
import { SidebarCampaignNav } from "./SidebarCampaignNav";
import { SidebarMiniMap } from "./SidebarMiniMap";
import { useRecentCampaigns } from "@/lib/hooks/useRecentCampaigns";

interface SidebarContentProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  hasDmAccess?: boolean;
  currentCampaignId?: string | null;
  isCampaignOwner?: boolean;
  onNavigate?: () => void;
  showCollapseButton?: boolean;
}

const PRIMARY_NAV = [
  { key: "overview" as const, href: "/app/dashboard", icon: LayoutDashboard, dmOnly: false, tourId: undefined as string | undefined },
  { key: "campaigns" as const, href: "/app/dashboard/campaigns", icon: Swords, dmOnly: false, tourId: undefined },
  { key: "combats" as const, href: "/app/dashboard/combats", icon: ScrollText, dmOnly: false, tourId: "dash-nav-combats" },
  { key: "characters" as const, href: "/app/dashboard/characters", icon: Users, dmOnly: false, tourId: undefined },
  { key: "compendium" as const, href: "/app/compendium", icon: BookOpen, dmOnly: false, tourId: "dash-nav-compendium" },
  { key: "soundboard" as const, href: "/app/dashboard/soundboard", icon: Music, dmOnly: false, tourId: "dash-nav-soundboard" },
  { key: "presets" as const, href: "/app/dashboard/presets", icon: Package, dmOnly: true, tourId: undefined },
  { key: "settings" as const, href: "/app/dashboard/settings", icon: Settings, dmOnly: false, tourId: undefined },
];

function openCommandPalette() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("command-palette:open"));
}

export function SidebarContent({
  collapsed,
  onToggleCollapse,
  hasDmAccess = false,
  currentCampaignId = null,
  isCampaignOwner = false,
  onNavigate,
  showCollapseButton = true,
}: SidebarContentProps) {
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const [recentCampaigns] = useRecentCampaigns();

  const navItems = PRIMARY_NAV.filter((item) => !item.dmOnly || hasDmAccess);

  const isActive = (href: string) => {
    if (href === "/app/dashboard") return pathname === "/app/dashboard";
    if (href === "/app/dashboard/settings") return pathname.startsWith("/app/dashboard/settings") || pathname === "/app/settings";
    if (href === "/app/dashboard/presets") return pathname.startsWith("/app/dashboard/presets") || pathname.startsWith("/app/presets");
    if (href === "/app/compendium") return pathname.startsWith("/app/compendium");
    return pathname.startsWith(href);
  };

  return (
    <div className="h-full flex flex-col" id="app-sidebar-content">
      {/* Brand */}
      <div className={cn("flex items-center justify-between px-4 py-4 border-b border-white/[0.08]", collapsed && "justify-center px-2")}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 rounded"
          aria-label={collapsed ? t("toggle_expand") : t("toggle_collapse")}
          aria-expanded={!collapsed}
          aria-controls="app-sidebar-content"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/art/brand/logo-icon.svg"
            alt=""
            width={20}
            height={20}
            className="pointer-events-none shrink-0 drop-shadow-[0_0_6px_rgba(212,168,83,0.3)]"
            aria-hidden="true"
          />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-sm font-bold text-amber-400 tracking-wide whitespace-nowrap"
              >
                {t("brand")}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        {!collapsed && showCollapseButton && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
            aria-label={t("toggle_collapse")}
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick switcher button */}
      <div className={cn("px-2 pt-3", collapsed && "px-1")}>
        <button
          type="button"
          onClick={openCommandPalette}
          className={cn(
            "flex items-center gap-3 w-full rounded-lg text-sm font-medium transition-all duration-200",
            "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
            collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
          )}
          aria-label={t("search_hint")}
          title={collapsed ? t("search_hint") : undefined}
          data-testid="sidebar-quick-switcher"
        >
          <Search className="w-5 h-5 shrink-0" aria-hidden="true" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left whitespace-nowrap">{t("search_hint")}</span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-white/[0.06] rounded border border-white/[0.08]">
                {t("search_kbd")}
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Scrollable nav area */}
      <div className="flex-1 overflow-y-auto py-3">
        {/* Story 12.5 — Campaign Workspace Mode.
         *  Inside a campaign (`currentCampaignId` set), the campaign's own
         *  navigation gets promoted above the global PRIMARY_NAV so the DM
         *  feels they're "inside" the campaign, not browsing menus. Outside
         *  of a campaign, the order is preserved (global nav first). */}
        {!collapsed && currentCampaignId && (
          <SidebarSection
            title={t("section_current_campaign")}
            defaultOpen={true}
            collapsed={collapsed}
            className="mb-4"
          >
            <SidebarCampaignNav isOwner={isCampaignOwner} collapsed={collapsed} onNavigate={onNavigate} />
          </SidebarSection>
        )}

        {/* Primary nav */}
        <nav
          className="px-2 space-y-1"
          aria-label={t("section_primary")}
          data-testid="sidebar-primary-nav"
        >
          {!collapsed && currentCampaignId && (
            <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {t("section_primary")}
            </p>
          )}
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                data-testid={`nav-${item.key}`}
                data-tour-id={item.tourId}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
                  active
                    ? "bg-amber-400/10 text-amber-400 shadow-[0_0_20px_-8px_rgba(251,191,36,0.4)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
                  collapsed && "justify-center px-2",
                )}
                aria-current={active ? "page" : undefined}
                title={collapsed ? t(item.key) : undefined}
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
                      {t(item.key)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Recent campaigns (expanded only) */}
        {!collapsed && recentCampaigns.length > 0 && (
          <SidebarSection title={t("section_my_campaigns")} defaultOpen={false} collapsed={collapsed} className="mt-4">
            <ul className="space-y-0.5">
              {recentCampaigns.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/app/campaigns/${c.id}`}
                    onClick={onNavigate}
                    className="block px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.03] truncate transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                    title={c.name}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </SidebarSection>
        )}

        {/* Mini mind-map placeholder */}
        {!collapsed && <SidebarMiniMap collapsed={collapsed} />}
      </div>

      {/* DM Quick Actions (expanded + DM) */}
      {hasDmAccess && !collapsed && (
        <div className="px-2 pb-3 space-y-1 border-t border-white/[0.06] pt-3" data-tour-id="dash-sidebar-actions">
          <Link
            href="/app/combat/new"
            data-testid="sidebar-new-combat"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-400/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">{t("new_combat")}</span>
          </Link>
          <Link
            href="/app/dashboard/campaigns"
            data-testid="sidebar-invite-player"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
          >
            <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">{t("invite_player")}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
