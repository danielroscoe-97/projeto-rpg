# Story CP.1.2: Parse Damage Resistances, Vulnerabilities & Immunities

Status: ready-for-dev

## Story

**Como** DM, **quero** que resistências e imunidades dos monstros sejam parseadas automaticamente **para que** o dano seja ajustado automaticamente quando eu rolar ataques.

## Context

Monster data stores resistances as freeform strings:
- `damage_resistances: "cold, lightning"` (simple)
- `damage_resistances: "bludgeoning, piercing, and slashing from nonmagical attacks"` (conditional)
- `damage_immunities: "fire, poison"` (simple)
- `damage_vulnerabilities: "fire"` (simple)
- `condition_immunities: "blinded, charmed, deafened"` (simple)

These need to be parsed into structured data for auto-damage calculation.

## Acceptance Criteria

1. Create `lib/combat/parse-resistances.ts` with:
   ```typescript
   interface DamageModifiers {
     resistances: DamageModifier[];
     immunities: DamageModifier[];
     vulnerabilities: DamageModifier[];
     conditionImmunities: string[];
   }

   interface DamageModifier {
     type: string;           // "fire", "cold", "bludgeoning", etc.
     condition?: string;     // "from nonmagical attacks", "that isn't silvered"
   }

   function parseDamageModifiers(monster: SrdMonster): DamageModifiers;
   ```
2. Handle these real-world patterns:
   - Simple list: "fire, cold, lightning"
   - Conditional: "bludgeoning, piercing, and slashing from nonmagical attacks"
   - Conditional with exception: "bludgeoning, piercing, and slashing from nonmagical attacks that aren't silvered"
   - Mixed: "fire; bludgeoning, piercing, and slashing from nonmagical attacks"
3. Create `applyDamageModifier(baseDamage: number, damageType: string, modifiers: DamageModifiers): { finalDamage: number, applied: "normal" | "resistant" | "immune" | "vulnerable" }`
   - Immune: damage = 0
   - Resistant: damage = Math.floor(baseDamage / 2)
   - Vulnerable: damage = baseDamage * 2
   - Normal: damage unchanged
   - For conditional modifiers (nonmagical): default to "normal" (DM can override)
4. Create tests with real monster data (dragons, fiends, elementals, constructs)
5. Pure functions, no store imports

## Technical Notes

- Damage types in D&D 5e: acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, thunder
- Conditional resistances (nonmagical) are complex — for now, flag them but default to NOT applying (DM can toggle)
- Semicolons separate different modifier groups in the raw data

## Tasks

- [ ] Define DamageModifiers and DamageModifier types
- [ ] Create parseDamageModifiers() — split on commas/semicolons, detect conditions
- [ ] Create applyDamageModifier() — immune > vulnerable > resistant priority
- [ ] Handle "and" conjunction ("bludgeoning, piercing, and slashing")
- [ ] Handle conditional suffixes ("from nonmagical attacks")
- [ ] Handle condition_immunities (simple comma list)
- [ ] Write tests with real SRD monsters (at least 8 diverse cases)
- [ ] Export canonical DAMAGE_TYPES constant for validation
