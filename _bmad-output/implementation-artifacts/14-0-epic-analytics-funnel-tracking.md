# Epic 14: Analytics, Funil & Tracking de Comportamento

## Epic Overview

Implementar sistema completo de tracking de comportamento e funil de conversão, usando Supabase como backend de analytics (zero dependência externa). Cobre: tabela de eventos, API de tracking, instrumentação client e server-side em todos os touchpoints, dashboard admin expandido, e queries de funil prontas.

## Business Value

- **Visibilidade total do funil**: saber exatamente onde usuários convertem ou desistem
- **Decisões data-driven**: priorizar features com base em usage real, não intuição
- **Otimização de conversão**: identificar e corrigir gargalos antes de escalar
- **Validação do modelo freemium**: medir se os aha moments funcionam
- **Baseline para Pro**: ter dados de comportamento antes de lançar assinatura

## Referências

- [Analytics & Funnel Strategy](../../docs/analytics-funnel-strategy.md) — doc completo com queries SQL e catálogo de eventos
- [Monetization Strategy](../../docs/monetization-strategy.md) — funil de conversão e métricas target
- Endpoint existente: `app/api/admin/metrics/route.ts` — será expandido

## Scope

### In Scope
- Tabela `analytics_events` no Supabase
- API route `/api/track` para receber eventos client-side
- Helper server-side `trackEvent()` para eventos backend
- Hook client-side `useTrack()` para eventos frontend
- Instrumentação em: LP, auth, combat, oracle, player join, compendium, presets
- Dashboard admin expandido com funil, feature usage, cohorts
- Page view tracker automático (middleware ou layout)

### Out of Scope
- Heatmaps / session replay (Sentry já faz 1%)
- A/B testing framework
- Email de re-engajamento (será épico separado)
- Tracking de eventos Pro/subscription (será implementado no Epic 13)

---

## Story 14.1: Migration — Tabela analytics_events

**Priority**: P0 (Foundation)
**Estimate**: 2 SP

### Description

Criar migration Supabase com tabela `analytics_events`, índices, e RLS policies.

### Acceptance Criteria

- [ ] Migration `013_analytics_events.sql` criada em `supabase/migrations/`
- [ ] Tabela `analytics_events` com colunas: `id`, `event_name`, `user_id`, `anonymous_id`, `properties` (JSONB), `page_path`, `referrer`, `user_agent`, `ip_hash`, `created_at`
- [ ] Índices em: `event_name`, `user_id`, `created_at`, `(event_name, created_at)`, `(user_id, event_name)`
- [ ] RLS habilitado: admin lê, insert via service_role
- [ ] Migration roda sem erros em `supabase db push`
- [ ] Tipos TypeScript gerados/atualizados

### Technical Notes

```sql
-- Ver schema completo em docs/analytics-funnel-strategy.md
```

---

## Story 14.2: API Route — `/api/track`

**Priority**: P0 (Foundation)
**Estimate**: 3 SP

### Description

Criar endpoint que recebe eventos de tracking do client-side, valida, e insere na tabela `analytics_events` via service_role.

### Acceptance Criteria

- [ ] `app/api/track/route.ts` criado
- [ ] Aceita `POST` com body `{ event_name, properties?, page_path?, referrer?, anonymous_id? }`
- [ ] Valida `event_name` contra allowlist de eventos conhecidos (rejeita 400 se desconhecido)
- [ ] Se usuário autenticado, extrai `user_id` da session; senão, usa `anonymous_id`
- [ ] Hash do IP (SHA-256 do IP + salt diário) — nunca armazena IP puro
- [ ] Captura `user_agent` do header
- [ ] Insere via `supabaseAdmin` (service_role key)
- [ ] Rate limit: 60 eventos/minuto por IP (in-process map, mesmo padrão do oracle-ai)
- [ ] Responde 200 `{ ok: true }` sem corpo pesado (fire-and-forget do client)
- [ ] Não bloqueia se inserção falhar (log error, respond 200)
- [ ] Testes unitários com payloads válidos e inválidos

### Technical Notes

```typescript
// app/api/track/route.ts
const ALLOWED_EVENTS = new Set([
  'page:view', 'page:scroll_depth',
  'lp:section_view', 'lp:cta_click',
  'auth:signup_start',
  'combat:session_created', 'combat:encounter_created', 'combat:started',
  'combat:turn_advanced', 'combat:ended', 'combat:hp_changed', 'combat:condition_toggled',
  'oracle:search', 'oracle:result_click',
  'preset:created', 'preset:loaded',
  'share:link_generated', 'share:link_copied',
  'player:joined', 'player:spell_searched',
  'compendium:visited',
  'settings:language_changed',
  'upsell:shown', 'upsell:clicked', 'upsell:dismissed',
  'pricing:visited',
  'checkout:started', 'checkout:completed', 'checkout:canceled',
  'subscription:canceled',
])
```

