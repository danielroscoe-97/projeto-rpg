"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { WifiOff, RefreshCw } from "lucide-react";
import { useDmSyncBanner, type DmBannerState } from "@/lib/hooks/useDmSyncBanner";
import { getQueueSize } from "@/lib/realtime/offline-queue";

/**
 * Persistent banner shown to the DM when offline or syncing.
 * Replaces the ephemeral toast with a visible, non-dismissable indicator.
 */
export function DmOfflineBanner() {
  const state = useDmSyncBanner();

  if (state === "online") return null;

  return <BannerContent state={state} />;
}

/** Poll queue size every 2s while banner is visible so the count stays fresh. */
function useReactiveQueueSize() {
  const [size, setSize] = useState(() => getQueueSize());

  useEffect(() => {
    setSize(getQueueSize()); // sync on mount
    const id = setInterval(() => setSize(getQueueSize()), 2_000);
    return () => clearInterval(id);
  }, []);

  return size;
}

function BannerContent({ state }: { state: Exclude<DmBannerState, "online"> }) {
  const t = useTranslations("combat");
  const queueSize = useReactiveQueueSize();

  if (state === "offline") {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/50 text-amber-200 text-xs font-medium rounded-lg border border-amber-700/40"
        role="status"
        aria-live="polite"
        data-testid="dm-offline-banner"
      >
        <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{t("dm_offline_banner")}</span>
        {queueSize > 0 && (
          <span className="text-amber-400/70 tabular-nums">
            ({t("dm_offline_queued", { count: queueSize })})
          </span>
        )}
      </div>
    );
  }

  // syncing
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/50 text-blue-200 text-xs font-medium rounded-lg border border-blue-700/40"
      role="status"
      aria-live="polite"
      data-testid="dm-syncing-banner"
    >
      <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" aria-hidden="true" />
      <span>{t("dm_syncing_banner")}</span>
    </div>
  );
}
