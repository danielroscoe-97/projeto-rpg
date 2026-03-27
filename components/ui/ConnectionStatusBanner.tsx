"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import type { ConnectionStatus } from "@/lib/realtime/use-realtime-channel";

interface ConnectionStatusBannerProps {
  status: ConnectionStatus;
  shouldPoll: boolean;
}

export function ConnectionStatusBanner({ status, shouldPoll }: ConnectionStatusBannerProps) {
  const t = useTranslations("common");
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasDisconnected, setWasDisconnected] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (status === "disconnected") {
      setWasDisconnected(true);
    }
    if (status === "connected" && wasDisconnected) {
      setShowReconnected(true);
      setWasDisconnected(false);
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        setShowReconnected(false);
      }, 2000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status, wasDisconnected]);

  const isDisconnected = status === "disconnected" || status === "connecting";
  const showBanner = (isDisconnected && wasDisconnected) || showReconnected || shouldPoll;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className={`fixed top-0 left-0 right-0 z-40 px-4 py-2 text-center text-sm font-medium ${
            showReconnected
              ? "bg-green-600/90 text-white"
              : shouldPoll
                ? "bg-amber-600/90 text-white"
                : "bg-amber-500/90 text-white"
          }`}
          role="status"
          aria-live="polite"
          data-testid="connection-status-banner"
        >
          <span className="inline-flex items-center gap-2">
            {showReconnected ? (
              <>
                <Wifi className="w-4 h-4" />
                {t("reconnected")}
              </>
            ) : shouldPoll ? (
              <>
                <WifiOff className="w-4 h-4" />
                {t("slow_update_mode")}
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("reconnecting")}
              </>
            )}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
