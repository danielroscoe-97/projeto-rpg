"use client";

import { DashboardSidebar } from "./DashboardSidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  translations: {
    overview: string;
    campaigns: string;
    combats: string;
    soundboard: string;
    settings: string;
  };
}

export function DashboardLayout({ children, translations }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-0">
      <DashboardSidebar translations={translations} />
      {/* Main content — offset for sidebar on desktop, bottom nav padding on mobile */}
      <div className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        {children}
      </div>
    </div>
  );
}
