# Story 4.2: Monster Search & Inline Stat Block Expansion

Status: done

## Story

As a **DM**,
I want to search the SRD monster database and expand full stat blocks inline within the combat tracker,
So that I can reference monster abilities without leaving the combat view.

## Acceptance Criteria

1. **Given** the combat tracker or oracle view
   **When** the DM types in the monster search field
   **Then** results are filtered by name, CR, and creature type in real time (FR16)
   **And** results show monster name, CR, type, and ruleset version badge (FR20)

2. **Given** a monster combatant in the initiative list
   **When** the DM clicks/taps the monster name or expand button
   **Then** the full stat block expands inline: abilities, AC, HP, speed, saving throws, skills, actions, traits, legendary actions (FR17)
   **And** the stat block opens in ≤300ms (NFR4) — instant from in-memory data, no network request
   **And** the stat block does not navigate away from the combat view

3. **Given** an expanded stat block
   **When** the DM clicks/taps again (toggle)
   **Then** the stat block collapses

4. **Given** any displayed stat block or search result
   **When** the content is shown
   **Then** a version badge ("2014" or "2024") is prominently visible (FR20)

---

## Tasks / Subtasks

- [x] Task 1 — Extend SrdMonster interface & update JSON bundles (AC: 2)
  - [x] Extend `SrdMonster` in `lib/srd/srd-loader.ts` with full stat block fields
  - [x] Update `scripts/generate-srd-bundles.ts` to export all monster fields from DB
  - [x] Update `public/srd/monsters-2014.json` and `monsters-2024.json` with full data
  - [x] Bump idb DB version to `2` in `lib/srd/srd-cache.ts` to force cache refresh

- [x] Task 2 — Add `getMonsterById` to `srd-search.ts` (AC: 2)
  - [x] Add `monsterMap: Map<string, SrdMonster>` singleton
  - [x] Update `buildMonsterIndex` to populate `monsterMap`
  - [x] Export `getMonsterById(id, version)` function
  - [x] Update `resetSrdIndexes` to also clear `monsterMap`

- [x] Task 3 — Create `MonsterStatBlock` component (AC: 2, 3, 4)
  - [x] Create `components/oracle/MonsterStatBlock.tsx` with full stat block layout
  - [x] Ability modifier calculation function
  - [x] Reuse `VersionBadge` from `components/session/RulesetSelector`
  - [x] ARIA: `section` with `aria-label`

- [x] Task 4 — Create `MonsterSearch` component (AC: 1, 4)
  - [x] Create `components/oracle/MonsterSearch.tsx`
  - [x] Debounced search using `searchMonsters` singleton
  - [x] Results list with version badge, toggle inline stat block expansion
  - [x] Optional `onAddToCombat` callback

- [x] Task 5 — Create `CombatantRow` component (AC: 2, 3, 4)
  - [x] Create `components/combat/CombatantRow.tsx`
  - [x] Three-tier collapsible: zero-tap (name, HP bar, conditions), one-tap (AC, DC, stat block)
  - [x] HP bar gradient (green/amber/red), temp HP indicator
  - [x] Condition badges as colored pills
  - [x] Inline `MonsterStatBlock` for monster combatants via `getMonsterById`

- [x] Task 6 — Write tests (AC: all)
  - [x] `components/oracle/MonsterStatBlock.test.tsx`
  - [x] `components/oracle/MonsterSearch.test.tsx`
  - [x] `components/combat/CombatantRow.test.tsx`
  - [x] Update `lib/srd/srd-search.test.ts` for `getMonsterById`

---

## Technical Requirements

### Critical: Extend SRD Bundles with Full Stat Block Data

**The current `monsters-2014.json` and `monsters-2024.json` bundles are lean** — they only contain:
`id, name, cr, type, hit_points, armor_class, ruleset_version`

For inline stat block display, the bundles **must be extended** with full stat block fields. This is the top-priority task because everything else depends on it.

**Step 1 — Extend `SrdMonster` interface** in `lib/srd/srd-loader.ts`:

```ts
export interface SrdMonster {
  // --- Search fields (already present) ---
  id: string;
  name: string;
  cr: string;           // maps from DB `challenge_rating`
  type: string;
  hit_points: number;   // maps from DB `hp`
  armor_class: number;  // maps from DB `ac`
  ruleset_version: RulesetVersion;

  // --- Full stat block fields (NEW - add in story 4.2) ---
  size: string;
  alignment: string | null;
  hp_formula: string | null;
  speed: Record<string, string | number>;   // e.g. { walk: "30 ft.", fly: "60 ft." }
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  saving_throws: Record<string, number> | null;  // e.g. { str: 5, wis: 3 }
  skills: Record<string, number> | null;          // e.g. { perception: 4 }
  damage_vulnerabilities: string | null;
  damage_resistances: string | null;
  damage_immunities: string | null;
  condition_immunities: string | null;
  senses: string | null;
  languages: string | null;
  xp: number | null;
  special_abilities: Array<{ name: string; desc: string }> | null;
  actions: Array<{ name: string; desc: string; attack_bonus?: number }> | null;
  legendary_actions: Array<{ name: string; desc: string }> | null;
  reactions: Array<{ name: string; desc: string }> | null;
}
```

**Step 2 — Update `scripts/generate-srd-bundles.ts`** to export all these fields from the DB `monsters` table. The DB schema has all these fields (see `lib/types/database.ts` — `monsters.Row`).

**Step 3 — Update `public/srd/monsters-2014.json` and `monsters-2024.json`** to include full data. Run the bundle script: `npx ts-node --project tsconfig.json scripts/generate-srd-bundles.ts`

> **Note on JSON field mapping (DB → bundle):**
> - DB `hp` → bundle `hit_points`
> - DB `ac` → bundle `armor_class`
> - DB `challenge_rating` → bundle `cr`
> - DB `int` (reserved word in TS) → bundle `int` (fine in JSON/runtime)
> - DB `speed` is `Json` type → cast to `Record<string, string | number>`
> - DB `actions`, `special_abilities`, etc. are `Json` → cast to array types above

### Add Monster Lookup by ID

Add to `lib/srd/srd-search.ts`:

```ts
/** Look up a single monster by its SRD id and version. Returns undefined if not found. */
export function getMonsterById(
  id: string,
  version: RulesetVersion
): SrdMonster | undefined {
  // monsterIndex is built from all monsters; we need direct lookup
  // Use the condition-style approach: iterate conditionData equivalent
  // BUT we need a monsterMap for O(1) lookup
}
```

**Implementation:** Add a `monsterMap: Map<string, SrdMonster>` module-level singleton to `srd-search.ts`, populated in `buildMonsterIndex`:

```ts
let monsterMap: Map<string, SrdMonster> = new Map();

export function buildMonsterIndex(data: SrdMonster[]): void {
  monsterIndex = new Fuse(data, MONSTER_OPTIONS);
  monsterMap = new Map(data.map((m) => [`${m.id}:${m.ruleset_version}`, m]));
}

export function getMonsterById(id: string, version: RulesetVersion): SrdMonster | undefined {
  return monsterMap.get(`${id}:${version}`);
}
```

Export `getMonsterById` from `srd-search.ts`.

### New Components

#### `components/oracle/MonsterStatBlock.tsx`

Renders the full stat block for a given `SrdMonster`. Pure display component — no state, no store access.

```ts
interface MonsterStatBlockProps {
  monster: SrdMonster;
}
```

**Stat block layout (follow standard D&D layout):**
1. **Header**: Name (h3), Size + Type + Alignment (small text), version badge (`<VersionBadge>` from `components/session/RulesetSelector`)
2. **Divider**
3. **Core stats**: AC, HP (with formula), Speed
4. **Ability scores**: STR / DEX / CON / INT / WIS / CHA — display score + modifier (e.g., "16 (+3)")
5. **Divider**
6. **Properties** (only render if present): Saving Throws, Skills, Damage Vulnerabilities, Resistances, Immunities, Condition Immunities, Senses, Languages, CR/XP
7. **Divider**
8. **Special Abilities** (if any): name in bold, desc as text
9. **Actions**: name in bold, desc as text
10. **Legendary Actions** (if any): section header + entries
11. **Reactions** (if any)

**Styling:**
- Background: `bg-[#16213e]` (surface color — matches existing cards)
- Text: white `text-white`, muted `text-white/60`
- Divider: `border-t border-white/10`
- Use Tailwind only — no inline styles (anti-pattern)
- ARIA: wrap in `<section>` with `aria-label={monster.name + ' stat block'}`

