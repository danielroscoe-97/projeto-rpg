# Prompt de Implementação — Trilhas A e B (Beta Test Fix)

> Copie este prompt inteiro e envie para o agente de implementação em uma nova janela de contexto.

---

## CONTEXTO DO PROJETO

Você está trabalhando no **Pocket DM** — app de combate para D&D 5e, focado em simplicidade na mesa. Stack: Next.js 15, Supabase (Postgres + Realtime), Tailwind CSS, Zustand, TypeScript.

O projeto passou por um **beta test ao vivo** que revelou bugs críticos e features faltantes. Todas as issues foram investigadas com root cause analysis e documentadas como stories em `docs/stories/`.

**Antes de qualquer implementação**, leia obrigatoriamente:
- `docs/backlog-beta-test-2026-04-02.md` — visão geral de todas as trilhas, mapa de dependências e regra de parity
- `CLAUDE.md` — contém a **Combat Parity Rule** (Guest vs Auth) que é obrigatória em todo change
- `docs/tech-stack-libraries.md` — libs disponíveis e regras de uso

---

## REGRA DE PARITY (IMUTÁVEL)

Toda alteração em combat experience DEVE verificar os 3 modos:

| Modo | Client | Entry Point |
|------|--------|-------------|
| Guest (DM) | `components/guest/GuestCombatClient.tsx` | `/app/try/page.tsx` |
| Anônimo (Player) | `components/player/PlayerJoinClient.tsx` | `/app/join/[token]/page.tsx` |
| Autenticado (Player) | `components/player/PlayerJoinClient.tsx` | `/app/invite/[token]/page.tsx` |

- **UI-only** → aplicar nos 3 modos
- **Realtime/broadcast** → Anônimo + Autenticado
- **Data persistence** → Auth-only
- **DM features** → Guest + Autenticado (DM sempre é autenticado)

---

## TRILHA A — Combat Core (Bugs Críticos)

**Ordem de implementação obrigatória** (dependências em cascata):

### 1. A.2 — Dedup combatant_add (1 SP) — COMEÇAR AQUI
Story: `docs/stories/A2-dedup-combatant-add.md`
- Fix cirúrgico: 1 linha em `components/player/PlayerJoinClient.tsx:548`
- Blind append `[...prev, payload.combatant]` → dedup por ID
- Auditar os outros 11 usos de `updateCombatants` para padrões similares

### 2. A.3 — Session ended broadcast (3 SP)
Story: `docs/stories/A3-session-ended-broadcast.md`
- Novo evento `session:ended` quando DM encerra combate
- DM side: `lib/hooks/useCombatActions.ts` (função `handleEndEncounter`)
- Player side: handler em `PlayerJoinClient.tsx` + limpar todos os intervals/timers
- Adicionar tipo em `lib/types/realtime.ts`

### 3. A.4 — Late-join recovery (2 SP)
Story: `docs/stories/A4-late-join-recovery.md`
- `PlayerLobby.tsx` usa `window.location.reload()` no timeout — remover
- Botão "Tentar novamente" no estado timeout
- Guard contra overwrite de status "accepted" pelo timer de timeout
- Cleanup: `lateJoinTimeoutRef` (linha 801-805) não está sendo limpo

### 4. A.1 — Polling/Realtime State Machine (8 SP)
Story: `docs/stories/A1-polling-realtime-state-machine.md`
- **Maior story da trilha** — implementar após A.2, A.3, A.4
- State machine: CONNECTED → RECONNECTING → POLLING_FALLBACK → CONNECTED
- Coordenar 6 mecanismos em `PlayerJoinClient.tsx` (linhas 728-932)
- Suprimir polling quando realtime está SUBSCRIBED
- Await `fetchFullState()` ANTES de reconnectar channel no visibility handler (linha 868)
- Backoff exponencial no polling (2s → 4s → 8s → max 30s)
- Desabilitar turn-sync polling durante late-join "waiting"

### 5. A.6 — Auto-join via invite link (3 SP)
Story: `docs/stories/A6-auto-join-invite-link.md`
- Handler `combat:started` (linha 720) é letra morta — nunca emitido
- Solução: `pendingRegistrationRef` em `handleRegister`
- No handler `session:state_sync`: se `isRegistered && !alreadyInCombatants` → auto-register
- Guard: não disparar no encerramento (payload.combatants vazio)

### 6. A.5 — Session persistence no refresh (5 SP)
Story: `docs/stories/A5-session-persistence-refresh.md`
- `rejoinAsPlayer()` em `lib/supabase/player-registration.ts:334-340`: adicionar `.select()` ao UPDATE e validar ownership
- Heartbeat de 30s: interval em `PlayerJoinClient` atualizando `last_seen_at`
- Retry de `combat:rejoin_request`: 3 tentativas × 15s
- **Testar obrigatório em mobile**: iOS Safari modo privado + Android Chrome background 15+ min

### 7. A.7 — Group rename durante combate (3 SP)
Story: `docs/stories/A7-group-rename-combat-phase.md`
- `handleUpdateStats` em `GuestCombatClient.tsx:1062-1066` não aceita `display_name`
- Mover lógica de group rename para fora do setup phase (phase-agnostic)
- Também corrigir em `useCombatActions.ts:401`

