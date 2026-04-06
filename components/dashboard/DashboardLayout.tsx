"use client";

import { useState } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardLoadingScreen } from "./DashboardLoadingScreen";
import { DashboardTourProvider } from "@/components/tour/DashboardTourProvider";
import { DashboardTourHelpButton } from "@/components/tour/DashboardTourHelpButton";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  translations: {
    overview: string;
    campaigns: string;
    combats: string;
    characters: string;
    soundboard: string;
    presets: string;
    settings: string;
    profile: string;
    more: string;
    nav_label: string;
    new_combat?: string;
    invite_player?: string;
    quick_actions?: string;
  };
  hasDmAccess?: boolean;
  showDashboardTour?: boolean;
  isPlayerFirstCampaign?: boolean;
  tourDelayMs?: number;
  tourSource?: string;
}

export function DashboardLayout({
  children,
  translations,
  hasDmAccess = false,
  showDashboardTour = false,
  isPlayerFirstCampaign = false,
  tourDelayMs = 1200,
  tourSource,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-0">
      <DashboardSidebar translations={translations} hasDmAccess={hasDmAccess} collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
      {/* Main content — offset for sidebar on desktop, bottom nav padding on mobile */}
      <div className={cn("flex-1 pb-20 lg:pb-0 transition-[margin] duration-200 ease-in-out", sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")} data-tour-id="dash-overview">
        {children}
      </div>
      <DashboardTourProvider
        shouldAutoStart={showDashboardTour || isPlayerFirstCampaign}
        delayMs={tourDelayMs}
        source={tourSource}
        hasDmAccess={hasDmAccess}
        isPlayerFirstCampaign={isPlayerFirstCampaign}
      />
      <DashboardTourHelpButton />
      <DashboardLoadingScreen />
    </div>
  );
}
