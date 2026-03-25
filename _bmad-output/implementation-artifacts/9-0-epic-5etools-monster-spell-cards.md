# Epic 9: 5e.tools-Style Pinnable Monster & Spell Cards

## Epic Overview

Transform the existing monster stat blocks and spell descriptions into a **5e.tools-inspired visual system** with dark-fantasy themed cards that can be **pinned to the screen**, **dragged freely**, **minimized**, and **cross-referenced** via clickable spell/condition links. This epic delivers a GM-screen-like experience where multiple stat blocks and spell cards float over the combat interface, matching the information density and visual polish of 5e.tools.

## Business Value

- **DM Productivity**: Eliminates constant tab-switching to reference monster abilities and spell descriptions during combat
- **Visual Polish**: Dark-fantasy theme elevates the app from "functional tool" to "immersive experience"
- **Feature Parity**: Matches the core reference UX that DMs expect from 5e.tools, our primary competitor for SRD lookup
- **Retention**: Pinnable cards create a "virtual GM screen" that becomes indispensable during sessions

## Dependencies

- Existing SRD data bundles (334 monsters, 319 spells per version) — ✅ Complete
- Existing `dnd-kit` dependency for drag behavior — ✅ Installed
- Existing Zustand store pattern — ✅ Established
- Existing `MonsterStatBlock.tsx` and `SpellDescriptionModal.tsx` — ✅ Will be refactored

## Architecture Decisions

1. **Zustand store** (`pinned-cards-store.ts`) manages all floating card state
2. **React Portal** renders cards at document root to escape overflow/z-index issues
3. **dnd-kit `useDraggable`** provides free-form drag positioning (not sortable)
4. **CSS custom properties** for the 5e.tools dark theme — scoped to `.stat-card-5e` class
5. **Spell name detection** uses regex matching against the loaded spell index for automatic cross-referencing
6. **Proficiency bonus** calculated from CR using the standard D&D formula

---

## Story 9.1: Pinned Cards State Management (Zustand Store)

**Priority**: P0 (Foundation)
**Estimate**: 3 SP

### Description
Create a Zustand store that manages the lifecycle of pinned floating cards — open, close, minimize, restore, reposition, and z-index stacking.

### Acceptance Criteria
- [ ] `usePinnedCardsStore()` hook available globally
- [ ] `pinCard(type, entityId, rulesetVersion)` opens a new card at a default cascading position
- [ ] `unpinCard(cardId)` removes a card from the store
- [ ] `moveCard(cardId, position)` updates x/y coordinates
- [ ] `focusCard(cardId)` brings card to front (highest z-index)
- [ ] `toggleMinimize(cardId)` toggles minimized state
- [ ] `unpinAll()` clears all pinned cards
- [ ] Maximum 8 simultaneous pinned cards (oldest auto-removed when exceeded)
- [ ] Cards cascade from top-left: each new card offset by +30px x and +30px y
- [ ] Store persists card state in `sessionStorage` so cards survive page navigation within the session
- [ ] Unit tests for all store actions

### Technical Notes
```typescript
// lib/stores/pinned-cards-store.ts
interface PinnedCard {
  id: string;
  type: 'monster' | 'spell' | 'condition';
  entityId: string;
  rulesetVersion: RulesetVersion;
  position: { x: number; y: number };
  zIndex: number;
  isMinimized: boolean;
  pinnedAt: number; // timestamp for LRU eviction
}

interface PinnedCardsState {
  cards: PinnedCard[];
  nextZIndex: number;
  pinCard: (type: PinnedCard['type'], entityId: string, rulesetVersion: RulesetVersion) => void;
  unpinCard: (cardId: string) => void;
  moveCard: (cardId: string, position: { x: number; y: number }) => void;
  focusCard: (cardId: string) => void;
  toggleMinimize: (cardId: string) => void;
  unpinAll: () => void;
}
```

---

## Story 9.2: 5e.tools Dark-Fantasy Visual Theme

**Priority**: P0 (Foundation)
**Estimate**: 5 SP

### Description
Create a CSS theme that replicates the 5e.tools visual aesthetic — dark parchment background, red section headers, amber text, stat table with alternating rows, and the iconic red/gold divider lines.

