"use client";

import { cn } from "@/lib/utils";
import { useSidebarCollapse } from "@/lib/hooks/useSidebarCollapse";

interface AppSidebarMainProps {
  children: React.ReactNode;
}

/**
 * Client wrapper around the main content that reads the sidebar collapse state
 * from localStorage and offsets margin-left accordingly on desktop. Mobile
 * gets a top offset for the slim AppSidebar topbar.
 */
export function AppSidebarMain({ children }: AppSidebarMainProps) {
  const [collapsed] = useSidebarCollapse(false);

  return (
    <main
      id="main-content"
      className={cn(
        "flex-1 transition-[margin] duration-200 ease-in-out",
        "pt-12 lg:pt-0 p-6 pb-28 lg:pb-6",
        collapsed ? "lg:ml-16" : "lg:ml-64",
      )}
    >
      {children}
    </main>
  );
}
