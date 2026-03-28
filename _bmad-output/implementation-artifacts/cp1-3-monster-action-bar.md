# Story CP.1.3: Monster Action Bar (DM Combat View)

Status: ready-for-dev

## Story

**Como** DM, **quero** ver as ações do monstro como botões clicáveis durante o combate **para que** eu possa rolar ataques e dano com 1-2 cliques sem abrir a ficha.

## Context

Currently, the DM sees the CombatantRow with HP adjuster, conditions, and basic stats. To use monster actions, the DM must open the stat block from the Oracle, find the action, mentally note the attack bonus, roll separately, then manually apply damage.

With parsed actions from CP.1.1, we can show action buttons directly in the combat row.

Existing components:
- `CombatantRow.tsx` — main DM row component
- `ClickableRoll.tsx` — already handles Shift=advantage, Ctrl=disadvantage
- `roll()` from `lib/dice/roll.ts` — full dice engine
- `DiceHistoryPanel.tsx` — shows roll history
- `getMonsterById()` from `lib/srd/srd-loader.ts` — loads full monster data

## Acceptance Criteria

1. Create `components/combat/MonsterActionBar.tsx`:
   - Appears below the combatant row for non-player monsters (when `monster_id` is set)
   - Shows parsed actions as compact buttons: `⚔️ Bite +7` `⚔️ Claw +7` `🔥 Fire Breath (DC 15)`
   - Attack actions show: icon + name + attack bonus
   - Save actions show: icon + name + "(DC N)"
   - Utility/unknown actions show: icon + name only
   - Collapsible — toggle with a small arrow button
   - Remember collapsed/expanded state per combatant (sessionStorage)

2. **Click flow for attack actions:**
   - Click → roll 1d20 + attack bonus → show result in popover + dice history
   - Show "HIT" (green) or "MISS" (red) based on target selection (see below)
   - Shift+Click → advantage (2d20 keep highest)
   - Ctrl+Click → disadvantage (2d20 keep lowest)
   - If hit: show damage dice buttons to roll damage
   - Damage roll auto-fires and shows total + type

3. **Click flow for save actions:**
   - Click → show "DC N ABILITY Save" banner
   - DM clicks "Passed" or "Failed"
   - Failed: full damage applied
   - Passed + halfOnSave: half damage applied
   - Passed + !halfOnSave: no damage

4. **Target selection:**
   - Before rolling attack, DM can optionally select target combatant
   - Quick select: click another combatant in the initiative list
   - If target selected: auto-compare attack roll vs target AC → show "HIT AC 15" or "MISS AC 15"
   - If no target: just show roll result, DM applies manually

5. **Damage application:**
   - After rolling damage, show "Apply to [target]" button
   - Clicking applies damage via combat store's applyDamage()
   - The damage amount, type, and roll are logged to combat action log (CP.2.1)
   - If target has resistance/immunity/vulnerability (from CP.1.2), show indicator and auto-adjust

6. **UI/UX Requirements:**
   - Actions load from SRD data via monster_id (lazy-loaded once, cached)
   - Action bar uses same dark theme as combat view
   - Buttons are compact enough to fit 3-4 actions in one row
   - Mobile-responsive: wraps to multiple rows on small screens
   - Roll popover shows: "Bite Attack: 1d20+7 = [14]+7 = 21 — HIT (AC 15)"
   - Nat 20: special glow + "CRITICAL HIT!" + auto double damage dice
   - Nat 1: "MISS!" regardless of AC

7. **i18n:** All UI strings in messages/pt-BR.json and messages/en.json

## Technical Notes

- Use `parseAllActions(monster)` from CP.1.1 to get structured action data
- Use `getMonsterById(monster_id, ruleset_version)` to load full monster data
- Cache parsed actions in a Map<string, ParsedAction[]> keyed by monster_id
- Fire `dice-roll-result` CustomEvent for DiceHistoryPanel integration
- For target AC comparison: read from combatants array in combat store
- Don't broadcast action bar state to players — DM-only component

## Tasks

- [ ] Create MonsterActionBar.tsx component
- [ ] Load and cache parsed actions per monster_id
- [ ] Render attack action buttons (name + bonus)
- [ ] Render save action buttons (name + DC)
- [ ] Implement click-to-roll with advantage/disadvantage (Shift/Ctrl)
- [ ] Implement target selection (optional click on other combatant)
- [ ] Implement AC comparison and HIT/MISS display
- [ ] Implement damage roll auto-fire after hit
- [ ] Implement nat 20 critical (double damage dice) with special UX
- [ ] Implement save flow (pass/fail + half damage)
- [ ] Implement "Apply damage" button that calls applyDamage()
- [ ] Integrate with DiceHistoryPanel (fire CustomEvent)
- [ ] Add collapse/expand toggle with sessionStorage persistence
- [ ] Add i18n strings (pt-BR + en)
- [ ] Mobile-responsive layout
- [ ] Integrate into CombatantRow.tsx (show for monsters, hide for players)
