---
story_key: 8-3-encounter-setup-unified-precombat-view
epic: 8
story_id: 8.3
status: ready-for-dev
created: 2026-03-24
updated: 2026-03-24
---

# Story 8.3: EncounterSetup — Unified Pre-Combat View

## Story

As a **DM**,
I want a single-page view where I can add combatants inline, search SRD monsters, load my campaign party, and see the full encounter list — all without navigating away,
So that encounter setup is as fast and fluid as the Kastark tracker.

## Acceptance Criteria

- AC1: Given the DM navigates to the encounter page, when it loads, then a single view shows: the combatant list (CombatantSetupRows), a bottom add-row, SRD search, Campaign loader, Ruleset selector, and "Start Combat" button
- AC2: Given the bottom add-row, when the DM fills Init/Name/HP/AC and presses Enter or clicks "Add", then a new combatant is added to the list and the add-row fields are cleared
- AC3: Given the add-row, when the DM presses Enter in the last field (Notes), then the combatant is added and focus returns to the Init field of the add-row
- AC4: Given the "Search SRD" button/input, when the DM types a monster name, then matching SRD monsters appear in an inline dropdown
- AC5: Given a SRD monster in the dropdown, when clicked, then the add-row is auto-filled with the monster's stats (name, HP, AC) and the DM only needs to enter Init and click Add
- AC6: Given the "Load Party" button, when clicked with a selected campaign, then all player characters are bulk-added to the list with their saved stats (Init left blank)
- AC7: Given the Ruleset selector, when toggled between 2014/2024, then SRD search uses the selected version
- AC8: Given the list has zero combatants, when viewing, then "Start Combat" is disabled and a helpful empty state message is shown
- AC9: Given combatants in the list, when "Start Combat" is clicked, then the encounter is persisted to Supabase and the view transitions to active combat in-place (Story 8.5)
- AC10: Given the list, when combatants are added, then they appear in **insertion order** (NOT sorted by initiative) — sorting happens only on "Start Combat"
- AC11: Given the DM adds the same SRD monster twice, then auto-numbering applies ("Goblin 1", "Goblin 2")

## Tasks / Subtasks

### Task 1: Create EncounterSetup Component
- [ ] 1.1 Create `components/combat/EncounterSetup.tsx`
- [ ] 1.2 Layout: combatant list (CombatantSetupRows) + bottom add-row + action bar
- [ ] 1.3 Add-row: always visible at bottom — Init/Name/HP/AC/Notes inputs + "Add" button
- [ ] 1.4 Add-row form state: local useState, cleared on submit
- [ ] 1.5 Enter key in any add-row field → submit the row (if Name + HP filled)
- [ ] 1.6 After add: clear fields, focus back to Init input

### Task 2: SRD Monster Search Integration
- [ ] 2.1 "Search SRD" input — inline, above the list or in a collapsible panel
- [ ] 2.2 Reuse `searchMonsters()` from `lib/srd/srd-search.ts` with debounce
- [ ] 2.3 Dropdown shows monster name, CR, type, HP, AC
- [ ] 2.4 On select: auto-fill add-row fields (name, HP, AC, monster_id, ruleset_version)
- [ ] 2.5 DM can still edit auto-filled values before clicking Add
- [ ] 2.6 Reuse monster index building from `srd-loader.ts`

### Task 3: Campaign Loader Integration
- [ ] 3.1 Reuse `CampaignLoader` component — "Load Party" button
- [ ] 3.2 On load: bulk-add all player characters to combatant list
- [ ] 3.3 Player combatants: `is_player: true`, `initiative: null`, stats from campaign
- [ ] 3.4 Auto-numbering for duplicate names

### Task 4: Ruleset Selector
- [ ] 4.1 Reuse `RulesetSelector` component at top of view
- [ ] 4.2 Changing version reloads monster index for search

### Task 5: Start Combat Button
- [ ] 5.1 Disabled if `combatants.length === 0`
- [ ] 5.2 On click: delegates to parent handler (Story 8.5 wires the persist + transition)
- [ ] 5.3 Shows loading state while persisting

### Task 6: Empty State
- [ ] 6.1 When no combatants: show centered message "Add combatants to build your encounter"
- [ ] 6.2 Subtle pointers to SRD search and campaign loader

### Task 7: Tests
- [ ] 7.1 Render test: all sections visible (add-row, SRD search, campaign loader, start button)
- [ ] 7.2 Add combatant via add-row: fills fields, presses Enter, combatant appears in list
- [ ] 7.3 SRD search: type query, select monster, fields auto-fill
- [ ] 7.4 Campaign load: bulk-adds players
- [ ] 7.5 Start Combat disabled when empty
- [ ] 7.6 Insertion order maintained (not sorted by initiative)

## Dev Notes

- This component REPLACES both `EncounterBuilder.tsx` and `InitiativeTracker.tsx`.
- The bottom add-row is the Kastark-inspired pattern: always visible, type-and-enter. No modal, no toggle.
- The SRD search can be a collapsible section or an inline search field — UX decision during implementation. Key: it auto-fills the add-row rather than adding directly.
- Pre-combat notes in the add-row map to `player_notes`. DM notes (`dm_notes`) are only editable during active combat.
- The combatant list is in **insertion order**. `initiative_order` is NOT assigned until "Start Combat" sorts and assigns it.
- Auto-numbering reuses the existing `getNumberedName()` helper.

## Design System Reference

Follow **Action Color Semantics** from `_bmad-output/planning-artifacts/ux-design-specification.md`:
- **"Add" button** in add-row: green solid (`bg-emerald-600 text-white hover:bg-emerald-500`)
- **"Start Combat" button**: gold (`bg-gold`) — the single primary CTA on this screen
- **"Remove" button** on rows: red text (`text-red-400`), appears on hover
- **"Limpar tudo"**: neutral text link (`text-muted-foreground`)
- **Opacity scale**: `white/[0.04]` (dividers), `white/[0.06]` (backgrounds), `white/[0.10]` (hover)