### 8. A.8 — Group ficha click (3 SP)
Story: `docs/stories/A8-group-ficha-click-manual-monsters.md`
- Monstros manuais (`monster_id: null`) → `canExpand = false` → click morto
- Criar `ManualMonsterStats.tsx` para sheet parcial sem SRD
- `stopPropagation()` no `MonsterGroupHeader` onClick
- Debounce no group toggle (200ms)

---

## TRILHA B — Combat Display (UI)

**Independente da Trilha A** — pode rodar em paralelo.
**Ordem recomendada** (B.0 é pré-requisito do B.06):

### 1. B.0 — Extrair HP_STATUS_STYLES (2 SP) — COMEÇAR AQUI
Story: `docs/stories/B0-extract-hp-status-styles.md`
- 4 fontes de duplicação: `PlayerInitiativeBoard.tsx:48-53`, `HPLegendOverlay.tsx`, `PlayerDrawer.tsx` (tem `bg-emerald-500` errado vs `bg-green-500`)
- Centralizar em `lib/utils/hp-status.ts`
- Corrigir inconsistência visual no `PlayerDrawer` como parte deste item

### 2. B.06 — Tier FULL (3 SP)
Story: `docs/stories/B06-tier-full-hp-status.md`
- `HpStatus = "FULL" | "LIGHT" | "MODERATE" | "HEAVY" | "CRITICAL"`
- `getHpStatus()`: checar `current_hp >= max_hp` ANTES dos outros thresholds (cobre over-heal)
- Depende de B.0 estar concluído

### 3. B.09 — Sticky header turno (2 SP)
Story: `docs/stories/B09-sticky-header-turn.md`
- `PlayerInitiativeBoard.tsx:354-420` já tem turn banner — converter pra sticky
- Backdrop blur, z-index mapeado para não conflitar com outros elementos
- Também no DM view: `GuestCombatClient.tsx:1173`

### 4. B.07 — AC e Save DC (3 SP)
Story: `docs/stories/B07-ac-save-dc-display.md`
- Player vê APENAS os próprios AC e Spell Save DC (não dos aliados)
- `broadcast.ts:103` (players) vs `broadcast.ts:109` (monsters — manter strippado)
- Adicionar `spell_save_dc` ao payload do próprio char em `sanitize-combatants.ts`

### 5. B.08 — HP % texto (2 SP)
Story: `docs/stories/B08-hp-percentage-display.md`
- Criar `getHpPercentage()` utility
- Adicionar `hp_percentage` ao payload sanitizado do broadcast (players não têm HP raw de monstros)
- Display: "MODERATE — 45%"

### 6. B.10 — Visual crítico sombreado (2 SP)
Story: `docs/stories/B10-visual-critical-shadowed.md`
- `opacity-50` + `grayscale(50%)` em CRITICAL
- Guard: não acumular com estilo `is_defeated` já existente
- Transition suave `transition-all duration-500`

### 7. B.11 — Log de danos separado (5 SP)
Story: `docs/stories/B11-damage-log-separate.md`
- Nova aba em `CombatActionLog` (componente já existe)
- Player vê apenas danos que ELE tomou
- DM vê log de todos os players

### 8. B.12 — Legendary Actions counter (5 SP)
Story: `docs/stories/B12-legendary-actions-counter.md`
- Dots clicáveis (filled/empty) no DM view
- Auto-detect do SRD com fallback em 3 níveis → default 3
- Reset automático no início de cada rodada
- DM-only: stripar de `sanitizeCombatantsForPlayer()`

### 9. B.21 — Monster groups na player view (8 SP)
Story: `docs/stories/B21-monster-groups-player-view.md`
- Adicionar `monster_group_id` e `group_order` ao payload sanitizado
- Novo componente `PlayerMonsterGroupHeader`
- Anti-metagaming preservado (status tiers, não HP exato)
- Backward-compatible (frontends antigos veem lista flat)

---

## REGRAS DE IMPLEMENTAÇÃO

1. **Ler a story completa antes de codar** — cada story tem root cause, AC numerados, abordagem técnica e plano de testes
2. **Marcar ACs como feitos** conforme completa (`- [x]`)
3. **Verificar parity** em cada change antes de considerar pronto
4. **Screenshots de QA** em `qa-evidence/` — nunca na raiz do projeto
5. **Não criar arquivos desnecessários** — prefira editar existentes
6. **HP tiers são imutáveis**: sempre `FULL/LIGHT/MODERATE/HEAVY/CRITICAL` em inglês

---

## ORDEM SUGERIDA PARA MÁXIMO PARALELISMO

```
AGENTE 1 (Trilha A — Core bugs):
  A.2 → A.3 → A.4 → A.1 → A.6 → A.5 → A.7 → A.8

AGENTE 2 (Trilha B — UI):
  B.0 → B.06 → B.09 → B.07 → B.08 → B.10 → B.11 → B.12 → B.21
```

As duas trilhas são **100% independentes** entre si — podem rodar em paralelo sem conflito.