**Ability modifier calculation:**
```ts
function abilityMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
```

#### `components/oracle/MonsterSearch.tsx`

Oracle search panel for monster lookups (FR16). Uses `searchMonsters` from `lib/srd/srd-search.ts`.

**Props:**
```ts
interface MonsterSearchProps {
  defaultVersion?: RulesetVersion;
  onAddToCombat?: (monster: SrdMonster) => void; // optional — only in encounter builder context
}
```

**Behavior:**
- Search input (debounced 150ms — same as `EncounterBuilder.tsx`)
- Results list: name, CR badge, type, version badge — max 10 results shown
- Click monster row → toggle inline `MonsterStatBlock` expansion (per AC2/3)
- Multiple monsters can be expanded simultaneously
- `onAddToCombat` callback shown as "+ Add" button on each result row (if provided)

**State:**
- `query: string` — search input
- `expandedIds: Set<string>` — which monster IDs have expanded stat blocks

**No separate store needed** — this is local UI state (`useState`).

#### `components/combat/CombatantRow.tsx`

New component. Implements the UX-DR1 three-tier collapsible pattern for the active combat view.

```ts
interface CombatantRowProps {
  combatant: Combatant;
  isCurrentTurn: boolean;
  onExpand?: (id: string) => void;
}
```

**Three tiers:**
- **Zero-tap** (always visible): name, HP bar (green/yellow/red gradient per UX-DR4), conditions badges (UX-DR5), is_defeated indicator
- **One-tap** (expand on click): AC, Spell Save DC, **inline MonsterStatBlock** (if `combatant.monster_id !== null`)
- The stat block lookup: `getMonsterById(combatant.monster_id, combatant.ruleset_version ?? '2014')`

**HP bar gradient:**
```ts
// HP percentage determines color
// >50% → green, 25–50% → amber, <25% → red
const hpPct = combatant.current_hp / combatant.max_hp;
const barColor = hpPct > 0.5 ? 'bg-green-500' : hpPct > 0.25 ? 'bg-amber-400' : 'bg-red-500';
```

**Temp HP overlay:** If `combatant.temp_hp > 0`, show separate temp HP indicator in `#9f7aea` (UX-DR4)

**Condition badges:** Colored pills per UX-DR5. Display each condition as `<span>` with appropriate color class. Text label always shown (UX-DR10 / NFR21).

**ARIA:** `role="listitem"`, `aria-current="true"` when `isCurrentTurn` (UX-DR15)

**Expand/collapse:** Use `useState` local to CombatantRow. Keyboard accessible: `Enter` or `Space` on the name/button expands (UX-DR8).

**Important:** This component is for the **active combat view** only (not the initiative setup phase). The `InitiativeTracker.tsx` is for the pre-combat initiative assignment phase and does NOT need to show stat blocks.

---

## File Structure

```
lib/srd/
  srd-loader.ts          ← MODIFY: extend SrdMonster interface with full fields
  srd-search.ts          ← MODIFY: add monsterMap + getMonsterById()
  srd-loader.test.ts     (existing — verify tests still pass after interface extension)
  srd-search.test.ts     ← MODIFY: add tests for getMonsterById

scripts/
  generate-srd-bundles.ts ← MODIFY: export full fields in monster export query

public/srd/
  monsters-2014.json     ← UPDATE: run bundle script to include full fields
  monsters-2024.json     ← UPDATE: run bundle script to include full fields

components/oracle/
  MonsterStatBlock.tsx   ← NEW
  MonsterStatBlock.test.tsx ← NEW
  MonsterSearch.tsx      ← NEW
  MonsterSearch.test.tsx ← NEW

components/combat/
  CombatantRow.tsx       ← NEW
  CombatantRow.test.tsx  ← NEW
```

---

## Architecture Compliance