### Acceptance Criteria
- [ ] `.stat-card-5e` CSS class provides the full 5e.tools dark theme
- [ ] Background: dark parchment (`#1a1a1e` with subtle texture gradient)
- [ ] Primary text: warm off-white (`#e8e4d0`)
- [ ] Monster name: large, bold, warm white with small-caps
- [ ] Source/book reference: red accent text (`#922610`) aligned top-right
- [ ] Section headers (Traits, Actions, Reactions, Legendary Actions): red (`#922610`), italic, with decorative underline
- [ ] Ability score table: 6-column grid with header row (Score/Mod/Save), alternating subtle row shading
- [ ] Properties (AC, HP, Speed, Skills, etc.): bold label + normal value, single-line each
- [ ] Red/gold decorative divider between major sections (SVG or CSS gradient)
- [ ] Stat block card has subtle border glow on hover (`box-shadow: 0 0 8px rgba(146,38,16,0.3)`)
- [ ] Card corner radius: `4px` (tight, parchment-like)
- [ ] Responsive: minimum width 320px, maximum width 500px
- [ ] Spell card uses same theme but with blue-tinted section headers (`#3a6ea5`)
- [ ] Condition card uses same theme with amber section headers (`#b8860b`)
- [ ] All colors defined as CSS custom properties for easy theming
- [ ] Theme does NOT affect the rest of the app — scoped entirely to `.stat-card-5e`

### Visual Reference
```
┌──────────────────────────────────────────┐
│ [+][-][📌][×]                            │
│ AARAKOCRA SPELLJAMMER          LoX p43   │
│ Medium Humanoid, Any Alignment    [img]  │
│──────────── red divider ─────────────────│
│ AC 12 (15 with mage armor)               │
│ HP 40 (9d8)          Initiative +2 (12)  │
│ Speed 30 ft., Fly 50 ft.                 │
│──────────── red divider ─────────────────│
│  STR   DEX   CON   INT   WIS   CHA      │
│   9     14    11    17    12    11        │
│  -1    +2    +0    +3    +1    +0        │
│  -1    +2    +0    +6    +4    +0  saves │
│──────────── red divider ─────────────────│
│ Skills Arcana +6, History +6             │
│ Senses Passive Perception 11             │
│ Languages Any four languages             │
│ CR 6 (XP 2,300; PB +3)                  │
│──────────── red divider ─────────────────│
│ 𝘛𝘳𝘢𝘪𝘵𝘴                                    │
│ Spellcasting. The aarakocra is a...      │
│   Cantrips: fire bolt, light, mage hand  │
│   1st level (4 slots): detect magic...   │
│──────────── red divider ─────────────────│
│ 𝘈𝘤𝘵𝘪𝘰𝘯𝘴                                   │
│ Dagger. Melee or Ranged Weapon Attack... │
└──────────────────────────────────────────┘
```

### Technical Notes
- CSS file: `styles/stat-card-5e.css` imported in the card components
- Use CSS custom properties: `--5e-bg`, `--5e-text`, `--5e-accent-red`, `--5e-accent-gold`, `--5e-divider`, `--5e-header`, `--5e-link`
- Divider: `background: linear-gradient(to right, transparent, #922610, #c9a959, #922610, transparent)` with `height: 2px`

---

## Story 9.3: Refactored Monster Stat Block (5e.tools Layout)

**Priority**: P0 (Core)
**Estimate**: 8 SP

### Description
Refactor `MonsterStatBlock.tsx` to match the 5e.tools layout precisely — including the ability score table with Mod and Save columns, proficiency bonus calculation, initiative display, CR with XP and PB, and the full section structure.

### Acceptance Criteria
- [ ] Monster name displayed in small-caps, bold, large font
- [ ] Size/Type/Alignment on second line, italic
- [ ] AC displayed with armor type in parentheses when available
- [ ] HP displayed with hit dice formula
- [ ] Initiative displayed: `Initiative +{dexMod} ({10 + dexMod})`
- [ ] Speed with all movement types
- [ ] Ability score table shows three rows: **Score**, **Mod** (with sign), **Save** (with sign)
  - Save = ability mod + proficiency bonus if the creature has a saving throw proficiency, otherwise just ability mod
