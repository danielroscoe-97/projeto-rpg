# Story 1.1: Add Combatant Mid-Combat

Status: ready-for-dev

## Story

As a **DM**,
I want to add new monsters or players to an encounter that is already in progress,
so that I can improvise freely during combat — reinforcements arrive, new NPCs join, or a player arrives late — without restarting the encounter.

## Acceptance Criteria

1. "Adicionar Combatente" button (green: `bg-emerald-900/30 text-emerald-400`) visible in combat toolbar when `is_active === true`. Has `aria-label`.
2. Form opens with fields: Name, HP, AC, DC (optional), Initiative (editable, required, 1-30). SRD monster search available via MonsterSearchPanel.
3. New combatant inserted at correct initiative position. `initiative_order` recalculated. If tied, new combatant goes after existing.
4. `current_turn_index` adjusted if insertion is before or at current turn.
5. Broadcast `combat:combatant_add` sent via channel. Payload sanitized via `sanitizePayload` (no dm_notes/monster stats for players).
6. Combatant persisted to DB via `persistNewCombatant`. Players see it appear in real-time.
7. DM can remove newly-added combatant via existing "Remove" button (same as `removeCombatant` flow).

## Tasks / Subtasks

- [ ] Task 1: Enable "Add Combatant" button during active combat (AC: #1)
  - [ ] In `components/combat/CombatView.tsx` or equivalent, show button when `is_active === true`
  - [ ] Style: `bg-emerald-900/30 text-emerald-400` (Action Color Semantics: green = constructive)
  - [ ] Add `aria-label="Adicionar combatente ao combate ativo"` (i18n: `combat.add_mid_combat`)

- [ ] Task 2: Create/adapt mid-combat add form (AC: #2)
  - [ ] Reuse or adapt `AddCombatantForm.tsx` for mid-combat context
  - [ ] Initiative field: required, numeric (1-30), pre-filled if SRD monster selected (d20 + DEX mod auto-roll)
  - [ ] Integrate MonsterSearchPanel for SRD monster lookup
  - [ ] Custom combatant: name, HP, AC required; DC optional; `monster_id = null`

- [ ] Task 3: Initiative insertion logic (AC: #3, #4)
  - [ ] In `lib/stores/combat-store.ts`, create/update `addCombatant` action for active combat
  - [ ] Insert at correct initiative position (sorted desc, ties → new goes after existing)
  - [ ] Recalculate `initiative_order` for all combatants
  - [ ] Adjust `current_turn_index`: if inserted before or at current, increment index by 1

- [ ] Task 4: Broadcast and persist (AC: #5, #6)
  - [ ] In `lib/hooks/useCombatActions.ts`, add `handleAddMidCombat` handler
  - [ ] Optimistic UI: add to store first
  - [ ] Broadcast: `broadcastEvent(sessionId, { type: 'combat:combatant_add', combatant: sanitizedPayload })`
  - [ ] Persist: `persistNewCombatant(combatant)` — verify existing function compatibility
  - [ ] On error: rollback store + `toast.error(t('combat.add_error'))` + `Sentry.captureException`

- [ ] Task 5: Undo via existing remove (AC: #7)
  - [ ] Verify existing `removeCombatant` works for mid-combat added combatants
  - [ ] Verify `current_turn_index` re-adjusts on removal

## Dev Notes

### Files to Modify/Create

- `components/combat/CombatView.tsx` — add button visibility during `is_active`
- `components/combat/AddCombatantForm.tsx` — adapt for editable initiative field
- `lib/stores/combat-store.ts` — `addCombatant` action with position logic + turn index adjustment
- `lib/hooks/useCombatActions.ts` — `handleAddMidCombat` handler
- `lib/supabase/session.ts` — verify `persistNewCombatant` compatibility

### Initiative Insertion Algorithm

```typescript
// Find insertion index (sorted descending by initiative)
const insertIdx = combatants.findIndex(c => c.initiative < newCombatant.initiative);
const position = insertIdx === -1 ? combatants.length : insertIdx;

// Adjust current_turn_index
if (position <= currentTurnIndex) {
  currentTurnIndex += 1;
}
```

### Broadcast Event Types

The event `combat:combatant_add` should already be typed in `lib/types/realtime.ts`. If not, add it:
```typescript
type RealtimeCombatantAdd = {
  type: 'combat:combatant_add';
  combatant: SanitizedCombatant;
};
```

### Anti-Patterns

- **DON'T** restart combat or reset turns when adding mid-combat
- **DON'T** send unsanitized monster stats to players via broadcast
- **DON'T** forget to adjust `current_turn_index` — this causes the wrong combatant's turn to be active

### References

- [Source: _bmad-output/implementation-artifacts/v2-epics-0-1-2-stories.md — Story 1.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Dual-write pattern]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, FR42, FR12]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
