"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const DISMISSED_KEY = "guest-banner-dismissed";

export function GuestBanner() {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid SSR flash

  useEffect(() => {
    const wasDismissed = localStorage.getItem(DISMISSED_KEY) === "true";
    if (!wasDismissed) setDismissed(false);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      role="status"
      className="w-full bg-white/[0.04] border-b border-white/[0.06] px-4 py-2 flex items-center justify-between gap-4 text-sm"
    >
      <span className="text-muted-foreground">
        Modo visitante — seu combate não será salvo.{" "}
        <Link
          href="/auth/sign-up"
          className="text-gold hover:underline underline-offset-2 transition-colors"
        >
          Criar conta grátis →
        </Link>
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0 min-h-[44px] px-2 flex items-center"
        aria-label="Fechar aviso"
      >
        ×
      </button>
    </div>
  );
}