- [ ] Proficiency bonus auto-calculated from CR: `Math.max(2, Math.floor((parseCR(cr) - 1) / 4) + 2)`
- [ ] Skills displayed with proper capitalization and sign
- [ ] Damage vulnerabilities, resistances, immunities displayed when present
- [ ] Condition immunities displayed when present
- [ ] Senses with passive Perception
- [ ] Languages displayed
- [ ] CR displayed as: `CR {cr} (XP {xp}; PB +{pb})`
- [ ] Special Abilities section with "Traits" header
- [ ] Actions section with "Actions" header
- [ ] Reactions section with "Reactions" header (when present)
- [ ] Legendary Actions section with "Legendary Actions" header and introductory text (when present)
- [ ] All sections separated by themed dividers
- [ ] Uses `.stat-card-5e` theme from Story 9.2
- [ ] Component accepts `variant` prop: `'inline'` (current behavior, embedded) or `'card'` (floating card with toolbar)
- [ ] `'card'` variant includes top toolbar: Pin (📌), Minimize (−), Close (×)
- [ ] Backward compatible — existing inline usage in `CombatantRow` and `MonsterSearch` still works

### Technical Notes
- File: `components/oracle/MonsterStatBlock.tsx` (refactor existing)
- New helper: `calculateProficiencyBonus(cr: string): number`
- New helper: `calculateSave(abilityScore: number, hasProficiency: boolean, pb: number): string`

---

## Story 9.4: Spell Card Component (5e.tools Layout)

**Priority**: P0 (Core)
**Estimate**: 5 SP

### Description
Create a new `SpellCard` component that displays spell information in the 5e.tools visual style, replacing the current plain modal. Supports both inline and floating card variants.

### Acceptance Criteria
- [ ] Spell name in small-caps, bold, large font (same style as monster name)
- [ ] Spell school and level on second line, italic (e.g., "2nd-level Evocation" or "Transmutation Cantrip")
- [ ] Source reference in top-right (red accent text)
- [ ] Properties section:
  - [ ] **Casting Time**: value
  - [ ] **Range**: value
  - [ ] **Components**: value (with material component details)
  - [ ] **Duration**: value (with "Concentration" prefix when applicable)
- [ ] Full description text with proper paragraph formatting
- [ ] "At Higher Levels" section when present, with italic header
- [ ] **Classes** list at bottom (bold label + comma-separated class names)
- [ ] Ritual tag displayed when applicable
- [ ] Concentration tag displayed when applicable
- [ ] Uses `.stat-card-5e` theme with blue-tinted headers
- [ ] `variant` prop: `'inline'` (for embedding) or `'card'` (floating with toolbar)
- [ ] `'card'` variant includes toolbar: Pin (📌), Minimize (−), Close (×)
- [ ] Replaces `SpellDescriptionModal` usage for the pinned card flow
- [ ] SpellDescriptionModal can remain for backward compat but internally renders SpellCard

### Technical Notes
- File: `components/oracle/SpellCard.tsx` (new component)
- Reuse theme CSS from Story 9.2

---

## Story 9.5: Floating Card Container & Drag System

**Priority**: P0 (Core)
**Estimate**: 5 SP

### Description
Build the floating card container that renders pinned cards via React Portal, supports free-form dragging via `dnd-kit`, and manages z-index stacking on focus.

### Acceptance Criteria
- [ ] `<FloatingCardContainer />` component renders at document root via `createPortal`
- [ ] Reads from `usePinnedCardsStore()` and renders one card per entry
- [ ] Each card is wrapped in a `useDraggable` from `@dnd-kit/core`
- [ ] Dragging updates card position in the store via `moveCard()`
- [ ] Clicking anywhere on a card calls `focusCard()` to bring it to front
- [ ] Minimized cards collapse to a small title bar (name + type icon + restore button)
- [ ] Minimized cards stack in bottom-right corner with 4px vertical gap
- [ ] Close button (×) calls `unpinCard()`
- [ ] Cards cannot be dragged outside the viewport (clamped to window bounds)
- [ ] Cards have a subtle drop shadow: `box-shadow: 0 4px 20px rgba(0,0,0,0.5)`
- [ ] Smooth transitions on minimize/restore (CSS transition, 200ms)
- [ ] "Unpin All" button appears when 2+ cards are pinned (fixed bottom-left)
- [ ] Container does not interfere with the combat UI underneath (pointer-events: none on container, pointer-events: auto on cards)
- [ ] Responsive: on mobile (<768px), cards open as full-screen overlay instead of floating
- [ ] Keyboard accessible: Escape closes the focused card, Tab navigates between cards

