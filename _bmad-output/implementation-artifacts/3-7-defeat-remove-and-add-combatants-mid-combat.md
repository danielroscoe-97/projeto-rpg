---
story_key: 3-7-defeat-remove-and-add-combatants-mid-combat
epic: 3
story_id: 3.7
status: done
created: 2026-03-24
updated: 2026-03-24
---

# Story 3.7: Defeat, Remove & Add Combatants Mid-Combat

## Story

As a **DM**,
I want to mark combatants as defeated, remove them from initiative, and add new combatants mid-combat,
So that I can handle dynamic combat scenarios.

## Implementation

- `setDefeated` action marks/un-marks combatants (already skipped by `advanceTurn`)
- `removeCombatant` action removes from list, reorders initiative, handles current turn adjustment
- `AddCombatantForm` component for adding custom NPCs mid-combat with name, HP, AC, initiative, DC
- New combatants inserted at correct initiative position via sort + re-assign order
- All changes persisted via helpers: `persistDefeated`, `persistRemoveCombatant`, `persistNewCombatant`, `persistInitiativeOrder`
