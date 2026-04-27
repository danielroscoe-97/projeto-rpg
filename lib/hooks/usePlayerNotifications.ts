"use client";

/**
 * usePlayerNotifications — surfaces in-app realtime pings for the player
 * (Wave 3c D5 / 09-implementation-plan §D5).
 *
 * Subscribes to the consolidated `campaign:{campaignId}` channel (per
 * project rule "NÃO crie canal Supabase novo") and tracks unread counts
 * for the three Player notification streams that decorate the Diário tab:
 *
 *   - note:received    — Mestre sent a private note to this character.
 *   - quest:assigned   — Mestre assigned a quest to this character.
 *   - quest:updated    — Mestre changed status / details of a quest the
 *                        player participates in.
 *
 * The hook keeps three category counters (`badges.diario`, `badges.mapa`,
 * `badges.arsenal`) so the tab bar can show a per-tab badge later. Today
 * only `diario` increments — the other tabs are reserved hooks for D8/D9.
 *
 * Filter contract: events that include a `targetCharacterId` are kept only
 * when they match the `characterId` prop. Events without a target are
 * treated as campaign-wide (every player sees them).
 *
 * `markAsRead` accepts either:
 *   - a notification id (for fine-grained per-row dismissal), OR
 *   - a category key (for "mark all read on this tab"); category keys are
 *     `diario`, `mapa`, `arsenal`.
 *
 * Notifications are kept in-memory for the session — long-term persistence
 * is out of scope (Wave 4 considers a `player_notifications` table).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  RealtimePlayerNoteReceived,
  RealtimeQuestAssigned,
  RealtimeQuestUpdated,
} from "@/lib/types/realtime";

export type PlayerNotificationCategory = "diario" | "mapa" | "arsenal";

export interface PlayerNotification {
  id: string;
  category: PlayerNotificationCategory;
  kind: "note:received" | "quest:assigned" | "quest:updated";
  title?: string;
  refId: string; // noteId / questId
  receivedAt: string;
}

export interface PlayerNotificationsResult {
  unreadCount: number;
  badges: Record<PlayerNotificationCategory, number>;
  notifications: PlayerNotification[];
  /** Mark a single notification id OR every notification of a category as read. */
  markAsRead: (idOrCategory: string | PlayerNotificationCategory) => void;
  /** Clear all unread notifications (logout / explicit dismiss). */
  clearAll: () => void;
}

interface UsePlayerNotificationsOptions {
  /** Optional override — defaults to true. Lets callers gate via a flag. */
  enabled?: boolean;
}

const ALL_CATEGORIES: PlayerNotificationCategory[] = [
  "diario",
  "mapa",
  "arsenal",
];

function isCategory(s: string): s is PlayerNotificationCategory {
  return (ALL_CATEGORIES as string[]).includes(s);
}

export function usePlayerNotifications(
  campaignId: string,
  characterId: string,
  options: UsePlayerNotificationsOptions = {},
): PlayerNotificationsResult {
  const { enabled = true } = options;
  const [notifications, setNotifications] = useState<PlayerNotification[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const handleNoteReceived = useCallback(
    (payload: RealtimePlayerNoteReceived) => {
      if (payload.targetCharacterId && payload.targetCharacterId !== characterId)
        return;
      setNotifications((prev) => [
        {
          id: `note-${payload.noteId}-${payload.timestamp}`,
          category: "diario",
          kind: "note:received",
          title: payload.title,
          refId: payload.noteId,
          receivedAt: payload.timestamp,
        },
        ...prev,
      ]);
    },
    [characterId],
  );

  const handleQuestAssigned = useCallback(
    (payload: RealtimeQuestAssigned) => {
      if (payload.targetCharacterId && payload.targetCharacterId !== characterId)
        return;
      setNotifications((prev) => [
        {
          id: `quest-assigned-${payload.questId}-${payload.timestamp}`,
          category: "diario",
          kind: "quest:assigned",
          title: payload.questTitle,
          refId: payload.questId,
          receivedAt: payload.timestamp,
        },
        ...prev,
      ]);
    },
    [characterId],
  );

  const handleQuestUpdated = useCallback(
    (payload: RealtimeQuestUpdated) => {
      if (payload.targetCharacterId && payload.targetCharacterId !== characterId)
        return;
      setNotifications((prev) => [
        {
          id: `quest-updated-${payload.questId}-${payload.timestamp}`,
          category: "diario",
          kind: "quest:updated",
          title: payload.questTitle,
          refId: payload.questId,
          receivedAt: payload.timestamp,
        },
        ...prev,
      ]);
    },
    [characterId],
  );

  useEffect(() => {
    if (!enabled || !campaignId) return;
    const supabase = createClient();
    const ch = supabase.channel(`campaign:${campaignId}`, {
      config: { broadcast: { self: false } },
    });

    ch.on(
      "broadcast",
      { event: "note:received" },
      (msg: { event: string; payload: unknown }) =>
        handleNoteReceived(msg.payload as RealtimePlayerNoteReceived),
    );
    ch.on(
      "broadcast",
      { event: "quest:assigned" },
      (msg: { event: string; payload: unknown }) =>
        handleQuestAssigned(msg.payload as RealtimeQuestAssigned),
    );
    ch.on(
      "broadcast",
      { event: "quest:updated" },
      (msg: { event: string; payload: unknown }) =>
        handleQuestUpdated(msg.payload as RealtimeQuestUpdated),
    );

    ch.subscribe();
    channelRef.current = ch;

    return () => {
      ch.unsubscribe();
      if (channelRef.current === ch) channelRef.current = null;
    };
  }, [
    enabled,
    campaignId,
    handleNoteReceived,
    handleQuestAssigned,
    handleQuestUpdated,
  ]);

  const markAsRead = useCallback(
    (idOrCategory: string | PlayerNotificationCategory) => {
      setNotifications((prev) => {
        if (isCategory(idOrCategory)) {
          return prev.filter((n) => n.category !== idOrCategory);
        }
        return prev.filter((n) => n.id !== idOrCategory);
      });
    },
    [],
  );

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const badges = useMemo<Record<PlayerNotificationCategory, number>>(() => {
    const acc: Record<PlayerNotificationCategory, number> = {
      diario: 0,
      mapa: 0,
      arsenal: 0,
    };
    for (const n of notifications) acc[n.category] += 1;
    return acc;
  }, [notifications]);

  return {
    unreadCount: notifications.length,
    badges,
    notifications,
    markAsRead,
    clearAll,
  };
}