### Technical Notes
- File: `components/oracle/FloatingCardContainer.tsx`
- Uses `@dnd-kit/core` `DndContext` + `useDraggable` (NOT `useSortable`)
- Portal target: `document.getElementById('floating-cards-root')` — add div in root layout
- Renders `MonsterStatBlock variant="card"` or `SpellCard variant="card"` based on card type

---

## Story 9.6: Spell & Condition Cross-Reference Links

**Priority**: P1 (Enhancement)
**Estimate**: 5 SP

### Description
Automatically detect spell and condition names in monster ability/action text and render them as clickable links that open pinnable cards. Hover shows a tooltip preview.

### Acceptance Criteria
- [ ] `<LinkedText text={string} rulesetVersion={RulesetVersion} />` component
- [ ] Scans text for known spell names (matched against loaded spell index from `srd-search.ts`)
- [ ] Scans text for known condition names (matched against conditions data)
- [ ] Detected names rendered as amber-colored links (`--5e-link: #e69a28`)
- [ ] **Click** on a spell link: calls `pinCard('spell', spellId, version)` — opens floating spell card
- [ ] **Click** on a condition link: calls `pinCard('condition', conditionId, version)` — opens floating condition card
- [ ] **Hover** on a link (300ms delay): shows tooltip with compact preview (name, level/school for spells; first sentence of description for conditions)
- [ ] Tooltip dismisses on mouse leave or after 3 seconds
- [ ] Links are case-insensitive (matches "Fire Bolt", "fire bolt", "FIRE BOLT")
- [ ] Does NOT link partial matches (e.g., "light" in "lightning" should not link to the Light spell)
  - Uses word boundary detection: match only when spell name is preceded and followed by non-alphanumeric characters or string boundaries
- [ ] Handles comma-separated spell lists (common in Spellcasting trait): "fire bolt, light, mage hand" → three separate links
- [ ] Performance: spell name matching runs once on render, memoized with `useMemo`
- [ ] Applied to all text fields in MonsterStatBlock: special_abilities, actions, reactions, legendary_actions
- [ ] Applied to spell description text in SpellCard (for spells that reference other spells)
- [ ] Unit tests for link detection with edge cases

### Technical Notes
- File: `components/oracle/LinkedText.tsx`
- Build a sorted (longest-first) array of spell names for greedy matching
- Regex: `new RegExp(`\\b(${escapedNames.join('|')})\\b`, 'gi')`
- Split text on matches, interleave plain text spans and link components

---

## Story 9.7: Condition Card Component

**Priority**: P1 (Enhancement)
**Estimate**: 3 SP

### Description
Create a `ConditionCard` component that displays D&D 5e condition rules in the 5e.tools visual style, for use in the floating card system.

### Acceptance Criteria
- [ ] Condition name in small-caps, bold, large font
- [ ] "Condition" subtitle in italic
- [ ] Full rules text from conditions.json
- [ ] Uses `.stat-card-5e` theme with amber-tinted headers
- [ ] `variant` prop: `'inline'` or `'card'`
- [ ] `'card'` variant includes toolbar: Pin (📌), Minimize (−), Close (×)
- [ ] Replaces `ConditionRulesModal` for the pinned card flow
- [ ] Condition badges in CombatantRow open a pinned condition card on click (instead of modal)

### Technical Notes
- File: `components/oracle/ConditionCard.tsx`
- Data source: `loadConditions()` from `srd-loader.ts`

---

## Story 9.8: Integration — Pin from Combat & Search

**Priority**: P1 (Integration)
**Estimate**: 5 SP

### Description
Wire up the pinning system to all existing UI touchpoints — monster search results, combatant rows, spell search results, and condition badges.

