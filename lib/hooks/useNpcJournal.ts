"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { NpcNote, NpcNoteInsert, NpcRelationship } from "@/lib/types/database";

// M-1: Order matches spec cycle: unknown → ally → enemy → neutral → unknown
const RELATIONSHIP_ORDER: NpcRelationship[] = ["unknown", "ally", "enemy", "neutral"];

export function useNpcJournal(characterId: string, campaignId: string) {
  const [npcs, setNpcs] = useState<NpcNote[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingRef = useRef<Record<string, Partial<NpcNote>>>({});

  // Fetch (I-2: error handling, I-7: race condition guard)
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("player_npc_notes")
        .select("*")
        .eq("player_character_id", characterId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load NPCs");
        setLoading(false);
        return;
      }
      setNpcs(data ?? []);
      setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [characterId, supabase]);

  // I-4: memoized sort
  const sortedNpcs = useMemo(
    () =>
      [...npcs].sort((a, b) => {
        const aIdx = RELATIONSHIP_ORDER.indexOf(a.relationship);
        const bIdx = RELATIONSHIP_ORDER.indexOf(b.relationship);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.npc_name.localeCompare(b.npc_name);
      }),
    [npcs]
  );

  // Add NPC (C-3: rollback on error)
  const addNpc = useCallback(
    async (input: { npc_name: string; relationship?: NpcRelationship; notes?: string }) => {
      const insert: NpcNoteInsert = {
        player_character_id: characterId,
        campaign_id: campaignId,
        npc_name: input.npc_name,
        relationship: input.relationship ?? "unknown",
        notes: input.notes ?? null,
      };
      const tempId = crypto.randomUUID();
      const optimistic: NpcNote = {
        ...insert,
        id: tempId,
        npc_name: insert.npc_name,
        relationship: insert.relationship ?? "unknown",
        notes: insert.notes ?? null,
        player_character_id: characterId,
        campaign_id: campaignId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setNpcs((prev) => [optimistic, ...prev]);

      const { data, error } = await supabase
        .from("player_npc_notes")
        .insert(insert)
        .select()
        .single();

      if (error || !data) {
        setNpcs((prev) => prev.filter((n) => n.id !== tempId));
        toast.error("Failed to add NPC");
        return null;
      }
      setNpcs((prev) => prev.map((n) => (n.id === tempId ? data : n)));
      return data;
    },
    [characterId, campaignId, supabase]
  );

  // C-6: Fix stale closure — use functional setNpcs to read current state
  const cycleRelationship = useCallback(
    async (npcId: string) => {
      let nextRelationship: NpcRelationship = "unknown";
      setNpcs((prev) =>
        prev.map((n) => {
          if (n.id !== npcId) return n;
          const currentIdx = RELATIONSHIP_ORDER.indexOf(n.relationship);
          nextRelationship = RELATIONSHIP_ORDER[(currentIdx + 1) % RELATIONSHIP_ORDER.length];
          return { ...n, relationship: nextRelationship };
        })
      );

      await supabase
        .from("player_npc_notes")
        .update({ relationship: nextRelationship })
        .eq("id", npcId);
    },
    [supabase]
  );

  // Update notes with debounce (I-3: error toast on save failure)
  const updateNpcNotes = useCallback(
    (npcId: string, notes: string) => {
      setNpcs((prev) =>
        prev.map((n) =>
          n.id === npcId ? { ...n, notes, updated_at: new Date().toISOString() } : n
        )
      );

      pendingRef.current[npcId] = { ...pendingRef.current[npcId], notes };

      if (debounceTimers.current[npcId]) {
        clearTimeout(debounceTimers.current[npcId]);
      }

      debounceTimers.current[npcId] = setTimeout(async () => {
        const pending = pendingRef.current[npcId];
        if (!pending) return;
        delete pendingRef.current[npcId];
        const { error } = await supabase
          .from("player_npc_notes")
          .update(pending)
          .eq("id", npcId);
        if (error) toast.error("Failed to save NPC notes");
      }, 1000);
    },
    [supabase]
  );

  // Delete NPC (I-3: rollback on error)
  const deleteNpc = useCallback(
    async (npcId: string) => {
      const backup = npcs.find((n) => n.id === npcId);
      setNpcs((prev) => prev.filter((n) => n.id !== npcId));
      if (debounceTimers.current[npcId]) {
        clearTimeout(debounceTimers.current[npcId]);
        delete pendingRef.current[npcId];
      }
      const { error } = await supabase
        .from("player_npc_notes")
        .delete()
        .eq("id", npcId);
      if (error && backup) {
        setNpcs((prev) => [backup, ...prev]);
        toast.error("Failed to delete NPC");
      }
    },
    [supabase, npcs]
  );

  // C-2: Flush pending on beforeunload + unmount
  const flushPendingSync = useCallback(() => {
    const pending = Object.entries(pendingRef.current);
    if (pending.length === 0) return;
    Object.values(debounceTimers.current).forEach(clearTimeout);
    pending.forEach(([npcId, updates]) => {
      supabase
        .from("player_npc_notes")
        .update(updates)
        .eq("id", npcId)
        .then(({ error }: { error: { message: string } | null }) => { if (error) console.error("Flush failed:", error); });
    });
    pendingRef.current = {};
  }, [supabase]);

  useEffect(() => {
    const handleUnload = () => flushPendingSync();
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      flushPendingSync();
    };
  }, [flushPendingSync]);

  return {
    npcs: sortedNpcs,
    loading,
    addNpc,
    cycleRelationship,
    updateNpcNotes,
    deleteNpc,
  };
}
