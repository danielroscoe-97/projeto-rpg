import { create } from "zustand";
import type { SrdMonster, SrdSpell, SrdCondition, SrdItem } from "@/lib/srd/srd-loader";
import {
  loadMonsters,
  loadSpells,
  loadConditions,
  loadItems,
  loadMadMonsters,
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
import { srdSearchProvider } from "@/lib/srd/fuse-search-provider";
import { getImportedMonsters } from "@/lib/import/import-cache";
import type { RulesetVersion } from "@/lib/types/database";

interface SrdState {
  monsters: SrdMonster[];
  spells: SrdSpell[];
  conditions: SrdCondition[];
  items: SrdItem[];
  is_loading: boolean;
  /** Tracks which SRD versions have been loaded */
  loadedVersions: Set<RulesetVersion>;
  error: string | null;
}

interface SrdActions {
  initializeSrd: () => Promise<void>;
  /** Load an additional SRD version on demand (e.g. DM switches version mid-combat) */
  loadVersionOnDemand: (version: RulesetVersion) => Promise<void>;
}

type SrdStore = SrdState & SrdActions;

const initialState: SrdState = {
  monsters: [],
  spells: [],
  conditions: [],
  items: [],
  is_loading: false,
  loadedVersions: new Set(),
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

/** Default version loaded on init (most recent ruleset, smaller bundle). */
const PRIMARY_VERSION: RulesetVersion = "2024";
const DEFERRED_VERSION: RulesetVersion = "2014";

export const useSrdStore = create<SrdStore>((set, get) => ({
  ...initialState,

  initializeSrd: async () => {
    const { is_loading, monsters } = get();
    if (is_loading || monsters.length > 0) return;
    set({ is_loading: true, error: null });
    try {
      // Phase 1: Load primary version + conditions + items (critical path)
      const [monstersPrimary, spellsPrimary, conditions, items] =
        await Promise.all([
          loadWithCache(
            () => getCachedMonsters(PRIMARY_VERSION),
            (d) => setCachedMonsters(PRIMARY_VERSION, d),
            () => loadMonsters(PRIMARY_VERSION)
          ),
          loadWithCache(
            () => getCachedSpells(PRIMARY_VERSION),
            (d) => setCachedSpells(PRIMARY_VERSION, d),
            () => loadSpells(PRIMARY_VERSION)
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

      srdSearchProvider.buildMonsterIndex(monstersPrimary);
      srdSearchProvider.buildSpellIndex(spellsPrimary);
      srdSearchProvider.buildItemIndex(items);
      srdSearchProvider.setConditionData(conditions);

      // Merge imported content if extended compendium was previously accepted
      try {
        const accepted = typeof window !== "undefined" &&
          localStorage.getItem("ext_compendium_accepted") === "true";
        if (accepted) {
          const imported = await getImportedMonsters();
          if (imported.length > 0) {
            srdSearchProvider.mergeImportedMonsters(imported);
          }
        }
      } catch {
        // IndexedDB unavailable — degrade gracefully
      }

      set({
        monsters: monstersPrimary,
        spells: spellsPrimary,
        conditions,
        items,
        is_loading: false,
        loadedVersions: new Set([PRIMARY_VERSION]),
      });

      // Phase 2: Defer loading of 2014 version (6.3MB) to idle time
      const scheduleDeferred = typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 2000);

      scheduleDeferred(() => {
        get().loadVersionOnDemand(DEFERRED_VERSION);
      });

      // Phase 3: Load Monster-a-Day community monsters (non-critical)
      scheduleDeferred(async () => {
        try {
          const madMonsters = await loadMadMonsters();
          if (madMonsters.length > 0) {
            srdSearchProvider.mergeImportedMonsters(madMonsters);
            set((state) => ({ monsters: [...state.monsters, ...madMonsters] }));
          }
        } catch {
          // MAD load failure is non-critical
        }
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load SRD content";
      set({ error: message, is_loading: false });
    }
  },

  loadVersionOnDemand: async (version: RulesetVersion) => {
    const { loadedVersions, monsters, spells } = get();
    if (loadedVersions.has(version)) return;

    try {
      const [newMonsters, newSpells] = await Promise.all([
        loadWithCache(
          () => getCachedMonsters(version),
          (d) => setCachedMonsters(version, d),
          () => loadMonsters(version)
        ),
        loadWithCache(
          () => getCachedSpells(version),
          (d) => setCachedSpells(version, d),
          () => loadSpells(version)
        ),
      ]);

      const mergedMonsters = [...monsters, ...newMonsters];
      const mergedSpells = [...spells, ...newSpells];

      // Rebuild indexes with all loaded data
      srdSearchProvider.buildMonsterIndex(mergedMonsters);
      srdSearchProvider.buildSpellIndex(mergedSpells);

      set({
        monsters: mergedMonsters,
        spells: mergedSpells,
        loadedVersions: new Set([...loadedVersions, version]),
      });
    } catch {
      // Deferred load failure is non-critical — user can retry via search
    }
  },
}));
