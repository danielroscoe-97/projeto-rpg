"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeUserInvite } from "@/lib/types/realtime";

interface ActiveCombatBannerProps {
  campaignId: string;
  /** Viewer's auth.uid() — needed to subscribe to `user-invites:{userId}`. */
  userId: string;
  /** When truthy on mount, we already know combat is live server-side. */
  initialSessionId?: string | null;
  initialJoinToken?: string | null;
  initialEncounterName?: string | null;
}

/**
 * Wave 5 (F19) — Banner persistente "Combate em andamento" para /app/campaigns/[id].
 *
 * Spec §4.2: banner permanente no topo enquanto sessions.is_active=true AND
 * encounters.is_active=true. Fonte de verdade:
 *   - SSR initial props (hydratation path — se já há encounter ativo, já mostra)
 *   - broadcast `user-invites:{userId}` (P2 consolidation — migrado do legacy
 *     `campaign:{id}:invites` em 2026-04-22 para eliminar N canais por DM).
 *   - fallback poll 30s (catch case onde broadcast falhou e a page ficou aberta)
 *
 * Filter `payload.campaign_id === campaignId` garante que invites de outras
 * campanhas não atualizam este banner (o canal user-scoped delivery invites
 * de todas as campanhas do usuário).
 *
 * CTA: link direto para /join/{token}, bypassing o form anônimo (spec §3.6).
 */
export function ActiveCombatBanner({
  campaignId,
  userId,
  initialSessionId = null,
  initialJoinToken = null,
  initialEncounterName = null,
}: ActiveCombatBannerProps) {
  const t = useTranslations("combat_invite_toast");

  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [joinToken, setJoinToken] = useState<string | null>(initialJoinToken);
  const [encounterName, setEncounterName] = useState<string | null>(
    initialEncounterName,
  );

  // Helper: fetch latest active session + token (used on mount + poll fallback).
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const refresh = async () => {
      const { data: session } = await supabase
        .from("sessions")
        .select("id, name")
        .eq("campaign_id", campaignId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (!session) {
        setSessionId(null);
        setJoinToken(null);
        setEncounterName(null);
        return;
      }

      const [{ data: encounter }, { data: token }] = await Promise.all([
        supabase
          .from("encounters")
          .select("name, is_active")
          .eq("session_id", session.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("session_tokens")
          .select("token")
          .eq("session_id", session.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (!encounter) {
        // Session active but no active encounter = lobby only, no banner.
        setSessionId(null);
        setJoinToken(null);
        setEncounterName(null);
        return;
      }

      setSessionId(session.id as string);
      setJoinToken((token?.token as string | undefined) ?? null);
      setEncounterName(
        (encounter.name as string | null | undefined) ?? null,
      );
    };

    // Always refresh once on mount (covers case where SSR props are stale).
    refresh();

    // Broadcast: jump immediately when the DM starts a new combat.
    // P2 consolidation — listens on the user-scoped channel so the tenant
    // does not accumulate N `campaign:{id}:invites` channels per DM.
    // Filter by `payload.campaign_id === campaignId` because the user-scoped
    // channel fans out invites from every campaign the user is a member of.
    const channel = supabase
      .channel(`user-invites:${userId}`)
      .on(
        "broadcast",
        { event: "user:combat_invite" },
        (msg: { payload?: unknown }) => {
          const payload = (msg?.payload ?? null) as RealtimeUserInvite | null;
          if (!payload || payload.campaign_id !== campaignId) return;
          setSessionId(payload.session_id);
          setJoinToken(payload.join_token);
          setEncounterName(payload.encounter_name);
        },
      )
      .subscribe();

    // Polling fallback for robustness (spec §5.1 defense-in-depth). 30s cadence.
    // Also covers pre-P2 clients whose broadcasts still go on the legacy
    // channel: they're caught here within 30s.
    const interval = setInterval(refresh, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [campaignId, userId]);

  if (!sessionId || !joinToken) return null;

  const href = `/join/${joinToken}`;
  const label = encounterName?.trim() || t("default_encounter_fallback");

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 shadow-sm"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-300">
        <Swords className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-red-200">
          {t("title", { dm: t("default_dm") })}
        </p>
        <p className="truncate text-xs text-red-200/80">{label}</p>
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1 rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-surface-primary transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
      >
        {t("cta_join")}
      </Link>
    </div>
  );
}
