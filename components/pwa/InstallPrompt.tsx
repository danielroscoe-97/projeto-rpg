"use client";

import { useEffect, useState, useCallback } from "react";

const DISMISS_KEY = "pwa-install-dismissed";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check cooldown
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - parseInt(dismissed, 10) < COOLDOWN_MS) {
      return;
    }

    // Already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Strategic timing: show after user has been on the page for 30 seconds
      setTimeout(() => setShow(true), 30_000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    // Track analytics
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: outcome === "accepted" ? "pwa:installed" : "pwa:dismissed",
        }),
      });
    } catch {
      // Non-critical
    }

    setDeferredPrompt(null);
    setShow(false);

    if (outcome === "dismissed") {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));

    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "pwa:install_prompt_dismissed" }),
      });
    } catch {
      // Non-critical
    }
  }, []);

  if (!show || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-surface-secondary border border-gold/30 text-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm max-w-md animate-in slide-in-from-bottom-4">
      <span className="flex-1">
        Instale Pocket DM para acesso rápido na mesa
      </span>
      <button
        type="button"
        onClick={handleInstall}
        className="bg-gold text-surface-primary font-semibold px-3 py-1.5 rounded-md text-xs hover:shadow-gold-glow transition-all whitespace-nowrap"
      >
        Instalar
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground text-xs whitespace-nowrap"
      >
        Depois
      </button>
    </div>
  );
}
