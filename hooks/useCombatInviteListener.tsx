"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeCombatInvite } from "@/lib/types/realtime";
import { CombatInviteToast } from "@/components/notifications/CombatInviteToast";

interface UseCombatInviteListenerOptions {
  /** auth.uid() — usado para filtrar auto-convite do próprio DM. */
  userId: string | null;
  /** campaigns where the user is an active member. One channel per campaign. */
  campaignIds: string[];
}

/**
 * Wave 5 (F19) — Auto-invite pro Combate (listener do jogador).
 *
 * Montado em `app/app/layout.tsx` (sempre ativo em /app/*). Assina o canal
 * NOVO `campaign:{id}:invites` para cada campanha em que o usuário é member
 * ativo. Quando o DM inicia combate:
 *
 *   1. DM -> dispatchCombatInvite -> /api/combat/invite/dispatch
 *   2. Server broadcasta em `campaign:{id}:invites` + persiste em
 *      player_notifications (fallback offline).
 *   3. Esse hook recebe o payload e mostra toast (dedup por session_id).
 *   4. Clique no toast navega via `router.push` para /join/{token}.
 *
 * Combat Parity: Auth-only (guest/anon NÃO chegam aqui — /app/* exige auth).
 *
 * Resilient Reconnection: se o broadcast falhar ou o player estiver offline,
 * `useNotifications` (via NotificationBell) recupera do player_notifications
 * ao montar — zero-drop garantido por defense-in-depth.
 */
export function useCombatInviteListener({
  userId,
  campaignIds,
}: UseCombatInviteListenerOptions): void {
  const t = useTranslations("combat_invite_toast");
  const router = useRouter();
  const pathname = usePathname();

  const seenSessionIdsRef = useRef<Set<string>>(new Set());
  const channelsRef = useRef<RealtimeChannel[]>([]);

  // Refs keep the effect stable across pathname/translation churn.
  const tRef = useRef(t);
  tRef.current = t;
  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!userId || campaignIds.length === 0) {
      return;
    }

    const supabase = createClient();
    const channels: RealtimeChannel[] = [];

    for (const campaignId of campaignIds) {
      const channelName = `campaign:${campaignId}:invites`;
      const channel = supabase.channel(channelName);

      channel
        .on(
          "broadcast",
          { event: "campaign:combat_invite" },
          (msg: { payload?: unknown }) => {
          const payload = (msg?.payload ?? null) as RealtimeCombatInvite | null;
          if (!payload || payload.type !== "campaign:combat_invite") return;

          // Dedup — same session_id across reconnects, multiple channels, etc.
          if (seenSessionIdsRef.current.has(payload.session_id)) return;
          seenSessionIdsRef.current.add(payload.session_id);

          // Filter: DM must not see own invite.
          if (payload.dm_user_id === userId) return;

          // Don't show toast if the player is already inside the combat UI
          // for this exact session — navigating again would be disruptive.
          const currentPath = pathnameRef.current ?? "";
          if (
            currentPath.startsWith(`/app/combat/${payload.session_id}`) ||
            currentPath.startsWith(`/join/${payload.join_token}`)
          ) {
            return;
          }

          const joinHref = `/join/${payload.join_token}`;

          // Decide toast treatment by route (spec §4):
          //   - /app/dashboard or /app/campaigns/{id} -> persistent, gold CTA
          //   - elsewhere in /app/* -> low-key, 15s auto-dismiss, prefixed
          const inOwnCampaign = currentPath.startsWith(
            `/app/campaigns/${payload.campaign_id}`,
          );
          const inDashboard = currentPath.startsWith("/app/dashboard");
          const isPrimarySurface = inOwnCampaign || inDashboard;

          const duration = isPrimarySurface ? Infinity : 15_000;

          toast.custom(
            (id) => (
              <CombatInviteToast
                toastId={id}
                campaignName={payload.campaign_name}
                dmDisplayName={payload.dm_display_name}
                encounterName={payload.encounter_name}
                lowKey={!isPrimarySurface}
                onJoin={() => {
                  toast.dismiss(id);
                  routerRef.current.push(joinHref);
                }}
                onDismiss={() => {
                  toast.dismiss(id);
                }}
              />
            ),
            {
              duration,
              // Best-effort a11y label for screen readers.
              id: `combat-invite:${payload.session_id}`,
            },
          );

          // Lightweight vibration when primary surface + visible tab.
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
        )
        .subscribe();

      channels.push(channel);
    }

    channelsRef.current = channels;

    return () => {
      for (const ch of channelsRef.current) {
        supabase.removeChannel(ch);
      }
      channelsRef.current = [];
    };
    // campaignIds is memoized upstream via join key; userId is primitive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, campaignIds.join(",")]);
}
