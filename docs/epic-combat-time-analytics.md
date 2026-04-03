# Epic: Combat Time Analytics — Metricas Temporais de Combate

**Projeto:** Pocket DM
**Autor:** BMAD Team (Architect + Dev + QA + PM)
**Data:** 2026-04-03
**Status:** Sprint Plan criado — [sprint-plan-combat-time-analytics-2026-04-03.md](sprint-plan-combat-time-analytics-2026-04-03.md)
**Dependencia:** Sistema de combate existente (combat-store, combat-log, CombatLeaderboard)

---

## 0. Estado Atual — O Que Ja Existe

### Timer infrastructure ja pronta

| Componente | Status | Arquivos |
|---|---|---|
| `combatStartedAt` timestamp | Implementado | `lib/stores/combat-store.ts` (L105-108) |
| `turnStartedAt` timestamp | Implementado | `lib/stores/combat-store.ts` (L129-171) |
| `CombatTimer.tsx` (display total) | Implementado | `components/combat/CombatTimer.tsx` |
| `TurnTimer.tsx` (display turno atual) | Implementado | `components/combat/TurnTimer.tsx` |
| localStorage persistence (`combat-timers`) | Implementado | `combat-store.ts` startCombat/hydrate |
| Guest mode timer (`combatStartTime`) | Implementado | `lib/stores/guest-combat-store.ts` |
| Guest turn timer (useState local) | Implementado | `components/guest/GuestCombatClient.tsx` (L767-770) |
| `CombatLeaderboard.tsx` (stats modal) | Implementado | `components/combat/CombatLeaderboard.tsx` |
| `computeCombatStats()` (aggregation) | Implementado | `lib/utils/combat-stats.ts` |
| `formatShareText()` (share) | Implementado | `lib/utils/combat-stats.ts` |

### O que NAO existe (gap)

| Gap | Descricao |
|---|---|
| **Acumulacao de tempo por combatente** | Quando `advanceTurn()` roda, o elapsed do turno anterior e descartado — nao salva em nenhum lugar |
| **Tempo total do combate no Leaderboard** | `CombatLeaderboard` recebe `rounds` mas NAO recebe `combatDuration` |
| **Tempo por combatente no Leaderboard** | `CombatantStats` nao tem campo de tempo |
| **Awards de tempo** | Nao existe "Mais rapido" / "Mais lento" nos secondary stats |
| **Guest mode turn accumulation** | Guest store nao acumula tempo por turno |
| **Share text com tempo** | `formatShareText()` nao inclui duracao do combate |

---

## 1. Manifesto de Produto

> *"Tempo e a metrica invisivel que transforma combate de mecanico em memoravel."*

**Nenhum VTT trata tempo como first-class citizen.** Roll20, Foundry, Owlbear — nenhum mostra quanto tempo cada jogador gastou nos turnos, nenhum celebra o mais rapido ou expoe o mais lento. Isso e **engagement gold**: jogadores comparam tempos entre sessoes, criam memes internos ("o slowpoke da mesa"), e o DM tem dados concretos pra otimizar o ritmo do jogo.

Combinado com o difficulty vote (ja implementado) e o leaderboard de dano, tempo completa o **tripé de analytics pos-combate** que diferencia o Pocket DM de qualquer concorrente.

---

## 2. Objetivos

1. **Rastrear tempo acumulado por combatente** durante todo o combate
2. **Exibir metricas temporais no Leaderboard** pos-combate (duracao total + breakdown por combatente)
3. **Destacar extremos** — award "Speedster" (mais rapido) e "Slowpoke" (mais lento)
4. **Incluir tempo no share text** para engajamento social
5. **Manter Combat Parity** — Guest, Anonimo, e Autenticado

---

## 3. Arquitetura Tecnica

### 3.1 Novo campo no EncounterState

```typescript
// lib/types/combat.ts — adicionar ao EncounterState
turnTimeAccumulated: Record<string, number>; // combatant ID → ms totais gastos em turnos
```

### 3.2 Logica de acumulacao no advanceTurn()

