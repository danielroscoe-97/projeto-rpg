"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type {
  ActiveEffect,
  ActiveEffectInsert,
  ActiveEffectUpdate,
} from "@/lib/types/database";

export function useActiveEffects(characterId: string) {
  const [effects, setEffects] = useState<ActiveEffect[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const deletingRef = useRef(new Set<string>());

  // Fetch active effects
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("character_active_effects")
        .select("*")
        .eq("player_character_id", characterId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load active effects");
      }
      setEffects(data ?? []);
      setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [characterId, supabase]);

  // Realtime subscription — DM changes sync to player and vice versa
  useEffect(() => {
    if (!characterId) return;

    const channel = supabase
      .channel(`active-effects:${characterId}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "character_active_effects",
          filter: `player_character_id=eq.${characterId}`,
        },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (payload.eventType === "INSERT") {
            const newEffect = payload.new as ActiveEffect;
            if (!newEffect.is_active) return;
            setEffects((prev) => {
              if (prev.some((e) => e.id === newEffect.id)) return prev;
              return [newEffect, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as ActiveEffect;
            if (!updated.is_active) {
              // Dismissed remotely
              setEffects((prev) => prev.filter((e) => e.id !== updated.id));
            } else {
              setEffects((prev) =>
                prev.map((e) => (e.id === updated.id ? updated : e))
              );
            }
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setEffects((prev) => prev.filter((e) => e.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [characterId, supabase]);

  // Check for existing concentration effect
  const getConcentrationConflict = useCallback(() => {
    return effects.find((e) => e.is_concentration);
  }, [effects]);

  // Add effect
  const addEffect = useCallback(
    async (input: Omit<ActiveEffectInsert, "player_character_id">) => {
      const { data, error } = await supabase
        .from("character_active_effects")
        .insert({
          ...input,
          player_character_id: characterId,
        })
        .select()
        .single();

      if (error) {
        toast.error("Failed to add effect");
        return { data: null, error };
      }
      if (data) setEffects((prev) => [data, ...prev]);
      return { data, error: null };
    },
    [characterId, supabase]
  );

  // Update effect (optimistic)
  const updateEffect = useCallback(
    async (id: string, updates: ActiveEffectUpdate) => {
      const original = effects.find((e) => e.id === id);
      if (!original) return { data: null, error: new Error("Not found") };

      setEffects((current) =>
        current.map((e) =>
          e.id === id ? { ...e, ...updates } : e
        )
      );
      const { error } = await supabase
        .from("character_active_effects")
        .update(updates)
        .eq("id", id);
      if (error) {
        setEffects((current) =>
          current.map((e) => (e.id === id ? original : e))
        );
        toast.error("Failed to update effect");
        return { data: null, error };
      }
      return { data: null, error: null };
    },
    [effects, supabase]
  );

  // Dismiss effect (soft delete)
  const dismissEffect = useCallback(
    async (id: string) => {
      if (deletingRef.current.has(id)) return;
      deletingRef.current.add(id);
      const original = effects.find((e) => e.id === id);
      setEffects((current) => current.filter((e) => e.id !== id));
      const { error } = await supabase
        .from("character_active_effects")
        .update({ is_active: false, dismissed_at: new Date().toISOString() })
        .eq("id", id);
      deletingRef.current.delete(id);
      if (error) {
        if (original) {
          setEffects((current) => {
            const already = current.some((e) => e.id === id);
            return already ? current : [original, ...current];
          });
        }
        toast.error("Failed to dismiss effect");
      }
    },
    [effects, supabase]
  );

  // Decrement consumable quantity
  const decrementQuantity = useCallback(
    async (id: string) => {
      const effect = effects.find((e) => e.id === id);
      if (!effect) return;

      const newQuantity = effect.quantity - 1;
      if (newQuantity <= 0) {
        // Auto-dismiss when quantity hits 0
        await dismissEffect(id);
        return;
      }
      await updateEffect(id, { quantity: newQuantity });
    },
    [effects, updateEffect, dismissEffect]
  );

  // Increment consumable quantity
  const incrementQuantity = useCallback(
    async (id: string) => {
      const effect = effects.find((e) => e.id === id);
      if (!effect) return;
      await updateEffect(id, { quantity: effect.quantity + 1 });
    },
    [effects, updateEffect]
  );

  // Dismiss all active effects
  const dismissAll = useCallback(
    async () => {
      if (effects.length === 0) return 0;
      const originals = [...effects];

      setEffects([]);
      const { error } = await supabase
        .from("character_active_effects")
        .update({ is_active: false, dismissed_at: new Date().toISOString() })
        .eq("player_character_id", characterId)
        .eq("is_active", true);

      if (error) {
        setEffects(originals);
        toast.error("Failed to dismiss effects");
      }
      return originals.length;
    },
    [effects, characterId, supabase]
  );

  return {
    effects,
    loading,
    addEffect,
    updateEffect,
    decrementQuantity,
    incrementQuantity,
    dismissEffect,
    dismissAll,
    getConcentrationConflict,
  };
}
