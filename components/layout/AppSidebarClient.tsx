"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { GlobalKeyboardShortcuts } from "./GlobalKeyboardShortcuts";

interface AppSidebarClientProps {
  hasDmAccess?: boolean;
  children?: React.ReactNode;
}

/**
 * Thin client wrapper that derives currentCampaignId from pathname.
 * The parent server layout passes hasDmAccess; ownership of the current
 * campaign is determined per-route (if needed) and defaults to false here
 * since the sidebar only uses it to filter a "DM-only" sub-nav item.
 * The campaign page itself still enforces permissions server-side.
 */
export function AppSidebarClient({ hasDmAccess = false, children }: AppSidebarClientProps) {
  const pathname = usePathname();
  const match = pathname.match(/^\/app\/campaigns\/([0-9a-f-]{36})/i);
  const currentCampaignId = match ? match[1] : null;

  // Owner flag: we don't know server-side here; default to hasDmAccess as a
  // reasonable proxy for "can see DM-only sub-items". Actual access control
  // remains enforced by server components on the campaign page.
  const isCampaignOwner = !!currentCampaignId && hasDmAccess;

  return (
    <>
      <AppSidebar hasDmAccess={hasDmAccess} currentCampaignId={currentCampaignId} isCampaignOwner={isCampaignOwner}>
        {children}
      </AppSidebar>
      <GlobalKeyboardShortcuts />
    </>
  );
}
