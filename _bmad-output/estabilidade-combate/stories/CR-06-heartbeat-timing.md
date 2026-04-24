# CR-06 — Heartbeat Timing Reconciliation

**Epic:** Estabilidade Combate
**Camada:** L2 (Heartbeat) — timing polish only
**Prioridade:** P2 — polish, previne drift futuro
**Estimate:** 1h
**Dependencies:** nenhuma
**Deliverable:** `lib/realtime/timing-constants.ts` + callsite migration

---

## Problem

Hoje temos **3 heartbeats / timeouts desalinhados** sem fonte única de verdade:

| Layer | Valor | Onde |
|---|---|---|
| Supabase Realtime WS heartbeat | 20s | `lib/supabase/client.ts:heartbeatIntervalMs` (PR #48) |
| App-level DM heartbeat | 30s | `lib/hooks/useCombatResilience.ts:DM_HEARTBEAT_INTERVAL` |
| Presence stale threshold (player shown offline) | 45s | `app/join/[token]/page.tsx:ACTIVE_THRESHOLD_MS` |
| DM offline threshold (via last_seen_at) | 90s | `components/player/PlayerJoinClient.tsx:2297` |

Esses 4 valores **deveriam derivar de relação explícita**. Hoje são magic numbers em 4 arquivos. Qualquer mudança num sem ajustar os outros = drift.

Edge Case Hunter do review flagou isso como P-9 mas eu classifiquei como "não aplicável" — revendo agora, é P2 polish válido.

## Goal / Value

Estabelecer single source of truth pros timings de presença/heartbeat. Previne bug onde mudar um valor quebra relação invisível.

## Acceptance Criteria

- [ ] **AC1** — Novo arquivo `lib/realtime/timing-constants.ts`:
  ```typescript
  /**
   * Single source of truth for realtime heartbeat / presence timings.
   *
   * Invariants (must hold):
   *   WS_HEARTBEAT < APP_HEARTBEAT < PLAYER_STALE_THRESHOLD < DM_OFFLINE_THRESHOLD
   *   WS_HEARTBEAT * 1.5 <= APP_HEARTBEAT
   *   PLAYER_STALE_THRESHOLD >= APP_HEARTBEAT * 1.5 (margin pra 1 heartbeat missed)
   *   DM_OFFLINE_THRESHOLD >= APP_HEARTBEAT * 3 (3 missed beats)
   */

  /** Supabase Realtime WS-level ping interval. Lower = faster dead-connection detect,
   *  higher = less server load. */
  export const WS_HEARTBEAT_MS = 20_000;

  /** App-level DM heartbeat (updates sessions.dm_last_seen_at). Drives
   *  player-side DM-offline indicator. */
  export const APP_HEARTBEAT_MS = 30_000;

  /** Threshold para o DM marcar um player como stale na presence UI
   *  (via session_tokens.last_seen_at). */
  export const PLAYER_STALE_THRESHOLD_MS = 45_000;

  /** Threshold para o player marcar o DM como offline (3 missed APP heartbeats). */
  export const DM_OFFLINE_THRESHOLD_MS = 90_000;

  /** Dev-time invariant check. Run at module load, throws if constants drift. */
  export function assertTimingInvariants(): void {
    if (!(WS_HEARTBEAT_MS < APP_HEARTBEAT_MS)) {
      throw new Error("Timing invariant: WS_HEARTBEAT < APP_HEARTBEAT violated");
    }
    if (!(PLAYER_STALE_THRESHOLD_MS >= APP_HEARTBEAT_MS * 1.5)) {
      throw new Error("Timing invariant: PLAYER_STALE_THRESHOLD >= APP_HEARTBEAT * 1.5 violated");
    }
    if (!(DM_OFFLINE_THRESHOLD_MS >= APP_HEARTBEAT_MS * 3)) {
      throw new Error("Timing invariant: DM_OFFLINE_THRESHOLD >= APP_HEARTBEAT * 3 violated");
    }
  }
  assertTimingInvariants();
  ```

- [ ] **AC2** — Callsites migram pra importar dessas constantes:
  - `lib/supabase/client.ts:heartbeatIntervalMs` → `WS_HEARTBEAT_MS`
  - `lib/hooks/useCombatResilience.ts:DM_HEARTBEAT_INTERVAL` → `APP_HEARTBEAT_MS`
  - `app/join/[token]/page.tsx:ACTIVE_THRESHOLD_MS` → `PLAYER_STALE_THRESHOLD_MS`
  - `components/player/PlayerJoinClient.tsx:2297` (`90_000`) → `DM_OFFLINE_THRESHOLD_MS`
  - Qualquer outro hit de `grep 30_000\|45_000\|90_000` relacionado a presence/heartbeat

- [ ] **AC3** — Comments no `PlayerJoinClient.tsx:2297` e `useCombatResilience.ts:23` atualizados pra referenciar as constantes (sem magic number strings):
  - ~~"3 missed beats at 30s interval"~~
  - ✅ `"DM_OFFLINE_THRESHOLD_MS (${DM_OFFLINE_THRESHOLD_MS}ms = ${DM_OFFLINE_THRESHOLD_MS / APP_HEARTBEAT_MS} missed APP heartbeats)"`

- [ ] **AC4** — Unit test `lib/realtime/__tests__/timing-constants.test.ts` verifica invariantes (call `assertTimingInvariants` dev-time + em CI)

- [ ] **AC5** — Zero regressão funcional — heartbeats continuam operando nos mesmos timings.

## Technical Approach

Super direto: criar constants file, grep pelos magic numbers, substituir.

Comentários DEVEM explicar a relação entre constantes, não só os valores.

## Tasks

- [ ] **T1** (15min) — Criar `lib/realtime/timing-constants.ts` com invariant check
- [ ] **T2** (10min) — Unit test pra invariantes
- [ ] **T3** (20min) — Grep + migrate 4 callsites
- [ ] **T4** (10min) — Update comments nos 2 spots (AC3)
- [ ] **T5** (5min) — tsc + test run verificando zero regressão

## Test Strategy

**Unit:** invariant check passa
**Grep:** após merge, `grep "30_000\|45_000\|90_000" lib/ components/ app/` não retorna hits relacionados a presence (só outros usos benignos)
**Regression:** existing tests continuam verdes

## Dependencies

Nenhuma.

## Definition of Done

- [ ] Todos ACs checked
- [ ] PR aberto + CI verde
- [ ] Merged

## Out of Scope

- ❌ Ajustar os valores em si (se 20s/30s/45s/90s são ótimos — fica pra dado em produção)
- ❌ UX feedback de conexão (já tem o sync indicator)
- ❌ Tornar os valores configuráveis via env — over-engineering

## Riscos

| Risco | Mitigação |
|---|---|
| Grep perder 1 callsite | T3 inclui double-check manual; T5 testes rodam |
| Import circular | timing-constants é leaf module, sem dependências |
| Valor errado numa constante (typo) | AC4 invariant check pega |