---

## Story 14.3: Client Hook — `useTrack()`

**Priority**: P0 (Foundation)
**Estimate**: 2 SP

### Description

Criar hook React e helper para enviar eventos de tracking a partir do frontend. O hook envia via `navigator.sendBeacon` (non-blocking) ou fetch fallback.

### Acceptance Criteria

- [ ] `lib/analytics/track.ts` criado com:
  - `trackEvent(name, properties?)` — função standalone para uso em qualquer contexto
  - `useTrack()` hook — retorna `{ track }` com user context pré-injetado
- [ ] Usa `navigator.sendBeacon('/api/track', ...)` quando disponível (non-blocking)
- [ ] Fallback para `fetch('/api/track', { keepalive: true })` quando sendBeacon não disponível
- [ ] Gera `anonymous_id` via `crypto.randomUUID()` persistido em `localStorage` (chave: `taverna_anon_id`)
- [ ] Inclui `page_path` e `referrer` automaticamente
- [ ] Batching opcional: acumula eventos por 2s e envia em batch (reduz requests)
- [ ] Não quebra se tracking falhar (try/catch silencioso)
- [ ] Não rastreia se `navigator.doNotTrack === '1'` (respeita DNT)
- [ ] Testes unitários

### Technical Notes

```typescript
// lib/analytics/track.ts
export function trackEvent(name: string, properties?: Record<string, unknown>) {
  const payload = {
    event_name: name,
    properties,
    page_path: window.location.pathname,
    referrer: document.referrer,
    anonymous_id: getOrCreateAnonId(),
  }

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/track', JSON.stringify(payload))
  } else {
    fetch('/api/track', {
      method: 'POST',
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {}) // fire-and-forget
  }
}

export function useTrack() {
  return { track: trackEvent }
}
```

---

## Story 14.4: Server-Side Tracker — `trackServerEvent()`

**Priority**: P0 (Foundation)
**Estimate**: 1 SP

### Description

Criar helper server-side para emitir eventos de tracking a partir de API routes e server actions, sem passar pelo endpoint HTTP.

### Acceptance Criteria

- [ ] `lib/analytics/track-server.ts` criado
- [ ] `trackServerEvent(name, { userId?, properties?, ipHash? })` — insere diretamente na tabela via `supabaseAdmin`
- [ ] Não bloqueia a response — usa `void supabaseAdmin.from(...).insert(...)` sem await na resposta (fire-and-forget)
- [ ] Opcional: pode receber `Request` object para extrair IP hash e user_agent
- [ ] Reusa mesma instância `supabaseAdmin` (singleton)
- [ ] Testes unitários

### Technical Notes

```typescript
// lib/analytics/track-server.ts
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export function trackServerEvent(
  name: string,
  opts: { userId?: string; properties?: Record<string, unknown>; req?: Request }
) {
  const ipHash = opts.req
    ? createHash('sha256')
        .update((opts.req.headers.get('x-forwarded-for') ?? 'unknown') + dailySalt())
        .digest('hex').slice(0, 16)
    : undefined

  // fire-and-forget — não bloqueia response
  void supabaseAdmin.from('analytics_events').insert({
    event_name: name,
    user_id: opts.userId,
    properties: opts.properties ?? {},
    ip_hash: ipHash,
    user_agent: opts.req?.headers.get('user-agent'),
  })
}
```

---

## Story 14.5: Page View Tracker Automático

**Priority**: P1 (Core)
**Estimate**: 2 SP

### Description

Instrumentar page views automáticas em todas as rotas do app, sem precisar adicionar código em cada página individualmente.

### Acceptance Criteria

- [ ] `components/analytics/PageViewTracker.tsx` criado — client component que emite `page:view` em cada navegação
- [ ] Usa `usePathname()` do Next.js para detectar mudanças de rota (SPA navigation)
- [ ] Emite `page:view` com: `path`, `referrer`, UTM params (`utm_source`, `utm_medium`, `utm_campaign`) do search params
- [ ] Componente adicionado ao `app/layout.tsx` (root layout) — cobre todas as páginas
- [ ] Deduplica: não emite dois `page:view` para mesma path em sequência (debounce 500ms)
- [ ] Não emite para rotas de API ou admin
- [ ] Testes

