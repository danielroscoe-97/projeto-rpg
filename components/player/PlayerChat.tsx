"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare, X, Send } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeChatPlayerMessage } from "@/lib/types/realtime";

const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 500;
// Rate limit: 1 message per second
const RATE_LIMIT_MS = 1000;

interface ChatMessage {
  id: string;
  senderName: string;
  content: string;
  sentAt: string;
  isMine: boolean;
}

/** Generate a consistent hue from a name string (0-359) */
function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function avatarStyle(name: string): React.CSSProperties {
  const hue = nameToHue(name);
  return { background: `hsl(${hue}, 65%, 45%)` };
}

function formatRelativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

interface PlayerChatProps {
  channelRef: React.RefObject<RealtimeChannel | null>;
  senderName: string;
  /** Only show chat during active combat */
  isActive: boolean;
}

export function PlayerChat({ channelRef, senderName, isActive }: PlayerChatProps) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const lastSentRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to chat:player_message events on the channel
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch) return;

    const handler = ({ payload }: { payload: Record<string, unknown> }) => {
      const msg = payload as unknown as RealtimeChatPlayerMessage;
      if (msg.type !== "chat:player_message") return;
      if (!msg.message_id || !msg.sender_name || !msg.content) return;

      setMessages((prev) => {
        // Dedup by message_id
        if (prev.some((m) => m.id === msg.message_id)) return prev;
        const next: ChatMessage[] = [
          ...prev,
          {
            id: msg.message_id,
            senderName: msg.sender_name,
            content: msg.content.slice(0, MAX_CONTENT_LENGTH),
            sentAt: msg.sent_at,
            isMine: msg.sender_name === senderName,
          },
        ];
        // FIFO: keep last MAX_MESSAGES
        return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      });

      setUnreadCount((prev) => (isOpen ? prev : prev + 1));
    };

    ch.on("broadcast", { event: "chat:player_message" }, handler);
    // No cleanup needed — Supabase channels don't support individual handler removal;
    // the channel itself is cleaned up by PlayerJoinClient
  }, [channelRef, senderName, isOpen]);

  // Auto-scroll to bottom on new messages when open
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setUnreadCount(0);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const content = inputValue.trim();
    if (!content) return;

    // Rate limit
    const now = Date.now();
    if (now - lastSentRef.current < RATE_LIMIT_MS) return;
    lastSentRef.current = now;

    const ch = channelRef.current;
    if (!ch) return;

    const messageId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const payload: RealtimeChatPlayerMessage = {
      type: "chat:player_message",
      sender_name: senderName,
      message_id: messageId,
      content: content.slice(0, MAX_CONTENT_LENGTH),
      sent_at: new Date().toISOString(),
    };

    // Optimistic: add my own message locally (self:false means we don't receive our own broadcasts)
    setMessages((prev) => {
      if (prev.some((m) => m.id === messageId)) return prev;
      const next: ChatMessage[] = [
        ...prev,
        {
          id: messageId,
          senderName: senderName,
          content: payload.content,
          sentAt: payload.sent_at,
          isMine: true,
        },
      ];
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
    });

    ch.send({
      type: "broadcast",
      event: "chat:player_message",
      payload,
    });

    setInputValue("");
  }, [inputValue, senderName, channelRef]);

  if (!isActive) return null;

  return (
    <>
      {/* Chat toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-gold text-black flex items-center justify-center shadow-lg transition-all duration-200 hover:bg-gold/90"
        aria-label={t("title")}
        data-testid="player-chat-btn"
      >
        <MessageSquare className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1"
            data-testid="player-chat-badge"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Chat panel (Sheet-like) */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-xl flex flex-col"
          style={{ maxHeight: "60vh" }}
          data-testid="player-chat-panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border flex-shrink-0">
            <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("close")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{t("empty")}</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.isMine ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                    style={avatarStyle(msg.senderName)}
                  >
                    {msg.senderName.charAt(0).toUpperCase()}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[80%] ${msg.isMine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                    {!msg.isMine && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {msg.senderName}
                      </span>
                    )}
                    <div
                      className={`px-2.5 py-1.5 rounded-lg text-xs leading-relaxed break-words ${
                        msg.isMine
                          ? "bg-gold/20 text-foreground rounded-tr-sm"
                          : "bg-white/[0.06] text-foreground rounded-tl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[9px] text-muted-foreground/60">
                      {formatRelativeTime(msg.sentAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t("placeholder")}
              className="flex-1 bg-background border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-gold/40 min-h-[36px]"
              data-testid="player-chat-input"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="p-2 rounded-md bg-gold text-black hover:bg-gold/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              aria-label={t("send")}
              data-testid="player-chat-send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
