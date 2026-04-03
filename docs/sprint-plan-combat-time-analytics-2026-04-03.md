# Sprint Plan — Combat Time Analytics (2026-04-03)

> **Versao:** 1.0 — Party Mode (Winston + Amelia + Quinn + Bob + John)
> **Estrategia:** Tudo client-side, zero migrations, extensao cirurgica de codigo existente
> **Filosofia:** *"Tempo e a metrica invisivel que nenhum concorrente mede."*
> **Docs de referencia:**
> - [epic-combat-time-analytics.md](epic-combat-time-analytics.md) — Epic completo com arquitetura e stories
> - [bucket-future-ideas.md](bucket-future-ideas.md) — F-43 registrado

---

## Contexto: O Que Ja Existe

O sistema de timers ja esta **funcional para display**. O gap e exclusivamente de **acumulacao e exibicao pos-combate**:

- `combatStartedAt` + `turnStartedAt` no combat-store ✅
- `CombatTimer.tsx` + `TurnTimer.tsx` (display durante combate) ✅
- localStorage persistence + hydrate no page refresh ✅
- `CombatLeaderboard.tsx` com damage rankings + MVPs ✅
- `computeCombatStats()` com damage/healing/crits aggregation ✅
- Guest mode com `combatStartTime` no store ✅

**O que falta:** acumular `elapsed` por combatente no `advanceTurn()`, injetar nos stats, exibir no leaderboard.

---

## Dependencias entre Stories

```
CTA-01 (auth store) ──┬──→ CTA-03 (undo) ──→ CTA-04 (stats) ──┬──→ CTA-05 (header)
                       │                                         ├──→ CTA-06 (coluna tempo)
CTA-02 (guest store) ─┘                                         ├──→ CTA-07 (awards)
                                                                 ├──→ CTA-08 (share text)
                                                                 └──→ CTA-09 (player broadcast)
```

**Caminho critico:** CTA-01 → CTA-03 → CTA-04 → CTA-06/07
**Paralelizaveis:** CTA-01 + CTA-02 | CTA-05 + CTA-06 + CTA-07 + CTA-08

---

## Fase 1 — Core Tracking (fundacao)

**Objetivo:** Acumular tempo por combatente em ambos os stores (auth + guest).
**SP Total:** ~8 SP | **Duracao estimada:** 1 dia

### 1.1 CTA-01 — Acumular tempo por combatente (auth)

- **SP:** 3
- **Esforco:** 2-3h
- **Arquivos:**
  - `lib/types/combat.ts` — adicionar `turnTimeAccumulated: Record<string, number>` ao `EncounterState`
  - `lib/stores/combat-store.ts` — 4 pontos de mudanca:
    1. `initialState` — `turnTimeAccumulated: {}`
    2. `startCombat()` — incluir `turnTimeAccumulated: {}` no set + localStorage
    3. `advanceTurn()` — ANTES de resetar turnStartedAt: calcular elapsed, acumular no mapa, persistir no localStorage
    4. `hydrateCombatants()` — restaurar `turnTimeAccumulated` do localStorage
    5. `clearEncounter()` — ja limpa localStorage (ok)
- **Logica do advanceTurn:**
  ```typescript
  const currentId = combatants[current_turn_index]?.id;
  const elapsed = state.turnStartedAt ? Date.now() - state.turnStartedAt : 0;
  const accumulated = { ...state.turnTimeAccumulated };
  if (currentId && elapsed > 0) {
    accumulated[currentId] = (accumulated[currentId] ?? 0) + elapsed;
  }
  ```
- **AC:**
  - [ ] `turnTimeAccumulated` populado a cada advanceTurn
  - [ ] Persiste em localStorage key `combat-timers`
  - [ ] Sobrevive page refresh via hydrateCombatants
  - [ ] clearEncounter limpa tudo

### 1.2 CTA-02 — Acumular tempo por combatente (guest)

- **SP:** 3
- **Esforco:** 2-3h
- **Arquivos:**
  - `lib/stores/guest-combat-store.ts` — adicionar `turnTimeAccumulated: Record<string, number>` + `turnStartedAt: number | null` ao state
  - `components/guest/GuestCombatClient.tsx` — remover `useState` local de `turnStartedAt`, usar store
- **Mudancas no guest store:**
  1. State: `turnTimeAccumulated: {}`, `turnStartedAt: null`
  2. `startCombat()` — setar `turnStartedAt: Date.now()`, `turnTimeAccumulated: {}`
  3. `advanceTurn()` — acumular elapsed, resetar turnStartedAt
  4. `endCombat()` / `resetAll()` — limpar
- **AC:**
  - [ ] Guest acumula tempo identico ao auth
  - [ ] turnStartedAt migrado de useState pro store
  - [ ] GuestCombatClient usa store em vez de state local

### 1.3 CTA-03 — Undo support para tempo