### Acceptance Criteria
- [ ] **MonsterSearch**: Each search result shows a 📌 pin button that opens a floating monster card
- [ ] **MonsterSearch**: Clicking monster name still expands inline stat block (existing behavior preserved)
- [ ] **CombatantRow**: Monster name click opens a floating pinned card (instead of inline expand, which remains available via a toggle)
- [ ] **CombatantRow**: New 📌 button in the action toolbar to pin the monster card
- [ ] **SpellSearch**: Each search result shows a 📌 pin button that opens a floating spell card
- [ ] **SpellSearch**: Clicking spell name still opens modal (existing behavior preserved), but modal now has a "Pin" button
- [ ] **ConditionBadge**: Click opens a floating condition card (replaces modal)
- [ ] **ConditionBadge**: Long-press or right-click opens the condition in a pinned card
- [ ] **EncounterSetup**: Monster added from SRD search can be pinned from the setup row
- [ ] **FloatingCardContainer** is mounted in the app layout (`app/app/layout.tsx`) so it's available on all DM pages
- [ ] Pin action is idempotent: pinning an already-pinned entity focuses the existing card instead of duplicating
- [ ] Visual feedback: brief pulse animation when a card is pinned or focused

### Technical Notes
- Modify: `components/oracle/MonsterSearch.tsx`
- Modify: `components/combat/CombatantRow.tsx`
- Modify: `components/oracle/SpellSearch.tsx`
- Modify: `components/oracle/ConditionBadge.tsx`
- Modify: `components/combat/EncounterSetup.tsx`
- Modify: `app/app/layout.tsx`

---

## Story 9.9: Keyboard Shortcuts & Accessibility

**Priority**: P2 (Polish)
**Estimate**: 3 SP

### Description
Add keyboard shortcuts for card management and ensure full accessibility compliance.

### Acceptance Criteria
- [ ] `Escape` closes the topmost (highest z-index) pinned card
- [ ] `Shift+Escape` closes ALL pinned cards (with confirmation if 3+ are open)
- [ ] `Tab` / `Shift+Tab` cycles focus between pinned cards
- [ ] Focused card has visible focus ring (`outline: 2px solid #e69a28`)
- [ ] All card content is screen-reader accessible (`role="dialog"`, `aria-label`, `aria-describedby`)
- [ ] Minimize/Restore announced to screen readers via `aria-live`
- [ ] Card toolbar buttons have `aria-label` attributes
- [ ] Cross-reference links have `role="button"` and `aria-haspopup="dialog"`
- [ ] Cards trap focus when opened (focus returns to trigger element on close)
- [ ] Reduced motion: disable drag animations and transitions when `prefers-reduced-motion` is active

---

## Story 9.10: Comprehensive SRD Data Validation & Enrichment

**Priority**: P1 (Data)
**Estimate**: 3 SP

### Description
Validate that SRD data bundles contain all spells referenced in monster spellcasting abilities, and enrich monster data with any missing fields needed for the 5e.tools display.

### Acceptance Criteria
- [ ] Script `scripts/validate-srd-crossrefs.ts` that:
  - Parses all monster spellcasting abilities
  - Extracts spell names
  - Checks each against the spell index
  - Reports any missing spells
- [ ] All spells referenced in monster abilities exist in the spell bundles (or are flagged as homebrew/non-SRD)
- [ ] Monsters have `proficiency_bonus` field (calculated from CR if not present)
- [ ] Monsters have `initiative_bonus` field (DEX mod, or explicit if variant)
- [ ] Missing data documented in a `MISSING_SRD_DATA.md` report for manual review
- [ ] Script runnable via `npm run validate:srd`

---

## Implementation Order

```
Phase 1 — Foundation (Stories 9.1, 9.2)
   ↓
Phase 2 — Core Cards (Stories 9.3, 9.4, 9.7)   [can parallelize]
   ↓
Phase 3 — Float & Drag (Story 9.5)
   ↓
Phase 4 — Cross-References (Story 9.6)
   ↓
Phase 5 — Integration (Story 9.8)
   ↓
Phase 6 — Polish (Stories 9.9, 9.10)            [can parallelize]
```

## Total Estimate: 45 Story Points

## Definition of Done (Epic Level)
- [ ] Monster stat blocks visually match 5e.tools dark-fantasy aesthetic
- [ ] Spell cards visually match 5e.tools dark-fantasy aesthetic
- [ ] Multiple cards can be pinned simultaneously and dragged freely
- [ ] Spell names in monster abilities are clickable links that open spell cards
- [ ] Condition names are clickable links that open condition cards
- [ ] Cards persist across page navigation within a session
- [ ] All existing functionality (inline stat blocks, search, combat) still works
- [ ] Mobile responsive (full-screen overlay on small screens)
- [ ] Keyboard accessible and screen-reader compatible
- [ ] All unit tests pass
- [ ] No performance regression (Lighthouse score maintained)
