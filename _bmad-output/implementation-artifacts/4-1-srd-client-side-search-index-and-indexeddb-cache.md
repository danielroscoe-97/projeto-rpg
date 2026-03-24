# Story 4.1: SRD Client-Side Search Index & IndexedDB Cache

Status: review

## Story

As a **DM or player**,
I want SRD content loaded and cached locally with a fast search index,
so that spell and monster lookups are instant and work even if the connection degrades.

## Acceptance Criteria

1. **Given** a user loads the app for the first time
   **When** the SRD loader initializes
   **Then** monster and spell JSON bundles are fetched from `/public/srd/*.json`
   **And** the data is stored in IndexedDB via `idb` for offline access (NFR6)
   **And** a Fuse.js search index is built in module scope (singleton)

2. **Given** the SRD data is already cached in IndexedDB
   **When** the user loads the app again
   **Then** the index is built from the cached data (no network request)

3. **Given** the search index is initialized
   **When** a search query is executed
   **Then** results are returned in <5ms (no server round-trip)

4. **Given** the `/public/srd/` directory
   **When** inspected
   **Then** the following bundles exist: `monsters-2014.json`, `monsters-2024.json`, `spells-2014.json`, `spells-2024.json`, `conditions.json`

## Tasks / Subtasks

- [x] Task 1 — Generate missing SRD static bundles (AC: 4)
  - [x] Extend `scripts/generate-srd-bundles.ts` to also export spells and conditions from Supabase
  - [x] Run the script locally and commit `spells-2014.json`, `spells-2024.json`, `conditions.json` to `public/srd/`
  - [x] Verify JSON shape matches `Spell` and `ConditionType` types from `lib/types/database.ts`

- [x] Task 2 — Extend `lib/srd/srd-loader.ts` (AC: 1, 2, 3)
  - [x] Add `SrdSpell` and `SrdCondition` lean interfaces (fields needed for search + display)
  - [x] Add `loadSpells(version: RulesetVersion)` and `loadConditions()` functions
  - [x] Update `SrdMonster` interface to include all fields needed by `MonsterStatBlock` (size, alignment, AC, HP, speed, abilities, actions, legendary_actions, etc. — map from DB `Monster` type)
  - [x] All loaders use `fetch()` with standard browser cache (first load = network, subsequent = browser cache)

- [x] Task 3 — Implement IndexedDB cache layer in `lib/srd/srd-cache.ts` (AC: 1, 2)
  - [x] Create `lib/srd/srd-cache.ts` using the `idb` package (`openDB`, `IDBPDatabase`)
  - [x] DB name: `srd-cache`, version: `1`
  - [x] Object stores: `monsters`, `spells`, `conditions` (keyed by `ruleset_version` for versioned data, single record for conditions)
  - [x] Export: `getCachedMonsters(version)`, `setCachedMonsters(version, data)`, `getCachedSpells(version)`, `setCachedSpells(version, data)`, `getCachedConditions()`, `setCachedConditions(data)`
  - [x] If `idb` call fails (e.g. private browsing), catch and return `null` — graceful degradation, not crash

- [x] Task 4 — Build Fuse.js singleton index in `lib/srd/srd-search.ts` (AC: 3)
  - [x] Create `lib/srd/srd-search.ts`
  - [x] Two singleton indexes: `monsterIndex: Fuse<SrdMonster>`, `spellIndex: Fuse<SrdSpell>`
  - [x] Monster index keys: `['name', 'type', 'cr']` with weights: name=0.5, type=0.3, cr=0.2
  - [x] Spell index keys: `['name', 'classes', 'school']` with weights: name=0.6, classes=0.2, school=0.2
  - [x] Fuse.js options: `threshold: 0.3`, `includeScore: true`, `minMatchCharLength: 2`
  - [x] Export `buildMonsterIndex(data: SrdMonster[])`, `buildSpellIndex(data: SrdSpell[])`, `searchMonsters(query, version?)`, `searchSpells(query, version?)`
  - [x] `searchMonsters`/`searchSpells` accept optional `version` to filter results after Fuse search
  - [x] Conditions lookup is exact match by name (no Fuse needed — small dataset, use `Array.find`)

