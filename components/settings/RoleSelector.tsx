"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRoleStore } from "@/lib/stores/role-store";
import type { UserRole } from "@/lib/stores/role-store";
import { toast } from "sonner";
import { Swords, Shield, Users } from "lucide-react";

const ROLE_OPTIONS: { value: UserRole; icon: React.ReactNode; labelKey: string }[] = [
  { value: "player", icon: <Swords className="w-5 h-5" />, labelKey: "role_player" },
  { value: "dm", icon: <Shield className="w-5 h-5" />, labelKey: "role_dm" },
  { value: "both", icon: <Users className="w-5 h-5" />, labelKey: "role_both" },
];

export function RoleSelector() {
  const t = useTranslations("settings");
  const ts = useTranslations("signup");
  const { role, loadRole, updateRole, initialized } = useRoleStore();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  const handleSelect = async (newRole: UserRole) => {
    if (newRole === role || saving) return;
    setSaving(true);
    try {
      await updateRole(newRole);
      toast.success(t("role_updated"));
    } catch {
      toast.error(ts("role_save_error"));
    } finally {
      setSaving(false);
    }
  };

  if (!initialized) return null;

  return (
    <div>
      <h2 className="text-foreground font-semibold mb-1">{t("role_title")}</h2>
      <p className="text-muted-foreground text-sm mb-4">{t("role_description")}</p>
      <div className="grid grid-cols-3 gap-2">
        {ROLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            disabled={saving}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-200 ${
              role === option.value
                ? "border-gold bg-gold/10 text-gold"
                : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/[0.15]"
            } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {option.icon}
            <span className="text-xs font-medium">
              {ts(option.labelKey as Parameters<typeof ts>[0])}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
