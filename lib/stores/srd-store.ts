import { create } from "zustand";
import type { SrdMonster, SrdSpell, SrdCondition, SrdItem } from "@/lib/srd/srd-loader";
import {
  loadMonsters,
  loadSpells,
  loadConditions,
  loadItems,
} from "@/lib/srd/srd-loader";
import {
  getCachedMonsters,
  setCachedMonsters,
  getCachedSpells,
  setCachedSpells,
  getCachedConditions,
  setCachedConditions,
  getCachedItems,
  setCachedItems,
} from "@/lib/srd/srd-cache";
import {
  buildMonsterIndex,
  buildSpellIndex,
  buildItemIndex,
  setConditionData,
  mergeImportedMonsters,
} from "@/lib/srd/srd-search";
import { getImportedMonsters } from "@/lib/import/import-cache";

interface SrdState {
  monsters: SrdMonster[];
  spells: SrdSpell[];
  conditions: SrdCondition[];
  items: SrdItem[];
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
  items: [],
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
      const [monsters2014, monsters2024, spells2014, spells2024, conditions, items] =
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
          loadWithCache(
            () => getCachedItems(),
            (d) => setCachedItems(d),
            () => loadItems()
          ),
        ]);

      buildMonsterIndex([...monsters2014, ...monsters2024]);
      buildSpellIndex([...spells2014, ...spells2024]);
      buildItemIndex(items);
      setConditionData(conditions);

      // Merge imported content if extended compendium was previously accepted
      try {
        const accepted = typeof window !== "undefined" &&
          localStorage.getItem("ext_compendium_accepted") === "true";
        if (accepted) {
          const imported = await getImportedMonsters();
          if (imported.length > 0) {
            mergeImportedMonsters(imported);
          }
        }
      } catch {
        // IndexedDB unavailable — degrade gracefully
      }

      set({
        monsters: [...monsters2014, ...monsters2024],
        spells: [...spells2014, ...spells2024],
        conditions,
        items,
        is_loading: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load SRD content";
      set({ error: message, is_loading: false });
    }
  },
}));
