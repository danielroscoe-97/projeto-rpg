# Analytics — Especificação Técnica & Regras de Negócio

**Autor:** Dani_
**Data:** 2026-03-26
**Status:** Implementado (foundation + instrumentation)

---

## 1. Arquitetura

### Stack

```
┌─────────────┐     POST /api/track     ┌──────────────────┐
│  Client-side │ ──────────────────────► │  API Route        │
│  trackEvent()│   sendBeacon (non-block)│  validates event  │
│  useTrack()  │                        │  extracts user_id │
└─────────────┘                        │  hashes IP        │
                                       │  inserts via       │
                                       │  service_role      │
                                       └────────┬─────────┘
                                                │
┌─────────────┐     direct insert       ┌───────▼──────────┐
│  Server-side │ ─────────────────────► │  Supabase         │
│  trackServer │   fire-and-forget      │  analytics_events │
│  Event()     │                        │  (PostgreSQL)     │
└─────────────┘                        └──────────────────┘
```

### Decisão: Por que Supabase e não PostHog/Mixpanel?

| Critério | Supabase (escolhido) | PostHog/Mixpanel |
|----------|---------------------|------------------|
| Custo | R$ 0 (dentro do plano atual) | $0–$450+/mês por volume |
| Complexidade | Zero SDK novo | SDK + configuração + manutenção |
| Dados | Mesmo banco, SQL direto | API separada, export limitado |
| LGPD | Dados no nosso Supabase | Dados em servers terceiros |
| Heatmaps/Replay | Não tem (Sentry faz 1%) | Tem (se precisar, migra depois) |
| Queries custom | SQL ilimitado | Limitado pela UI do produto |

**Quando migrar:** Se precisar de heatmaps, session replay avançado, ou A/B testing nativo, PostHog é o upgrade natural. A tabela `analytics_events` é compatível com export para qualquer ferramenta.

---

## 2. Componentes Implementados

### 2.1 Tabela `analytics_events`

**Localização:** `supabase/migrations/013_analytics_events.sql`

| Coluna | Tipo | Regra |
|--------|------|-------|
| `id` | UUID | PK auto-gerado |
| `event_name` | TEXT | Obrigatório, validado contra allowlist |
| `user_id` | UUID | FK → auth.users, nullable (visitantes anônimos) |
| `anonymous_id` | TEXT | UUID gerado no browser, persistido em localStorage |
| `properties` | JSONB | Dados específicos do evento, schema livre |
| `page_path` | TEXT | Pathname do evento (ex: `/`, `/app/dashboard`) |
| `referrer` | TEXT | document.referrer do browser |
| `user_agent` | TEXT | User-Agent header |
| `ip_hash` | TEXT | SHA-256(IP + data_do_dia), rotação diária, LGPD-safe |
| `created_at` | TIMESTAMPTZ | Timestamp do servidor |

**RLS:**
- SELECT: apenas admins (`is_admin = true`)
- INSERT: apenas via `service_role` key (API route e server tracker)
- UPDATE/DELETE: bloqueado (eventos são imutáveis — append-only)

**Índices:**
- `event_name` — filtrar por tipo de evento
- `user_id` — análise por usuário
- `created_at` — range queries temporais
- `(event_name, created_at)` — funil queries
- `(user_id, event_name)` — feature usage por usuário

### 2.2 API Route `/api/track`

**Localização:** `app/api/track/route.ts`

**Contrato:**
```typescript
POST /api/track
Content-Type: application/json

{
  event_name: string,      // obrigatório, deve estar na allowlist
  properties?: object,     // dados do evento
  page_path?: string,      // pathname
  referrer?: string,       // referrer
  anonymous_id?: string    // UUID do browser
}

// Response
200 { ok: true }
400 { error: "unknown_event" | "invalid_json" }
429 { error: "rate_limited" }
```

