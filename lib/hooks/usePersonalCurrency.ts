"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Currency } from "@/lib/types/database";

const DEFAULT_CURRENCY: Currency = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

export function usePersonalCurrency(characterId: string) {
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Fetch
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("player_characters")
        .select("currency")
        .eq("id", characterId)
        .single();
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load currency");
        setLoading(false);
        return;
      }
      setCurrency({ ...DEFAULT_CURRENCY, ...(data?.currency as Currency) });
      setLoading(false);
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [characterId, supabase]);

  // Update currency (optimistic, merge partial)
  const updateCurrency = useCallback(
    async (updates: Partial<Currency>) => {
      const prev = currency;
      const merged = { ...prev, ...updates };
      setCurrency(merged);
      const { error } = await supabase
        .from("player_characters")
        .update({ currency: merged, updated_at: new Date().toISOString() })
        .eq("id", characterId);
      if (error) {
        setCurrency(prev);
        toast.error("Failed to update currency");
      }
    },
    [characterId, currency, supabase],
  );

  return {
    currency,
    loading,
    updateCurrency,
  };
}
