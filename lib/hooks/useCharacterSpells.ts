"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { CharacterSpell, CharacterSpellInsert, SpellStatus } from "@/lib/types/database";

export function useCharacterSpells(characterId: string) {
  const [spells, setSpells] = useState<CharacterSpell[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("character_spells")
        .select("*")
        .eq("player_character_id", characterId)
        .order("spell_level", { ascending: true })
        .order("spell_name", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load spells");
        setLoading(false);
        return;
      }
      setSpells(data ?? []);
      setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [characterId, supabase]);

  // Grouped by level
  const spellsByLevel = useMemo(() => {
    const groups: Record<number, CharacterSpell[]> = {};
    for (const spell of spells) {
      if (!groups[spell.spell_level]) groups[spell.spell_level] = [];
      groups[spell.spell_level].push(spell);
    }
    return groups;
  }, [spells]);

  const cantrips = useMemo(() => spells.filter((s) => s.spell_level === 0), [spells]);
  const leveledSpells = useMemo(() => spells.filter((s) => s.spell_level > 0), [spells]);

  // Add spell
  const addSpell = useCallback(
    async (input: CharacterSpellInsert) => {
      const tempId = crypto.randomUUID();
      const optimistic: CharacterSpell = {
        id: tempId,
        player_character_id: characterId,
        spell_name: input.spell_name,
        spell_level: input.spell_level ?? 0,
        school: input.school ?? null,
        description_short: input.description_short ?? null,
        compendium_ref: input.compendium_ref ?? null,
        status: input.status ?? "known",
        is_concentration: input.is_concentration ?? false,
        is_ritual: input.is_ritual ?? false,
        casting_time: input.casting_time ?? null,
        range_text: input.range_text ?? null,
        components: input.components ?? null,
        duration: input.duration ?? null,
        created_at: new Date().toISOString(),
      };
      setSpells((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from("character_spells")
        .insert({ ...input, player_character_id: characterId })
        .select()
        .single();

      if (error || !data) {
        setSpells((prev) => prev.filter((s) => s.id !== tempId));
        toast.error("Failed to add spell");
        return null;
      }
      setSpells((prev) => prev.map((s) => (s.id === tempId ? data : s)));
      return data;
    },
    [characterId, supabase]
  );

  // Toggle status
  const toggleStatus = useCallback(
    async (spellId: string, newStatus: SpellStatus) => {
      const backup = spells.find((s) => s.id === spellId);
      setSpells((prev) =>
        prev.map((s) => (s.id === spellId ? { ...s, status: newStatus } : s))
      );
      const { error } = await supabase
        .from("character_spells")
        .update({ status: newStatus })
        .eq("id", spellId);
      if (error && backup) {
        setSpells((prev) =>
          prev.map((s) => (s.id === spellId ? backup : s))
        );
        toast.error("Failed to update spell");
      }
    },
    [supabase, spells]
  );

  // Remove spell
  const removeSpell = useCallback(
    async (spellId: string) => {
      const backup = spells.find((s) => s.id === spellId);
      setSpells((prev) => prev.filter((s) => s.id !== spellId));
      const { error } = await supabase
        .from("character_spells")
        .delete()
        .eq("id", spellId);
      if (error && backup) {
        setSpells((prev) => [...prev, backup]);
        toast.error("Failed to remove spell");
      }
    },
    [supabase, spells]
  );

  return {
    spells,
    spellsByLevel,
    cantrips,
    leveledSpells,
    loading,
    addSpell,
    toggleStatus,
    removeSpell,
  };
}
