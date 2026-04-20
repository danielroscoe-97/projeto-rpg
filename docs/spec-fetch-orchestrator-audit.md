# Spec — Fetch Orchestrator Audit & Full Wiring (C2 / Beta 4)

**Data:** 2026-04-19
**Autor:** Claude (Plan agent)
**Status:** PRONTO PARA IMPLEMENTAÇÃO
**Tracks:** Beta 4 fix C2 (bloqueador — 429 storm)

---

## Contexto

Log de produção (2026-04-17) mostra **90 × 429** em dois picos de 20s no endpoint `GET /api/session/[id]/state` — 39 ocorrências em `00:06:40-50` (session `b33616aa`) e 51 em `02:27:40-50` (session `3c43f5b7`). P99 = 4019 ms, max = 8519 ms, mesmo endpoint.

O orchestrator (S3.5) *foi* shipado em `54492e93` / `896e2e8d` / `62bc3e92` / `2cfcf402` e está presente em [lib/realtime/fetch-orchestrator.ts](../lib/realtime/fetch-orchestrator.ts). A auditoria confirma que **a maioria dos call sites de `/state` já passa pelo orchestrator**, mas identifica:

- (i) **um bypass direto** no handler de `visibilitychange` para checagem anti-split-brain
- (ii) dois endpoints adjacentes (`/dm-presence`, `/latest-recap`) não-orquestrados que partilham budget de rate-limit
- (iii) vetores sistêmicos (multi-tab do mesmo user, Strict Mode remount, reset de circuit breaker em storm) que tornam as 429s possíveis *mesmo com cobertura quase total*

Esta spec corrige (i)+(ii) de forma determinística e (iii) adicionando telemetria + guardrails.

## Call sites de `/api/session/[id]/state` (inventário completo)

Todos em [components/player/PlayerJoinClient.tsx](../components/player/PlayerJoinClient.tsx):

| # | Arquivo:linha | Tipo / Trigger | Frequência nominal | Caller label | Passa pelo orchestrator? |
|---|---|---|---|---|---|
| 1 | `PlayerJoinClient.tsx:886-993` (`fetchFullState`) | Callback central — chama orchestrator | n/a (sob demanda) | via `opts.caller` | Sim — wrapper canônico |
| 2 | `PlayerJoinClient.tsx:658-664` (`startPollingWithBackoff` → `fetchFullStateRef`) | `setTimeout` recursivo quando `POLLING_FALLBACK` | 2s → 4 → 8 … cap 30s | `polling_fallback`, `polling_fallback_kickoff` | Sim (`emergency`) |
| 3 | `PlayerJoinClient.tsx:1283, 1391, 1491, 1625, 1630` | Handlers de broadcast | Event-driven (one-shot) | respectivos | Sim (`emergency`) |
| 4 | `PlayerJoinClient.tsx:1692-1786` (late-join poll) | `setTimeout` recursivo; 2s → 5 → 10 → 20 → 30 | adaptive | `late_join_poll` | Sim (`background`) |
| 5 | `PlayerJoinClient.tsx:1818-1875` (lobby poll) | `setTimeout` recursivo; 5 → 10 → 20 → 30s | 5s happy-path | `lobby_poll` | Sim (`background`) |
| 6 | `PlayerJoinClient.tsx:2038-2040` — **`fetch(\`/state?token_id=…\`)`** | `visibilitychange → visible` (anti-split-brain) | One-shot per visibility event | *unlabelled* | **NÃO — bypass direto** |
| 7 | `PlayerJoinClient.tsx:2093, 2098, 2140` | Após (6): sync full state (visibility + online) | One-shot + retry once | `visibility_change:visible`, `…_retry`, `network_recovery` | Sim (`emergency`) |
| 8 | `PlayerJoinClient.tsx:2241-2250` (turn-sync safety net) | `setInterval` — 30s se `CONNECTED`, 10s se `POLLING_FALLBACK` | 30s / 10s | `turn_poll` | Sim (`high`) |

**Endpoints adjacentes do mesmo segmento (compartilham rate-limit):**