---

## Story 14.6: Instrumentação — Landing Page

**Priority**: P1 (Core)
**Estimate**: 2 SP

### Description

Instrumentar todos os touchpoints da landing page: section views (via IntersectionObserver), CTA clicks, e scroll depth.

### Acceptance Criteria

- [ ] **Section views**: cada section da LP (hero, features, how-it-works, comparison, cta) emite `lp:section_view` quando entra no viewport (IntersectionObserver, threshold 0.3, emite uma vez por sessão)
- [ ] **CTA clicks**: todos os CTAs emitem `lp:cta_click` com `{ cta: 'try_free' | 'signup' | 'login' | 'pricing' }`
- [ ] **Scroll depth**: emite `page:scroll_depth` a cada quartil (25/50/75/100), uma vez por sessão
- [ ] Não adiciona peso perceptível — IntersectionObserver é nativo, sem lib
- [ ] Não impacta performance da LP (lazy, non-blocking)

### Technical Notes

```typescript
// Hook para section tracking
function useSectionTracker(ref: RefObject<HTMLElement>, section: string) {
  const tracked = useRef(false)
  useEffect(() => {
    if (!ref.current || tracked.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !tracked.current) {
        tracked.current = true
        trackEvent('lp:section_view', { section })
      }
    }, { threshold: 0.3 })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
}
```

---

## Story 14.7: Instrumentação — Auth Flow

**Priority**: P1 (Core)
**Estimate**: 1 SP

### Description

Instrumentar signup start, signup complete (via DB trigger), e login.

### Acceptance Criteria

- [ ] **Signup start**: emite `auth:signup_start` quando form de signup é submitted (client-side)
- [ ] **Signup complete**: trigger SQL que insere evento `auth:signup_complete` quando novo user é criado em `auth.users` (server-side, mesmo trigger que cria row em `users`)
- [ ] **Login**: emite `auth:login` após `signInWithPassword` com sucesso (client-side)
- [ ] Não emite dados sensíveis (sem password, sem email completo)

### Technical Notes

O trigger de signup é o mesmo `handle_new_user` existente — adicionar INSERT na `analytics_events` no mesmo trigger.

---

## Story 14.8: Instrumentação — Combat Flow

**Priority**: P0 (Core)
**Estimate**: 3 SP

### Description

Instrumentar todo o fluxo de combate: criação de sessão, encounter, start, turn advance, HP changes, conditions, e combat end.

### Acceptance Criteria

- [ ] `combat:session_created` — emitido em `createSessionOnly()` ou equivalente (server-side via `trackServerEvent`)
- [ ] `combat:encounter_created` — emitido em `createEncounterWithCombatants()` com count de combatants, players, monsters
- [ ] `combat:started` — emitido em `persistInitiativeAndStartCombat()` com combatant count
- [ ] `combat:turn_advanced` — emitido a cada avanço de turno com round e turn_index (client-side, batched)
- [ ] `combat:hp_changed` — emitido a cada mudança de HP com `change_type` (damage/heal/temp) e `combatant_type` (player/monster) — sem identificar o combatant (privacidade)
- [ ] `combat:condition_toggled` — emitido a cada toggle com `condition_name` e `action` (add/remove)
- [ ] `combat:ended` — emitido ao encerrar combate com `rounds_total`, `duration_seconds` (calculado a partir do created_at do encounter), `combatants_defeated`
- [ ] Eventos de alta frequência (turn, hp, condition) são batched (acumula 5s, envia em batch)
- [ ] Não degrada performance do combat tracker

---

## Story 14.9: Instrumentação — Oracle, Presets, Share, Player

**Priority**: P1 (Feature Usage)
**Estimate**: 3 SP

### Description

Instrumentar feature usage em: Command Palette (Oracle), presets, share link, player join, compendium.

### Acceptance Criteria

- [ ] **Oracle search**: `oracle:search` emitido em cada busca (debounced — 1 evento por query final, não por keystroke) com `query_length`, `filter`, `result_count`
- [ ] **Oracle result click**: `oracle:result_click` com `type` e `entity_name`
- [ ] **Preset created**: `preset:created` com `monster_count` (server-side)
- [ ] **Preset loaded**: `preset:loaded` com `preset_id` (client-side)
- [ ] **Share link generated**: `share:link_generated` com `session_id` (server-side, em `createSessionToken`)
- [ ] **Share link copied**: `share:link_copied` (client-side, no click do botão copy)
- [ ] **Player joined**: `player:joined` com `session_id` e `anon_user_id` (server-side, em `registerPlayerCombatant`)
- [ ] **Player spell search**: `player:spell_searched` (client-side)
- [ ] **Compendium visited**: `compendium:visited` (via page:view — sem instrumentação extra)

