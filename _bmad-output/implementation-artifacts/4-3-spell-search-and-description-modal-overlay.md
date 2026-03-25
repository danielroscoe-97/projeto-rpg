# Story 4.3: Spell Search & Description Modal Overlay

Status: done

## Story

As a **DM or player**,
I want to search the SRD spell list and view full descriptions in a modal overlay,
So that I can look up spell rules mid-combat without losing my place.

## Acceptance Criteria

1. **Given** the oracle or combat view
   **When** the user types in the spell search field
   **Then** results are filtered by name, class, level, and school in real time (FR18)
   **And** results show spell name, level, school, and ruleset version badge (FR20)

2. **Given** a spell search result
   **When** the user clicks/taps a spell name
   **Then** a modal overlay opens with the full spell description: casting time, range, components, duration, description text (FR19)
   **And** the modal opens in ≤300ms (NFR4) — instant from in-memory data, no network request
   **And** the combat view remains visible behind the modal (semi-transparent overlay)

3. **Given** an open spell modal
   **When** the user closes it (X button, Escape key, or click outside)
   **Then** the modal closes and the user returns to exactly where they were

4. **Given** any displayed spell result or modal
   **When** the content is shown
   **Then** a version badge ("2014" or "2024") is prominently visible (FR20)

---

## Tasks / Subtasks

- [ ] Task 1 — Add `getSpellById` to `srd-search.ts` (AC: 2)
  - [ ] Add `spellMap: Map<string, SrdSpell>` singleton
  - [ ] Update `buildSpellIndex` to populate `spellMap`
  - [ ] Export `getSpellById(id, version)` function
  - [ ] Update `resetSrdIndexes` to also clear `spellMap`

- [ ] Task 2 — Create `SpellDescriptionModal` component (AC: 2, 3, 4)
  - [ ] Create `components/oracle/SpellDescriptionModal.tsx`
  - [ ] Use shadcn `Dialog` (Radix) for modal overlay
  - [ ] Full spell layout: name, level+school, casting time, range, components, duration, description, higher levels
  - [ ] Concentration and ritual indicators
  - [ ] Class list display
  - [ ] VersionBadge from `RulesetSelector`
  - [ ] ARIA: dialog with accessible title

- [ ] Task 3 — Create `SpellSearch` component (AC: 1, 4)
  - [ ] Create `components/oracle/SpellSearch.tsx`
  - [ ] Debounced search using `searchSpells` singleton (150ms, matching MonsterSearch)
  - [ ] Results list with spell name, level, school, classes, version badge
  - [ ] Click result → open `SpellDescriptionModal`
  - [ ] Max 10 results shown
  - [ ] Optional `defaultVersion` prop to filter by session ruleset

- [ ] Task 4 — Write tests (AC: all)
  - [ ] `components/oracle/SpellDescriptionModal.test.tsx`
  - [ ] `components/oracle/SpellSearch.test.tsx`
  - [ ] Update `lib/srd/srd-search.test.ts` for `getSpellById`

---

## Technical Requirements

### Add Spell Lookup by ID

Add to `lib/srd/srd-search.ts` (mirrors `getMonsterById` pattern):

```ts
let spellMap: Map<string, SrdSpell> = new Map();

export function buildSpellIndex(data: SrdSpell[]): void {
  spellIndex = new Fuse(data, SPELL_OPTIONS);
  spellMap = new Map(data.map((s) => [`${s.id}:${s.ruleset_version}`, s]));
}

export function getSpellById(id: string, version: RulesetVersion): SrdSpell | undefined {
  return spellMap.get(`${id}:${version}`);
}
```

Update `resetSrdIndexes` to clear `spellMap`.

### New Components

#### `components/oracle/SpellDescriptionModal.tsx`

Modal overlay displaying full spell details. Uses shadcn `Dialog` component.

