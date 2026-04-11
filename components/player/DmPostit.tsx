"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Mail, X } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeChatDmPostit } from "@/lib/types/realtime";

const MAX_POSTITS = 20;
const DISMISS_MS = 15_000;

interface ReceivedPostit {
  id: string;
  content: string;
  receivedAt: string;
}

interface DmPostitProps {
  channelRef: React.RefObject<RealtimeChannel | null>;
  /** The player's token ID — used to filter targeted postits */
  tokenId: string;
  /** The player's registered name — secondary filter for name-based targeting */
  playerName?: string;
  /** Only show postits during active combat */
  isActive: boolean;
}

export function DmPostit({ channelRef, tokenId, playerName, isActive }: DmPostitProps) {
  const t = useTranslations("chat");
  const [postits, setPostits] = useState<ReceivedPostit[]>([]);
  const [activeToast, setActiveToast] = useState<ReceivedPostit | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissActiveToast = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setActiveToast(null);
  }, []);

  // Subscribe to chat:dm_postit events
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch) return;

    const handler = ({ payload }: { payload: Record<string, unknown> }) => {
      const msg = payload as unknown as RealtimeChatDmPostit;
      if (msg.type !== "chat:dm_postit") return;
      // Filter: show postits targeted at this player (by token_id or name) or "all"
      const isTargetedAtMe =
        msg.target === tokenId ||
        msg.target === "all" ||
        (playerName && msg.target === playerName);
      if (!isTargetedAtMe) return;
      if (!msg.postit_id || !msg.content) return;

      const postit: ReceivedPostit = {
        id: msg.postit_id,
        content: msg.content.slice(0, 280),
        receivedAt: msg.sent_at,
      };

      // Add to history (FIFO, max 20)
      setPostits((prev) => {
        if (prev.some((p) => p.id === postit.id)) return prev;
        const next = [...prev, postit];
        return next.length > MAX_POSTITS ? next.slice(-MAX_POSTITS) : next;
      });

      // Show as floating toast (replaces any current toast)
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      setActiveToast(postit);
      dismissTimerRef.current = setTimeout(() => {
        dismissTimerRef.current = null;
        setActiveToast(null);
      }, DISMISS_MS);
    };

    ch.on("broadcast", { event: "chat:dm_postit" }, handler);
  }, [channelRef, tokenId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  if (!isActive) return null;

  const unreadCount = postits.length;

  return (
    <>
      {/* Floating toast — top-right */}
      {activeToast && (
        <div
          className="fixed top-4 right-4 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-lg shadow-xl border-l-4 p-3"
          style={{
            background: "rgba(212, 168, 83, 0.12)",
            borderLeftColor: "var(--accent-gold)",
            backdropFilter: "blur(8px)",
            borderTop: "1px solid rgba(212,168,83,0.25)",
            borderRight: "1px solid rgba(212,168,83,0.25)",
            borderBottom: "1px solid rgba(212,168,83,0.25)",
          }}
          data-testid="dm-postit-toast"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gold mb-1">{t("postit_header")}</p>
              <p className="text-sm text-foreground leading-snug break-words">{activeToast.content}</p>
            </div>
            <button
              type="button"
              onClick={dismissActiveToast}
              className="flex-shrink-0 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("close")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Auto-dismiss progress bar */}
          <div className="mt-2 h-0.5 bg-gold/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold/60 rounded-full"
              style={{ animation: `shrink ${DISMISS_MS}ms linear forwards` }}
            />
          </div>
          <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
        </div>
      )}

      {/* Postit history button */}
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="fixed bottom-4 left-4 z-40 w-12 h-12 rounded-full bg-surface-tertiary border border-border flex items-center justify-center shadow-md transition-all hover:bg-white/[0.1]"
          aria-label={t("postit_history")}
          data-testid="dm-postit-history-btn"
        >
          <Mail className="w-5 h-5 text-gold" />
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-gold text-black text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        </button>
      )}

      {/* History panel */}
      {showHistory && (
        <div
          className="fixed bottom-20 left-4 z-40 w-72 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-xl flex flex-col"
          style={{ maxHeight: "50vh" }}
          data-testid="dm-postit-history-panel"
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border flex-shrink-0">
            <h2 className="text-sm font-semibold text-foreground">{t("postit_history")}</h2>
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("close")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {postits.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{t("postit_empty")}</p>
            ) : (
              [...postits].reverse().map((p) => (
                <div
                  key={p.id}
                  className="rounded-md p-2.5 text-xs text-foreground"
                  style={{
                    background: "rgba(212, 168, 83, 0.08)",
                    borderLeft: "2px solid rgba(212,168,83,0.5)",
                  }}
                >
                  <p className="font-semibold text-gold text-[10px] mb-0.5">{t("postit_header")}</p>
                  <p className="leading-snug break-words">{p.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
