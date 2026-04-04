"use client";

import { Bell, CheckCircle, XCircle, Package } from "lucide-react";
import type { PlayerNotification } from "@/lib/types/database";

const ICON_MAP: Record<string, typeof CheckCircle> = {
  removal_approved: CheckCircle,
  removal_denied: XCircle,
};

const COLOR_MAP: Record<string, string> = {
  removal_approved: "text-emerald-400",
  removal_denied: "text-red-400",
};

interface NotificationFeedProps {
  notifications: PlayerNotification[];
  emptyMessage: string;
}

export function NotificationFeed({
  notifications,
  emptyMessage,
}: NotificationFeedProps) {
  if (notifications.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <Bell className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {notifications.map((notif) => (
        <NotificationRow key={notif.id} notification={notif} />
      ))}
    </div>
  );
}

function NotificationRow({
  notification,
}: {
  notification: PlayerNotification;
}) {
  const Icon = ICON_MAP[notification.type] ?? Package;
  const color = COLOR_MAP[notification.type] ?? "text-muted-foreground";
  const isUnread = !notification.read_at;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-colors ${
        isUnread ? "bg-white/[0.03]" : ""
      }`}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            isUnread
              ? "text-foreground font-medium"
              : "text-muted-foreground"
          }`}
        >
          {notification.title}
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
