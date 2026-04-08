"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { CharacterInventoryItem } from "@/lib/types/database";

export function usePersonalInventory(characterId: string) {
  const [items, setItems] = useState<CharacterInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Fetch
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("character_inventory_items")
        .select("*")
        .eq("player_character_id", characterId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load inventory");
        setLoading(false);
        return;
      }
      setItems(data ?? []);
      setLoading(false);
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [characterId, supabase]);

  // Derived: equipped items
  const equipped = useMemo(() => items.filter((i) => i.equipped), [items]);

  // Derived: backpack (unequipped) items
  const backpack = useMemo(() => items.filter((i) => !i.equipped), [items]);

  // Add item (optimistic)
  const addItem = useCallback(
    async (name: string, quantity: number = 1) => {
      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      const optimistic: CharacterInventoryItem = {
        id: tempId,
        player_character_id: characterId,
        item_name: name,
        quantity,
        equipped: false,
        notes: null,
        created_at: now,
        updated_at: now,
      };
      setItems((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from("character_inventory_items")
        .insert({
          player_character_id: characterId,
          item_name: name,
          quantity,
        })
        .select()
        .single();

      if (error || !data) {
        setItems((prev) => prev.filter((i) => i.id !== tempId));
        toast.error("Failed to add item");
        return null;
      }
      setItems((prev) => prev.map((i) => (i.id === tempId ? data : i)));
      return data;
    },
    [characterId, supabase],
  );

  // Remove item (optimistic)
  const removeItem = useCallback(
    async (id: string) => {
      const backup = items.find((i) => i.id === id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      const { error } = await supabase
        .from("character_inventory_items")
        .delete()
        .eq("id", id);
      if (error && backup) {
        setItems((prev) => [...prev, backup]);
        toast.error("Failed to remove item");
      }
    },
    [items, supabase],
  );

  // Toggle equip (optimistic)
  const toggleEquip = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const newEquipped = !item.equipped;
      const prev = items;
      setItems((current) =>
        current.map((i) =>
          i.id === id ? { ...i, equipped: newEquipped, updated_at: new Date().toISOString() } : i,
        ),
      );
      const { error } = await supabase
        .from("character_inventory_items")
        .update({ equipped: newEquipped, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        setItems(prev);
        toast.error("Failed to update item");
      }
    },
    [items, supabase],
  );

  // Update quantity (optimistic) — delete if 0
  const updateQuantity = useCallback(
    async (id: string, quantity: number) => {
      if (quantity <= 0) {
        return removeItem(id);
      }
      const prev = items;
      setItems((current) =>
        current.map((i) =>
          i.id === id ? { ...i, quantity, updated_at: new Date().toISOString() } : i,
        ),
      );
      const { error } = await supabase
        .from("character_inventory_items")
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        setItems(prev);
        toast.error("Failed to update quantity");
      }
    },
    [items, supabase, removeItem],
  );

  return {
    items,
    equipped,
    backpack,
    loading,
    addItem,
    removeItem,
    toggleEquip,
    updateQuantity,
  };
}
