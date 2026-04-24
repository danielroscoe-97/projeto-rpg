# CR-01 — Connection State Machine Explícita

**Epic:** Estabilidade Combate
**Camada:** L1 (Transport)
**Prioridade:** P0 — blocker pra CR-03, CR-04
**Estimate:** 1 dia
**Dependencies:** nenhuma
**Deliverable:** `lib/realtime/connection-state.ts` + refactor `lib/realtime/broadcast.ts`

---

## Problem

Estado de conexão está **implícito**, espalhado em variáveis module-level dentro de `lib/realtime/broadcast.ts`:
- `reconnectAttempts`, `reconnectBackoffMs`, `channel`, `channelReady`, `errorHandledForThisLifecycle`

Consumidores não conseguem responder perguntas básicas:
- "Estamos conectados?" → olha `channel.state`, mas esse é do Supabase SDK, não reflete nosso retry loop
- "Estamos reconectando?" → não tem como saber
- "Estamos degraded (ceiling hit)?" → não tem como saber — sync indicator UI só reage a `setSyncStatus("offline")`

**Consequência:**
- `useEventResume` (CR-03) precisa saber quando re-entrou em "connected" pra disparar resume — hoje não há hook limpo pra isso
- UI de skeleton (CR-03) precisa saber quando estamos "reconnecting" pra renderizar
- Debug de reconnect issues depende de `console.log` ad-hoc

## Goal / Value

Tornar o estado de conexão **observável** via pubsub tipado. Serve de base pra CR-03 (resume hook) e pra qualquer feature futura que precise reagir a degradação.

## Acceptance Criteria

- [ ] **AC1** — Novo arquivo `lib/realtime/connection-state.ts` exporta:
  - `type ConnectionState` discriminated union com kinds: `idle`, `connecting`, `connected`, `reconnecting`, `degraded`, `closed`
  - `type DegradedReason = "ceiling_hit" | "network_offline" | "broker_down"`
  - `getConnectionState(): ConnectionState` — estado atual
  - `onConnectionStateChange(cb): () => void` — subscribe, retorna unsubscribe
  - `transitionTo(next: ConnectionState): void` — internal (usado por broadcast.ts)

- [ ] **AC2** — `broadcast.ts` emite transições nos pontos corretos:
  - Início de `createAndSubscribe` → `connecting { attempt, since }`
  - Status `SUBSCRIBED` → `connected { subscribedAt, currentSeq }`
  - Status `CHANNEL_ERROR`/`TIMED_OUT` (sub-ceiling) → `reconnecting { attempt, since, backoffMs }`
  - Status `CHANNEL_ERROR`/`TIMED_OUT` ceiling hit → `degraded { reason: "ceiling_hit" }`
  - `navigator.online === false` detectado → `degraded { reason: "network_offline" }`
  - `cleanupDmChannel()` → `closed`
  - `resetDmChannel()` → `idle`

