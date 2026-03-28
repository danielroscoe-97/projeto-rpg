# Story CP.2.1: Combat Action Log (Cronológico)

Status: ready-for-dev

## Story

**Como** DM, **quero** ver um log cronológico de todas as ações do combate **para que** eu possa acompanhar o que aconteceu e não perder o fio.

## Context

DiceHistoryPanel exists but only tracks dice rolls (notation + result). There's no log of combat ACTIONS (who attacked whom, for how much damage, conditions applied, turns advanced, etc.).

Shieldmaiden has a complete combat log — this is one of their most praised features.

## Acceptance Criteria

1. Create `lib/stores/combat-log-store.ts` (Zustand):
   ```typescript
   interface CombatLogEntry {
     id: string;                    // nanoid
     timestamp: number;
     round: number;
     type: "attack" | "damage" | "heal" | "condition" | "turn" | "defeat" | "save" | "system";
     actorName: string;             // "Goblin 1" (display_name or name)
     targetName?: string;           // "Aldric the Brave"
     description: string;           // "Bite Attack: 1d20+5 = 18 — HIT (AC 15)"
     details?: {
       damageAmount?: number;
       damageType?: string;
       damageModifier?: string;     // "resistant", "immune", "vulnerable"
       rollResult?: number;
       rollMode?: string;           // "advantage", "disadvantage"
       isNat1?: boolean;
       isNat20?: boolean;
       conditionName?: string;
       conditionAction?: "applied" | "removed";
     };
   }
   ```

2. Create `components/combat/CombatActionLog.tsx`:
   - Collapsible panel on the right side (or bottom on mobile)
   - Shows entries in chronological order (newest at bottom, auto-scroll)
   - Turn separators: "— Round 2 —" visual dividers
   - Entry formatting:
     - Attack: "⚔️ Goblin 1 → Aldric: Bite +5 = 18 — HIT"
     - Damage: "💥 Aldric takes 7 Slashing damage (RESISTANT → 3)"
     - Heal: "💚 Cleric heals Aldric for 12 HP"
     - Condition: "🟡 Goblin 1 is now Poisoned"
     - Defeat: "💀 Goblin 1 is defeated"
     - Turn: "⏭️ Turn: Aldric the Brave"
     - Save: "🛡️ Aldric passes DEX DC 15 — Fire Breath half damage (14)"
   - Color coding by entry type
   - Compact mode: 1 line per entry
   - Max 200 entries (FIFO eviction)

3. Auto-log from combat store actions:
   - `applyDamage()` → logs damage entry
   - `applyHealing()` → logs heal entry
   - `toggleCondition()` → logs condition entry
   - `advanceTurn()` → logs turn entry + round separator
   - `setDefeated()` → logs defeat entry
   - MonsterActionBar attack rolls → logs attack entry
   - MonsterActionBar save prompts → logs save entry

4. Clear log when encounter ends or new encounter starts

5. **NOT broadcast to players** — DM-only component (player view shows simplified HP changes only)

6. Toggle visibility with keyboard shortcut "L" (for Log)

7. Add to KeyboardCheatsheet

## Technical Notes

- Integrate by adding log calls inside existing store actions (combat-store.ts)
- Use CustomEvent pattern (like dice-roll-result) for cross-component logging
- sessionStorage persistence (survives F5, not across sessions)
- Framer Motion for entry animations (slide in from bottom)

## Tasks

- [ ] Create CombatLogEntry type
- [ ] Create combat-log-store.ts (Zustand with sessionStorage)
- [ ] Create CombatActionLog.tsx component (collapsible panel)
- [ ] Style entries by type (attack, damage, heal, condition, turn, defeat, save)
- [ ] Round separator visual dividers
- [ ] Auto-scroll to newest entry
- [ ] Integrate with combat-store.ts (log on applyDamage, applyHealing, etc.)
- [ ] Integrate with MonsterActionBar (log attack rolls, saves)
- [ ] Keyboard shortcut "L" to toggle
- [ ] Max 200 entries with FIFO eviction
- [ ] Clear on new encounter
- [ ] i18n strings (pt-BR + en)
- [ ] Mobile layout (bottom sheet instead of side panel)