- **SP:** 2
- **Esforco:** 1h
- **Arquivos:**
  - `lib/types/combat.ts` — adicionar `previousTurnTimeAccumulated: Record<string, number>` ao UndoEntry type "turn"
  - `lib/stores/combat-store.ts` — no `advanceTurn()`, salvar state.turnTimeAccumulated no undo entry; no `undoLastAction()` case "turn", restaurar
- **AC:**
  - [ ] Undo de turno restaura turnTimeAccumulated anterior
  - [ ] Undo de HP/condition nao afeta turnTimeAccumulated

---

## Fase 2 — Stats Aggregation + Leaderboard

**Objetivo:** Injetar dados de tempo nos stats e exibir no leaderboard.
**SP Total:** ~13 SP | **Duracao estimada:** 1-2 dias

### 2.1 CTA-04 — Injetar tempo no CombatantStats

- **SP:** 3
- **Esforco:** 2h
- **Arquivos:**
  - `lib/utils/combat-stats.ts`:
    - `CombatantStats` — adicionar `totalTurnTime: number` (ms) + `turnCount: number`
    - `computeCombatStats()` — nova assinatura: receber `turnTimeAccumulated` + `combatants` (pra mapear ID→name)
    - Nova helper: `formatDuration(ms: number): string` — "45s", "5m 32s", "1h 12m"
    - Nova helper: `getTimeAwards(stats)` — retorna speedster (menor avg) e slowpoke (maior avg)
- **ID→Name mapping:** `computeCombatStats` recebe array de `{id, name}` pra traduzir o Record de IDs pro stats de nomes
- **turnCount:** contar entries do combat-log com `type === "turn"` por actorName
- **AC:**
  - [ ] `totalTurnTime` populado corretamente por combatente
  - [ ] `turnCount` conta turnos corretamente
  - [ ] `formatDuration` formata <60s, <3600s, >=3600s
  - [ ] `getTimeAwards` retorna speedster + slowpoke (por avg time)
  - [ ] Combatente sem turnos (morreu round 1) nao causa divisao por zero

### 2.2 CTA-05 — Duracao total no Leaderboard header

- **SP:** 1
- **Esforco:** 30min
- **Arquivos:**
  - `components/combat/CombatLeaderboard.tsx` — nova prop `combatDuration`, exibir no header ao lado de rounds
  - `components/session/CombatSessionClient.tsx` — calcular `Date.now() - combatStartedAt` e passar como prop
- **Display:** `{encounterName} • {rounds} rounds • 12m 34s`
- **AC:**
  - [ ] Header exibe duracao total formatada
  - [ ] Formato consistente com `formatDuration()`

### 2.3 CTA-06 — Coluna de tempo no ranking

- **SP:** 3
- **Esforco:** 2-3h
- **Arquivos:**
  - `components/combat/CombatLeaderboard.tsx` — adicionar tempo ao lado do valor de damage em cada ranking row
- **Layout:**
  ```
  [#1] [Goblin]  [45 dmg]  [2m 15s]
       [████████████████]
  [#2] [Fighter] [32 dmg]  [1m 42s]
       [████████████]
  ```
- **Estilo:** `text-xs text-muted-foreground/60 font-mono` — sutil, nao compete com o damage
- **AC:**
  - [ ] Cada combatente mostra tempo total ao lado do dano
  - [ ] Formato: "Xm Xs" consistente
  - [ ] Layout responsivo (mobile nao quebra)

### 2.4 CTA-07 — Awards Speedster + Slowpoke

- **SP:** 3
- **Esforco:** 2-3h
- **Arquivos:**
  - `components/combat/CombatLeaderboard.tsx` — 2 novos `SecondaryStatCard`
  - `lib/utils/combat-stats.ts` — `getTimeAwards()` helper
- **Cards:**
  - ⚡ `Speedster` — icone `Zap` (lucide), cor `text-cyan-400`, valor: "avg Xm Xs/turno"
  - 🐌 `Slowpoke` — icone `Snail` (lucide) ou `Timer` se Snail nao existir, cor `text-orange-400`, valor: "avg Xm Xs/turno"
- **Calculo:** `avgTimePerTurn = totalTurnTime / turnCount` — menor avg = speedster, maior = slowpoke
- **Edge case:** Se todos combatentes tiveram apenas 1 turno, nao exibir awards (sem significancia estatistica)
- **AC:**
  - [ ] Card Speedster aparece com nome + avg time
  - [ ] Card Slowpoke aparece com nome + avg time
  - [ ] Nao aparece se todos tiveram <=1 turno
  - [ ] Combatentes com 0 turnos (morreu antes de agir) excluidos do calculo

### 2.5 CTA-08 — Share text com tempo

- **SP:** 1
- **Esforco:** 30min
- **Arquivos:**
  - `lib/utils/combat-stats.ts` — `formatShareText()` — adicionar duracao e tempos
