---
story_key: 3-5-hp-management-damage-healing-and-temporary-hp
epic: 3
story_id: 3.5
status: done
created: 2026-03-24
updated: 2026-03-24
---

# Story 3.5: HP Management — Damage, Healing & Temporary HP

## Story

As a **DM**,
I want to adjust HP for any combatant (damage, healing, and temporary HP),
So that I can track health status accurately throughout combat.

## Acceptance Criteria

- AC1: Each combatant row shows an HP adjust button that opens an inline control
- AC2: DM can apply damage — current HP reduced by amount (minimum 0)
- AC3: DM can apply healing — current HP increased (capped at max HP)
- AC4: DM can set temporary HP — tracked separately from current/max
- AC5: Temp HP absorbs damage first; remaining damage reduces current HP
- AC6: Temp HP cannot be healed — only replaced with a higher value
- AC7: HP changes update immediately (optimistic UI, NFR8)
- AC8: HP changes are persisted to DB in background

## Tasks

### Task 1: Add HP management actions to types and store

- 1.1 Add `applyDamage`, `applyHealing`, `setTempHp` to CombatActions
- 1.2 Implement actions in combat-store with D&D 5e temp HP rules
- 1.3 Add store unit tests

### Task 2: Add DB persistence helper

- 2.1 Add `persistHpChange` to `lib/supabase/session.ts`

### Task 3: Create HpAdjuster component

- 3.1 Inline component with damage/heal/temp HP modes
- 3.2 Number input + apply button
- 3.3 Integrate into CombatantRow

### Task 4: Wire optimistic UI + persistence in CombatSessionClient

- 4.1 Pass HP callbacks through to CombatantRow
- 4.2 Optimistic update + background persist + rollback on error
