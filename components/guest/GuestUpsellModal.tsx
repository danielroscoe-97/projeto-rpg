"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export type UpsellTrigger = "save" | "export" | "player-link" | "weather" | "background";

interface GuestUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: UpsellTrigger;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function GuestUpsellModal({ isOpen, onClose, trigger }: GuestUpsellModalProps) {
  const t = useTranslations("guest");
  const tc = useTranslations("common");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app/dashboard`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
    } catch {
      setGoogleLoading(false);
    }
  };

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
            {trigger === "player-link" ? t("upsell_title_share") : trigger === "save" ? t("upsell_title_save") : trigger === "weather" ? t("upsell_title_weather") : trigger === "background" ? t("upsell_title_background") : t("upsell_title")}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {trigger === "player-link" ? t("upsell_description_share") : trigger === "save" ? t("upsell_description_save") : trigger === "weather" ? t("upsell_description_weather") : trigger === "background" ? t("upsell_description_background") : t("upsell_description")}
          </p>
          <p className="text-gold text-xs font-medium">
            {t("upsell_data_preserved")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-1">
          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="relative overflow-hidden w-full px-6 py-3 bg-white text-gray-800 font-medium rounded-lg hover:bg-gray-50 hover:-translate-y-[1px] transition-all duration-[250ms] min-h-[48px] flex items-center justify-center gap-3 border border-gray-300 disabled:opacity-60"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? t("upsell_google_loading") : t("upsell_google")}
          </button>

          {/* Email sign-up */}
          <Link
            href="/auth/sign-up"
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
