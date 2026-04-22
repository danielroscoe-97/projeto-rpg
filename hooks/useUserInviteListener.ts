"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeUserInvite } from "@/lib/types/realtime";
import { CombatInviteToast } from "@/components/notifications/CombatInviteToast";
import { createElement } from "react";

interface UseUserInviteListenerOptions {
  /** auth.uid() — usado para filtrar auto-convite do próprio DM. */
  userId: string | null;
}

/**
 * P2 channel consolidation (2026-04-22) — substitui `useCombatInviteListener`.
 *
 * Assina UM ÚNICO canal `user-invites:{userId}` (independente do número de
 * campanhas em que o user participa). Reduz N canais → 1 por usuário,
 * eliminando o `ChannelRateLimitReached` no Free tier (200 canais/projeto)
 * que estava travando o subscribe do DM em prod.
 *
 * O servidor (`/api/combat/invite/dispatch`) faz fan-out para cada
 * `playerUserId` via `user-invites:{playerUserId}` — a lista de destinatários
 * é resolvida server-side (`campaign_members.status='active'`), então o
 * cliente não precisa mais conhecer `campaignIds` (diferente do listener
 * antigo que abria 1 canal por campanha).
 *
 * Combat Parity: Auth-only (guest/anon não chegam aqui — /app/* exige auth).
 *
 * Resilient Reconnection: fallback durável continua via `player_notifications`
 * + `NotificationBell` (recuperação ao montar).
 */
export function useUserInviteListener({
  userId,
}: UseUserInviteListenerOptions): void {
  const t = useTranslations("combat_invite_toast");
  const router = useRouter();
  const pathname = usePathname();

  const seenSessionIdsRef = useRef<Set<string>>(new Set());

  const tRef = useRef(t);
  tRef.current = t;
  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase.channel(`user-invites:${userId}`);

    channel.on(
      "broadcast",
      { event: "user:combat_invite" },
      (msg: { payload?: unknown }) => {
        const payload = (msg?.payload ?? null) as RealtimeUserInvite | null;
        if (!payload || payload.type !== "user:combat_invite") return;

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
      },
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
