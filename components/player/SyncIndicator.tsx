"use client";

import { useTranslations } from "next-intl";
import type { ConnectionStatus } from "@/lib/realtime/use-realtime-channel";

interface SyncIndicatorProps {
  status: ConnectionStatus;
}

export function SyncIndicator({ status }: SyncIndicatorProps) {
  const t = useTranslations("player");
  const color =
    status === "connected"
      ? "bg-green-400"
      : status === "connecting"
        ? "bg-amber-400"
        : "bg-red-400";

  const label =
    status === "connected"
      ? t("sync_connected")
      : status === "connecting"
        ? t("sync_connecting")
        : t("sync_reconnecting");

  return (
    <div className="flex items-center gap-1.5" data-testid="sync-indicator" title={label}>
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${color}${status !== "connected" ? " animate-pulse" : ""}`}
        aria-hidden="true"
      />
      <span className="text-muted-foreground text-xs hidden sm:inline w-[5.5rem]">
        {label}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
