"use client";

/**
 * User-scoped realtime broadcasts for Epic 04 Story 04-F (Player-as-DM
 * upsell wizard role flip).
 *
 * Separate module from `lib/realtime/broadcast.ts` (session-scoped
 * channels) because this touches user-level state across all open tabs
 * of the same authenticated user, not session participants.
 *
 * D9 contract (Epic 04 spec §Área 3):
 *   - Channel name: `user:{userId}` (NOT `campaign:*`).
 *   - Event name:   `role_updated`
 *   - Payload:      `{ from: UserRole, to: UserRole }`
 *   - `self: false` so the emitting tab does not loop its own payload
 *     back into the role store.
 *
 * Receive side lives in `lib/realtime/user-role-listener.ts` (mounted
 * from the app shell); it subscribes on login, forwards payloads into
 * `useRoleStore` so every other tab re-reads the new role without a
 * full reload. Resilient Reconnection rule: this broadcast never
 * touches `session_token_id` or any heartbeat state — role is a pure
 * user property, so Test 10 (sessionStorage preserved across tabs) is
 * satisfied trivially.
 *
 * Fire-and-forget: a failed broadcast (network blip, Supabase realtime
 * degraded) leaves the user with a stale role label in other tabs until
 * their next refresh. That is acceptable — the authoritative state is
 * in Postgres, and `useRoleStore.loadRole()` re-reads it on every mount.
 */

import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/stores/role-store";

export type RoleUpdatedPayload = {
  from: UserRole;
  to: UserRole;
};

/**
 * Broadcasts a `role_updated` event on `user:{userId}`. Creates a
 * throwaway channel, subscribes, sends, unsubscribes. Never throws —
 * any realtime error is swallowed so the caller's post-broadcast flow
 * (usually navigation) proceeds.
 */
export async function broadcastRoleUpdated(
  userId: string,
  payload: RoleUpdatedPayload,
  timeoutMs = 2500,
): Promise<void> {
  if (!userId || typeof window === "undefined") return;

  let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
    null;
  try {
    const supabase = createClient();
    channel = supabase.channel(`user:${userId}`, {
      config: { broadcast: { self: false } },
    });

    // Wait for SUBSCRIBED before sending — sending on an un-subscribed
    // channel is silently dropped by Supabase. Bound the wait so a
    // realtime outage doesn't block the wizard's success flow.
    const subscribed = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs);
      channel!.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timer);
          resolve(true);
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          clearTimeout(timer);
          resolve(false);
        }
      });
    });

    if (!subscribed) return;

    await channel.send({
      type: "broadcast",
      event: "role_updated",
      payload,
    });
  } catch {
    // Swallow — broadcast is best-effort.
  } finally {
    if (channel) {
      try {
        channel.unsubscribe();
      } catch {
        /* nothing */
      }
    }
  }
}
