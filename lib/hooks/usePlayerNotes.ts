"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { JournalEntry, JournalEntryInsert } from "@/lib/types/database";

type NoteType = JournalEntry["type"];

export function usePlayerNotes(characterId: string, campaignId: string) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const pendingRef = useRef<Record<string, Partial<JournalEntry>>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Fetch entries (I-2: error handling)
  useEffect(() => {
    let cancelled = false; // I-7: race condition guard
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("player_journal_entries")
        .select("*")
        .eq("player_character_id", characterId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load notes");
        setLoading(false);
        return;
      }
      setEntries(data ?? []);
      setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [characterId, supabase]);

  // I-6: memoized filters
  const quickNotes = useMemo(() => entries.filter((e) => e.type === "quick_note"), [entries]);
  const journalEntries = useMemo(() => entries.filter((e) => e.type === "journal" || e.type === "lore"), [entries]);

  // Add entry (C-3: rollback on error)
  const addEntry = useCallback(
    async (input: { type: NoteType; content: string; title?: string }) => {
      const insert: JournalEntryInsert = {
        player_character_id: characterId,
        campaign_id: campaignId,
        type: input.type,
        content: input.content,
        title: input.title ?? null,
      };
      const tempId = crypto.randomUUID();
      const optimistic: JournalEntry = {
        ...insert,
        id: tempId,
        type: input.type,
        title: input.title ?? null,
        content: input.content,
        player_character_id: characterId,
        campaign_id: campaignId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setEntries((prev) => [optimistic, ...prev]);

      const { data, error } = await supabase
        .from("player_journal_entries")
        .insert(insert)
        .select()
        .single();

      if (error || !data) {
        // Rollback optimistic insert
        setEntries((prev) => prev.filter((e) => e.id !== tempId));
        toast.error("Failed to save note");
        return null;
      }
      setEntries((prev) => prev.map((e) => (e.id === tempId ? data : e)));
      return data;
    },
    [characterId, campaignId, supabase]
  );

  // Update entry with per-entry debounce (I-3: error handling in debounced save)
  const updateEntry = useCallback(
    (entryId: string, updates: { content?: string; title?: string }) => {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, ...updates, updated_at: new Date().toISOString() } : e
        )
      );

      pendingRef.current[entryId] = {
        ...pendingRef.current[entryId],
        ...updates,
      };

      if (debounceTimers.current[entryId]) {
        clearTimeout(debounceTimers.current[entryId]);
      }

      debounceTimers.current[entryId] = setTimeout(async () => {
        const pending = pendingRef.current[entryId];
        if (!pending) return;
        delete pendingRef.current[entryId];
        const { error } = await supabase
          .from("player_journal_entries")
          .update(pending)
          .eq("id", entryId);
        if (error) toast.error("Failed to save changes");
      }, 1000);
    },
    [supabase]
  );

  // Delete entry (I-3: rollback on error)
  const deleteEntry = useCallback(
    async (entryId: string) => {
      const backup = entries.find((e) => e.id === entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      if (debounceTimers.current[entryId]) {
        clearTimeout(debounceTimers.current[entryId]);
        delete pendingRef.current[entryId];
      }
      const { error } = await supabase
        .from("player_journal_entries")
        .delete()
        .eq("id", entryId);
      if (error && backup) {
        setEntries((prev) => [backup, ...prev]);
        toast.error("Failed to delete note");
      }
    },
    [supabase, entries]
  );

  // C-1: Real flush for beforeunload + unmount
  const flushPendingSync = useCallback(() => {
    const pending = Object.entries(pendingRef.current);
    if (pending.length === 0) return;
    // Fire-and-forget saves, clear timers
    Object.values(debounceTimers.current).forEach(clearTimeout);
    pending.forEach(([entryId, updates]) => {
      supabase
        .from("player_journal_entries")
        .update(updates)
        .eq("id", entryId)
        .then(({ error }: { error: { message: string } | null }) => { if (error) console.error("Flush failed:", error); });
    });
    pendingRef.current = {};
  }, [supabase]);

  useEffect(() => {
    const handleUnload = () => flushPendingSync();
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      // Flush pending on unmount
      flushPendingSync();
    };
  }, [flushPendingSync]);

  return {
    quickNotes,
    journalEntries,
    loading,
    addEntry,
    updateEntry,
    deleteEntry,
  };
}
