"use client";

import { useHeroMonsterCount } from "@/lib/stores/monster-count-store";

export function MonsterHeroCount({ ssrCount }: { ssrCount: number }) {
  const count = useHeroMonsterCount(ssrCount);
  return <>{count}</>;
}
