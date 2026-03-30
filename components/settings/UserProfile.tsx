"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSubscriptionStore } from "@/lib/stores/subscription-store";
import { createClient } from "@/lib/supabase/client";
import { PlanBadge } from "@/components/settings/PlanBadge";
import { toast } from "sonner";
import { Pencil, ArrowUpRight } from "lucide-react";

interface UserProfileProps {
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

function getInitials(name: string, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function UserProfile({ email, displayName, avatarUrl }: UserProfileProps) {
  const t = useTranslations("profile");
  const { plan, status, subscription } = useSubscriptionStore();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(displayName);
  const [saving, setSaving] = useState(false);

  const initials = getInitials(name || displayName, email);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { display_name: name.trim() },
      });
      if (error) throw error;
      toast.success(t("settings_saved"));
      setIsEditing(false);
    } catch {
      toast.error(t("save_error"));
    } finally {
      setSaving(false);
    }
  };

  const isPro = plan === "pro" || plan === "mesa";

  return (
    <section className="bg-card rounded-lg border border-border p-6" data-testid="user-profile">
      <h2 className="text-foreground font-semibold mb-5">{t("title")}</h2>

      <div className="flex items-start gap-5">
        {/* Avatar */}
        <div className="shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={t("avatar")}
              data-testid="user-avatar-img"
              className="w-20 h-20 rounded-full ring-2 ring-amber-400/30 object-cover"
            />
          ) : (
            <div
              data-testid="user-avatar-initials"
              className="w-20 h-20 rounded-full ring-2 ring-amber-400/30 bg-amber-400/10 flex items-center justify-center text-amber-400 text-xl font-bold"
            >
              {initials}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Name */}
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wider">
              {t("name")}
            </span>
            {isEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="edit-name-input"
                  className="bg-surface-secondary border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 flex-1"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={saving || !name.trim()}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-gold text-surface-primary hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {t("save_settings")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setName(displayName);
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-border text-muted-foreground hover:text-foreground transition-all"
                >
                  {t("cancel")}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-foreground text-sm">{name || email}</p>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  data-testid="edit-name-btn"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t("edit_name")}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wider">
              {t("email")}
            </span>
            <p className="text-foreground text-sm mt-0.5">{email}</p>
          </div>

          {/* Plan */}
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wider">
              {t("plan")}
            </span>
            <div className="flex items-center gap-3 mt-1">
              <PlanBadge
                plan={plan}
                status={status}
                trialEndsAt={subscription?.trial_ends_at ?? null}
              />
              {!isPro && (
                <a
                  href="/app/settings?tab=billing"
                  data-testid="upgrade-btn"
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-gold/10 text-gold hover:bg-gold/20 transition-all"
                >
                  {t("upgrade")}
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