```typescript
// lib/stores/combat-store.ts — advanceTurn()
// ANTES de resetar turnStartedAt:
const currentId = combatants[current_turn_index]?.id;
const elapsed = turnStartedAt ? Date.now() - turnStartedAt : 0;
const accumulated = { ...state.turnTimeAccumulated };
if (currentId && elapsed > 0) {
  accumulated[currentId] = (accumulated[currentId] ?? 0) + elapsed;
}
// Persistir em localStorage junto com combat-timers
```

### 3.3 Persistencia em localStorage

```typescript
// Key: "combat-timers"
// Adicionar turnTimeAccumulated ao JSON existente
{
  combatStartedAt: number,
  turnStartedAt: number,
  turnTimeAccumulated: Record<string, number>
}
```

### 3.4 Undo support

```typescript
// UndoEntry type "turn" — adicionar:
previousTurnTimeAccumulated: Record<string, number>;
```

### 3.5 CombatantStats — novo campo

```typescript
// lib/utils/combat-stats.ts
export interface CombatantStats {
  // ... campos existentes ...
  totalTurnTime: number; // ms totais gastos em turnos
}
```

### 3.6 CombatLeaderboard — novas props

```typescript
interface CombatLeaderboardProps {
  stats: CombatantStats[];
  encounterName: string;
  rounds: number;
  combatDuration: number;    // NOVO: ms totais do combate
  onClose: () => void;
}
```

### 3.7 Display no Leaderboard

- **Header:** ao lado de "X rounds" adicionar "• 12m 34s"
- **Coluna de tempo:** ao lado do damage bar, mostrar tempo formatado (ex: "2m 15s")
- **Secondary stat cards — 2 novos:**
  - ⚡ **Speedster** — combatente com menor tempo medio por turno (totalTime / numTurnsTaken)
  - 🐌 **Slowpoke** — combatente com maior tempo medio por turno
- **Share text:** incluir duracao total + top 3 com tempo

### 3.8 Formato de display

```
Tempo total: formatDuration(ms)
  < 60s     → "45s"
  < 3600s   → "5m 32s"
  >= 3600s  → "1h 12m"

Tempo por turno (media):
  totalTurnTime / numberOfTurns → "avg 1m 15s/turno"
```

---

## 4. Combat Parity Rule — 3 Modos

| Mudanca | Guest (`/try`) | Anonimo (`/join`) | Autenticado (`/invite`) |
|---|---|---|---|
| Acumular turnTimeAccumulated | SIM — no guest-combat-store | SIM — via combat-store | SIM — via combat-store |
| Persistir em localStorage | SIM (guest) | SIM | SIM |
| Exibir no Leaderboard | SIM | SIM (player view) | SIM (player view) |
| Speedster/Slowpoke awards | SIM | SIM | SIM |
| Share text com tempo | SIM | SIM | SIM |

### Guest mode — mudancas especificas

O `guest-combat-store.ts` precisa:
1. Adicionar `turnTimeAccumulated: Record<string, number>` ao state
2. No `advanceTurn()`, acumular elapsed antes de resetar
3. O `turnStartedAt` que hoje e `useState` local no `GuestCombatClient` deve migrar pro store

---

## 5. Stories

### Sprint 1 — Core Tracking + Leaderboard