**Regras de negócio:**
1. **Allowlist**: apenas eventos conhecidos são aceitos (previne garbage data)
2. **Rate limit**: 60 eventos/min por IP (in-process map, cleanup a cada 60s)
3. **Auth opcional**: se o usuário está logado, extrai `user_id` da session Supabase
4. **IP hash**: SHA-256(IP + data), rotação diária — nunca armazena IP puro
5. **Fire-and-forget**: responde 200 mesmo se insert falhar (tracking não bloqueia UX)

### 2.3 Client Tracker — `trackEvent()` e `useTrack()`

**Localização:** `lib/analytics/track.ts`

**Regras de negócio:**
1. **sendBeacon primeiro**: usa `navigator.sendBeacon` (non-blocking, survives page unload). Fallback para `fetch({ keepalive: true })`
2. **Anonymous ID**: `crypto.randomUUID()` persistido em `localStorage` (key: `taverna_anon_id`). Sobrevive entre sessões do browser
3. **Do Not Track**: se `navigator.doNotTrack === '1'`, não emite nada (respeita privacidade)
4. **Silent failure**: try/catch em tudo — tracking nunca quebra o app
5. **Auto-enrichment**: inclui `page_path` e `referrer` automaticamente
6. **SSR-safe**: no-op se `typeof window === "undefined"`

### 2.4 Server Tracker — `trackServerEvent()`

**Localização:** `lib/analytics/track-server.ts`

**Regras de negócio:**
1. **Fire-and-forget**: usa `void supabaseAdmin.from(...).insert(...)` — não bloqueia response
2. **Lazy init**: Supabase client inicializado sob demanda (evita crash em build time)
3. **IP hash**: mesmo padrão do API route (SHA-256 + salt diário)
4. **Error logging**: log de erro no console, não propaga exception

### 2.5 Page View Tracker

**Localização:** `components/analytics/PageViewTracker.tsx`

**Regras de negócio:**
1. **Auto-tracking**: emite `page:view` em cada navegação SPA (via `usePathname()`)
2. **Deduplicação**: não emite dois `page:view` para mesma path em sequência
3. **UTM capture**: captura `utm_source`, `utm_medium`, `utm_campaign` do search params
4. **Exclusões**: não rastreia rotas `/api/` ou `/admin`
5. **Suspense**: wrapped em `<Suspense>` no layout (useSearchParams requer)

### 2.6 Landing Page Tracker

**Localização:** `components/analytics/LandingPageTracker.tsx`

**Regras de negócio:**
1. **Section views**: IntersectionObserver com threshold 0.3 — emite `lp:section_view` quando 30% da seção é visível. **Uma vez por sessão** (Set de tracking)
2. **Scroll depth**: emite `page:scroll_depth` nos quartis 25/50/75/100. **Uma vez por quartil** por sessão
3. **CTA clicks**: event delegation no `document` — detecta cliques em `<a>` com href `/try`, `/auth/sign-up`, `/auth/login`, `/pricing`
4. **Zero peso**: usa apenas APIs nativas (IntersectionObserver, scroll event passive)

---

## 3. Catálogo de Eventos — Regras por Evento

### Eventos de Navegação

| Evento | Quem emite | Quando | Regra de deduplicação |
|--------|-----------|--------|----------------------|
| `page:view` | PageViewTracker (auto) | Cada navegação SPA | Não emite se `path === lastPath` |
| `page:scroll_depth` | LPTracker | Scroll atinge quartil | Uma vez por quartil por sessão |
| `lp:section_view` | LPTracker | Seção 30% visível | Uma vez por seção por sessão |
| `lp:cta_click` | LPTracker | Click em CTA da LP | Sem dedup (cada click conta) |

### Eventos de Auth

| Evento | Quem emite | Quando | Dados |
|--------|-----------|--------|-------|
| `auth:signup_start` | SignUpForm (client) | Form submitted (antes do Supabase) | Nenhum (sem PII) |
| `auth:signup_complete` | Futuro: DB trigger | User criado em auth.users | `user_id` |
| `auth:login` | LoginForm (client) | Login com sucesso | Nenhum (sem PII) |

