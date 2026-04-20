"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCombatInviteListener } from "@/hooks/useCombatInviteListener";

interface CombatInviteListenerMountProps {
  userId: string;
}

/**
 * Wave 5 (F19) — Mount adapter para `useCombatInviteListener`.
 *
 * Carrega as campanhas onde o usuário é membro ativo (ou DM) e passa os IDs
 * pro hook, que abre um canal por campanha (spec §3.6 — mesmo pattern de
 * `subscribeToDashboardMembers`).
 *
 * - Inclui campanhas onde o usuário é dono (DM) porque o hook já filtra o
 *   próprio DM via `dm_user_id === userId` — e precisamos cobrir o caso
 *   de multi-tab do próprio DM (dedup por session_id).
 * - Recarrega membership quando um INSERT novo em campaign_members chega
 *   (player aceitou convite do DM enquanto a sessão já estava aberta).
 */
export function CombatInviteListenerMount({
  userId,
}: CombatInviteListenerMountProps) {
  const [campaignIds, setCampaignIds] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let cancelled = false;

    const loadMembership = async () => {
      // Union of: campaigns I own + campaigns I'm an active member of.
      const [ownedRes, memberRes] = await Promise.all([
        supabase.from("campaigns").select("id").eq("owner_id", userId),
        supabase
          .from("campaign_members")
          .select("campaign_id")
          .eq("user_id", userId)
          .eq("status", "active"),
      ]);

      if (cancelled) return;

      const owned = (ownedRes.data ?? []).map(
        (r: { id: string }) => r.id,
      );
      const joined = (memberRes.data ?? []).map(
        (r: { campaign_id: string }) => r.campaign_id,
      );
      const unique = Array.from(new Set([...owned, ...joined])).filter(
        Boolean,
      );
      setCampaignIds(unique);
    };

    loadMembership();

    // Listen for membership changes so newly-joined campaigns start receiving
    // invites without a full page reload.
    const channel = supabase
      .channel(`combat-invite-mount:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "campaign_members",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadMembership();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "campaign_members",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadMembership();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useCombatInviteListener({ userId, campaignIds });

  return null;
}
