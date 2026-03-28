# Story CP.1.4: Auto Damage Application with Damage Types

Status: ready-for-dev

## Story

**Como** DM, **quero** que o dano seja aplicado automaticamente com tipo de dano (fire, slashing, etc.) **para que** resistências e imunidades sejam calculadas sem math manual.

## Context

Currently `applyDamage(id, amount)` applies raw damage without knowing the type. With CP.1.1 (parsed actions) and CP.1.2 (parsed resistances), we can now auto-apply damage with type awareness.

Existing code:
- `combat-store.ts`: `applyDamage(id, amount)` — reduces HP, absorbs temp HP first
- `HpAdjuster.tsx`: manual damage entry
- `broadcast.ts`: broadcasts `combat:hp_update` events
- CP.1.2: `applyDamageModifier(baseDamage, damageType, modifiers)` returns finalDamage + modifier applied

## Acceptance Criteria

1. Extend `applyDamage` signature to accept optional damage type:
   ```typescript
   applyDamage(id: string, amount: number, options?: {
     damageType?: string;
     isHalfDamage?: boolean;
     source?: string;          // "Goblin — Bite Attack"
   })
   ```
   - If damageType provided AND target has monster_id: auto-lookup resistances
   - Apply resistance (half), immunity (zero), or vulnerability (double) automatically
   - Show toast notification: "Fire damage → Immune! (0 damage)" or "Cold damage → Resistant (7 → 3)"
   - If no damageType: apply raw damage as before (backwards compatible)

2. Extend HpUndoEntry to include damage type and modifier:
   ```typescript
   interface HpUndoEntry {
     combatantId: string;
     previousHp: number;
     previousTempHp: number;
     action: "damage" | "heal" | "temp";
     damageType?: string;
     damageModifier?: "normal" | "resistant" | "immune" | "vulnerable";
     source?: string;
   }
   ```

3. Visual feedback on CombatantRow:
   - Flash color varies by damage type category:
     - Physical (bludgeoning/piercing/slashing): red flash (existing)
     - Fire: orange flash
     - Cold/Ice: blue flash
     - Lightning: yellow flash
     - Poison/Necrotic: green flash
     - Psychic/Radiant/Force/Thunder/Acid: purple flash
   - If immune: gray flash + "IMMUNE" text overlay (brief)
   - If resistant: reduced flash + "RESISTANT (half)" text
   - If vulnerable: amplified flash + "VULNERABLE (x2)" text

4. When MonsterActionBar (CP.1.3) applies damage, it passes the damageType from ParsedDamage

5. Manual HpAdjuster still works without damage type (backwards compatible)

6. Broadcast: `combat:hp_update` payload now includes optional `damageType` and `damageModifier` for player view display

## Technical Notes

- Cache monster DamageModifiers in combat store (lookup once per monster_id, keep in Map)
- Performance: resistance lookup must be <1ms per damage application
- Multiple damage types in one action (e.g., "Slashing + Lightning"): apply each separately, sum results
- Framer Motion for flash animations (already installed)
- Toast: use existing toast system for immune/resistant/vulnerable feedback

## Tasks

- [ ] Extend applyDamage() signature with optional damageType, isHalfDamage, source
- [ ] Integrate applyDamageModifier() from CP.1.2 into damage flow
- [ ] Cache parsed DamageModifiers per monster_id in combat store
- [ ] Handle multi-type damage (apply each damage component separately)
- [ ] Extend HpUndoEntry with damageType, damageModifier, source
- [ ] Add damage type color flash variants (fire=orange, cold=blue, etc.)
- [ ] Add "IMMUNE" / "RESISTANT" / "VULNERABLE" text overlays on flash
- [ ] Extend broadcast payload with damageType and damageModifier
- [ ] Ensure backwards compatibility (no damageType = raw damage as before)
- [ ] Add i18n strings for damage modifiers (pt-BR + en)
- [ ] Tests: apply damage with resistance, immunity, vulnerability, multi-type
