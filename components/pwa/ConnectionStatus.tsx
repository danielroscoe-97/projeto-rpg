"use client";

import { useEffect, useState } from "react";
import {
  getSyncStatus,
  onSyncStatusChange,
  getQueueSize,
  type SyncStatus,
} from "@/lib/realtime/offline-queue";

const STATUS_CONFIG: Record<SyncStatus, { color: string; label: string }> = {
  online: { color: "bg-emerald-500", label: "" },
  offline: { color: "bg-amber-500", label: "Offline" },
  syncing: { color: "bg-blue-500 animate-pulse", label: "Sincronizando" },
  error: { color: "bg-red-500", label: "Erro de sync" },
};

export function ConnectionStatus() {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    const unsub = onSyncStatusChange((newStatus) => {
      setStatus(newStatus);
      setQueueSize(getQueueSize());
    });

    // Poll queue size while offline
    const interval = setInterval(() => {
      if (getSyncStatus() !== "online") {
        setQueueSize(getQueueSize());
      }
    }, 2000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  // Don't show anything when online and synced
  if (status === "online") return null;

  const config = STATUS_CONFIG[status];

  return (
    <div className="fixed top-[72px] left-0 right-0 z-40 flex items-center justify-center gap-2 py-1.5 px-4 bg-surface-secondary/95 backdrop-blur-sm border-b border-white/5 text-xs">
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className="text-muted-foreground">
        {config.label}
        {status === "offline" && queueSize > 0 && (
          <> — {queueSize} {queueSize === 1 ? "ação pendente" : "ações pendentes"}</>
        )}
        {status === "syncing" && queueSize > 0 && (
          <> — replay de {queueSize} {queueSize === 1 ? "ação" : "ações"}</>
        )}
      </span>
    </div>
  );
}
