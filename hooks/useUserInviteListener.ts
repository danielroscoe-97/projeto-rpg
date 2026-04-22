"use client";

import { createElement, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { subscribeToUserInvites } from "@/lib/realtime/user-invite-channel";
import { CombatInviteToast } from "@/components/notifications/CombatInviteToast";

interface UseUserInviteListenerOptions {
  /** auth.uid() — usado para filtrar auto-convite do próprio DM. */
  userId: string | null;
}

/**
 * P2 channel consolidation (2026-04-22) — substitui `useCombatInviteListener`.
 *
 * Escuta UM ÚNICO canal `user-invites:{userId}` via `subscribeToUserInvites`
 * (refcounted singleton em lib/realtime/user-invite-channel.ts). Multiplos
 * consumidores (este hook + `ActiveCombatBanner`) compartilham o mesmo
 * canal sem race de teardown — o canal só fecha quando o último
 * consumidor desinscreve.
 *
 * O servidor (`/api/combat/invite/dispatch`) faz fan-out para cada
 * `user_id` ativo via `user-invites:{userId}` — a lista de destinatários
 * é resolvida server-side (`campaign_members.status='active'` + DM por
 * fallback), então o cliente não precisa mais conhecer `campaignIds`
 * (diferente do listener antigo que abria 1 canal por campanha).
 *
 * Combat Parity: Auth-only (guest/anon não chegam aqui — /app/* exige auth).
 *
 * Resilient Reconnection: fallback durável via `player_notifications` +
 * `NotificationBell`.
 */
export function useUserInviteListener({
  userId,
}: UseUserInviteListenerOptions): void {
  const router = useRouter();
  const pathname = usePathname();

  const seenSessionIdsRef = useRef<Set<string>>(new Set());
  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToUserInvites(userId, (payload) => {
      if (seenSessionIdsRef.current.has(payload.session_id)) return;
      seenSessionIdsRef.current.add(payload.session_id);

      if (payload.dm_user_id === userId) return;

      const currentPath = pathnameRef.current ?? "";
      if (
        currentPath.startsWith(`/app/combat/${payload.session_id}`) ||
        currentPath.startsWith(`/join/${payload.join_token}`)
      ) {
        return;
      }

      const joinHref = `/join/${payload.join_token}`;

      const inOwnCampaign = currentPath.startsWith(
        `/app/campaigns/${payload.campaign_id}`,
      );
      const inDashboard = currentPath.startsWith("/app/dashboard");
      const isPrimarySurface = inOwnCampaign || inDashboard;

      const duration = isPrimarySurface ? Infinity : 15_000;

      toast.custom(
        (id) =>
          createElement(CombatInviteToast, {
            toastId: id,
            campaignName: payload.campaign_name,
            dmDisplayName: payload.dm_display_name,
            encounterName: payload.encounter_name,
            lowKey: !isPrimarySurface,
            onJoin: () => {
              toast.dismiss(id);
              routerRef.current.push(joinHref);
            },
            onDismiss: () => {
              toast.dismiss(id);
            },
          }),
        {
          duration,
          id: `combat-invite:${payload.session_id}`,
        },
      );

      if (
        isPrimarySurface &&
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        try {
          navigator.vibrate?.([80, 40, 80]);
        } catch {
          /* ignore */
        }
      }
    });

    return unsubscribe;
  }, [userId]);
}
