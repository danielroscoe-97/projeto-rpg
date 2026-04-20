"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, CheckCircle, XCircle, Package, Swords } from "lucide-react";
import { useNotifications } from "@/lib/hooks/useNotifications";
import type { PlayerNotification } from "@/lib/types/database";

interface NotificationBellProps {
  userId: string;
}

const ICON_MAP: Record<string, typeof CheckCircle> = {
  removal_approved: CheckCircle,
  removal_denied: XCircle,
  combat_invite: Swords,
};

const COLOR_MAP: Record<string, string> = {
  removal_approved: "text-emerald-400",
  removal_denied: "text-red-400",
  combat_invite: "text-amber-400",
};

export function NotificationBell({ userId }: NotificationBellProps) {
  const t = useTranslations("player_hq.notifications");
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAllRead } = useNotifications(userId);

  // Mark as read when panel opens
  useEffect(() => {
    if (open && unreadCount > 0) {
      markAllRead();
    }
  }, [open, unreadCount, markAllRead]);

  // M6 fix: Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && open) setOpen(false);
  }, [open]);

  // Close on click outside + Escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={t("bell_label")}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-xl shadow-xl z-50"
          role="menu"
        >
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              {t("title")}
            </h3>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => (
                <NotificationRow key={notif.id} notification={notif} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({ notification }: { notification: PlayerNotification }) {
  const t = useTranslations("player_hq.notifications");
  const router = useRouter();
  const Icon = ICON_MAP[notification.type] ?? Package;
  const color = COLOR_MAP[notification.type] ?? "text-muted-foreground";
  const isUnread = !notification.read_at;

  // I3 + I4 fix: Resolve title from i18n, use type as key fallback
  const titleKey = `type_${notification.type}`;
  const resolvedTitle = t.has(titleKey) ? t(titleKey) : notification.title;

  // W5 (F19): combat_invite rows are clickable — navigate to /join/{token}
  // using meta.join_token when present.
  const isCombatInvite = notification.type === "combat_invite";
  const joinToken =
    isCombatInvite &&
    typeof notification.meta === "object" &&
    notification.meta !== null &&
    typeof (notification.meta as { join_token?: unknown }).join_token ===
      "string"
      ? (notification.meta as { join_token: string }).join_token
      : null;

  const clickable = Boolean(joinToken);

  const handleActivate = () => {
    if (joinToken) {
      router.push(`/join/${joinToken}`);
    }
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-colors ${
        isUnread ? "bg-white/[0.03]" : ""
      } ${clickable ? "cursor-pointer hover:bg-white/[0.05] focus:bg-white/[0.05]" : ""}`}
      role={clickable ? "menuitem button" : "menuitem"}
      tabIndex={clickable ? 0 : -1}
      onClick={clickable ? handleActivate : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleActivate();
              }
            }
          : undefined
      }
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
          {resolvedTitle}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {notification.message}
        </p>
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0">
        {timeAgo(notification.created_at)}
      </span>
    </div>
  );
}

// I4 fix: locale-aware relative time
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "<1m";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
