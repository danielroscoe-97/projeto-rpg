import { create } from "zustand";
import type { SrdMonster, SrdSpell, SrdCondition, SrdItem, SrdFeat, SrdBackground, SrdRace } from "@/lib/srd/srd-loader";
import type { SrdClass } from "@/lib/types/srd-class";
import {
  loadMonsters,
  loadSpells,
  loadConditions,
  loadItems,
  loadMadMonsters,
  loadFeats,
  loadBackgrounds,
  loadClasses,
  loadRaces,
  loadMonsterCrossref,
  clearAllLoaderCaches,
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
  getCachedFeats,
  setCachedFeats,
  getCachedBackgrounds,
  setCachedBackgrounds,
  getCachedClasses,
  setCachedClasses,
  getCachedRaces,
  setCachedRaces,
} from "@/lib/srd/srd-cache";
import { srdSearchProvider } from "@/lib/srd/fuse-search-provider";
import { getImportedMonsters } from "@/lib/import/import-cache";
import type { RulesetVersion } from "@/lib/types/database";
import { isFullDataMode } from "@/lib/srd/srd-mode";

type SrdDataMode = "public" | "full";

interface SrdState {
  monsters: SrdMonster[];
  spells: SrdSpell[];
  conditions: SrdCondition[];
  items: SrdItem[];
  feats: SrdFeat[];
  backgrounds: SrdBackground[];
  classes: SrdClass[];
  races: SrdRace[];
  is_loading: boolean;
  /** Tracks whether the in-memory store was loaded from public or full SRD data. */
  loadedMode: SrdDataMode | null;
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
  feats: [],
  backgrounds: [],
  classes: [],
  races: [],
  is_loading: false,
  loadedMode: null,
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

/** Tracks in-flight loadVersionOnDemand calls to prevent duplicate fetches. */
const versionLoadInFlight = new Set<string>();

export const useSrdStore = create<SrdStore>((set, get) => ({
  ...initialState,

  initializeSrd: async () => {
    const requestedMode: SrdDataMode = isFullDataMode() ? "full" : "public";
    const { is_loading, monsters, loadedMode } = get();
    if (is_loading) return;
    if (monsters.length > 0 && loadedMode === requestedMode) return;

    // If the user changed from public SRD to full-data mode (or back) in the
    // same tab, drop the in-memory snapshot AND the module-level fetch caches
    // so loadMonsters/loadSpells/etc. actually re-fetch from the correct URL.
    if (loadedMode && loadedMode !== requestedMode) {
      clearAllLoaderCaches();
      set({
        monsters: [],
        spells: [],
        conditions: [],
        items: [],
        feats: [],
        backgrounds: [],
        classes: [],
        races: [],
        loadedVersions: new Set(),
        error: null,
      });
    }

    set({ is_loading: true, error: null });
    try {
      // Phase 1: Load primary version + conditions + items + classes (critical path)
      const [monstersPrimary, spellsPrimary, conditions, items, classes] =
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
          loadWithCache(
            () => getCachedClasses(),
            (d) => setCachedClasses(d),
            () => loadClasses()
          ),
        ]);

      srdSearchProvider.buildMonsterIndex(monstersPrimary);
      srdSearchProvider.buildSpellIndex(spellsPrimary);
      srdSearchProvider.buildItemIndex(items);
      srdSearchProvider.setConditionData(conditions);

      // Load monster cross-version ID map (fire-and-forget, non-critical)
      loadMonsterCrossref().then((crossref) => {
        srdSearchProvider.setMonsterCrossref(crossref);
      }).catch(() => { /* crossref failure is non-critical */ });

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
        classes,
        is_loading: false,
        loadedMode: requestedMode,
        loadedVersions: new Set([PRIMARY_VERSION]),
      });

      // Phase 2: Defer loading of 2014 version (6.3MB) to idle time
      const scheduleDeferred = typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 2000);

      scheduleDeferred(() => {
        get().loadVersionOnDemand(DEFERRED_VERSION);
      });

