# Quick Spec: Multi-System Support (System-Agnostic Refactor)

> **Horizonte:** 3.2 — Plataforma
> **Prioridade:** P2 — Refatorar AGORA, implementar PF2e depois
> **Estimativa:** ~8h (refactor only), +16h (PF2e implementation)
> **Data:** 2026-03-30

---

## Contexto

O código atual é D&D 5e-specific em vários pontos: conditions, HP status tiers, CR calculator, SRD schema, stat block parsing. Quando a demanda por Pathfinder 2e (ou outros sistemas) for validada, refatorar nesse momento será 3-5x mais caro.

**Estratégia:** Refatorar AGORA para extrair uma interface `GameSystem`. NÃO implementar PF2e — apenas garantir que o código é plugável. O investimento de ~8h agora economiza semanas depois.

---

## Story 1: Interface GameSystem

**Implementação:**

1. Criar `lib/systems/types.ts`:
```typescript
export interface GameSystem {
  id: string;                    // 'dnd5e', 'pf2e'
  name: string;                  // 'D&D 5th Edition'
  version: string;               // '2024', '2014'

  // HP
  getHpStatus(currentHp: number, maxHp: number): HpStatus;
  getHpBarColor(currentHp: number, maxHp: number): string;

  // Conditions
  getConditions(): Condition[];
  getConditionIcon(conditionName: string): string;
  getConditionDescription(conditionName: string): string;

  // Combat
  calculateInitiativeOrder(combatants: Combatant[]): Combatant[];
  getDeathSavesConfig(): DeathSavesConfig | null;  // null = sistema não tem death saves

  // Content
  getStatBlockFields(): StatBlockField[];
  getCreatureTypes(): string[];
  getChallengeRatingLabel(): string;  // "CR" para D&D, "Level" para PF2e

  // Search
  getSearchableFields(): string[];    // campos para Fuse.js
}

export interface DeathSavesConfig {
  successes: number;     // 3 para D&D
  failures: number;      // 3 para D&D
  criticalSuccess: boolean; // true para D&D (nat 20 = revive with 1 HP)
  criticalFailure: boolean; // true para D&D (nat 1 = 2 failures)
}

export interface Condition {
  id: string;
  name: string;
  icon: string;
  description: string;
  isStackable: boolean;
}

export interface StatBlockField {
  key: string;
  label: string;
  type: 'number' | 'string' | 'array' | 'actions';
  required: boolean;
}
```

2. Criar `lib/systems/registry.ts`:
```typescript
import { dnd5eSystem } from './dnd5e';

const systems: Record<string, GameSystem> = {
  'dnd5e': dnd5eSystem,
  // 'pf2e': pf2eSystem,  // futuro
};

export function getSystem(id: string): GameSystem {
  return systems[id] ?? systems['dnd5e'];
}

export function getAvailableSystems(): GameSystem[] {
  return Object.values(systems);
}
```

**AC:**
- [ ] Interface `GameSystem` definida com todos os métodos necessários
- [ ] Registry com apenas `dnd5e` registrado
- [ ] Tipo exportado para uso em todo o app

---

## Story 2: Extrair D&D 5e para GameSystem

**Implementação:**

1. Criar `lib/systems/dnd5e/index.ts`:
```typescript
import { getHpStatus, getHpBarColor } from '@/lib/utils/hp-status';
import type { GameSystem } from '../types';

export const dnd5eSystem: GameSystem = {
  id: 'dnd5e',
  name: "D&D 5th Edition",
  version: '2024',

  getHpStatus,
  getHpBarColor,

  getConditions: () => DND5E_CONDITIONS,
  getConditionIcon: (name) => CONDITION_ICONS[name] ?? '⚡',
  getConditionDescription: (name) => CONDITION_DESCRIPTIONS[name] ?? '',

  calculateInitiativeOrder: (combatants) => {
    return [...combatants].sort((a, b) => b.initiative_order - a.initiative_order);
  },

  getDeathSavesConfig: () => ({
    successes: 3,
    failures: 3,
    criticalSuccess: true,
    criticalFailure: true,
  }),

  getStatBlockFields: () => DND5E_STAT_BLOCK_FIELDS,
  getCreatureTypes: () => DND5E_CREATURE_TYPES,
  getChallengeRatingLabel: () => 'CR',
  getSearchableFields: () => ['name', 'type', 'challenge_rating'],
};
```

