---
story_key: 3-8-edit-combatant-stats-mid-combat
epic: 3
story_id: 3.8
status: done
created: 2026-03-24
updated: 2026-03-24
---

# Story 3.8: Edit Combatant Stats Mid-Combat

## Story

As a **DM**,
I want to edit any combatant's stats (name, max HP, AC, spell save DC) during combat,
So that I can correct mistakes or apply mid-session adjustments.

## Implementation

- `updateCombatantStats` action updates partial stats, caps current_hp to new max_hp
- `StatsEditor` component: inline form with fields for name, max HP, AC, spell DC
- Changes saved immediately on submit, persisted via `persistCombatantStats`
- Optimistic UI pattern
