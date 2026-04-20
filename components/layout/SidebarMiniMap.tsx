"use client";

import { useTranslations } from "next-intl";
import { Network } from "lucide-react";

interface SidebarMiniMapProps {
  collapsed?: boolean;
}

/**
 * Placeholder for "Teia recente" (recently visited entities as mini mind-map).
 * Real implementation comes in Phase 3 after Entity Graph is ready.
 */
export function SidebarMiniMap({ collapsed = false }: SidebarMiniMapProps) {
  const t = useTranslations("sidebar");

  if (collapsed) return null;

  return (
    <div className="px-4 py-3 border-t border-white/[0.06]">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50 uppercase tracking-wider">
        <Network className="w-3 h-3" aria-hidden="true" />
        <span className="italic">{t("mini_map_soon")}</span>
      </div>
    </div>
  );
}