- [ ] **AC3** — `setSyncStatus("offline")` (do PR #48) **continua funcionando** — não remover. Estado `degraded` é complementar, não substituto. Sync indicator UI pode migrar pra subscrever connection state em follow-up (não neste sprint).

- [ ] **AC4** — `useCombatResilience` hook OU outro consumer apropriado migra pra subscrever connection state como prova de conceito. Escolher 1 callsite; resto fica no Sprint 2.

- [ ] **AC5** — Transições inválidas (ex: `idle → connected` direto) são **ignoradas com warning** via `captureWarning`. Não throw (não queremos quebrar prod por estado bug-ridden).

- [ ] **AC6** — Unit tests cobrem:
  - Cada transição válida
  - Transição inválida é ignorada + warning capturado
  - Emissão síncrona (listener chamado antes de `transitionTo` retornar)
  - Unsubscribe funciona (listener não é chamado após)
  - Múltiplos listeners recebem em ordem de registro

- [ ] **AC7** — **Zero regressão** nos 52 testes existentes de broadcast (`broadcast-channel-lifecycle.test.ts`, `reconnect.test.ts`, `broadcast-sanitization.test.ts`, `sanitize-combatants.test.ts`).

## Technical Approach

### Arquivo novo: `lib/realtime/connection-state.ts`

```typescript
import { captureWarning } from "@/lib/errors/capture";

export type ConnectionState =
  | { kind: "idle" }
  | { kind: "connecting"; attempt: number; since: number }
  | { kind: "connected"; subscribedAt: number; currentSeq: number }
  | { kind: "reconnecting"; attempt: number; since: number; backoffMs: number }
  | { kind: "degraded"; reason: DegradedReason; since: number }
  | { kind: "closed" };

export type DegradedReason = "ceiling_hit" | "network_offline" | "broker_down";

let current: ConnectionState = { kind: "idle" };
const listeners = new Set<(s: ConnectionState) => void>();

export function getConnectionState(): ConnectionState { return current; }

export function onConnectionStateChange(cb: (s: ConnectionState) => void): () => void {
  listeners.add(cb);
  cb(current); // immediately call with current state
  return () => listeners.delete(cb);
}

export function transitionTo(next: ConnectionState): void {
  if (!isValidTransition(current, next)) {
    captureWarning(`Invalid connection state transition: ${current.kind} → ${next.kind}`, {
      component: "connection-state",
      action: "transitionTo",
      category: "realtime",
      extra: { from: current, to: next },
    });
    return;
  }
  current = next;
  for (const cb of listeners) {
    try { cb(next); } catch (err) {
      captureWarning("Connection state listener threw", {
        component: "connection-state",
        action: "listener",
        category: "realtime",
        extra: { err: (err as Error).message },
      });
    }
  }
}

function isValidTransition(from: ConnectionState, to: ConnectionState): boolean {
  const table: Record<string, string[]> = {
    idle: ["connecting", "closed"],
    connecting: ["connected", "reconnecting", "closed"],
    connected: ["reconnecting", "degraded", "closed"],
    reconnecting: ["connected", "degraded", "closed"],
    degraded: ["connecting", "closed"],
    closed: ["idle"],
  };
  return (table[from.kind] ?? []).includes(to.kind);
}
```

### Integração com `broadcast.ts`

Editar `createAndSubscribe`:
- Antes de `fresh.subscribe(...)`: `transitionTo({ kind: "connecting", attempt: reconnectAttempts + 1, since: Date.now() })`
- No `SUBSCRIBED`: `transitionTo({ kind: "connected", subscribedAt: Date.now(), currentSeq: _broadcastSeq })`
- No error < ceiling: `transitionTo({ kind: "reconnecting", attempt: nextAttempt, since: Date.now(), backoffMs: delay })`
- No ceiling hit: `transitionTo({ kind: "degraded", reason: "ceiling_hit", since: Date.now() })`

Editar `cleanupDmChannel`:
- Após `teardownChannel()`: `transitionTo({ kind: "closed" })`

Editar `resetDmChannel`:
- Final: `transitionTo({ kind: "idle" })`

## Tasks

- [ ] **T1** (2h) — Criar `lib/realtime/connection-state.ts` com tipo, transition table, pubsub
- [ ] **T2** (1h) — Unit tests pra state machine (arquivo `lib/realtime/__tests__/connection-state.test.ts`)
- [ ] **T3** (2h) — Refactor `broadcast.ts` pra emitir transições nos 6+ pontos listados
- [ ] **T4** (1h) — Re-rodar suite inteira (`jest lib/realtime`), garantir zero regressão nos 52 tests
- [ ] **T5** (1h) — Migrar 1 callsite consumer (`useCombatResilience` OU sync indicator UI) pra subscrever state — prova de conceito
- [ ] **T6** (1h) — Commit + push + PR com descrição explicando valor downstream

## Test Strategy

**Unit:**
- `connection-state.test.ts` — transitions, listeners, unsubscribe, invalid transitions
- `broadcast-channel-lifecycle.test.ts` — adicionar asserções que emit events são disparados nos pontos certos

**Manual:**
- DevTools Network offline → state muda pra `reconnecting` após timeout
- 16+ falhas consecutivas → state muda pra `degraded`
- Click "retry" (quando UI tiver) → state volta pra `connecting`

## Dependencies

Nenhuma externa. Só Jest (já configurado).

## Definition of Done

- [ ] Todos ACs checked
- [ ] PR aberto, CI verde, 1 reviewer approve
- [ ] Code review adversarial se Dani pedir
- [ ] Merged em master
- [ ] Dashboard em Sentry mostra tags `connection_state_kind` preenchidas

## Out of Scope

- ❌ Migração de todos os callsites — só 1 POC
- ❌ UI redesign do sync indicator — fica pro Sprint 2 se necessário
- ❌ XState library — rolling our own é suficiente

## Riscos

| Risco | Mitigação |
|---|---|
| Regressão nos 52 tests atuais | Rodar suite completa antes de cada commit |
| Transition table incompleta (cenário real não coberto) | AC5: inválido = warn + ignore (não crasha) |
| Emissão síncrona causa reentrancy bug | AC6 unit test cobrindo; catch dentro do loop de listeners |