| ID | Story | Descricao | Arquivos |
|---|---|---|---|
| CTA-01 | Acumular tempo por combatente (auth) | Adicionar `turnTimeAccumulated` ao EncounterState, acumular no `advanceTurn()`, persistir em localStorage, restaurar no `hydrateCombatants()` | `lib/types/combat.ts`, `lib/stores/combat-store.ts` |
| CTA-02 | Acumular tempo por combatente (guest) | Mesma logica no guest-combat-store. Migrar `turnStartedAt` de useState local pro store | `lib/stores/guest-combat-store.ts`, `components/guest/GuestCombatClient.tsx` |
| CTA-03 | Undo support para tempo | Salvar `previousTurnTimeAccumulated` no undo entry type "turn". Restaurar no undo | `lib/stores/combat-store.ts`, `lib/types/combat.ts` |
| CTA-04 | Injetar tempo no CombatantStats | `computeCombatStats()` recebe `turnTimeAccumulated` e popula `totalTurnTime` por combatente (match por nome, pois stats usam nome e accumulated usa ID) | `lib/utils/combat-stats.ts` |
| CTA-05 | Duracao total no Leaderboard header | Passar `combatDuration` como prop, exibir ao lado de rounds. Formato: "5m 32s" | `components/combat/CombatLeaderboard.tsx`, `components/session/CombatSessionClient.tsx` |
| CTA-06 | Coluna de tempo no ranking | Ao lado do valor de damage, mostrar tempo total do combatente. Formato: "2m 15s" | `components/combat/CombatLeaderboard.tsx` |
| CTA-07 | Awards Speedster + Slowpoke | 2 novos secondary stat cards. Calculo: tempo medio por turno (totalTime / numTurns). Usar entries do combat-log type "turn" pra contar turnos | `components/combat/CombatLeaderboard.tsx`, `lib/utils/combat-stats.ts` |
| CTA-08 | Share text com tempo | Adicionar duracao total e tempo dos top 3 no `formatShareText()` | `lib/utils/combat-stats.ts` |
| CTA-09 | Player view — tempo no leaderboard broadcast | Garantir que o broadcast de stats pro player inclui dados de tempo. PlayerInitiativeBoard renderiza corretamente | `components/session/CombatSessionClient.tsx`, `components/player/PlayerInitiativeBoard.tsx` |

### Sprint 2 — Polish & Edge Cases (futuro)

| ID | Story | Descricao |
|---|---|---|
| CTA-10 | Historico de tempos por sessao (DB) | Persistir `turnTimeAccumulated` e `combatDuration` na tabela `encounters` para analytics longitudinais |
| CTA-11 | Trend comparativo entre sessoes | "Voce foi 20% mais rapido que na sessao passada" |
| CTA-12 | Timer pause durante pausa do jogo | Botao de pause que congela turnStartedAt sem acumular (ex: break pra pizza) |

---

## 6. Criterios de Aceitacao

### CTA-01 a CTA-03 (Core Tracking)
- [ ] `turnTimeAccumulated` populado corretamente a cada `advanceTurn()`
- [ ] Tempo sobrevive page refresh (localStorage)
- [ ] Undo de turno restaura tempo anterior
- [ ] Combatente adicionado mid-combat inicia com 0ms acumulado
- [ ] `clearEncounter()` limpa `turnTimeAccumulated`

### CTA-04 a CTA-08 (Leaderboard)
- [ ] Header mostra "X rounds • 5m 32s"
- [ ] Cada combatente tem coluna de tempo ao lado do dano
- [ ] Card "Speedster" mostra combatente com menor avg time/turn
- [ ] Card "Slowpoke" mostra combatente com maior avg time/turn
- [ ] Share text inclui duracao total e tempos do top 3
- [ ] Animacoes consistentes com cards existentes (motion)

### CTA-09 (Parity)
- [ ] Player view (PlayerInitiativeBoard) recebe e exibe dados de tempo
- [ ] Guest mode leaderboard identico ao auth mode

---

## 7. Riscos e Mitigacoes

| Risco | Probabilidade | Mitigacao |
|---|---|---|
| Clock drift entre DM e players | Media | Toda medicao e client-side no DM — player recebe dados prontos via broadcast |
| Timer corrupted no localStorage | Baixa | `hydrateCombatants` ja tem try/catch. Fallback: tempo zerado (graceful degradation) |
| ID vs Name mismatch (stats usam name, accumulated usa ID) | Alta | `computeCombatStats()` recebe mapa ID→name dos combatants pra traduzir |
| Combatente removido mid-combat | Baixa | Tempo acumulado permanece no mapa; nao causa crash, apenas nao aparece no leaderboard se nao tiver stats |

---

## 8. Metricas de Sucesso

- **Engagement:** % de jogadores que fazem screenshot/share do leaderboard com tempo
- **Ritmo de jogo:** DMs reportam que visibilidade de tempo ajudou a reduzir turnos longos
- **Diferenciacao:** Feature unica que nenhum concorrente (Roll20, Foundry, MasterApp) oferece

---

> **Ultima atualizacao:** 2026-04-03
> **Revisado por:** Dani_ + BMAD Party Mode (Winston, Amelia, Quinn, John)