---

## Story 14.10: Dashboard Admin — Funil & Métricas Expandidas

**Priority**: P1 (Visibility)
**Estimate**: 5 SP

### Description

Expandir o dashboard admin com visualização de funil, feature usage, retenção por cohort, e métricas de combate.

### Acceptance Criteria

- [ ] Endpoint `/api/admin/metrics` expandido com novas queries (ou novo endpoint `/api/admin/analytics`)
- [ ] **Painel de Funil**: LP visits → CTA clicks → Signups → Activated → Retained
  - Barras horizontais com % de conversão entre cada etapa
  - Filtro por período (7d, 30d, 90d)
- [ ] **Feature Usage**: ranking de features mais usadas (tabela com event_name, unique_users, total_events)
- [ ] **Engajamento de Combate**: avg rounds, avg duration, avg combatants (cards com números)
- [ ] **Viral Coefficient**: avg players per DM, total players (card)
- [ ] **DAU/WAU/MAU + Stickiness**: cards com números e DAU/MAU ratio
- [ ] **Drop-off Analysis**: onde signups param (barra empilhada: sem campanha / sem session / sem combat / sem player)
- [ ] UI segue design system existente (dark, gold accents)
- [ ] Responsive
- [ ] Dados cacheados com `revalidate: 300` (5 min) para não sobrecarregar DB

### Technical Notes

As queries SQL estão prontas em `docs/analytics-funnel-strategy.md`. O endpoint deve executá-las via `supabaseAdmin` com raw SQL ou queries compostas.

---

## Story Dependency Map

```
14.1 (DB Migration)
  └→ 14.2 (API /track)
  └→ 14.4 (Server tracker)
       └→ 14.7 (Auth instrumentation)
       └→ 14.8 (Combat instrumentation)
       └→ 14.9 (Feature instrumentation) — partial
  └→ 14.3 (Client hook)
       └→ 14.5 (Page view tracker)
       └→ 14.6 (LP instrumentation)
       └→ 14.8 (Combat instrumentation) — partial
       └→ 14.9 (Feature instrumentation) — partial
  └→ 14.10 (Admin dashboard)
```

**Recommended Implementation Order**:
14.1 → 14.2 + 14.4 (parallel) → 14.3 → 14.5 → 14.6 + 14.7 + 14.8 + 14.9 (parallel) → 14.10

---

## Story Summary

| # | Story | Priority | SP | Fase |
|---|-------|----------|----|------|
| 14.1 | DB migration — analytics_events | P0 | 2 | Foundation |
| 14.2 | API route — /api/track | P0 | 3 | Foundation |
| 14.3 | Client hook — useTrack | P0 | 2 | Foundation |
| 14.4 | Server tracker — trackServerEvent | P0 | 1 | Foundation |
| 14.5 | Page view tracker automático | P1 | 2 | Core |
| 14.6 | Instrumentação LP | P1 | 2 | Core |
| 14.7 | Instrumentação Auth | P1 | 1 | Core |
| 14.8 | Instrumentação Combat | P0 | 3 | Core |
| 14.9 | Instrumentação Oracle/Presets/Share/Player | P1 | 3 | Feature |
| 14.10 | Dashboard admin expandido | P1 | 5 | Visibility |
| | **Total** | | **24 SP** | |

---

## Definition of Done

- Tabela `analytics_events` criada e funcional
- `/api/track` recebe e persiste eventos com rate limiting
- `useTrack()` e `trackServerEvent()` disponíveis e testados
- Page views trackeadas automaticamente em todas as rotas
- LP instrumentada (sections, CTAs, scroll)
- Auth flow instrumentado (signup start/complete, login)
- Combat flow instrumentado (session → encounter → combat → end)
- Feature usage instrumentado (oracle, presets, share, player)
- Dashboard admin mostra funil, feature usage, engagement, viral coeff
- Nenhuma regressão em features existentes
- Performance: tracking não impacta LCP/TTI da LP
- Privacidade: IP hasheado, DNT respeitado, sem dados sensíveis
- Todos os testes passam (`npm test`)
