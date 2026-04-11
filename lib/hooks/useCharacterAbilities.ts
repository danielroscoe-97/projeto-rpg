"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type {
  CharacterAbility,
  CharacterAbilityInsert,
  CharacterAbilityUpdate,
  AbilityType,
} from "@/lib/types/database";

export function useCharacterAbilities(characterId: string) {
  const [abilities, setAbilities] = useState<CharacterAbility[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const deletingRef = useRef(new Set<string>());

  // Fetch
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("character_abilities")
        .select("*")
        .eq("player_character_id", characterId)
        .order("display_order", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load abilities");
      }
      setAbilities(data ?? []);
      setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [characterId, supabase]);

  // Add ability
  const addAbility = useCallback(
    async (
      input: Omit<CharacterAbilityInsert, "player_character_id" | "display_order">
    ) => {
      const maxOrder = abilities.reduce(
        (max, a) => Math.max(max, a.display_order),
        -1
      );
      const { data, error } = await supabase
        .from("character_abilities")
        .insert({
          ...input,
          player_character_id: characterId,
          display_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) {
        toast.error("Failed to add ability");
        return { data: null, error };
      }
      if (data) setAbilities((prev) => [...prev, data]);
      return { data, error: null };
    },
    [characterId, abilities, supabase]
  );

  // Update ability (optimistic)
  const updateAbility = useCallback(
    async (id: string, updates: CharacterAbilityUpdate) => {
      const original = abilities.find((a) => a.id === id);
      if (!original) return { data: null, error: new Error("Not found") };

      setAbilities((current) =>
        current.map((a) =>
          a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a
        )
      );
      const { error } = await supabase
        .from("character_abilities")
        .update(updates)
        .eq("id", id);
      if (error) {
        setAbilities((current) =>
          current.map((a) => (a.id === id ? original : a))
        );
        toast.error("Failed to update ability");
        return { data: null, error };
      }
      return { data: null, error: null };
    },
    [abilities, supabase]
  );

  // Toggle dot (use/restore) — same pattern as resource trackers
  const toggleDot = useCallback(
    (abilityId: string, dotIndex: number) => {
      const ability = abilities.find((a) => a.id === abilityId);
      if (!ability || ability.max_uses == null) return;

      const filled = ability.max_uses - ability.current_uses;
      let newCurrent: number;

      if (dotIndex < filled) {
        newCurrent = ability.current_uses + 1;
      } else {
        newCurrent = ability.current_uses - 1;
      }

      newCurrent = Math.max(0, Math.min(ability.max_uses, newCurrent));
      updateAbility(abilityId, { current_uses: newCurrent });
    },
    [abilities, updateAbility]
  );

  // Delete ability (optimistic)
  const deleteAbility = useCallback(
    async (id: string) => {
      if (deletingRef.current.has(id)) return;
      deletingRef.current.add(id);
      const original = abilities.find((a) => a.id === id);
      setAbilities((current) => current.filter((a) => a.id !== id));
      const { error } = await supabase
        .from("character_abilities")
        .delete()
        .eq("id", id);
      deletingRef.current.delete(id);
      if (error) {
        if (original) {
          setAbilities((current) => {
            const already = current.some((a) => a.id === id);
            return already ? current : [...current, original].sort((a, b) => a.display_order - b.display_order);
          });
        }
        toast.error("Failed to delete ability");
      }
    },
    [abilities, supabase]
  );

  // Reset by type — for RestResetPanel integration
  const resetByType = useCallback(
    async (resetTypes: string[]) => {
      const affectedOriginals = abilities.filter(
        (a) =>
          a.reset_type != null &&
          resetTypes.includes(a.reset_type) &&
          a.current_uses > 0
      );
      if (affectedOriginals.length === 0) return 0;

      const affectedIds = new Set(affectedOriginals.map((a) => a.id));

      // Optimistic
      setAbilities((current) =>
        current.map((a) =>
          a.reset_type != null && resetTypes.includes(a.reset_type)
            ? { ...a, current_uses: 0 }
            : a
        )
      );

      const ids = Array.from(affectedIds);
      const { error } = await supabase
        .from("character_abilities")
        .update({ current_uses: 0 })
        .in("id", ids);

      if (error) {
        // Rollback: restore only affected items
        setAbilities((current) =>
          current.map((a) => {
            if (!affectedIds.has(a.id)) return a;
            const orig = affectedOriginals.find((o) => o.id === a.id);
            return orig ?? a;
          })
        );
        toast.error("Failed to reset abilities");
      }

      return affectedOriginals.length;
    },
    [abilities, supabase]
  );

  // Reset single
  const resetAbility = useCallback(
    (id: string) => {
      updateAbility(id, { current_uses: 0 });
    },
    [updateAbility]
  );

  // Count affected by reset type
  const countByResetType = useCallback(
    (resetTypes: string[]) => {
      return abilities.filter(
        (a) =>
          a.reset_type != null &&
          resetTypes.includes(a.reset_type) &&
          a.current_uses > 0
      ).length;
    },
    [abilities]
  );

  // Filter by type
  const filterByType = useCallback(
    (type: AbilityType | "all") => {
      if (type === "all") return abilities;
      return abilities.filter((a) => a.ability_type === type);
    },
    [abilities]
  );

  return {
    abilities,
    loading,
    addAbility,
    updateAbility,
    toggleDot,
    deleteAbility,
    resetByType,
    resetAbility,
    countByResetType,
    filterByType,
  };
}
