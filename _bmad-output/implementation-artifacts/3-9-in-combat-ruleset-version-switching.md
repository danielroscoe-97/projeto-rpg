---
story_key: 3-9-in-combat-ruleset-version-switching
epic: 3
story_id: 3.9
status: done
created: 2026-03-24
updated: 2026-03-24
---

# Story 3.9: In-Combat Ruleset Version Switching

## Story

As a **DM**,
I want to switch a monster's ruleset version (2014 <-> 2024) mid-combat per combatant,
So that I can correct version mistakes without restarting the encounter.

## Implementation

- `setRulesetVersion` action in combat-store updates a single combatant's version
- Version switch button shown only for monster combatants with a ruleset version
- Switch does not affect other combatants' HP, conditions, or initiative
- Persisted via `persistRulesetVersion` helper
- `getMonsterById` in CombatantRow automatically picks up new version for stat block display