```ts
interface SpellDescriptionModalProps {
  spell: SrdSpell | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Spell modal layout (standard D&D spell card):**
1. **Header**: Spell name (DialogTitle), level + school line (e.g., "3rd-level Evocation"), version badge
2. **Properties grid**: Casting Time, Range, Components, Duration — each as label/value pair
3. **Tags**: Concentration badge (if true), Ritual badge (if true)
4. **Divider**
5. **Description**: Full spell text
6. **At Higher Levels** (if `higher_levels` is not null): section with upcast text
7. **Classes**: Comma-separated class list

**Styling:**
- Use shadcn `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`
- Override `DialogContent` max-width to `max-w-lg` for spell text readability
- Background: inherits from Dialog (`bg-[#16213e]`)
- Text: `text-white`, muted `text-white/60`
- Divider: `border-t border-white/10`
- Concentration/Ritual badges: `bg-amber-500/20 text-amber-400` / `bg-purple-500/20 text-purple-400`
- 44×44px close button (NFR24)
- Tailwind only — no inline styles

**Level display helper:**
```ts
function spellLevelLabel(level: number, school: string): string {
  if (level === 0) return `${school} cantrip`;
  const suffix = level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th';
  return `${level}${suffix}-level ${school}`;
}
```

#### `components/oracle/SpellSearch.tsx`

Oracle search panel for spell lookups (FR18). Mirrors `MonsterSearch` architecture.

```ts
interface SpellSearchProps {
  defaultVersion?: RulesetVersion;
}
```

**Behavior:**
- Search input (debounced 150ms)
- Results list: name, level, school, classes (truncated), version badge — max 10 results
- Click spell row → open `SpellDescriptionModal` (controlled state)
- Only one modal open at a time (single `selectedSpell` state)

**State:**
- `query: string` — search input
- `selectedSpell: SrdSpell | null` — spell shown in modal (null = closed)

**No separate store needed** — local UI state (`useState`).

---

## File Structure

```
lib/srd/
  srd-search.ts          ← MODIFY: add spellMap + getSpellById() + resetSrdIndexes update
  srd-search.test.ts     ← MODIFY: add tests for getSpellById

components/oracle/
  SpellDescriptionModal.tsx   ← NEW
  SpellDescriptionModal.test.tsx ← NEW
  SpellSearch.tsx              ← NEW
  SpellSearch.test.tsx         ← NEW
```

---

## Architecture Compliance

| Rule | Application |
|------|-------------|
| **NO `supabase.from('spells')` at runtime** | Full spell data served from static JSON bundle (CDN). No DB queries. |
| **NO server round-trip per keystroke** | All search via `searchSpells()` (Fuse.js singleton, in-memory) |
| **Modal ≤300ms open** | Data already in memory; Radix Dialog animation is CSS-only |
| **snake_case in data layer** | `SrdSpell` fields use snake_case throughout |
| **Tailwind only** | No inline styles in components |
| **Co-located tests** | `.test.tsx` files next to source |
| **`VersionBadge` reuse** | Import from `components/session/RulesetSelector` |
| **shadcn/ui primitives** | Use `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` for modal |
| **44×44px touch targets** | All interactive elements meet NFR24 |

---

## Previous Story Intelligence (Story 4.2)

**Pattern to follow:** `MonsterSearch.tsx` architecture — debounced search, results list, version badge, toggle interaction. Key difference: spell uses **modal overlay** (Dialog) instead of **inline expansion** (Collapsible).

**Existing infrastructure from 4.1:**
- `searchSpells(query, version?)` — already built in `srd-search.ts`
- `SrdSpell` interface — already defined in `srd-loader.ts` with all fields needed
- `VersionBadge` — already exported from `RulesetSelector.tsx`
- `Dialog` component — already installed in `components/ui/dialog.tsx`

**What's missing (this story adds):**
- `getSpellById()` for direct lookup
- `SpellDescriptionModal` component
- `SpellSearch` component

---

## Testing Requirements

### `SpellDescriptionModal.test.tsx`
- Renders spell name as dialog title
- Renders level + school line correctly (cantrip vs. leveled)
- Renders casting time, range, components, duration
- Renders description text
- Renders "At Higher Levels" section when `higher_levels` is present
- Does NOT render "At Higher Levels" when `higher_levels` is null
- Shows concentration badge when `concentration` is true
- Shows ritual badge when `ritual` is true
- Shows version badge
- Shows class list
- ARIA: dialog has accessible title

### `SpellSearch.test.tsx`
- Shows no results when query is empty
- Shows results when `searchSpells` returns matches (mock `srd-search.ts`)
- Clicking a result opens the spell modal
- Shows version badge on each result
- Shows level and school on each result
- Shows "No spells found" message for empty results with query

### `srd-search.test.ts` updates
- `getSpellById(id, version)` returns correct spell
- `getSpellById` returns `undefined` for unknown id
- `getSpellById` returns `undefined` after `resetSrdIndexes()` (map also cleared)

---

## Anti-Patterns to Avoid

- **DO NOT** call `supabase.from('spells')` to fetch spell data — use the static JSON bundle
- **DO NOT** fetch individual spell JSON files on click — all data loaded at init, lookup is in-memory
- **DO NOT** build a new Fuse.js index in `SpellSearch` — use `searchSpells()` from `srd-search.ts`
- **DO NOT** create a new Zustand store for spell modal state — modal open/close is local UI state only
- **DO NOT** duplicate the `VersionBadge` component — import from `components/session/RulesetSelector`
- **DO NOT** use inline `style={}` — Tailwind utility classes only
- **DO NOT** use a custom modal implementation — use shadcn `Dialog` (Radix) which handles Escape, click-outside, focus trap, ARIA
