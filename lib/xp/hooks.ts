"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

interface UserXpData {
  dm_xp: number;
  dm_rank: number;
  dm_title_pt: string;
  dm_title_en: string;
  dm_icon: string;
  dm_next_rank_xp: number | null;
  player_xp: number;
  player_rank: number;
  player_title_pt: string;
  player_title_en: string;
  player_icon: string;
  player_next_rank_xp: number | null;
}

export interface UseUserXpReturn {
  dmXp: number;
  dmRank: number;
  dmTitle: string;
  dmIcon: string;
  dmNextRankXp: number | null;
  playerXp: number;
  playerRank: number;
  playerTitle: string;
  playerIcon: string;
  playerNextRankXp: number | null;
  isLoading: boolean;
  refetch: () => void;
}

export function useUserXp(): UseUserXpReturn {
  const locale = useLocale();
  const [data, setData] = useState<UserXpData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/xp/me")
      .then((r) => {
        if (!r.ok) throw new Error("not ok");
        return r.json();
      })
      .then((d: UserXpData) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        /* fail silently */
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const isPt = locale === "pt-BR";

  return {
    dmXp: data?.dm_xp ?? 0,
    dmRank: data?.dm_rank ?? 1,
    dmTitle: isPt ? (data?.dm_title_pt ?? "Aprendiz de Taverna") : (data?.dm_title_en ?? "Tavern Apprentice"),
    dmIcon: data?.dm_icon ?? "🕯️",
    dmNextRankXp: data?.dm_next_rank_xp ?? 100,
    playerXp: data?.player_xp ?? 0,
    playerRank: data?.player_rank ?? 1,
    playerTitle: isPt ? (data?.player_title_pt ?? "Aventureiro Novato") : (data?.player_title_en ?? "Novice Adventurer"),
    playerIcon: data?.player_icon ?? "🗡️",
    playerNextRankXp: data?.player_next_rank_xp ?? 75,
    isLoading,
    refetch: () => setFetchKey((k) => k + 1),
  };
}
