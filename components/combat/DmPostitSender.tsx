"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { StickyNote, Send, X } from "lucide-react";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeChatDmPostit } from "@/lib/types/realtime";

const MAX_POSTIT_LENGTH = 280;

interface DmPostitSenderProps {
  /** Channel used to broadcast postits */
  channel: RealtimeChannel;
  /** Token ID of the specific player, or "all" for broadcast */
  targetTokenId: string;
  /** Display label shown in the popover title */
  targetLabel: string;
}

export function DmPostitSender({ channel, targetTokenId, targetLabel }: DmPostitSenderProps) {
  const t = useTranslations("chat");
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const postitId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const payload: RealtimeChatDmPostit = {
      type: "chat:dm_postit",
      postit_id: postitId,
      content: trimmed.slice(0, MAX_POSTIT_LENGTH),
      target: targetTokenId,
      sent_at: new Date().toISOString(),
    };

    channel.send({
      type: "broadcast",
      event: "chat:dm_postit",
      payload,
    });

    toast.success(t("postit_sent"), { duration: 2000 });
    setContent("");
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((v) => !v);
          // Focus textarea after open
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className="p-1 rounded text-muted-foreground hover:text-gold transition-colors"
        aria-label={t("postit_send")}
        data-testid={`dm-postit-btn-${targetTokenId}`}
        title={t("postit_send")}
      >
        <StickyNote className="w-3.5 h-3.5" />
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          {/* Click-away backdrop */}
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            className="absolute z-[61] right-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-xl p-3 space-y-2"
            data-testid={`dm-postit-popover-${targetTokenId}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gold truncate max-w-[80%]">
                {targetTokenId === "all" ? t("postit_all") : targetLabel}
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Input */}
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_POSTIT_LENGTH))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t("postit_placeholder")}
              rows={3}
              className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-gold/40 resize-none"
              data-testid={`dm-postit-input-${targetTokenId}`}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {content.length}/{MAX_POSTIT_LENGTH}
              </span>
              <button
                type="button"
                onClick={handleSend}
                disabled={!content.trim()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gold text-black text-xs font-medium hover:bg-gold/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid={`dm-postit-send-${targetTokenId}`}
              >
                <Send className="w-3 h-3" />
                {t("postit_send")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