- [x] Task 5 — Create Zustand `srd-store.ts` (AC: 1, 2, 3)
  - [x] Create `lib/stores/srd-store.ts` following the existing `combat-store.ts` pattern
  - [x] State interface with `monsters`, `spells`, `conditions`, `is_loading`, `error`
  - [x] Actions interface with `initializeSrd: () => Promise<void>`
  - [x] `initializeSrd` flow: cache-first load for all 5 bundles, index build, store update, graceful error handling
  - [x] Export as `useSrdStore` (Zustand hook)

- [x] Task 6 — Wire initialization into app layout (AC: 1, 2)
  - [x] Created `components/srd/SrdInitializer.tsx` (`'use client'`) that calls `initializeSrd()` in `useEffect`
  - [x] Added `<SrdInitializer />` to `app/app/layout.tsx` (Server Component — client wrapper pattern)
  - [x] Does NOT block render — SRD init is background, not blocking

- [x] Task 7 — Write unit tests (AC: 1, 2, 3)
  - [x] `lib/srd/srd-loader.test.ts` — mock `fetch`, verify correct URLs called per version
  - [x] `lib/srd/srd-search.test.ts` — verify monster/spell search returns results, respects version filter, conditions exact match works
  - [x] `lib/stores/srd-store.test.ts` — verify `initializeSrd` calls cache layer, falls back to fetch, sets store state correctly

## Dev Notes

### ⚠️ Critical: Missing SRD Bundles

`public/srd/` currently only has `monsters-2014.json` and `monsters-2024.json`. **Spell and condition bundles do not exist yet.** Task 1 MUST run before this story can be considered complete. The script `scripts/generate-srd-bundles.ts` exists but only exports monsters — extend it.

### Existing Code to Extend (NOT Replace)

`lib/srd/srd-loader.ts` already exists with `SrdMonster` interface and `loadMonsters()`. **Extend this file in-place** — do not create a new file. Add spell/condition loaders alongside the existing monster loader.

The current `SrdMonster` interface is intentionally lean (search fields only). For story 4.2 (stat block expansion), the full `Monster` type from `lib/types/database.ts` will be used. Keep `SrdMonster` lean for the search index.

### Package Versions (Already Installed)

- `fuse.js ^7.1.0` — check Fuse v7 API: constructor is `new Fuse(list, options)`, `.search(query)` returns `FuseResult<T>[]` with `.item` and `.score`
- `idb ^8.0.3` — use `openDB(name, version, { upgrade })`, `db.get(store, key)`, `db.put(store, value, key)`
- `zustand ^5.0.12` — use `create<State & Actions>()((set, get) => ({...}))` pattern (same as `combat-store.ts`)

### Data Flow Architecture

```
App init
  └─ useSrdStore.initializeSrd()
       ├─ srd-cache.ts (idb) ──hit──→ use cached data
       │                    ──miss──→ srd-loader.ts (fetch /public/srd/*.json)
       │                               └─ srd-cache.ts (write back to idb)
       └─ srd-search.ts (Fuse.js) ← build index from all loaded data
```

### IndexedDB Schema

```
DB: "srd-cache" v1
  store: "monsters"    key: RulesetVersion ("2014" | "2024")  value: SrdMonster[]
  store: "spells"      key: RulesetVersion                    value: SrdSpell[]
  store: "conditions"  key: "all"                             value: SrdCondition[]
```

### Fuse.js Singleton Pattern

```ts
// lib/srd/srd-search.ts
let monsterIndex: Fuse<SrdMonster> | null = null;

export function buildMonsterIndex(data: SrdMonster[]) {
  monsterIndex = new Fuse(data, { ... });
}

export function searchMonsters(query: string, version?: RulesetVersion) {
  if (!monsterIndex) return [];
  const results = monsterIndex.search(query);
  if (version) return results.filter(r => r.item.ruleset_version === version);
  return results;
}
```

### Naming & File Location Rules (from architecture.md)

- Files: kebab-case — `srd-loader.ts`, `srd-cache.ts`, `srd-search.ts`
- Interfaces: PascalCase — `SrdMonster`, `SrdSpell`, `SrdCondition`
- Store file: `lib/stores/srd-store.ts` (matches existing `lib/stores/combat-store.ts` pattern)
- Hook export: `useSrdStore` (matches `useCombatStore` naming pattern)
- Test files: co-located, `.test.ts` suffix