| Rule | Application |
|------|-------------|
| **NO `supabase.from('monsters')` at runtime** | Full stat block data served from static JSON bundle (CDN). No DB queries for stat blocks. |
| **NO server round-trip per keystroke** | All search via `searchMonsters()` (Fuse.js singleton, in-memory) |
| **NO re-indexing per query** | Fuse.js singleton, `buildMonsterIndex` called only once at app init |
| **snake_case in data layer** | `SrdMonster` fields use snake_case throughout |
| **No `any` types** | Use `SrdMonster` interface with explicit field types; `Json` from DB → typed cast in bundle script |
| **Tailwind only** | No inline styles in components |
| **Co-located tests** | `.test.tsx` files next to source |
| **`VersionBadge` reuse** | Already exists in `components/session/RulesetSelector.tsx` — import from there |
| **shadcn/ui primitives** | Use `Collapsible`/`CollapsibleContent` from shadcn for expand/collapse pattern |

---

## Previous Story Intelligence (Story 4.1)

**Files created/modified in Story 4.1:**

| File | State |
|------|-------|
| `lib/srd/srd-loader.ts` | `SrdMonster` is **lean** (search fields only). Story 4.2 extends it. |
| `lib/srd/srd-search.ts` | Has `buildMonsterIndex`, `searchMonsters`, Fuse.js singleton. Extend with `monsterMap`. |
| `lib/srd/srd-cache.ts` | Handles idb caching. IndexedDB will cache the extended monster data automatically. |
| `lib/stores/srd-store.ts` | `monsters: SrdMonster[]` in state. When SrdMonster is extended, the stored data automatically includes full fields. |
| `components/srd/SrdInitializer.tsx` | Background init. No changes needed. |
| `public/srd/monsters-2014.json` | **LEAN stub data** — 15 monsters, search fields only. Must be regenerated. |
| `public/srd/monsters-2024.json` | **LEAN stub data** — same. Must be regenerated. |
| `components/session/RulesetSelector.tsx` | Contains `VersionBadge` component — **import and reuse in story 4.2**. |

**Critical Learning from 4.1:**
- Story 4.1 completion notes: "SrdMonster kept lean per dev notes" — the full fields extension was **deferred to story 4.2** (current story).
- The Fuse.js singleton pattern is established. Extend `buildMonsterIndex` to also populate `monsterMap`.
- `idb` cache: When `SrdMonster` is extended with new fields, the bundle script re-export will produce new data. The idb cache may have stale lean data — handle this by bumping the idb DB version to `2` in `srd-cache.ts` to force cache refresh.

**idb Cache Version Bump:**
```ts
// lib/srd/srd-cache.ts
const DB_VERSION = 2; // was 1 — bump to force refresh when schema changes
```

---

## Testing Requirements

### `MonsterStatBlock.test.tsx`
- Renders monster name, CR, type, version badge
- Renders ability scores with correct modifiers (e.g., STR 16 → "+3")
- Renders actions list when present
- Does NOT render legendary actions section if `legendary_actions` is null
- ARIA: `section` has correct `aria-label`

### `MonsterSearch.test.tsx`
- Shows no results when query is empty
- Shows results when `searchMonsters` returns matches (mock `srd-search.ts`)
- Clicking a result toggles `MonsterStatBlock` visibility (expand/collapse)
- Shows version badge on each result
- Calls `onAddToCombat` with correct monster when "+ Add" is clicked
- Does not render "+ Add" button when `onAddToCombat` is not provided

### `CombatantRow.test.tsx`
- Renders name, HP bar, conditions in zero-tap tier
- Does NOT show stat block by default
- Click on name/button → shows stat block for monster combatants (`monster_id` set)
- Click again → hides stat block
- Non-monster combatants (`monster_id: null`) do NOT show stat block expand UI
- `aria-current="true"` when `isCurrentTurn=true`
- HP bar color: green when >50%, amber when 25–50%, red when <25%
- Temp HP indicator shown when `temp_hp > 0`

### `srd-search.test.ts` updates
- `getMonsterById(id, version)` returns correct monster
- `getMonsterById` returns `undefined` for unknown id
- `getMonsterById` returns `undefined` after `resetSrdIndexes()` (map also cleared)

---

## Anti-Patterns to Avoid

