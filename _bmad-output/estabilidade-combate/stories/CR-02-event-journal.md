# CR-02 — Event Journal + Resume Endpoint

**Epic:** Estabilidade Combate
**Camada:** L3 (Sequence + journal + resume)
**Prioridade:** P0 — fecha a dor narrativa ("player perdido")
**Estimate:** 1 dia
**Dependencies:** nenhuma (pode paralelizar com CR-01)
**Deliverable:** `lib/realtime/event-journal.ts` + `app/api/combat/[id]/events/route.ts`

---

## Problem

`_broadcastSeq` já incrementa monotonic em `broadcast.ts`, mas os eventos em si **não são retidos** em lugar algum após o broadcast. Consequência:

- Player reconecta → precisa refetch TUDO via `/api/combat/:id/state`
- Refetch é caro (~200KB JSON, ~500ms latency em 4G) e carrega sanitização SSR + hidratação no client
- Se DB persistir fora de ordem por 504 transiente, estado refetch pode divergir do estado "ao vivo"

**Evidence do Piper (Beta #4):** "Player perdeu Wi-Fi por 40s. Tela dele ficou com HP do Dao em 100% por 3 minutos — enquanto eu narrava como bad ele tava. Meta-gaming plantado."

## Goal / Value

Server-side ring buffer per-session dos últimos 100 eventos + endpoint GET pra client consumir deltas via cursor de seq. Isso transforma disconnect de 30s de "refetch 200KB + pray" pra "fetch 5 events + apply".

## Acceptance Criteria

- [ ] **AC1** — Novo arquivo `lib/realtime/event-journal.ts`:
  - `recordEvent(sessionId: string, seq: number, event: SanitizedEvent): void`
  - `getEventsSince(sessionId: string, sinceSeq: number): EventsSinceResult`
  - `purgeIdleSessions(): void` (chamado via setInterval 5min)
  - Módulo-level `Map<string, JournalEntry[]>`, cap 100 por sessão

- [ ] **AC2** — Tipo `JournalEntry`:
  ```typescript
  { seq: number, sessionId: string, timestamp: number, event: SanitizedEvent }
  ```

- [ ] **AC3** — Tipo `EventsSinceResult` (discriminated union):
  ```typescript
  | { kind: "events", events: JournalEntry[], currentSeq: number }
  | { kind: "too_stale", currentSeq: number, oldestSeq: number }
  | { kind: "empty", currentSeq: number }  // buffer não tem nada pra essa sessão
  ```

- [ ] **AC4** — `broadcast.ts:broadcastEvent` chama `recordEvent` após sanitização, antes do `channel.send`. Eventos **player→DM** (late_join, hp_action, self_condition_toggle) também são registrados — toda linha que passa por `sanitizePayload` vai pro journal.

- [ ] **AC5** — Ring buffer semantics:
  - Push to tail; length > 100 → `shift()` (drop oldest)
  - `getEventsSince(X)`:
    - Se buffer vazio → `{ kind: "empty", currentSeq: 0 }`
    - Se `X < oldest.seq - 1` → `{ kind: "too_stale", currentSeq, oldestSeq }`
    - Se `X > currentSeq` → `{ kind: "events", events: [], currentSeq }` (client tá ahead?? no-op)
    - Caso normal → `{ kind: "events", events: buffer.filter(e => e.seq > X), currentSeq }`

- [ ] **AC6** — Cleanup: `purgeIdleSessions` remove sessões com `last_event.timestamp < Date.now() - 60*60*1000` (idle 1h). Timer iniciado no módulo load (setInterval 5min).

- [ ] **AC7** — API route nova: `app/api/combat/[encounterId]/events/route.ts`
  - `GET ?since_seq=<N>&token=<string>`
  - Valida token via `session_tokens` table (service client, igual `/state`)
  - Encontra `sessionId` a partir do `encounterId` → chama `getEventsSince`
  - Retorna JSON conforme AC3
  - Status codes: 200 (all cases), 401 (invalid token), 400 (invalid since_seq), 404 (encounter/session not found)

- [ ] **AC8** — Unit tests cobrem:
  - Push + wrap em cap 100
  - `getEventsSince` happy path
  - `getEventsSince` too_stale
  - `getEventsSince` empty
  - `getEventsSince` future seq (client ahead)
  - `purgeIdleSessions` remove idle, preserva ativa
  - Concurrency: N push concorrentes mantém ordem (não race em seq)

- [ ] **AC9** — Endpoint tests (integration):
  - 401 com token inválido
  - 400 com `since_seq` negativo ou NaN
  - 404 com encounter id inexistente
  - 200 happy path com eventos
  - 200 too_stale com instruction de refetch

- [ ] **AC10** — Observabilidade:
  - Log estruturado em cada `recordEvent` (debug level, tagged `sessionId`, `seq`)
  - Log warning quando `too_stale` é retornado (Sentry breadcrumb)
  - Métrica `journal_buffer_size_p95` exposta via console (Sentry captureMetric em follow-up)

## Technical Approach

### `lib/realtime/event-journal.ts`

```typescript
import type { SanitizedEvent } from "@/lib/types/realtime";

interface JournalEntry {
  seq: number;
  sessionId: string;
  timestamp: number;
  event: SanitizedEvent;
}

export type EventsSinceResult =
  | { kind: "events"; events: JournalEntry[]; currentSeq: number }
  | { kind: "too_stale"; currentSeq: number; oldestSeq: number }
  | { kind: "empty"; currentSeq: number };

const BUFFER_CAP = 100;
const SESSION_TTL_MS = 60 * 60 * 1000;
const journals = new Map<string, JournalEntry[]>();

export function recordEvent(sessionId: string, seq: number, event: SanitizedEvent): void {
  let buffer = journals.get(sessionId);
  if (!buffer) { buffer = []; journals.set(sessionId, buffer); }
  buffer.push({ seq, sessionId, timestamp: Date.now(), event });
  if (buffer.length > BUFFER_CAP) buffer.shift();
}

export function getEventsSince(sessionId: string, sinceSeq: number): EventsSinceResult {
  const buffer = journals.get(sessionId);
  if (!buffer || buffer.length === 0) return { kind: "empty", currentSeq: 0 };
  const currentSeq = buffer[buffer.length - 1].seq;
  const oldestSeq = buffer[0].seq;
  if (sinceSeq < oldestSeq - 1) return { kind: "too_stale", currentSeq, oldestSeq };
  const events = buffer.filter((e) => e.seq > sinceSeq);
  return { kind: "events", events, currentSeq };
}

export function purgeIdleSessions(): void {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [sid, buffer] of journals) {
    const last = buffer[buffer.length - 1];
    if (!last || last.timestamp < cutoff) journals.delete(sid);
  }
}

// Start background cleanup
if (typeof window === "undefined") {
  setInterval(purgeIdleSessions, 5 * 60 * 1000);
}
```

### `broadcast.ts` integration

Em `broadcastEvent`, após `const payloadWithSeq = { ...safeEvent, _seq: seq }`:

```typescript
import { recordEvent } from "./event-journal";
// ...
recordEvent(sessionId, seq, safeEvent);
```

### API route `app/api/combat/[encounterId]/events/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getEventsSince } from "@/lib/realtime/event-journal";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ encounterId: string }> }
) {
  const { encounterId } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const sinceSeqStr = url.searchParams.get("since_seq");

  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  const sinceSeq = parseInt(sinceSeqStr ?? "", 10);
  if (!Number.isFinite(sinceSeq) || sinceSeq < 0) {
    return NextResponse.json({ error: "invalid_since_seq" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Resolve sessionId from encounterId + validate token
  const { data: enc } = await supabase
    .from("encounters")
    .select("session_id")
    .eq("id", encounterId)
    .single();
  if (!enc) return NextResponse.json({ error: "encounter_not_found" }, { status: 404 });

  const { data: tokenRow } = await supabase
    .from("session_tokens")
    .select("id")
    .eq("token", token)
    .eq("session_id", enc.session_id)
    .eq("is_active", true)
    .maybeSingle();
  if (!tokenRow) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const result = getEventsSince(enc.session_id, sinceSeq);
  return NextResponse.json(result);
}
```

## Tasks

- [ ] **T1** (1h) — `lib/realtime/event-journal.ts` com tipos + funções + cleanup
- [ ] **T2** (1.5h) — Unit tests `event-journal.test.ts` cobrindo AC8
- [ ] **T3** (30min) — Integrar `recordEvent` em `broadcast.ts:broadcastEvent`
- [ ] **T4** (1.5h) — API route `app/api/combat/[encounterId]/events/route.ts` + error handling
- [ ] **T5** (1h) — Integration tests pro endpoint (AC9)
- [ ] **T6** (30min) — Smoke manual: curl o endpoint, verifica responses
- [ ] **T7** (30min) — Log estruturado + Sentry breadcrumb em too_stale
- [ ] **T8** (1h) — Docstrings + comentários arquiteturais (D1-D5 do tech spec)

## Test Strategy

**Unit (AC8):**
- `event-journal.test.ts` — todos os cenários listados

**Integration (AC9):**
- Via `node --test` ou jest com `request` helper
- Teste mínimo: mock supabase, call handler, verify response shape

**Manual:**
- `curl "http://localhost:3000/api/combat/:enc/events?token=X&since_seq=0"` antes/depois de um broadcast

## Dependencies

- Tipo `SanitizedEvent` (já existe em `lib/types/realtime.ts`)
- `createServiceClient` (já existe)
- Schema Supabase `encounters`, `session_tokens` (já existe)

## Definition of Done

- [ ] Todos ACs checked
- [ ] PR aberto, CI verde
- [ ] Smoke manual assinado (eu mesmo + Barry)
- [ ] Endpoint retorna todos 4 response shapes corretamente via curl
- [ ] Merged em master

## Out of Scope

- ❌ Client usa o endpoint — isso é CR-03
- ❌ Persistence em Redis — D1 é in-memory
- ❌ Multi-region (CDN edge) — serverless single region OK
- ❌ Rate limiting no endpoint — quando tiver abuso, adiciona Vercel WAF

## Riscos

| Risco | Mitigação |
|---|---|
| Race condition em `recordEvent` concurrent | JS single-threaded no Next.js handler; sem risco real |
| Memory leak sessão idle | `purgeIdleSessions` cobre; monitora `journals.size` em Sentry |
| Endpoint auth bypass | Token validation igual `/state`, mesmo RLS model |
| Buffer overflow comum em sessão longa | Monitor `too_stale` rate; se >5%, subir cap ou migrar Redis |
