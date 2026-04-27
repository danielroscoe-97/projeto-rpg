"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCw } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { trackEvent } from "@/lib/analytics/track";

const COOLDOWN_MS = 60_000;
const LOADING_MS = 700;
const STALE_TICK_MS = 5_000;

interface SosResyncButtonProps {
  /** Active session realtime channel — must be SUBSCRIBED before the user can click. */
  channelRef: React.RefObject<RealtimeChannel | null>;
  /** Token row ID of the player session — included in the broadcast for DM-side telemetry. */
  tokenId: string;
  /** Player's chosen name. Forwarded for DM-side debug logs only (no UI surfacing). */
  playerName: string;
  /**
   * Optional ref tracking the timestamp of the most recent broadcast received from the DM.
   * When provided, the button paints a gold pulse hint after `staleThresholdMs` of silence —
   * a soft cue that pressing the button is likely to help. Without this prop the button
   * still works, just without the staleness affordance.
   */
  lastBroadcastAtRef?: React.RefObject<number>;
  staleThresholdMs?: number;
  className?: string;
}

type ButtonState = "idle" | "loading" | "cooldown";

/**
 * Player-initiated SOS resync. Sends a `player:sos_resync_requested` broadcast
 * which the DM handler answers by re-emitting the current `session:state_sync`
 * snapshot — silently, per Resilient Reconnection §18.
 */
export function SosResyncButton({
  channelRef,
  tokenId,
  playerName,
  lastBroadcastAtRef,
  staleThresholdMs = 30_000,
  className,
}: SosResyncButtonProps) {
  const t = useTranslations("player");
  const [state, setState] = useState<ButtonState>("idle");
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(0);
  const [isStale, setIsStale] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    cooldownTimerRef.current = null;
    loadingTimerRef.current = null;
  }, []);

  // Stale gate — repaints when the last DM broadcast aged past the threshold
  // and the tab is visible. Reacts to visibilitychange so a player returning
  // to a backgrounded tab sees the pulse cue immediately instead of waiting
  // up to STALE_TICK_MS.
  useEffect(() => {
    if (!lastBroadcastAtRef) return;
    const tick = () => {
      const last = lastBroadcastAtRef.current ?? 0;
      const visible =
        typeof document === "undefined" || document.visibilityState === "visible";
      const ageMs = last > 0 ? Date.now() - last : 0;
      setIsStale(visible && last > 0 && ageMs > staleThresholdMs);
    };
    tick();
    staleTimerRef.current = setInterval(tick, STALE_TICK_MS);
    const onVisibilityChange = () => tick();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
    return () => {
      if (staleTimerRef.current) clearInterval(staleTimerRef.current);
      staleTimerRef.current = null;
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, [lastBroadcastAtRef, staleThresholdMs]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleClick = useCallback(() => {
    if (state !== "idle") return;
    const channel = channelRef.current;
    if (!channel) return;

    const requestedAt = Date.now();
    const lastBroadcastAt = lastBroadcastAtRef?.current ?? 0;
    const msSinceLastBroadcast = lastBroadcastAt > 0 ? requestedAt - lastBroadcastAt : -1;

    trackEvent("player:sos_resync_clicked", {
      is_stale: isStale,
      ms_since_last_broadcast: msSinceLastBroadcast,
      visibility_state:
        typeof document !== "undefined" ? document.visibilityState : "unknown",
    });

    setState("loading");

    // Best-effort send — channel.send may resolve, fail, or hang. Wrap in a
    // short min/max so the user always sees a brief loading state and never
    // a stuck spinner.
    void Promise.resolve(
      channel.send({
        type: "broadcast",
        event: "player:sos_resync_requested",
        payload: {
          type: "player:sos_resync_requested",
          player_name: playerName,
          sender_token_id: tokenId,
          requested_at: requestedAt,
        },
      })
    ).catch(() => {
      // Swallow — the cooldown still applies and the user can re-press after it expires.
    });

    const enterCooldown = () => {
      clearTimers();
      setState("cooldown");
      setCooldownSecondsLeft(Math.ceil(COOLDOWN_MS / 1000));
      cooldownTimerRef.current = setInterval(() => {
        setCooldownSecondsLeft((prev) => {
          if (prev <= 1) {
            clearTimers();
            setState("idle");
            return 0;
          }
          return prev - 1;
        });
      }, 1_000);
    };

    // Hold the loading affordance briefly so the press feels deliberate, then
    // enter cooldown regardless of whether channel.send resolved — a dropped
    // DM should never strand the button mid-spin.
    loadingTimerRef.current = setTimeout(enterCooldown, LOADING_MS);
  }, [channelRef, clearTimers, isStale, lastBroadcastAtRef, playerName, state, tokenId]);

  const tooltip =
    state === "loading"
      ? t("sos_loading_label")
      : state === "cooldown"
        ? t("sos_cooldown_label", { seconds: cooldownSecondsLeft })
        : t("sos_button_label");

  const baseClasses =
    "relative w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed";
  const stateClasses =
    state === "idle"
      ? `bg-surface-overlay border ${isStale ? "border-gold animate-pulse text-gold" : "border-muted-foreground/30 text-muted-foreground"} hover:text-gold hover:border-gold/60`
      : state === "loading"
        ? "bg-surface-overlay border border-gold text-gold"
        : "bg-surface-overlay border border-muted-foreground/20 text-muted-foreground/40";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state !== "idle"}
      title={tooltip}
      aria-label={t("sos_button_aria")}
      className={`${baseClasses} ${stateClasses} ${className ?? ""}`}
      data-testid="sos-resync-btn"
    >
      <RotateCw
        className={`w-5 h-5 ${state === "loading" ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      {state === "cooldown" && cooldownSecondsLeft > 0 && (
        <span
          className="absolute -bottom-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-surface-secondary text-[9px] font-semibold text-muted-foreground border border-muted-foreground/30 flex items-center justify-center"
          aria-hidden="true"
        >
          {cooldownSecondsLeft}
        </span>
      )}
    </button>
  );
}