2. Mover constantes de `lib/utils/` e `components/combat/` para `lib/systems/dnd5e/`:
   - `DND5E_CONDITIONS` (from ConditionSelector logic)
   - `DND5E_CREATURE_TYPES` (from monster search filters)
   - `DND5E_STAT_BLOCK_FIELDS` (from stat block rendering)
   - `CONDITION_ICONS` (from condition badges)

3. Manter exports originais como re-exports (backward compat):
```typescript
// lib/utils/hp-status.ts — manter como está (usado em broadcast.ts server-side)
// Apenas adicionar: export via system para novos usos
```

**AC:**
- [ ] `dnd5eSystem` implementa toda a interface
- [ ] Constantes D&D-specific movidas para `lib/systems/dnd5e/`
- [ ] Re-exports mantêm backward compatibility (nenhum import quebra)
- [ ] Zero mudança funcional

---

## Story 3: Consumir via System Provider

**Implementação:**

1. Criar hook `useGameSystem()`:
```typescript
// lib/hooks/useGameSystem.ts
import { getSystem } from '@/lib/systems/registry';

export function useGameSystem(systemId?: string): GameSystem {
  // Por agora, sempre retorna dnd5e
  // No futuro: ler do session ou campaign context
  return getSystem(systemId ?? 'dnd5e');
}
```

2. Refatorar componentes para usar o hook (mudança gradual, não big-bang):

**Prioridade de refactor:**
```
Alto impacto:
- ConditionSelector.tsx → usar system.getConditions()
- CombatantRow.tsx → usar system.getHpBarColor()
- PlayerInitiativeBoard.tsx → usar system.getHpStatus()

Médio impacto:
- MonsterSearchPanel.tsx → usar system.getCreatureTypes()
- EncounterSetup.tsx → usar system.getChallengeRatingLabel()

Baixo impacto (pode esperar):
- CrCalculator → usar system-specific calculation
- StatBlock rendering → usar system.getStatBlockFields()
```

3. **NÃO** refatorar tudo de uma vez. Começar com HP status e conditions (mais usados).

**AC:**
- [ ] `useGameSystem()` hook funcional
- [ ] ConditionSelector usa system.getConditions()
- [ ] HP display usa system.getHpStatus() e system.getHpBarColor()
- [ ] Todos os testes passam sem mudanças
- [ ] Nenhuma regressão visual

---

## Story 4: Session System Field

**Implementação:**

1. Nova migration `042_session_system.sql`:
```sql
ALTER TABLE sessions ADD COLUMN game_system TEXT NOT NULL DEFAULT 'dnd5e';
ALTER TABLE encounters ADD COLUMN game_system TEXT NOT NULL DEFAULT 'dnd5e';
```

2. EncounterSetup mostra system selector (disabled com apenas D&D 5e):
```tsx
<Select disabled value="dnd5e">
  <SelectItem value="dnd5e">D&D 5th Edition</SelectItem>
  {/* Futuro: <SelectItem value="pf2e">Pathfinder 2e</SelectItem> */}
</Select>
```

3. Session view lê `game_system` e passa para `useGameSystem()`.

**AC:**
- [ ] Campo `game_system` existe nas tabelas (migration aplicada)
- [ ] Sessões existentes default para 'dnd5e'
- [ ] UI mostra selector (disabled por agora)
- [ ] Futuro: habilitar selector quando segundo sistema disponível
