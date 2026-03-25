# Epic 11: Monster Search & Combat Setup Overhaul

## Epic Overview

Transform the encounter setup experience — replacing the minimal text-only monster search with a visual, filter-rich panel; removing pre-filled example combatants; adding confirmation feedback when a monster is selected; and giving every monster in the initiative list a clearly-labelled "Ver Ficha" button. Applies equally to the guest (`/try`) and authenticated (`/app/session/new`) flows.

## Business Value

- **First-impression polish**: The first thing a DM does is search for monsters — it must feel powerful and visual, not like a plain `<input>`
- **Reduced confusion**: Pre-filled Goblins + "Init" placeholders mislead new users; a clean slate with helpful empty-state copy is friendlier
- **Discoverability**: Filtering by CR and creature type mirrors how DMs actually think when building encounters
- **Actionability**: Labelled "Ver Ficha" button is immediately understandable; an unlabelled pin icon is not

## Scope

### In Scope

- Remove all pre-filled combatants from both guest store and auth encounter setup
- Redesign monster search into an expandable panel with result cards (thumbnail/silhouette, name, CR, type, HP, AC)
- Filterable by CR range and creature type
- SVG silhouettes per creature type as thumbnails (no copyright issues)
- Golden glow animation on the combatant row that received a monster selection
- Replace pin/icon-only button with `[📖 Ver Ficha]` labelled button for monsters in the initiative list (setup and active combat)
- Both `/try` (guest) and `/app/session/new` (authenticated)

### Out of Scope

- Real artwork / licensed monster images
- Sorting results by anything beyond name
- Infinite scroll / pagination (SRD list is small enough for full load)

## Architecture Decisions

1. **`MonsterSearchPanel` component** — replaces the existing inline input in `EncounterSetup`; self-contained with local filter state
2. **SVG silhouettes** — one file per broad type category, imported as React components; falls back to a generic silhouette for unknown types
3. **Golden glow** — CSS `@keyframes` + class toggled via `setTimeout` on the target `CombatantSetupRow`; no animation library needed
4. **"Ver Ficha" button** — updates existing pin/stat-block trigger in `CombatantRow` and `CombatantSetupRow` to use a `<button>` with visible label

---

## Story 11.1: Clean Initial State

**Priority**: P0
**Estimate**: 1 SP

### Description

Remove all pre-filled combatants (Goblin 1/2/3, Herói 1/2) that appear when the encounter setup screen loads. Replace them with a clean empty state and helpful onboarding copy.

### Acceptance Criteria

- [ ] Guest store (`guest-combat-store.ts`) initialises with zero combatants — no sample encounter loaded on first render
- [ ] Auth encounter setup (`EncounterSetup.tsx`) initialises with zero combatants — no default rows
- [ ] Empty state message is shown when the combatant list is empty: _"Nenhum combatente ainda — pesquise um monstro acima ou adicione manualmente."_
- [ ] "Limpar tudo" button is hidden (or disabled) when the list is already empty
- [ ] `next build` passes with zero TypeScript errors

---

## Story 11.2: Monster Search Panel Redesign

**Priority**: P0
**Estimate**: 3 SP

### Description

Replace the plain text input with a rich `MonsterSearchPanel` component: expandable dropdown of result cards, each showing a creature type silhouette thumbnail, name, CR badge, type tag, HP, and AC. Filterable by CR range and creature type.

### Acceptance Criteria

- [ ] `MonsterSearchPanel` component created in `components/combat/`
- [ ] Search input with debounce (300 ms) filtering the loaded SRD monster list
- [ ] Results render as cards with: silhouette thumbnail (by type), name, CR badge (gold), type label, HP, AC
- [ ] Filter panel (collapsible, defaults closed) with: CR min/max number inputs, creature type multi-select
- [ ] Clicking a result card adds the monster to the encounter and closes the dropdown
- [ ] Keyboard navigation: arrow keys move focus through results, Enter selects, Escape closes
- [ ] Panel used in both `EncounterSetup` (auth) and `GuestCombatClient` / guest setup
- [ ] Responsive: full-width on mobile, max-width 640px on desktop
- [ ] `next build` passes

---

## Story 11.3: Creature Type SVG Silhouettes

**Priority**: P1
**Estimate**: 1 SP

### Description

Create SVG silhouette assets for each D&D creature type and a React helper that maps type → silhouette component.

### Acceptance Criteria

- [ ] Silhouettes exist for: Beast, Dragon, Undead, Humanoid, Fiend, Celestial, Construct, Elemental, Fey, Giant, Monstrosity, Ooze, Plant, Aberration
- [ ] Generic silhouette fallback for any unknown type
- [ ] `getCreatureTypeSilhouette(type: string): React.FC<SVGProps>` utility exported from `lib/utils/creature-silhouettes.tsx`
- [ ] Silhouettes render at 40×40 px in search result cards; styled with a subtle dark-surface background and gold accent tint
- [ ] No external image requests; all assets are inline SVG

---

## Story 11.4: Golden Glow Feedback on Monster Selection

**Priority**: P1
**Estimate**: 1 SP

### Description

When a DM clicks a monster in the search panel and it populates a combatant row, that row briefly glows gold so the DM can see exactly where the action landed.

### Acceptance Criteria

- [ ] CSS keyframe animation `@keyframes glow-gold` defined: border + box-shadow pulse from transparent → `#f5a623` → transparent over 1.5 s
- [ ] `CombatantSetupRow` accepts an optional `highlight` boolean prop; when `true` the animation plays once
- [ ] `EncounterSetup` / monster panel logic sets `highlight` for the row that received the last monster selection, then clears it after 1.5 s
- [ ] Animation respects `prefers-reduced-motion` (no glow when motion is reduced)
- [ ] Works in both guest and authenticated flows

---

## Story 11.5: "Ver Ficha" Labelled Button

**Priority**: P0
**Estimate**: 1 SP

### Description

Replace the unlabelled pin/icon button used to open a monster's stat block with a clearly-labelled button reading "Ver Ficha". Apply to the initiative setup list and the active combat list.

### Acceptance Criteria

- [ ] In `CombatantSetupRow`: existing pin/stat-block icon replaced by `<button>` with icon + text label "Ver Ficha"
- [ ] In `CombatantRow` (active combat): same replacement
- [ ] Button is only rendered for combatants with a `monster_id` (players have no stat block)
- [ ] Button opens the existing `MonsterStatBlock` / pinned card behaviour unchanged
- [ ] Accessible: `aria-label="Ver ficha de {name}"` on the button
- [ ] Visible on all breakpoints (no truncation); uses the existing accent colour
- [ ] `next build` passes
