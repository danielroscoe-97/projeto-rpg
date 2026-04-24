"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { GoogleOAuthButton } from "@/components/auth/GoogleOAuthButton";
import { resolvePostCombatRedirect } from "@/lib/player-hq/post-combat-redirect";

export type UpsellTrigger = "save" | "export" | "player-link" | "weather" | "background" | "end-combat";

const TRIGGER_KEYS: Record<UpsellTrigger, { title: string; desc: string }> = {
  save:          { title: "upsell_title_save",       desc: "upsell_description_save" },
  export:        { title: "upsell_title",            desc: "upsell_description" },
  "player-link": { title: "upsell_title_share",      desc: "upsell_description_share" },
  weather:       { title: "upsell_title_weather",     desc: "upsell_description_weather" },
  background:    { title: "upsell_title_background",  desc: "upsell_description_background" },
  "end-combat":  { title: "upsell_title_end_combat",  desc: "upsell_description_end_combat" },
};

interface GuestUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: UpsellTrigger;
  /** Optional redirect URL after Google OAuth. Defaults to /auth/confirm?from=guest-combat */
  redirectTo?: string;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * @deprecated Replaced by {@link RecapCtaCard} + {@link GuestRecapFlow} in
 * Epic 03 Wave 3a (2026-04-20). Kept for fallback compatibility in case the
 * new AuthModal-based flow fails to open (e.g. hydration error). Planned
 * removal in v4 after 90 days of `conversion:*` analytics data has stabilized
 * (target: 2026-07-20). Do not add new call sites — consume `GuestRecapFlow`
 * directly instead.
 */
export function GuestUpsellModal({ isOpen, onClose, trigger, redirectTo }: GuestUpsellModalProps) {
  const t = useTranslations("guest");
  const tc = useTranslations("common");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // A6 (decision #43) — Guest post-combat redirect is locked to
  // `/app/dashboard`. `resolvePostCombatRedirect` enforces the invariant;
  // explicit `redirectTo` still wins for tests / preview branches.
  const resolvedRedirectTo =
    redirectTo ?? resolvePostCombatRedirect({ mode: "guest" });

  // Focus trap: focus the close button when modal opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  // ESC to close + Tab cycling focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upsell-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div ref={modalRef} className="relative bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-5">
        {/* Close */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground/60 hover:text-muted-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={tc("close")}
        >
          ×
        </button>

        {/* Icon */}
        <div className="text-3xl text-center">🏰</div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2
            id="upsell-modal-title"
            className="font-display text-xl text-foreground"
          >
            {t(TRIGGER_KEYS[trigger].title)}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t(TRIGGER_KEYS[trigger].desc)}
          </p>
          <p className="text-gold text-xs font-medium">
            {t("upsell_data_preserved")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-1">
          {/* Google OAuth — redirect back to guest combat so data is migrated */}
          <GoogleOAuthButton
            namespace="guest"
            redirectTo={resolvedRedirectTo}
            data-testid="upsell-google-button"
          />

          {/* Email sign-up */}
          <Link
            href="/auth/sign-up?from=guest-combat"
            className="relative overflow-hidden w-full text-center px-6 py-3 bg-gold text-surface-primary font-semibold rounded-lg hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms] min-h-[48px] flex items-center justify-center btn-shimmer"
          >
            {t("upsell_email")}
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-center px-6 py-3 bg-white/[0.06] text-muted-foreground rounded-lg hover:bg-white/[0.1] transition-all duration-[250ms] min-h-[48px] text-sm"
          >
            {t("upsell_dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
