import { create } from "zustand";
import type { SrdMonster, SrdSpell, SrdCondition } from "@/lib/srd/srd-loader";
import {
  loadMonsters,
  loadSpells,
  loadConditions,
} from "@/lib/srd/srd-loader";
import {
  getCachedMonsters,
  setCachedMonsters,
  getCachedSpells,
  setCachedSpells,
  getCachedConditions,
  setCachedConditions,
} from "@/lib/srd/srd-cache";
import {
  buildMonsterIndex,
  buildSpellIndex,
  setConditionData,
} from "@/lib/srd/srd-search";

interface SrdState {
  monsters: SrdMonster[];
  spells: SrdSpell[];
  conditions: SrdCondition[];
  is_loading: boolean;
  error: string | null;
}

interface SrdActions {
  initializeSrd: () => Promise<void>;
}

type SrdStore = SrdState & SrdActions;

const initialState: SrdState = {
  monsters: [],
  spells: [],
  conditions: [],
  is_loading: false,
  error: null,
};

async function loadWithCache<T>(
  getCached: () => Promise<T[] | null>,
  setCache: (data: T[]) => Promise<void>,
  fetchFn: () => Promise<T[]>
): Promise<T[]> {
  const cached = await getCached();
  if (cached) return cached;
  const data = await fetchFn();
  await setCache(data);
  return data;
}

export const useSrdStore = create<SrdStore>((set, get) => ({
  ...initialState,

  initializeSrd: async () => {
    const { is_loading, monsters } = get();
    if (is_loading || monsters.length > 0) return;
    set({ is_loading: true, error: null });
    try {
      const [monsters2014, monsters2024, spells2014, spells2024, conditions] =
        await Promise.all([
          loadWithCache(
            () => getCachedMonsters("2014"),
            (d) => setCachedMonsters("2014", d),
            () => loadMonsters("2014")
          ),
          loadWithCache(
            () => getCachedMonsters("2024"),
            (d) => setCachedMonsters("2024", d),
            () => loadMonsters("2024")
          ),
          loadWithCache(
            () => getCachedSpells("2014"),
            (d) => setCachedSpells("2014", d),
            () => loadSpells("2014")
          ),
          loadWithCache(
            () => getCachedSpells("2024"),
            (d) => setCachedSpells("2024", d),
            () => loadSpells("2024")
          ),
          loadWithCache(
            () => getCachedConditions(),
            (d) => setCachedConditions(d),
            () => loadConditions()
          ),
        ]);

      buildMonsterIndex([...monsters2014, ...monsters2024]);
      buildSpellIndex([...spells2014, ...spells2024]);
      setConditionData(conditions);

      set({
        monsters: [...monsters2014, ...monsters2024],
        spells: [...spells2014, ...spells2024],
        conditions,
        is_loading: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load SRD content";
      set({ error: message, is_loading: false });
    }
  },
}));