**Regra: NUNCA incluir email, password, ou qualquer PII nos eventos de auth.**

### Eventos de Combat

| Evento | Quem emite | Quando | Dados |
|--------|-----------|--------|-------|
| `combat:session_created` | encounter.ts (client) | `createSessionOnly()` retorna | `session_id`, `has_campaign`, `ruleset` |
| `combat:encounter_created` | encounter.ts (client) | `createEncounterWithCombatants()` retorna | `encounter_id`, `combatant_count`, `player_count`, `monster_count` |
| `combat:started` | session.ts (client) | `persistInitiativeAndStartCombat()` completa | `encounter_id`, `combatant_count` |
| `combat:ended` | session.ts (client) | `persistEndEncounter()` chamado | `encounter_id`, `rounds_total`, `duration_seconds`, `combatants_defeated` |

**Regra sobre combat:ended:** O caller deve passar `stats` com `rounds_total`, `duration_seconds` (calculado como `Date.now() - encounter.created_at`), e `combatants_defeated` (count de `is_defeated === true`). Se não passar, o evento é emitido sem essas props.

**Eventos de alta frequência (turn, hp, condition):** Ainda NÃO instrumentados no código. Quando implementados, devem usar batching (acumular 5s, enviar em batch) para não sobrecarregar o DB.

### Eventos de Feature Usage

| Evento | Quem emite | Quando | Dados | Dedup |
|--------|-----------|--------|-------|-------|
| `oracle:search` | CommandPalette (client) | Query debounced (150ms) muda | `query_length`, `filter`, `result_count` | Uma vez por query final |
| `share:link_generated` | session-token.ts (client) | Token criado/reutilizado | `session_id` | Sem dedup |
| `player:joined` | player-registration.ts (server) | Combatant registrado | `session_id`, `token_id` | Uma vez por token (server valida) |

---

## 4. Regras de Privacidade & LGPD

1. **Sem PII**: nenhum evento contém email, nome, senha, ou dados pessoais identificáveis
2. **IP hash rotativo**: SHA-256(IP + data_do_dia) — impossível reverter, rotação diária impede correlação cross-day
3. **Anonymous ID**: UUID aleatório no browser — não vinculável a identidade real sem cruzar com auth
4. **Do Not Track**: se ativado no browser, zero tracking
5. **Dados no nosso Supabase**: não compartilhamos dados de analytics com terceiros
6. **Eventos imutáveis**: append-only, sem UPDATE/DELETE (audit trail)
7. **Retenção**: indefinida por padrão. Quando volume crescer, implementar partitioning por mês e/ou política de retenção (ex: deletar eventos > 1 ano)

---

## 5. Como Usar os Dados — Guia Prático

### 5.1 Perguntas que os dados respondem

