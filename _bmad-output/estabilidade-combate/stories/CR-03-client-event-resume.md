# CR-03 — Client Event Resume Hook + Skeleton UI

**Epic:** Estabilidade Combate
**Camada:** L3 (Sequence + journal + resume)
**Prioridade:** P0 — fecha o loop server→client de resume
**Estimate:** 1 dia
**Dependencies:** CR-01 (state machine), CR-02 (event journal endpoint)
**Deliverable:** `lib/realtime/event-store.ts` + `lib/realtime/use-event-resume.ts` + skeleton integration em `PlayerJoinClient.tsx`

---

## Problem

Server agora tem journal + endpoint (CR-02). Cliente precisa:
1. **Persistir `lastSeenSeq`** por sessionId (sobrevive reload de tab)
2. **Observar** state machine (CR-01) → quando transita `reconnecting → connected`, disparar resume
3. **Aplicar eventos** via o mesmo reducer já usado pelos broadcasts ao vivo
4. **Fallback** pra refetch full `/state` quando `too_stale`
5. **Renderizar skeleton** durante `reconnecting` — regra do Piper: nunca tela branca, nunca form de re-registro

## Goal / Value

Completa o ciclo "disconnect → reconnect → zero drop". Jogador perde 30s de combate, volta, estado chega correto **sem refresh manual, sem form, sem tela branca**.

## Acceptance Criteria

### Event Store

- [ ] **AC1** — `lib/realtime/event-store.ts` exporta:
  - `getLastSeenSeq(sessionId: string): number` — retorna 0 se nunca viu
  - `setLastSeenSeq(sessionId: string, seq: number): void` — persiste em sessionStorage
  - Key format: `estcombate:lastseq:${sessionId}`
  - SSR-safe: checks `typeof window !== "undefined"`

- [ ] **AC2** — `lastSeenSeq` é atualizado **em toda aceitação de evento** — tanto pelos broadcasts live quanto pelo resume hook.

### Resume Hook

- [ ] **AC3** — `lib/realtime/use-event-resume.ts` exporta:
  ```typescript
  useEventResume({
    sessionId: string,
    encounterId: string,
    token: string,
    onEvents: (events: SanitizedEvent[]) => void,  // apply via reducer
    onFullRefetchNeeded: () => void,  // fallback signal
  }): void
  ```

- [ ] **AC4** — Hook subscreve a state machine (CR-01) via `onConnectionStateChange`. Reage a transições `X → connected`:
  - Lê `getLastSeenSeq(sessionId)`
  - Compara com `state.currentSeq`:
    - Se igual → no-op (nothing missed)
    - Se menor → fetch `/api/combat/${encounterId}/events?since_seq=X&token=Y`
  - Response handling:
    - `kind: "events"` → chama `onEvents(events.map(e => e.event))` + atualiza `lastSeenSeq`
    - `kind: "too_stale"` OR `kind: "empty"` → chama `onFullRefetchNeeded()`
    - HTTP error OR network error → chama `onFullRefetchNeeded()` (fallback)

- [ ] **AC5** — **Debounce** de 300ms — se múltiplas transições pra `connected` (flap rápido), só 1 resume dispara.

### Integration

- [ ] **AC6** — `PlayerJoinClient.tsx` usa `useEventResume`:
  - `onEvents` aplica cada evento via `applyRealtimeEvent` (reducer existente)
  - `onFullRefetchNeeded` chama a função existente de refetch `/api/combat/:id/state`
  - Após cada broadcast ao vivo ou resume event processado, chama `setLastSeenSeq(sessionId, event._seq)`

- [ ] **AC7** — `CombatSessionClient.tsx` (DM side) também usa `useEventResume`. Mesmo behavior.

### Skeleton UI

- [ ] **AC8** — `PlayerJoinClient.tsx` observa state machine; quando `reconnecting` OU `degraded`, renderiza `<ReconnectingSkeleton />` (novo componente em `components/player/ReconnectingSkeleton.tsx`).

- [ ] **AC9** — Skeleton **delay de 500ms** — só renderiza após 500ms contínuos de `reconnecting`. Antes disso, mantém última view renderizada (evita flash em retries <300ms).

- [ ] **AC10** — Skeleton reusa design tokens existentes (cor gold, shadcn skeleton utility). **Nunca tela branca. Nunca formulário de registro.** (Regra imutável CLAUDE.md)

- [ ] **AC11** — DM **não** recebe qualquer notificação de player reconectando. Silêncio intencional. Documentar em `docs/spec-resilient-reconnection.md`.

### Test Coverage

- [ ] **AC12** — Unit tests:
  - `event-store.test.ts` — get/set, SSR safety, key format
  - `use-event-resume.test.tsx` — todos ramos do AC4 + debounce

- [ ] **AC13** — **Smoke manual obrigatório** (não-automatizado pra esta story, E2E é CR-04):
  - Abrir `/join/[token]` em aba anônima
  - DevTools Network → offline
  - Esperar 10s
  - DM faz 5 mutações (HP, condition, turn)
  - DevTools Network → online
  - Esperar ~2s
  - Verificar: todos 5 eventos aplicados, sem tela branca, sem form

## Technical Approach

### `lib/realtime/event-store.ts`

```typescript
const STORAGE_KEY = (sessionId: string) => `estcombate:lastseq:${sessionId}`;

export function getLastSeenSeq(sessionId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY(sessionId));
    const n = parseInt(raw ?? "", 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch { return 0; }
}

export function setLastSeenSeq(sessionId: string, seq: number): void {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(STORAGE_KEY(sessionId), String(seq)); } catch {}
}
```

