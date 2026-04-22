"use client";

/**
 * UserRoleListenerMount — Epic 04 Story 04-F (Player-as-DM Upsell, D9).
 *
 * Mounts a Supabase Realtime subscription on `user:{userId}` and listens
 * for `role_updated` events emitted by the BecomeDmWizard (or any future
 * surface that flips the role). On receive, calls `useRoleStore` to
 * re-hydrate from the DB so this tab picks up the new role without a
 * reload.
 *
 * Invariants (CLAUDE.md §Resilient Reconnection):
 *   - The subscription does NOT touch `session_token_id`, `sessionStorage`,
 *     or any heartbeat state. Role flip is a pure user-property update.
 *   - If Supabase realtime is unavailable, the listener silently fails
 *     to subscribe; the other tab's role will simply lag until the
 *     next page mount runs `loadRole()`.
 *
 * Mount site: `app/app/layout.tsx`, alongside `CombatInviteListenerMount`.
 *
 * Test 10 (Epic 04 spec §Testing Contract, obrigatório 10): a companion
 * test asserts sessionStorage `session_token_id` identical before/after
 * the broadcast arrives — verified in
 * `tests/upsell/user-role-listener.test.tsx`.
 */

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRoleStore } from "@/lib/stores/role-store";

type UserRoleListenerMountProps = {
  userId: string;
};

export function UserRoleListenerMount({ userId }: UserRoleListenerMountProps) {
  useEffect(() => {
    if (!userId || typeof window === "undefined") return;

    const supabase = createClient();
    const channel = supabase.channel(`user:${userId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "role_updated" }, () => {
      // Re-hydrate role from DB; this is the authoritative read path.
      // We intentionally ignore the payload's `to` field and trust the
      // DB, so a stale or forged broadcast can't poison this tab.
      // `loadRole` is idempotent + short-circuits when already loading.
      // Force a reset first so the short-circuit in loadRole doesn't fire.
      useRoleStore.setState({ initialized: false, loading: false });
      void useRoleStore.getState().loadRole();
    });

    channel.subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch {
        /* teardown best-effort */
      }
    };
  }, [userId]);

  return null;
}