- **Formato atualizado:**
  ```
  Pocket DM -- Combat Results
  Encounter: Dragon's Lair | Rounds: 8 | Duration: 25m 12s

  MVP: Fighter -- 45 damage (3m 20s)
  #2: Wizard -- 32 damage (4m 15s)
  #3: Rogue -- 28 damage (2m 10s)

  Tank: Paladin (67 received)
  Healer: Cleric (45 healed)
  ⚡ Speedster: Rogue (avg 42s/turn)
  🐌 Slowpoke: Wizard (avg 1m 25s/turn)
  ```
- **AC:**
  - [ ] Share text inclui duracao total
  - [ ] Top 3 inclui tempo total entre parenteses
  - [ ] Speedster + Slowpoke incluidos se existirem

### 2.6 CTA-09 — Player view broadcast com tempo

- **SP:** 2
- **Esforco:** 1-2h
- **Arquivos:**
  - `components/session/CombatSessionClient.tsx` — incluir `turnTimeAccumulated` + `combatDuration` + `combatants` (id→name) no broadcast de leaderboard
  - `components/player/PlayerInitiativeBoard.tsx` — receber e renderizar CombatLeaderboard com dados de tempo
- **Broadcast payload:** adicionar `turnTimeAccumulated`, `combatDuration`, `combatantIdNameMap` ao evento existente
- **AC:**
  - [ ] Player view mostra leaderboard identico ao DM
  - [ ] Tempo por combatente visivel na player view
  - [ ] Awards Speedster/Slowpoke visiveis na player view

---

## Fase 3 — Guest Parity (CTA-02 ja cobre o store)

**Objetivo:** Garantir que o guest mode exibe leaderboard com tempo.
**Incluso na Fase 1 (CTA-02) + Fase 2 (CTA-04/05/06/07)**

O GuestCombatClient ja renderiza CombatLeaderboard — basta que:
1. Guest store acumule `turnTimeAccumulated` (CTA-02)
2. GuestCombatClient passe `combatDuration` e `turnTimeAccumulated` como props (incluso no CTA-05/06)

---

## i18n — Chaves necessarias

```
combat.leaderboard_duration: "Duração: {duration}"
combat.leaderboard_speedster: "Speedster"
combat.leaderboard_slowpoke: "Slowpoke"
combat.leaderboard_avg_turn: "avg {time}/turno"
combat.leaderboard_time: "{time}"
```

Adicionar em `messages/en.json` e `messages/pt-BR.json`.

---

## Resumo de Esforco

| Fase | Stories | SP | Esforco |
|---|---|---|---|
| Fase 1 — Core Tracking | CTA-01, CTA-02, CTA-03 | 8 SP | ~1 dia |
| Fase 2 — Stats + Leaderboard | CTA-04 a CTA-09 | 13 SP | ~1-2 dias |
| **Total Sprint 1** | **9 stories** | **21 SP** | **~2-3 dias** |

---

## Checklist de QA (Quinn)

### Smoke Tests
- [ ] Iniciar combate → advanceTurn 5x → verificar turnTimeAccumulated tem 5 entries
- [ ] Page refresh mid-combat → tempo restaurado corretamente
- [ ] Undo turn → tempo do turno desfeito removido do acumulado
- [ ] End combat → leaderboard exibe tempo por combatente

### Edge Cases
- [ ] Combatente adicionado mid-combat → tempo comeca em 0, nao NaN
- [ ] Combatente morto round 1 (0 turnos) → nao aparece em awards, nao causa crash
- [ ] Combate de 1 round (todos com 1 turno) → awards nao aparecem
- [ ] Combate longo (>1h) → formato "1h 12m" no header
- [ ] Guest mode → leaderboard identico ao auth mode

### Parity Check
- [ ] Auth (`/invite`) — todos os tempos corretos
- [ ] Anonimo (`/join`) — player view recebe tempos via broadcast
- [ ] Guest (`/try`) — store acumula, leaderboard exibe

### Regression
- [ ] Leaderboard sem tempo (combate antigo sem turnTimeAccumulated) → graceful fallback (nao mostra tempo, nao crasheia)
- [ ] Damage/healing/crit stats inalterados
- [ ] Share text funcional (clipboard + navigator.share)

---

## Nao incluso neste sprint (Sprint 2 futuro)

| ID | Feature | Motivo do adiamento |
|---|---|---|
| CTA-10 | Persistir tempos no DB | Requer migration + schema change. Analytics longitudinais nao sao MVP |
| CTA-11 | Trend entre sessoes | Depende de CTA-10 |
| CTA-12 | Timer pause | Edge case (pausa pra pizza). Pode acumular tempo "morto" — aceitavel no MVP |

---

> **Ultima atualizacao:** 2026-04-03
> **Revisado por:** Dani_ + BMAD Party Mode (Bob, Winston, Amelia, Quinn, John)
