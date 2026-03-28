# Story CP.1.1: Parse Monster Actions into Structured Data

Status: ready-for-dev

## Story

**Como** DM, **quero** que as ações dos monstros sejam parseadas automaticamente do texto SRD **para que** eu possa clicar e rolar ataques sem copiar números manualmente.

## Context

Monster actions are stored as `{ name: string, desc: string }` where desc contains freeform text like:
- "Melee Attack: +7, reach 10 ft. 11 (2d6 + 4) Slashing damage."
- "Ranged Attack: +5, range 80/320 ft. 8 (1d8 + 4) Piercing damage."
- "Melee or Ranged Attack: +5, reach 5 ft. or range 120 ft. 7 (1d8 + 3) Bludgeoning plus 11 (2d10) Lightning."
- "DEX DC 15. 28 (8d6) Fire damage, half on save."
- "WIS DC 14, one creature within 30 ft. 10 (3d6) Psychic damage and Frightened condition."

There is already a parser at `lib/dice/parse-dice.ts` that extracts dice from text (DiceSegment[]).

## Acceptance Criteria

1. Create `lib/combat/parse-action.ts` with function `parseMonsterAction(action: MonsterAction): ParsedAction`
2. ParsedAction type must include:
   ```typescript
   interface ParsedAction {
     name: string;
     rawDesc: string;
     type: "attack" | "save" | "utility" | "unknown";
     // Attack fields (when type === "attack")
     attackBonus?: number;        // e.g., +7
     attackType?: "melee" | "ranged" | "melee_or_ranged";
     reach?: string;              // "10 ft."
     range?: string;              // "80/320 ft."
     // Save fields (when type === "save")
     saveDC?: number;             // e.g., 15
     saveAbility?: string;        // "DEX", "WIS", "CON", etc.
     halfOnSave?: boolean;
     // Damage (both attack and save)
     damages: ParsedDamage[];
     // Conditions applied
     conditionsApplied?: string[];
   }

   interface ParsedDamage {
     dice: string;          // "2d6+4", "8d6"
     avgDamage: number;     // 11, 28
     type: string;          // "Slashing", "Fire", "Psychic"
   }
   ```
3. Must handle ALL these patterns from the SRD data:
   - "Melee Attack: +N" / "Ranged Attack: +N" / "Melee or Ranged Attack: +N"
   - "N (XdY + Z) DamageType damage"
   - Multiple damage types in one action: "plus N (XdY) DamageType damage"
   - "ABILITY DC N" saves
   - "half on save" / "half damage on a successful save" / "or half as much on a success"
   - Conditions: "Frightened", "Poisoned", "Prone", "Grappled", etc.
4. Create `lib/combat/parse-action.test.ts` with tests for all the above patterns
5. Test with REAL data from `public/srd/monsters-2024.json` — at least 10 diverse monsters:
   - Simple melee (Goblin)
   - Multi-damage (dragon breath, attacks with + elemental)
   - Save-based (Fireball, Mind Blast)
   - Condition-applying (Medusa gaze, Aboleth tentacle)
   - Melee or Ranged (javelin)
6. Function must be pure (no side effects, no imports from stores)
7. Handle gracefully when pattern doesn't match — return type "unknown" with rawDesc

## Technical Notes

- Use the regex patterns from existing `parse-dice.ts` as starting point
- The SRD 2024 format is slightly different from 2014 (e.g., "Melee Attack:" vs "Melee Weapon Attack:")
- Must handle both formats
- Performance: parse ~400 monsters in <100ms (will be called at bundle load time)

## Tasks

- [ ] Define ParsedAction and ParsedDamage types in `lib/types/combat.ts`
- [ ] Create `lib/combat/parse-action.ts` with parseMonsterAction()
- [ ] Handle attack pattern parsing (melee/ranged/both + bonus)
- [ ] Handle damage parsing (dice + avg + type, multiple damages per action)
- [ ] Handle save pattern parsing (ability + DC + half on save)
- [ ] Handle condition extraction
- [ ] Handle SRD 2014 format differences ("Weapon Attack" vs "Attack")
- [ ] Create comprehensive tests with real SRD data
- [ ] Export `parseAllActions(monster: SrdMonster): ParsedAction[]` convenience function
