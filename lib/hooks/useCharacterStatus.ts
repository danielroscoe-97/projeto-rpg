"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { PlayerCharacter } from "@/lib/types/database";

type CharacterStatus = Pick<
  PlayerCharacter,
  | "id"
  | "current_hp"
  | "max_hp"
  | "hp_temp"
  | "ac"
  | "conditions"
  | "inspiration"
  | "speed"
  | "initiative_bonus"
  | "spell_slots"
  | "spell_save_dc"
  | "name"
  | "race"
  | "class"
  | "level"
  | "subclass"
  | "subrace"
  | "background"
  | "alignment"
  | "str"
  | "dex"
  | "con"
  | "int_score"
  | "wis"
  | "cha_score"
  | "notes"
  | "token_url"
  | "proficiencies"
  // Migration 184 (#58) — A4 header reads these to fill the HD/CD chips.
  | "hit_dice"
  | "class_resources"
>;

export function useCharacterStatus(characterId: string | null) {
  const [character, setCharacter] = useState<CharacterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  // I-08 fix: stable supabase ref
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // C-06 fix: accumulate pending updates and flush together
  const pendingRef = useRef<Partial<PlayerCharacter>>({});
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial data
  useEffect(() => {
    if (!characterId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchCharacter = async () => {
      const { data, error } = await supabase
        .from("player_characters")
        .select(
          "id, current_hp, max_hp, hp_temp, ac, conditions, inspiration, speed, initiative_bonus, spell_slots, spell_save_dc, name, race, class, level, subclass, subrace, background, alignment, str, dex, con, int_score, wis, cha_score, notes, token_url, proficiencies, hit_dice, class_resources"
        )
        .eq("id", characterId)
        .single();

      if (cancelled) return;
      if (error) {
        toast.error("Failed to load character");
        setLoading(false);
        return;
      }
      if (data) setCharacter(data as CharacterStatus);
      setLoading(false);
    };

    fetchCharacter();
    return () => { cancelled = true; };
  }, [characterId, supabase]);

  // Realtime subscription
  useEffect(() => {
    if (!characterId) return;

    const channel = supabase
      .channel(`player-character:${characterId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "player_characters",
          filter: `id=eq.${characterId}`,
        },
        (payload: { new: Record<string, unknown>; old: Record<string, unknown>; eventType: string }) => {
          setCharacter((prev) =>
            prev ? { ...prev, ...(payload.new as Partial<CharacterStatus>) } : prev
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [characterId, supabase]);

  // C-06 fix: Debounced save that accumulates fields
  const saveField = useCallback(
    (updates: Partial<PlayerCharacter>) => {
      if (!characterId) return;

      // Optimistic update
      setCharacter((prev) => (prev ? { ...prev, ...updates } : prev));

      // Accumulate pending updates
      pendingRef.current = { ...pendingRef.current, ...updates };

      // Debounce the DB write
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const toSave = { ...pendingRef.current };
        pendingRef.current = {};
        const { error } = await supabase
          .from("player_characters")
          .update(toSave)
          .eq("id", characterId);
        if (error) toast.error("Failed to save changes");
      }, 400);
    },
    [characterId, supabase]
  );

  const updateHp = useCallback(
    (newHp: number) => saveField({ current_hp: newHp }),
    [saveField]
  );

  const updateTempHp = useCallback(
    (newTemp: number) => saveField({ hp_temp: newTemp }),
    [saveField]
  );

  // C-03 fix: simple toggle, no sentinel hack
  const toggleCondition = useCallback(
    (condition: string) => {
      if (!character) return;
      const current = character.conditions ?? [];
      const next = current.includes(condition)
        ? current.filter((c) => c !== condition)
        : [...current, condition];
      saveField({ conditions: next });
    },
    [character, saveField]
  );

  // C-03 fix: direct set for exhaustion changes
  const setConditions = useCallback(
    (conditions: string[]) => {
      saveField({ conditions });
    },
    [saveField]
  );

  const toggleInspiration = useCallback(() => {
    if (!character) return;
    saveField({ inspiration: !character.inspiration });
  }, [character, saveField]);

  const updateSpellSlots = useCallback(
    (slots: Record<string, { max: number; used: number }>) => {
      saveField({ spell_slots: slots });
    },
    [saveField]
  );

  return {
    character,
    loading,
    updateHp,
    updateTempHp,
    toggleCondition,
    setConditions,
    toggleInspiration,
    updateSpellSlots,
    saveField,
  };
}