      // Phase 2b: Load feats + backgrounds + races + abilities index (non-critical, deferred)
      scheduleDeferred(async () => {
        try {
          const [feats, backgrounds, races] = await Promise.all([
            loadWithCache(
              () => getCachedFeats(),
              (d) => setCachedFeats(d),
              () => loadFeats()
            ),
            loadWithCache(
              () => getCachedBackgrounds(),
              (d) => setCachedBackgrounds(d),
              () => loadBackgrounds()
            ),
            loadWithCache(
              () => getCachedRaces(),
              (d) => setCachedRaces(d),
              () => loadRaces()
            ),
          ]);

          // Build Fuse.js search indices for feats, backgrounds & races
          srdSearchProvider.buildFeatIndex(feats);
          srdSearchProvider.buildBackgroundIndex(backgrounds);
          srdSearchProvider.buildRaceIndex(races);

          // Build abilities index (class features + racial + feats + subclass)
          // In full-data mode, fetch the complete abilities index from the
          // auth-gated API; otherwise use the statically-imported SRD-only set.
          try {
            if (isFullDataMode()) {
              const resp = await fetch("/api/srd/full/abilities-index.json");
              if (resp.ok) {
                const fullAbilities = await resp.json();
                const { setSrdAbilities } = await import("@/lib/data/srd-abilities");
                setSrdAbilities(fullAbilities);
                srdSearchProvider.buildAbilityIndex(fullAbilities);
              } else {
                // Fallback to public SRD-only data
                const { SRD_ABILITIES } = await import("@/lib/data/srd-abilities");
                srdSearchProvider.buildAbilityIndex(SRD_ABILITIES);
              }
            } else {
              const { SRD_ABILITIES } = await import("@/lib/data/srd-abilities");
              srdSearchProvider.buildAbilityIndex(SRD_ABILITIES);
            }
          } catch {
            // Abilities index load failure is non-critical
          }

          set({ feats, backgrounds, races });

          // Phase 2c: Load PT-BR translation names and inject into Fuse indexes
          // This enables bilingual search (finding "Dragão Vermelho" for "Adult Red Dragon")
          try {
            const {
              loadMonsterNamesPt,
              loadSpellNamesPt,
              loadItemNamesPt,
              loadFeatNamesPt,
              loadBackgroundNamesPt,
            } = await import("@/lib/srd/translation-loader");

            const [monsterPt, spellPt, itemPt, featPt, bgPt] = await Promise.all([
              loadMonsterNamesPt(),
              loadSpellNamesPt(),
              loadItemNamesPt(),
              loadFeatNamesPt(),
              loadBackgroundNamesPt(),
            ]);

            srdSearchProvider.injectTranslationsAndRebuild({
              monsters: Object.keys(monsterPt).length > 0 ? monsterPt : undefined,
              spells: Object.keys(spellPt).length > 0 ? spellPt : undefined,
              items: Object.keys(itemPt).length > 0 ? itemPt : undefined,
              feats: Object.keys(featPt).length > 0 ? featPt : undefined,
              backgrounds: Object.keys(bgPt).length > 0 ? bgPt : undefined,
            });
          } catch {
            // Translation injection failure is non-critical — search stays EN-only
          }
        } catch {
          // Feats/backgrounds/races load failure is non-critical
        }
      });

      // Phase 3: Load Monster-a-Day community monsters (non-critical)
      scheduleDeferred(async () => {
        try {
          const madMonsters = await loadMadMonsters();
          if (madMonsters.length > 0) {
            srdSearchProvider.mergeImportedMonsters(madMonsters);
            // Re-inject PT-BR translations for MAD entries
            try {
              const { getMonsterNamesPtSync } = await import("@/lib/srd/translation-loader");
              const monsterPt = getMonsterNamesPtSync();
              if (monsterPt) {
                srdSearchProvider.injectTranslationsAndRebuild({ monsters: monsterPt });
              }
            } catch { /* non-critical */ }
            set((state) => ({ monsters: [...state.monsters, ...madMonsters] }));
          }
        } catch {
          // MAD load failure is non-critical
        }
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load SRD content";
      set({ error: message, is_loading: false, loadedMode: null });
    }
  },

  loadVersionOnDemand: async (version: RulesetVersion) => {
    const requestedMode: SrdDataMode = isFullDataMode() ? "full" : "public";
    const { loadedVersions, loadedMode } = get();
    if (loadedVersions.has(version) && loadedMode === requestedMode) return;

    // Prevent duplicate in-flight fetches for the same version+mode
    const flightKey = `${version}:${requestedMode}`;
    if (versionLoadInFlight.has(flightKey)) return;
    versionLoadInFlight.add(flightKey);

    // If a deferred load from a previous mode fires after the user changes
    // access level, re-bootstrap the store instead of mixing datasets.
    if (loadedMode && loadedMode !== requestedMode) {
      versionLoadInFlight.delete(flightKey);
      await get().initializeSrd();
      return;
    }

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

      // Read current state AFTER await so MAD monsters added by Phase 3 are included
      const { monsters, spells, loadedVersions } = get();
      if (loadedVersions.has(version)) return;
      const mergedMonsters = [...monsters, ...newMonsters];
      const mergedSpells = [...spells, ...newSpells];

      // Rebuild indexes with all loaded data
      srdSearchProvider.buildMonsterIndex(mergedMonsters);
      srdSearchProvider.buildSpellIndex(mergedSpells);

      // Re-inject PT-BR translations for the new entries so bilingual search works
      try {
        const { getMonsterNamesPtSync, getSpellNamesPtSync } = await import("@/lib/srd/translation-loader");
        const monsterPt = getMonsterNamesPtSync();
        const spellPt = getSpellNamesPtSync();
        if (monsterPt || spellPt) {
          srdSearchProvider.injectTranslationsAndRebuild({
            monsters: monsterPt ?? undefined,
            spells: spellPt ?? undefined,
          });
        }
      } catch { /* non-critical */ }

      set({
        monsters: mergedMonsters,
        spells: mergedSpells,
        loadedMode: requestedMode,
        loadedVersions: new Set([...loadedVersions, version]),
      });
    } catch {
      // Deferred load failure is non-critical — user can retry via search
    } finally {
      versionLoadInFlight.delete(flightKey);
    }
  },
}));