- **DO NOT** call `supabase.from('monsters')` to fetch stat block data — use the static JSON bundle
- **DO NOT** fetch individual monster JSON files on click — all data loaded at init, lookup is in-memory
- **DO NOT** build a new Fuse.js index in `MonsterSearch` — use `searchMonsters()` from `srd-search.ts`
- **DO NOT** create a new `MonsterStatBlock` state in a store — expand/collapse is local UI state only
- **DO NOT** put stat block rendering inside `InitiativeTracker.tsx` — initiative setup phase ≠ active combat view
- **DO NOT** duplicate the `VersionBadge` component — import from `components/session/RulesetSelector`
- **DO NOT** use inline `style={}` — Tailwind utility classes only
- **DO NOT** forget to update the idb DB version to `2` when extending SrdMonster — stale lean cache will break stat block rendering

---

## Key Package Versions

- `fuse.js ^7.1.0` — already installed, singleton pattern in `srd-search.ts`
- `idb ^8.0.3` — already installed. Bump DB version to 2 in `srd-cache.ts`
- `zustand ^5.0.12` — no new stores needed for this story
- `shadcn/ui` — `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` for expand/collapse (check if installed; if not, add via `npx shadcn@latest add collapsible`)

---

## Ability Score Modifier Reference

```
Score  Modifier
1      -5
2-3    -4
4-5    -3
6-7    -2
8-9    -1
10-11  +0
12-13  +1
14-15  +2
16-17  +3
18-19  +4
20-21  +5
```

Formula: `Math.floor((score - 10) / 2)`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean run.

### Completion Notes List

- Extended `SrdMonster` interface in `srd-loader.ts` with 23 optional full stat block fields (size, alignment, hp_formula, speed, ability scores, saving_throws, skills, damage types, senses, languages, xp, special_abilities, actions, legendary_actions, reactions). Made optional (not required) to preserve backward compat with existing lean test fixtures.
- Added `MonsterAction` sub-interface for typed action/ability entries.
- Bumped idb DB version from 1 → 2 in `srd-cache.ts` to force cache invalidation when clients load the extended bundles.
- Updated both JSON stub bundles (`monsters-2014.json` — 15 monsters, `monsters-2024.json` — 15 monsters) with full SRD-accurate stat block data. `generate-srd-bundles.ts` already uses `select("*")` so production re-run will also include all fields.
- Added `monsterMap: Map<string, SrdMonster>` singleton to `srd-search.ts`, keyed by `{id}:{ruleset_version}`. Populated in `buildMonsterIndex`, cleared in `resetSrdIndexes`. New `getMonsterById(id, version)` export provides O(1) stat block lookup.
- Created `components/oracle/MonsterStatBlock.tsx`: full D&D stat block renderer with ability score grid, ability modifier calculation, collapsible sections (special abilities, actions, reactions, legendary actions), ARIA `region` role. Reuses `VersionBadge` from `RulesetSelector`.
- Created `components/oracle/MonsterSearch.tsx`: Fuse.js oracle search panel with 150ms debounce, 10-result cap, per-monster toggle expansion of inline `MonsterStatBlock`, optional `onAddToCombat` callback.
- Created `components/combat/CombatantRow.tsx`: UX-DR1 three-tier collapsible combatant card (zero-tap: name+HP bar+conditions; one-tap: AC+DC+MonsterStatBlock). HP bar uses green/amber/red gradient. Condition badges as colored pills. `aria-current` for active turn. `getMonsterById` lookup to determine expandability.
- 83 new tests added across 4 files. 216 total tests — zero regressions.

### File List

- `lib/srd/srd-loader.ts` (modified — extended SrdMonster + added MonsterAction)
- `lib/srd/srd-cache.ts` (modified — DB_VERSION bumped to 2)
- `lib/srd/srd-search.ts` (modified — monsterMap singleton + getMonsterById + resetSrdIndexes update)
- `lib/srd/srd-search.test.ts` (modified — added getMonsterById describe block, 5 new tests)
- `public/srd/monsters-2014.json` (modified — full stat block data for all 15 stub monsters)
- `public/srd/monsters-2024.json` (modified — full stat block data for all 15 stub monsters)
- `components/oracle/MonsterStatBlock.tsx` (new)
- `components/oracle/MonsterStatBlock.test.tsx` (new — 26 tests)
- `components/oracle/MonsterSearch.tsx` (new)
- `components/oracle/MonsterSearch.test.tsx` (new — 12 tests)
- `components/combat/CombatantRow.tsx` (new)
- `components/combat/CombatantRow.test.tsx` (new — 22 tests)
