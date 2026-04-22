"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeUserInvite } from "@/lib/types/realtime";

/**
 * Refcounted singleton subscription to `user-invites:{userId}`.
 *
 * Why this exists: `createClient()` is a singleton (lib/supabase/client.ts)
 * and `supabase.channel(topic)` dedupes by topic within the client — so if
 * two components (e.g. the global `CombatInviteListenerMount` + the
 * page-scoped `ActiveCombatBanner`) both call `.channel("user-invites:X")`
 * they receive the SAME `RealtimeChannel` instance. The first one to
 * `removeChannel()` tears down the shared instance, silently killing
 * broadcasts for the other consumer.
 *
 * Pattern: each consumer calls `subscribeToUserInvites(userId, callback)`.
 * We keep a `Map<userId, { channel, listeners }>`. First subscriber opens
 * the channel, last one tears it down. Callbacks are fanned out in a
 * `try/catch` so one bad listener cannot starve siblings.
 *
 * Return value is an unsubscribe function — the caller invokes it in the
 * effect cleanup.
 */

type InviteListener = (payload: RealtimeUserInvite) => void;

interface Entry {
  channel: RealtimeChannel;
  listeners: Set<InviteListener>;
}

const entries = new Map<string, Entry>();

export function subscribeToUserInvites(
  userId: string,
  onInvite: InviteListener,
): () => void {
  let entry = entries.get(userId);

  if (!entry) {
    const supabase = createClient();
    const channel = supabase.channel(`user-invites:${userId}`);
    const newEntry: Entry = { channel, listeners: new Set() };
    channel.on(
      "broadcast",
      { event: "user:combat_invite" },
      (msg: { payload?: unknown }) => {
        const payload = (msg?.payload ?? null) as RealtimeUserInvite | null;
        if (!payload || payload.type !== "user:combat_invite") return;
        for (const listener of newEntry.listeners) {
          try {
            listener(payload);
          } catch {
            // Isolate listener errors — one bad consumer must not starve siblings.
          }
        }
      },
    );
    channel.subscribe();
    entries.set(userId, newEntry);
    entry = newEntry;
  }

  entry.listeners.add(onInvite);

  return () => {
    const existing = entries.get(userId);
    if (!existing) return;
    existing.listeners.delete(onInvite);
    if (existing.listeners.size === 0) {
      const supabase = createClient();
      supabase.removeChannel(existing.channel);
      entries.delete(userId);
    }
  };
}

/** Test-only helper — reset module state between test cases. */
export function __resetUserInviteChannelsForTests(): void {
  entries.clear();
}