| Pergunta | Query/Abordagem |
|----------|----------------|
| Quantos visitantes chegam na LP por dia? | `SELECT DATE(created_at), COUNT(*) FROM analytics_events WHERE event_name = 'page:view' AND page_path = '/' GROUP BY 1` |
| Qual CTA da LP converte mais? | Filtrar `lp:cta_click` por `properties->>'cta'`, correlacionar com signups |
| Onde os usuários desistem após signup? | Query de drop-off (ver analytics-funnel-strategy.md, query #6) |
| Qual feature é mais usada? | Query de feature ranking (query #3) |
| Os mestres estão voltando? | Cohort retention query (query #2) |
| Quantos jogadores cada mestre traz? | Viral coefficient query (query #5) |
| O Oracle é útil? | `oracle:search` → taxa de zero results indica gaps no conteúdo |

### 5.2 Métricas North Star

| Métrica | Definição | Target | Query |
|---------|-----------|--------|-------|
| **WAU (DMs)** | DMs únicos com session na semana | Crescer 10% w/w | `SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE event_name IN ('combat:started', 'combat:session_created') AND created_at >= NOW() - '7 days'` |
| **Viral Coefficient** | Jogadores únicos por DM | ≥ 3.0 | Query #5 |
| **Activation Rate** | % de signups que completam 1 combate em 24h | > 40% | Existente em `/api/admin/metrics` |
| **Week-2 Retention** | % de DMs com sessão entre dia 7–14 | > 25% | Existente em `/api/admin/metrics` |

### 5.3 Como adicionar novos eventos

1. **Adicionar à allowlist** em `app/api/track/route.ts` → `ALLOWED_EVENTS`
2. **Client-side:** `trackEvent("novo:evento", { prop: value })`
3. **Server-side:** `trackServerEvent("novo:evento", { userId, properties: { prop: value } })`
4. **Documentar** neste arquivo (seção 3)
5. **Testar:** verificar que o evento aparece na tabela `analytics_events`

### 5.4 Como criar dashboards

O dashboard admin (`/admin`) pode ser expandido com novas queries. Padrão:

1. Criar query SQL em `docs/analytics-funnel-strategy.md`
2. Adicionar ao endpoint `/api/admin/metrics` (ou criar `/api/admin/analytics`)
3. Renderizar no componente admin com cards/gráficos
4. Cache com `revalidate: 300` (5 min)

---

## 6. Arquitetura de Dados — Fluxos por Jornada

### Jornada do DM (Mestre)

```
Visitante (anon)                    Usuário (user_id)
─────────────────                   ─────────────────
page:view (/)                       auth:signup_complete
  │                                   │
  ├─► lp:section_view (hero)         page:view (/app/dashboard)
  ├─► lp:section_view (features)       │
  ├─► lp:section_view (comparison)     ├─► combat:session_created
  ├─► page:scroll_depth (50)           ├─► combat:encounter_created
  │                                    ├─► combat:started
  ├─► lp:cta_click (try_free)         ├─► share:link_generated
  │   └─► page:view (/try)            ├─► oracle:search (durante combate)
  │                                    ├─► combat:ended
  ├─► lp:cta_click (signup)           │
  │   └─► page:view (/auth/sign-up)   └─► Retorna semana seguinte
  │       └─► auth:signup_start           └─► page:view (/app/dashboard)
  │           └─► auth:signup_complete         (retenção!)
  │
  └─► lp:cta_click (login)
      └─► auth:login
```

### Jornada do Player (Jogador)

```
page:view (/join/[token])
  │
  └─► player:joined
      └─► (visualiza combate via realtime)
          └─► player:spell_searched (opcional)
```

### Correlação anon → user

O `anonymous_id` é gerado no browser e persiste em `localStorage`. Quando o visitante cria conta, os eventos subsequentes passam a ter `user_id` E `anonymous_id`. Para correlacionar jornada completa:

```sql
-- Vincular anon events ao user
WITH user_anon AS (
  SELECT DISTINCT user_id, anonymous_id
  FROM analytics_events
  WHERE user_id IS NOT NULL AND anonymous_id IS NOT NULL
)
SELECT e.*
FROM analytics_events e
JOIN user_anon ua ON e.anonymous_id = ua.anonymous_id
WHERE ua.user_id = '{{target_user_id}}'
ORDER BY e.created_at;
```

---

## 7. Evolução Futura

### Fase 2 — Quando Pro for lançado (Epic 13)
- Adicionar eventos: `upsell:shown`, `upsell:clicked`, `pricing:visited`, `checkout:*`, `subscription:*`
- Já estão na allowlist — basta emitir

### Fase 3 — Quando escalar
- **Partitioning**: particionar `analytics_events` por mês quando > 1M rows
- **Materialized views**: pré-computar métricas diárias para dashboard rápido
- **Export**: pipeline para exportar dados para BigQuery/Redshift se precisar de análise pesada
- **PostHog**: migrar se precisar de heatmaps, session replay, ou A/B testing

### Fase 4 — Automação
- **Alertas**: notificação se activation rate cair abaixo de threshold
- **Email de re-engajamento**: baseado em ausência de eventos por 7+ dias
- **Relatórios automáticos**: weekly digest de métricas por email
