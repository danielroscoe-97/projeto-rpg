"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRoleStore } from "@/lib/stores/role-store";
import { Shield, Swords } from "lucide-react";

/**
 * Pill-style toggle shown in the navbar for users with role "both".
 * Allows switching between DM and Player views.
 */
export function RoleSwitcher() {
  const t = useTranslations("role_switcher");
  const { role, activeView, toggleView, loadRole, initialized } = useRoleStore();

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  // Only show for "both" users, hide until loaded
  if (!initialized || role !== "both") return null;

  return (
    <button
      type="button"
      onClick={toggleView}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 text-xs font-medium min-h-[36px]"
      aria-label={t("toggle_label")}
      title={t("toggle_label")}
    >
      {activeView === "dm" ? (
        <>
          <Shield className="w-3.5 h-3.5 text-gold" />
          <span className="text-gold">{t("view_dm")}</span>
        </>
      ) : (
        <>
          <Swords className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400">{t("view_player")}</span>
        </>
      )}
    </button>
  );
}
