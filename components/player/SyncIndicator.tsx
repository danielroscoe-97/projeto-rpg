"use client";

import type { ConnectionStatus } from "@/lib/realtime/use-realtime-channel";

interface SyncIndicatorProps {
  status: ConnectionStatus;
}

export function SyncIndicator({ status }: SyncIndicatorProps) {
  const color =
    status === "connected"
      ? "bg-green-400"
      : status === "connecting"
        ? "bg-amber-400"
        : "bg-red-400";

  const label =
    status === "connected"
      ? "Connected"
      : status === "connecting"
        ? "Connecting..."
        : "Reconnecting...";

  return (
    <div className="flex items-center gap-1.5" data-testid="sync-indicator">
      <span className={`w-2 h-2 rounded-full ${color}`} aria-hidden="true" />
      <span className="text-white/50 text-xs">{label}</span>
    </div>
  );
}
