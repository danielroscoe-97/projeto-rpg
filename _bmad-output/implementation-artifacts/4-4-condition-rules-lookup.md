# Story 4.4: Condition Rules Lookup

Status: done

## Story

As a **DM or player**,
I want to look up the full rules text for any condition (Stunned, Blinded, etc.),
So that I can quickly resolve condition effects during combat.

## Acceptance Criteria

1. **Given** the oracle view or a condition badge on a combatant
   **When** the user clicks/taps a condition name or badge
   **Then** the full condition rules text is displayed (FR21)

2. **Given** the condition lookup
   **When** viewing condition rules
   **Then** the rules text matches the SRD definition for the session's selected ruleset version
   **And** the version is clearly labeled

---

## Tasks / Subtasks

- [ ] Task 1 — Create `ConditionRulesModal` component
  - [ ] Reusable modal showing condition name + full rules text
  - [ ] Uses shadcn Dialog (same pattern as SpellDescriptionModal)

- [ ] Task 2 — Create `ConditionBadge` component
  - [ ] Clickable condition badge that opens ConditionRulesModal
  - [ ] Replaces plain `<span>` badges in CombatantRow
  - [ ] Uses `findCondition` from srd-search.ts for rules lookup

- [ ] Task 3 — Create `ConditionLookup` oracle component
  - [ ] Lists all 13 conditions from `getAllConditions()`
  - [ ] Click any condition → opens ConditionRulesModal

- [ ] Task 4 — Update CombatantRow to use ConditionBadge
  - [ ] Replace inline condition `<span>` with `ConditionBadge` component

- [ ] Task 5 — Write tests

---

## File Structure

```
components/oracle/
  ConditionRulesModal.tsx      ← NEW
  ConditionRulesModal.test.tsx ← NEW
  ConditionBadge.tsx           ← NEW
  ConditionBadge.test.tsx      ← NEW
  ConditionLookup.tsx          ← NEW
  ConditionLookup.test.tsx     ← NEW

components/combat/
  CombatantRow.tsx             ← MODIFY: use ConditionBadge
```
