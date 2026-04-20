"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface QuickSwitcherCampaign {
  id: string;
  name: string;
}

export interface QuickSwitcherCharacter {
  id: string;
  name: string;
  campaign_id: string | null;
}

export interface QuickSwitcherEntity {
  id: string;
  name: string;
  kind: "npc" | "location" | "faction" | "quest";
}

export interface QuickSwitcherNote {
  id: string;
  title: string;
  updated_at: string;
}

interface QuickSwitcherData {
  campaigns: QuickSwitcherCampaign[];
  characters: QuickSwitcherCharacter[];
  entities: QuickSwitcherEntity[];
  notes: QuickSwitcherNote[];
  isLoading: boolean;
  /** Force re-fetch (e.g. after user opens the palette) */
  refresh: () => void;
}

/**
 * Aggregates user's campaigns + characters + (optionally) the current
 * campaign's NPCs/locations/factions/quests + recent notes for the Ctrl+K
 * Quick Switcher.
 *
 * - Cache-on-first-open: fetches when `enabled` toggles true.
 * - Refetches when `currentCampaignId` changes so entity list is scoped.
 * - Silently skips fetch errors (palette remains usable with SRD results).
 */
export function useQuickSwitcherData(
  enabled: boolean,
  currentCampaignId: string | null,
): QuickSwitcherData {
  const [campaigns, setCampaigns] = useState<QuickSwitcherCampaign[]>([]);
  const [characters, setCharacters] = useState<QuickSwitcherCharacter[]>([]);
  const [entities, setEntities] = useState<QuickSwitcherEntity[]>([]);
  const [notes, setNotes] = useState<QuickSwitcherNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const baseLoadedRef = useRef(false);
  const campaignLoadedRef = useRef<string | null>(null);

  const refresh = useCallback(() => {
    baseLoadedRef.current = false;
    campaignLoadedRef.current = null;
    setRefreshTick((n) => n + 1);
  }, []);

  // Base fetch: campaigns + characters (once per session)
  useEffect(() => {
    if (!enabled) return;
    if (baseLoadedRef.current) return;
    baseLoadedRef.current = true;

    let cancelled = false;
    const supabase = createClient();
    setIsLoading(true);

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const [campaignsRes, charactersRes] = await Promise.all([
          supabase
            .from("campaigns")
            .select("id, name, is_archived")
            .eq("owner_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(20),
          supabase
            .from("player_characters")
            .select("id, name, campaign_id")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(30),
        ]);
        if (cancelled) return;
        const campaignRows = (campaignsRes.data ?? []) as Array<{ id: string; name: string; is_archived: boolean | null }>;
        const characterRows = (charactersRes.data ?? []) as Array<{ id: string; name: string; campaign_id: string | null }>;
        const cs = campaignRows.filter((c) => !c.is_archived);
        setCampaigns(cs.map((c) => ({ id: c.id, name: c.name })));
        setCharacters(
          characterRows.map((ch) => ({
            id: ch.id,
            name: ch.name,
            campaign_id: ch.campaign_id,
          })),
        );
      } catch {
        // ignore — palette remains functional without this data
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, refreshTick]);

  // Entities + notes for the current campaign
  useEffect(() => {
    if (!enabled) return;
    if (!currentCampaignId) {
      setEntities([]);
      setNotes([]);
      campaignLoadedRef.current = null;
      return;
    }
    if (campaignLoadedRef.current === currentCampaignId) return;
    campaignLoadedRef.current = currentCampaignId;

    let cancelled = false;
    const supabase = createClient();

    (async () => {
      try {
        const [npcsRes, locationsRes, factionsRes, questsRes, notesRes] = await Promise.all([
          supabase
            .from("campaign_npcs")
            .select("id, name")
            .eq("campaign_id", currentCampaignId)
            .limit(30),
          supabase
            .from("campaign_locations")
            .select("id, name")
            .eq("campaign_id", currentCampaignId)
            .limit(30),
          supabase
            .from("campaign_factions")
            .select("id, name")
            .eq("campaign_id", currentCampaignId)
            .limit(30),
          supabase
            .from("campaign_quests")
            .select("id, title")
            .eq("campaign_id", currentCampaignId)
            .limit(30),
          supabase
            .from("campaign_notes")
            .select("id, title, updated_at")
            .eq("campaign_id", currentCampaignId)
            .order("updated_at", { ascending: false })
            .limit(10),
        ]);
        if (cancelled) return;

        type NameRow = { id: string; name: string };
        type QuestRow = { id: string; title: string };
        type NoteRow = { id: string; title: string | null; updated_at: string | null };

        const npcRows = (npcsRes.data ?? []) as NameRow[];
        const locationRows = (locationsRes.data ?? []) as NameRow[];
        const factionRows = (factionsRes.data ?? []) as NameRow[];
        const questRows = (questsRes.data ?? []) as QuestRow[];
        const noteRows = (notesRes.data ?? []) as NoteRow[];

        const combined: QuickSwitcherEntity[] = [
          ...npcRows.map((r) => ({ id: r.id, name: r.name, kind: "npc" as const })),
          ...locationRows.map((r) => ({ id: r.id, name: r.name, kind: "location" as const })),
          ...factionRows.map((r) => ({ id: r.id, name: r.name, kind: "faction" as const })),
          ...questRows.map((r) => ({ id: r.id, name: r.title ?? "", kind: "quest" as const })),
        ];
        setEntities(combined);
        setNotes(
          noteRows.map((n) => ({
            id: n.id,
            title: n.title ?? "",
            updated_at: n.updated_at ?? "",
          })),
        );
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, currentCampaignId, refreshTick]);

  return useMemo(
    () => ({ campaigns, characters, entities, notes, isLoading, refresh }),
    [campaigns, characters, entities, notes, isLoading, refresh],
  );
}
