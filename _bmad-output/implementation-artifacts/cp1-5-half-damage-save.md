# Story CP.1.5: Half Damage on Successful Save

Status: ready-for-dev

## Story

**Como** DM, **quero** aplicar metade do dano com 1 clique quando um combatente passa no saving throw **para que** eu não precise calcular manualmente.

## Context

Save-based actions (Fireball, Dragon Breath, etc.) deal full damage on fail and half on success. Currently the DM must mentally halve the damage and type it in the HpAdjuster.

CP.1.3 (MonsterActionBar) already has the save flow (DC + pass/fail buttons). This story adds the "half damage" calculation and a standalone half-damage button for the HpAdjuster.

## Acceptance Criteria

1. In MonsterActionBar save flow:
   - "Failed Save" → apply full damage (with damage type from CP.1.4)
   - "Passed Save" → if action.halfOnSave: apply Math.floor(damage / 2); else: 0 damage
   - Show clear visual: "PASSED — 14 → 7 damage (half)"

2. Add "½" (half) toggle button to HpAdjuster damage mode:
   - When toggled ON: any damage entered is halved before applying
   - Visual: button shows "½" with active highlight when on
   - Keyboard shortcut: press "/" while HpAdjuster is open to toggle half
   - Clear state when HpAdjuster closes

3. The halving respects resistance stacking:
   - Half on save + resistant = Math.floor(Math.floor(damage / 2) / 2)
   - Half on save + immune = 0
   - Half on save + vulnerable = Math.floor(damage / 2) * 2
   - (D&D 5e rules: half before resistance)

4. Combat log entry (when CP.2.1 exists) should note: "Goblin passed DEX save vs Fire Breath — 28 → 14 (half)"

## Tasks

- [ ] Add halfOnSave handling to MonsterActionBar save flow
- [ ] Add "½" toggle button to HpAdjuster
- [ ] Keyboard shortcut "/" for half toggle
- [ ] Calculate correct stacking: half → then resistance/vulnerability
- [ ] Visual feedback showing original → halved amount
- [ ] i18n strings (pt-BR + en)
- [ ] Tests for half damage + resistance stacking combinations
