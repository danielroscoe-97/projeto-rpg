"use client";

import { useTranslations } from "next-intl";
import type { ConnectionStatus } from "@/lib/realtime/use-realtime-channel";

interface DmSyncDotProps {
  status: ConnectionStatus;
}

/**
 * Minimal sync indicator for the DM Navbar — just a colored dot with tooltip.
 * Green (teal) = connected, Amber = connecting (pulse), Red = disconnected (pulse).
 */
export function DmSyncDot({ status }: DmSyncDotProps) {
  const t = useTranslations("player");

  const colorClass =
    status === "connected"
      ? "bg-teal-400"
      : status === "connecting"
        ? "bg-amber-400 animate-[pulse_4s_ease-in-out_infinite]"
        : "bg-red-400 animate-[pulse_4s_ease-in-out_infinite]";

  const tooltip =
    status === "connected"
      ? t("sync_connected")
      : status === "connecting"
        ? t("sync_connecting")
        : t("sync_reconnecting");

  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${colorClass}`}
      title={tooltip}
      aria-label={tooltip}
      role="status"
    />
  );
}
