"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function ServiceWorkerRegistration() {
  const t = useTranslations("pwa");
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Cache-bust SW registration so Vercel deployments trigger update
    const swUrl = `/sw.js?v=${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || "dev"}`;
    navigator.serviceWorker.register(swUrl).then((registration) => {
      // Check for updates periodically (every 60 minutes)
      setInterval(() => registration.update(), 60 * 60 * 1000);

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New version ready — show update banner
            setUpdateAvailable(true);
            setWaitingWorker(newWorker);
          }
        });
      });
    });

    // Listen for controller change (new SW activated) → reload
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-surface-secondary border border-gold/30 text-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm max-w-md">
      <span className="flex-1">{t("update_available")}</span>
      <button
        type="button"
        onClick={() => {
          waitingWorker?.postMessage({ type: "SKIP_WAITING" });
          setUpdateAvailable(false);
        }}
        className="bg-gold text-surface-primary font-semibold px-3 py-1.5 rounded-md text-xs hover:shadow-gold-glow transition-all"
      >
        {t("update_now")}
      </button>
      <button
        type="button"
        onClick={() => setUpdateAvailable(false)}
        className="text-muted-foreground hover:text-foreground text-xs"
      >
        {t("update_later")}
      </button>
    </div>
  );
}
