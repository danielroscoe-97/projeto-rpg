"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { SidebarContent } from "./SidebarContent";
import { useSidebarCollapse } from "@/lib/hooks/useSidebarCollapse";
import { useRecentCampaigns } from "@/lib/hooks/useRecentCampaigns";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";

interface AppSidebarProps {
  hasDmAccess?: boolean;
  /** Current campaign id, if the pathname is inside /app/campaigns/:id */
  currentCampaignId?: string | null;
  /** Current campaign name, if available (used to record recent visits) */
  currentCampaignName?: string | null;
  /** Whether the current user owns the current campaign */
  isCampaignOwner?: boolean;
  children?: React.ReactNode;
}

/**
 * Global left sidebar for /app/* — desktop fixed + mobile drawer.
 * Replaces both DashboardSidebar (dashboard routes) and CampaignSidebarIndex
 * (campaign routes) behind a single unified component.
 */
export function AppSidebar({
  hasDmAccess = false,
  currentCampaignId = null,
  currentCampaignName = null,
  isCampaignOwner = false,
  children,
}: AppSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const [collapsed, , toggleCollapse] = useSidebarCollapse(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

  const [, recordVisit] = useRecentCampaigns();

  // Record recent campaign visit
  useEffect(() => {
    if (currentCampaignId && currentCampaignName) {
      recordVisit(currentCampaignId, currentCampaignName);
    }
  }, [currentCampaignId, currentCampaignName, recordVisit]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Close drawer on Esc + return focus
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setDrawerOpen(false);
        hamburgerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Ctrl/Cmd+B toggles collapse (desktop)
  useKeyboardShortcut(
    "b",
    useCallback(() => {
      toggleCollapse();
    }, [toggleCollapse]),
    { ctrlOrMeta: true },
  );

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    hamburgerRef.current?.focus();
  }, []);

  return (
    <>
      {/* Desktop fixed sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-30 bg-background border-r border-white/[0.08] overflow-hidden"
        role="navigation"
        aria-label={t("section_primary")}
        data-testid="app-sidebar"
        data-tour-id="dash-sidebar"
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          hasDmAccess={hasDmAccess}
          currentCampaignId={currentCampaignId}
          isCampaignOwner={isCampaignOwner}
        />
      </motion.aside>

      {/* Mobile top bar (slim) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-12 flex items-center gap-2 px-3 bg-background border-b border-white/[0.08]">
        <button
          ref={hamburgerRef}
          type="button"
          onClick={openDrawer}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
          aria-label={t("open_drawer")}
          aria-expanded={drawerOpen}
          aria-controls="mobile-drawer"
          data-testid="app-sidebar-hamburger"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/art/brand/logo-icon.svg"
            alt=""
            width={18}
            height={18}
            className="pointer-events-none shrink-0 drop-shadow-[0_0_6px_rgba(212,168,83,0.3)]"
            aria-hidden="true"
          />
          <span className="text-xs font-bold text-amber-400 tracking-wide">{t("brand")}</span>
        </div>
        <div className="flex-1" />
        {children}
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={closeDrawer}
              aria-hidden="true"
            />
            <motion.aside
              id="mobile-drawer"
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-[260px] bg-background border-r border-white/[0.08] overflow-hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              role="dialog"
              aria-modal="true"
              aria-label={t("section_primary")}
              data-testid="app-sidebar-drawer"
            >
              <div className="absolute top-2 right-2 z-10">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                  aria-label={t("close_drawer")}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent
                collapsed={false}
                onToggleCollapse={closeDrawer}
                hasDmAccess={hasDmAccess}
                currentCampaignId={currentCampaignId}
                isCampaignOwner={isCampaignOwner}
                onNavigate={closeDrawer}
                showCollapseButton={false}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

    </>
  );
}