### `lib/realtime/use-event-resume.ts`

```typescript
import { useEffect, useRef } from "react";
import { onConnectionStateChange, ConnectionState } from "./connection-state";
import { getLastSeenSeq, setLastSeenSeq } from "./event-store";
import type { SanitizedEvent } from "@/lib/types/realtime";

interface UseEventResumeProps {
  sessionId: string;
  encounterId: string;
  token: string;
  onEvents: (events: SanitizedEvent[]) => void;
  onFullRefetchNeeded: () => void;
}

export function useEventResume({ sessionId, encounterId, token, onEvents, onFullRefetchNeeded }: UseEventResumeProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return onConnectionStateChange((state) => {
      if (state.kind !== "connected") return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => resume(state), 300);
    });

    async function resume(state: Extract<ConnectionState, { kind: "connected" }>) {
      const lastSeen = getLastSeenSeq(sessionId);
      if (lastSeen === state.currentSeq) return;
      try {
        const res = await fetch(`/api/combat/${encounterId}/events?since_seq=${lastSeen}&token=${encodeURIComponent(token)}`);
        if (!res.ok) { onFullRefetchNeeded(); return; }
        const data = await res.json();
        if (data.kind === "events") {
          onEvents(data.events.map((e: { event: SanitizedEvent }) => e.event));
          setLastSeenSeq(sessionId, data.currentSeq);
        } else {
          onFullRefetchNeeded();
        }
      } catch {
        onFullRefetchNeeded();
      }
    }
  }, [sessionId, encounterId, token, onEvents, onFullRefetchNeeded]);
}
```

### Skeleton component

```typescript
// components/player/ReconnectingSkeleton.tsx
export function ReconnectingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="reconnecting-skeleton">
      <div className="animate-pulse space-y-4 w-full max-w-md">
        <div className="h-8 bg-gold/20 rounded" />
        <div className="h-24 bg-muted/30 rounded" />
        <div className="h-24 bg-muted/30 rounded" />
      </div>
    </div>
  );
}
```

### Integration pattern em PlayerJoinClient.tsx

```typescript
const [showSkeleton, setShowSkeleton] = useState(false);

useEffect(() => {
  let timer: ReturnType<typeof setTimeout>;
  return onConnectionStateChange((state) => {
    clearTimeout(timer);
    if (state.kind === "reconnecting" || state.kind === "degraded") {
      timer = setTimeout(() => setShowSkeleton(true), 500);
    } else {
      setShowSkeleton(false);
    }
  });
}, []);

useEventResume({
  sessionId,
  encounterId,
  token,
  onEvents: (events) => events.forEach(applyRealtimeEvent),
  onFullRefetchNeeded: () => fetchFullState(),
});

if (showSkeleton) return <ReconnectingSkeleton />;
// ... rest of normal render
```

## Tasks

- [ ] **T1** (30min) — `lib/realtime/event-store.ts` + unit tests
- [ ] **T2** (1.5h) — `lib/realtime/use-event-resume.ts` + unit tests com mock de state machine + fetch
- [ ] **T3** (30min) — `components/player/ReconnectingSkeleton.tsx`
- [ ] **T4** (1h) — Integration em `PlayerJoinClient.tsx` — hook + skeleton
- [ ] **T5** (1h) — Integration em `CombatSessionClient.tsx` (DM)
- [ ] **T6** (30min) — Update `docs/spec-resilient-reconnection.md` com AC11 (DM não é notificado)
- [ ] **T7** (1.5h) — Smoke manual AC13 + documentar evidence
- [ ] **T8** (30min) — Fix bugs encontrados no smoke

## Test Strategy

**Unit:**
- `event-store.test.ts` — storage ops + SSR safety
- `use-event-resume.test.tsx` — mock `onConnectionStateChange` emit `connected`, mock fetch, assert `onEvents` / `onFullRefetchNeeded` chamados corretamente
- Debounce test: emit `connected` 3x em 100ms, verifica 1 único fetch

**Integration (manual, AC13):**
- Cenário completo offline→online com 5 mutações

**E2E (CR-04, separate story):**
- Cobre Anon + Auth automatizado

## Dependencies

- CR-01 merged (state machine) — hard blocker
- CR-02 merged (endpoint) — hard blocker

## Definition of Done

- [ ] Todos ACs checked
- [ ] Smoke manual AC13 documentado em PR body (screenshots OK, mas nota textual + steps também serve)
- [ ] PR aberto, CI verde
- [ ] Doc atualizado (T6)
- [ ] Merged

## Out of Scope

- ❌ E2E automatizado — CR-04
- ❌ DM-side specific UX durante próprio reconnect — scope dele é igual (mesmo hook)
- ❌ Retry button na UI de `degraded` — pode ficar pro Sprint 2 se quisermos UX
- ❌ Analytics event `resume_success` — pode ficar pra follow-up observability PR

## Riscos

| Risco | Mitigação |
|---|---|
| `applyRealtimeEvent` reducer não é idempotente — resume duplica effects | Verificar antes de implementar; já se comporta dedup via `_seq`? Se não, adicionar guard |
| Skeleton flicka em conexão instável | AC9 debounce 500ms |
| sessionStorage indisponível (private browsing) | try/catch no event-store; falha silencio vira "always refetch full" — pior caso aceitável |
| Debounce 300ms atrasa resume visível | É trade-off. Piper já aceitou "volta em <2s" como OK |
| DM reconnect com mutações pendentes locais | Offline queue do broadcast.ts já cobre — mutações saem quando channel voltar, resume pega eventos do server |
