"use client";

import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTourProvider } from "@/components/tour/DashboardTourProvider";
import { DashboardTourHelpButton } from "@/components/tour/DashboardTourHelpButton";

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
    nav_label: string;
  };
  hasDmAccess?: boolean;
  showDashboardTour?: boolean;
  tourDelayMs?: number;
  tourSource?: string;
}

export function DashboardLayout({
  children,
  translations,
  hasDmAccess = false,
  showDashboardTour = false,
  tourDelayMs = 1200,
  tourSource,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-0">
      <DashboardSidebar translations={translations} hasDmAccess={hasDmAccess} />
      {/* Main content — offset for sidebar on desktop, bottom nav padding on mobile */}
      <div className="flex-1 lg:ml-64 pb-20 lg:pb-0" data-tour-id="dash-overview">
        {children}
      </div>
      <DashboardTourProvider
        shouldAutoStart={showDashboardTour}
        delayMs={tourDelayMs}
        source={tourSource}
      />
      <DashboardTourHelpButton />
    </div>
  );
}
