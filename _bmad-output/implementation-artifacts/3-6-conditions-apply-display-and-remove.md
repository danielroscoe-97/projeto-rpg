---
story_key: 3-6-conditions-apply-display-and-remove
epic: 3
story_id: 3.6
status: done
created: 2026-03-24
updated: 2026-03-24
---

# Story 3.6: Conditions — Apply, Display & Remove

## Story

As a **DM**,
I want to apply, view, and remove conditions on any combatant,
So that status effects are tracked visually and never forgotten.

## Implementation

- `toggleCondition` action in combat-store toggles conditions on/off
- `ConditionSelector` component shows all 13 D&D 5e conditions as toggle buttons
- Condition badges displayed via `ConditionBadge` component with color-coded pills (UX-DR5)
- Conditions persisted to DB via `persistConditions` helper
- Optimistic UI: instant toggle, background DB sync
