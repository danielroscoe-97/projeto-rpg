# Multi-Player Combat E2E Stress Test — Spec

> Created: 2026-04-10
> Status: Implemented
> Test file: `e2e/combat/multi-player-stress.spec.ts`
> Helpers: `e2e/helpers/multi-player.ts`

## Objetivo

Simular uma sessao real de combate com 1 DM e 2 players simultaneos em browser contexts isolados. Testar todos os edge cases criticos: reconexao, monstros ocultos, dano em tempo real, adicao mid-combat, rename, grupos e derrota.

## Arquitetura do Teste

```
Browser Instance (Chromium)
├── DM Context (auth: DM_PRIMARY)
│   └── dmPage → /app/session/new → /app/session/[id]
├── Player 1 Context (anonymous)
│   └── p1Page → /join/[token] → player-view
└── Player 2 Context (anonymous)
    └── p2Page → /join/[token] → player-view
```

Cada context tem sessao isolada (cookies, storage, auth separados).
Players usam anonymous auth via token — nao precisam de conta.

## Fases do Teste

### Phase 1: DM Setup
- DM loga com `DM_PRIMARY`
- Navega pra `/app/session/new`
- Gera share token (ANTES de adicionar combatants)
- Adiciona 4 combatants manuais:
  - Goblin Boss (HP:50, AC:16, Init:14)
  - Goblin A (HP:14, AC:12, Init:10)
  - Goblin B (HP:14, AC:12, Init:10)
  - Skeleton (HP:20, AC:13, Init:8)
- Inicia combate
- Descobre IDs dos combatants via DOM scan

### Phase 2: DM Hides Monster
- DM toggle hidden no Skeleton (`hidden-btn-{id}`)
- Verifica que DM ainda ve o Skeleton

### Phase 3-4: Players Join
- Player 1 ("Thorin", init:18) join via `/join/[token]` → DM aprova via toast
- Player 2 ("Elara", init:12) join via `/join/[token]` → DM aprova via toast
- Ambos veem `player-view`

### Phase 5: Visibility Check
- Ambos players veem `player-initiative-board`
- Nenhum player ve o Skeleton (hidden) — `player-combatant-{skeletonId}` not visible
- DM ve TODOS os combatants

### Phase 6: Turn Advance
- DM avanca turno (`next-turn-btn`)
- Ambos players veem update (8s wait pra realtime)

### Phase 7: HP Damage
- DM aplica 25 de dano no Goblin Boss (50→25 HP = MODERATE)
- Players veem status change via broadcast

### Phase 8: Conditions
- DM adiciona "poisoned" no Goblin A
- Players veem condicao

### Phase 9: Player Reconnect
- Player 1 refresh (`page.reload()`)
- Reconecta automaticamente via sessionStorage
- `player-view` visivel novamente (30s timeout)
- Initiative board restaurado

### Phase 10: Reveal Hidden Monster
- DM unhide Skeleton (`hidden-btn-{id}` toggle)
- Players agora veem o Skeleton (via `combat:hidden_change` broadcast)

### Phase 11: Rename Mid-Combat
- DM abre stats editor (`edit-btn-{id}`) no Goblin B
- Muda display_name para "Shadow Fiend"
- Players veem nome novo no initiative board

### Phase 12: Add Monster Mid-Combat
- DM clica `add-combatant-btn`
- Abre panel, adiciona "Zombie" (HP:22, AC:8, Init:6)
- Players veem novo combatant (via `combat:combatant_add` broadcast)

### Phase 13: Defeat Monster
- DM derrota Goblin A (`defeat-btn-{id}`)
- Players veem estado derrotado (via `combat:defeated_change` broadcast)

### Phase 14: End Encounter
- DM encerra combate (`end-encounter-btn`)
- Verifica que nenhuma pagina crashou

## Broadcast Events Testados

| Evento | Fase | Propagacao Esperada |
|--------|------|---------------------|
| `session:state_sync` | Phase 1 (start) | Automatico |
| `combat:hidden_change` | Phase 2, 10 | Players veem/nao veem monster |
| `combat:combatant_add` | Phase 3-4, 12 | Late-join + mid-combat add |
| `combat:turn_advance` | Phase 6 | Turn indicator atualiza |
| `combat:hp_update` | Phase 7 | HP status tier muda |
| `combat:condition_change` | Phase 8 | Condition badge aparece |
| `combat:defeated_change` | Phase 13 | Defeated visual state |

## Mitigacoes de Flakiness

| Risco | Mitigacao |
|-------|-----------|
| Realtime latency (5-30s) | Timeouts de 30-45s, polling fallback (5s) |
| Toast overlap (multi-player) | Players join sequencialmente |
| Hydration race | Init preenchido antes de name, verify apos fill |
| SRD loading | Nao usado (combatants manuais) |
| Test duration (~3-5min) | `test.slow()` (3x timeout) |

## Como Rodar

```bash
# Local (requer dev server rodando)
npm run e2e:stress

# Headed (ver browser)
npx playwright test e2e/combat/multi-player-stress.spec.ts --headed --project=desktop-chrome

# Com trace (debug)
npx playwright test e2e/combat/multi-player-stress.spec.ts --trace on --project=desktop-chrome
```

## Testids Utilizados

### DM Side
- `add-row-name/hp/ac/init/btn` — setup form
- `start-combat-btn` — iniciar combate
- `active-combat` — combat view wrapper
- `hp-btn-{id}` — HP adjuster trigger
- `hidden-btn-{id}` — hide/reveal toggle
- `edit-btn-{id}` — stats editor trigger
- `defeat-btn-{id}` — defeat toggle
- `conditions-btn-{id}` — condition selector
- `next-turn-btn` — avancar turno
- `end-encounter-btn` — encerrar
- `add-combatant-btn` — add mid-combat
- `add-combatant-panel` — mid-combat panel
- `stats-editor` — stats editor container
- `stats-display-name-input` — display name field
- `share-prepare-btn/generate/url` — share token

### Player Side
- `lobby-name/initiative/hp/ac/submit` — late-join form
- `player-view` — main view
- `player-initiative-board` — initiative board
- `player-combatant-{id}` — individual combatant card

### Shared
- `[data-sonner-toaster] button` — DM approval toast