| # | Arquivo:linha | Endpoint | Tipo | Passa pelo orchestrator? |
|---|---|---|---|---|
| A | `PlayerJoinClient.tsx:1899` | `/api/session/[id]/latest-recap` | `useEffect` one-shot | Não (one-shot é aceitável) |
| B | `PlayerJoinClient.tsx:1956` | `/api/session/[id]/dm-presence` | `setTimeout` recursivo, 30s → 60 → 120 | Não — loop não-orquestrado |
| C | `components/session/FileShareButton.tsx:67`, `SharedFileCard.tsx:51` | `/api/session/[id]/files` | Ação do usuário (one-shot) | N/A (mutation, diferente pool) |

**Totais (somente `/state`):** 8 call sites distintos; **7 passam pelo orchestrator, 1 é bypass** (item #6). Se incluirmos `/dm-presence`, são **2 bypasses** relevantes.

## Orchestrator atual (API)

- **Arquivo:** [lib/realtime/fetch-orchestrator.ts](../lib/realtime/fetch-orchestrator.ts)
- **Classe exportada:** `FetchOrchestrator` + singleton `fetchOrchestrator`
- **Método público:** `fetch(req: FetchRequest): Promise<SessionStateEnvelope | null>`
  - `req = { encounterId: string; priority: FetchPriority; caller: string }`
  - Retorno `null` ⇒ drop (throttle | dedup | circuit | falha de rede)
- **Helper:** `setUnauthorizedHandler((): Promise<boolean>)` — plumbing de refresh silencioso do Supabase em 401
- **Priority levels (4 tiers):**
  - `emergency` → 0ms (bypass de throttle **e** de circuit breaker)
  - `high` → 2000ms
  - `throttled` → 5000ms (default legacy)
  - `background` → 15000ms
- **Dedup:** chave `${caller}::${encounterId}` enquanto in-flight/queued
- **In-flight coalescing:** N awaiters do mesmo `encounterId` resolvem em 1 request
- **Circuit breaker:** abre após 3 erros consecutivos, cooldown 30s; só `emergency` atravessa
- **Telemetry:** `fetch_orchestrator:hit | dropped | circuit_open | circuit_close` via `trackEvent`

## Gaps identificados

**G1 — Bypass direto em `visibilitychange` (HIGH):** `PlayerJoinClient.tsx:2038-2040` chama `fetch()` sem passar pelo orchestrator. Motivo histórico: precisa do query-param `?token_id=…`, e a `FetchRequest` atual não aceita query params. Cenário patológico: 8 tabs do mesmo user voltando ao foco simultaneamente ⇒ 8 requests em ms.

**G2 — `/dm-presence` polling não-orquestrado (MEDIUM):** loop dedicado a 30–120s. Compartilha budget de rate-limit do mesmo endpoint-family.

**G3 — Orchestrator é per-instância-de-módulo (CRITICAL):** o singleton é `new FetchOrchestrator()` no topo do módulo; vive no contexto da janela/tab. **N tabs = N orchestradores**. 429 em 2 × 20s com 39 e 51 hits (≈2/s) coincide com ~8 players × (turn_poll 10s + lobby_poll 5s + late-join/visibility burst). **Explicação provável do log.**

**G4 — React Strict Mode remount:** baixo risco, não observado.

**G5 — Falta de enforcement:** nada impede que um call site novo seja adicionado com `fetch()` direto. Regressão é inevitável sem lint rule.

**G6 — Telemetria insuficiente:** não conseguimos calcular *cobertura* (% de requests que passaram pelo orchestrator) sem correlação manual.

## Plano de correção

### Fase 1 — Wire call sites pendentes (C2.1, 1-2h)

**F1.a — Orchestrar o token-ownership check (G1)**
- Estender `FetchRequest` com `queryParams?: Record<string, string>` e construir URL em `executeFetch` (`fetch-orchestrator.ts:207`).
- Em `PlayerJoinClient.tsx:2032-2050`, substituir `fetch()` direto por `fetchOrchestrator.fetch({ encounterId, queryParams: { token_id }, priority: "high", caller: "visibility_change:token_ownership_check" })`.
- **Cuidado com coalescing:** o orchestrator coalesce por `encounterId`; um awaiter do check pode receber response de outro caller sem `token_id`. Mitigação: quando `queryParams` está presente, key = `\`${encounterId}::${JSON.stringify(queryParams ?? {})}\``.

**F1.b — Orquestrar `/dm-presence` (G2)**
- Generalizar a API: adicionar campo `path: "state" | "dm-presence" | "latest-recap"` em `FetchRequest`.
- Mantém um único círculo de circuit-breaker.

**F1.c — `/latest-recap` (borderline)**
- One-shot por sessão. Se `F1.b` generalizar, rotear é trivial e dá cobertura 100%.

### Fase 2 — Enforce via lint rule (C2.2, 1h)

- Adicionar regra custom em `eslint.config.mjs`:
  - `no-restricted-syntax` ⇒ erro com mensagem `"Use fetchOrchestrator.fetch() — ver lib/realtime/fetch-orchestrator.ts"`.
  - Excluir `lib/realtime/fetch-orchestrator.ts` e `__tests__`.
- Rodar `pnpm lint` na CI como gate; falha bloqueia merge.

### Fase 3 — Telemetria de cobertura (C2.3, 1h)

- **`fetch_orchestrator:coverage`** — `setInterval` de 60s lendo contadores internos. Se `orchestrator.total >= vercel.total × N_tabs`, cobertura é 100%.
- **`fetch_orchestrator:multi_tab_detected`** — usar `BroadcastChannel('fetch-orchestrator')` para detectar outras tabs do mesmo user; logar se ≥ 2. Não é correção, mas expõe o vetor de G3 para follow-up.

### Fase 4 (opcional, follow-up) — Cross-tab coordenação

G3 é o único caminho realista para 39 × 429 em 20s com o orchestrator já em lugar. Não está no escopo de C2, mas documentar em `docs/beta-5-backlog.md`: sincronização via `BroadcastChannel` ou `SharedWorker` para um único orchestrador por origin.

## Parity

- **Guest:** usa estado local (Zustand) — não chama `/state`. Zero mudanças.
- **Anon/Auth (player):** único trajeto que usa `/state`. Todas as mudanças neste caminho.
- **DM (`CombatSessionClient`):** não consome `/state` (só `/latest-recap` one-shot e `/files`). Nada a mudar.

## Testes

**Unit (Jest, `lib/realtime/__tests__/fetch-orchestrator.test.ts`):**
- `queryParams` incluído na URL e participa da dedup/coalescing key.
- Path configurável (state / dm-presence / latest-recap).
- Circuit aberto por erro em path A também bloqueia path B (decisão explícita — gargalo é o pod).

**Integration:** 8 awaiters simultâneos mesmo `encounterId` + `queryParams={token_id:X}` ⇒ 1 request, 8 resolves idênticos.

**E2E (Playwright, `e2e/player-throttle.spec.ts` — novo):**
- 4 tabs abrindo a mesma sessão, todas `visibilitychange:visible` no mesmo frame ⇒ ≤1 request por tab em 5s.
- Regressão do log: simular 2 players com turn-poll + lobby-poll + visibility burst; asserir zero 429 em 60s.

**Lint regression:** introduzir `fetch('/api/session/x/state')` em arquivo arbitrário ⇒ `pnpm lint` falha.

## Rollback

- **F1.a (token check):** reverter chunk em `PlayerJoinClient.tsx:2032-2050`. Sem risco de dados.
- **F1.b (dm-presence/latest-recap):** feature flag `ff_orchestrator_multipath_v1` recomendada.
- **F2 (lint):** remover regra do eslint config; não afeta runtime.
- **F3 (telemetria):** eventos passivos; remover emissores sem risco.

## Conclusão crítica

Volume de 429 (39 req / 20s e 51 req / 20s) é **incompatível** com um único orchestrator funcionando. Evidência aponta para **G3 — múltiplas tabs do mesmo user = N orchestradores independentes**. Bypass G1 contribui mas não explica sozinho. Recomenda-se documentar Fase 4 (cross-tab) no backlog do beta 5.

---

## Critical Files

- `c:/Projetos Daniel/projeto-rpg/lib/realtime/fetch-orchestrator.ts`
- `c:/Projetos Daniel/projeto-rpg/components/player/PlayerJoinClient.tsx`
- `c:/Projetos Daniel/projeto-rpg/lib/realtime/__tests__/fetch-orchestrator.test.ts`
- `c:/Projetos Daniel/projeto-rpg/eslint.config.mjs`

## Estimativa

- F1 (wire) — 1-2h
- F2 (lint) — 1h
- F3 (telemetry) — 1h
- Testes — 2h
- **Total: ~6h**
