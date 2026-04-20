"use client";

import { Swords, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface CombatInviteToastProps {
  /** sonner toast id (string | number). Used by CTA handlers. */
  toastId: string | number;
  campaignName: string;
  dmDisplayName: string | null;
  encounterName: string | null;
  /**
   * When true the toast renders in a compact/subdued style — used when the
   * player is in an unrelated /app/* route (spec §4.3).
   */
  lowKey?: boolean;
  onJoin: () => void;
  onDismiss: () => void;
}

/**
 * Wave 5 (F19) — Toast custom com CTA dourado quando o DM inicia um combate.
 *
 * Renderizado via `toast.custom(...)` em `useCombatInviteListener`. Persistente
 * (duration=Infinity) nas superfícies primárias (dashboard + própria campanha)
 * e auto-dismiss 15s nas demais rotas (lowKey).
 */
export function CombatInviteToast({
  toastId: _toastId,
  campaignName,
  dmDisplayName,
  encounterName,
  lowKey = false,
  onJoin,
  onDismiss,
}: CombatInviteToastProps) {
  const t = useTranslations("combat_invite_toast");

  const dmName = dmDisplayName?.trim() || t("default_dm");
  const encounterLabel =
    encounterName?.trim() || t("default_encounter_fallback");

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={
        lowKey
          ? "pointer-events-auto relative flex items-start gap-3 rounded-lg border border-amber-500/30 bg-surface-primary/95 px-3 py-2 shadow-lg backdrop-blur"
          : "pointer-events-auto relative flex items-start gap-3 rounded-xl border border-amber-500/40 bg-surface-primary/95 px-4 py-3 shadow-xl backdrop-blur"
      }
      style={{ minWidth: lowKey ? 280 : 320, maxWidth: 380 }}
    >
      <div
        className={
          lowKey
            ? "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300"
            : "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300"
        }
      >
        <Swords className={lowKey ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={
            lowKey
              ? "truncate text-[13px] font-semibold text-foreground"
              : "truncate text-sm font-semibold text-foreground"
          }
        >
          {lowKey
            ? `${campaignName}: ${t("title_short", { dm: dmName })}`
            : t("title", { dm: dmName })}
        </p>
        <p
          className={
            lowKey
              ? "truncate text-[11px] text-muted-foreground"
              : "truncate text-xs text-muted-foreground"
          }
        >
          {lowKey
            ? encounterLabel
            : t("subtitle", {
                encounter: encounterLabel,
                campaign: campaignName,
              })}
        </p>

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onJoin}
            className={
              lowKey
                ? "inline-flex items-center gap-1 rounded-md bg-gold px-2.5 py-1 text-[11px] font-semibold text-surface-primary transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                : "inline-flex items-center gap-1 rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-surface-primary transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            }
          >
            {t("cta_join")}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            {t("cta_dismiss")}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("cta_dismiss")}
        className="absolute right-1.5 top-1.5 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
