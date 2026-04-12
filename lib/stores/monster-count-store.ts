// Tiny external store for the public compendium hero count.
// The CompendiumMonsterHydrator writes to it; MonsterHeroCount reads from it.

import { useSyncExternalStore } from "react";

let _count: number | null = null;
const _listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

function getSnapshot() {
  return _count;
}

export function setHeroMonsterCount(n: number) {
  _count = n;
  _listeners.forEach((cb) => cb());
}

/** Returns the live count if the hydrator has loaded full data, otherwise `ssrCount`. */
export function useHeroMonsterCount(ssrCount: number): number {
  const live = useSyncExternalStore(subscribe, getSnapshot, () => null);
  return live ?? ssrCount;
}