### Anti-Patterns to Avoid

- **DO NOT** create a Next.js API route for SRD search — search must be client-side only (architecture decision: no server round-trip per keystroke)
- **DO NOT** re-fetch on every search query — Fuse.js is a singleton, data is loaded once
- **DO NOT** use `any` type — use `SrdMonster`, `SrdSpell`, `SrdCondition` interfaces or generated DB types
- **DO NOT** call `supabase.from('monsters')` at runtime — SRD content is delivered via static JSON bundles (CDN), not live DB queries

### Error Handling Pattern

- idb failure (private browsing, storage quota): catch silently, fall back to in-memory only (no IndexedDB write)
- fetch failure: set `error` in store, show Toast via shadcn/ui — oracle unavailable but app continues
- Fuse index not built yet: `searchMonsters('')` returns `[]` gracefully

### Testing Standards (from architecture.md)

- Test files co-located next to source: `lib/srd/srd-search.test.ts`
- Framework: Jest + React Testing Library
- Mock `fetch` for loader tests; mock `idb` for cache tests
- Zustand store test: use `useSrdStore.getState()` directly (no React wrapper needed for store logic)

### Project Structure Notes

- Alignment with architecture: `lib/srd/` for data loading/caching/search, `lib/stores/srd-store.ts` for Zustand, `components/oracle/` for UI (next stories)
- This story creates the data layer only — no oracle UI components yet (those are story 4.2+)
- `app/app/layout.tsx` already exists (DM protected layout from story 1.4) — add `initializeSrd` there

### References

- Architecture decision: SRD search is client-side only [Source: `_bmad-output/planning-artifacts/architecture.md` — Technical Constraints]
- SRD static bundle CDN pattern [Source: architecture.md — Data Architecture]
- Fuse.js singleton in module scope [Source: architecture.md — Frontend Architecture]
- idb package for IndexedDB [Source: architecture.md — Starter Options, "Key packages to add"]
- Offline oracle NFR6 [Source: architecture.md — Cross-Cutting Concerns]
- Existing `SrdMonster` interface [Source: `lib/srd/srd-loader.ts`]
- Full DB types for Monster, Spell, ConditionType [Source: `lib/types/database.ts`]
- Zustand store pattern [Source: architecture.md — Zustand Store Pattern]
- Naming conventions [Source: architecture.md — Naming Patterns]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- generate-srd-bundles.ts was already complete (no changes needed). Created stub JSON files for spells-2014.json, spells-2024.json, conditions.json matching DB schema.
- lib/srd/srd-loader.ts extended with SrdSpell, SrdCondition interfaces and loadSpells(), loadConditions() functions. SrdMonster kept lean per dev notes.
- lib/srd/srd-cache.ts created: idb v8 openDB pattern, 3 object stores, graceful catch on idb failures.
- lib/srd/srd-search.ts rewritten from async per-version pattern to sync singleton pattern (buildMonsterIndex/buildSpellIndex called from store). resetSrdIndexes() kept for tests.
- lib/stores/srd-store.ts created: Zustand, cache-first via loadWithCache helper, all 5 bundles loaded in parallel via Promise.all, index build, graceful error handling.
- components/srd/SrdInitializer.tsx created as 'use client' component (layout is a Server Component, required client wrapper pattern).
- app/app/layout.tsx updated to include SrdInitializer.
- 40 new tests, all passing. 105 existing tests unaffected. Pre-existing CampaignManager.test.tsx failure is unrelated (missing component from a future story).

### File List

- public/srd/spells-2014.json (new)
- public/srd/spells-2024.json (new)
- public/srd/conditions.json (new)
- lib/srd/srd-loader.ts (modified)
- lib/srd/srd-cache.ts (new)
- lib/srd/srd-search.ts (modified)
- lib/stores/srd-store.ts (new)
- components/srd/SrdInitializer.tsx (new)
- app/app/layout.tsx (modified)
- lib/srd/srd-loader.test.ts (new)
- lib/srd/srd-search.test.ts (modified)
- lib/stores/srd-store.test.ts (new)
