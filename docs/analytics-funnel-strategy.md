# Estratégia de Analytics & Mapeamento de Funil

**Autor:** Dani_
**Data:** 2026-03-26
**Status:** Aprovado para implementação

---

## Estado Atual

Hoje temos:
- **Vercel Analytics** — Web Vitals apenas (LCP, CLS, FID)
- **Sentry** — Error tracking + 1% session replay
- **1 endpoint admin** (`/api/admin/metrics`) — 5 métricas agregadas (total users, registros 7/30d, day-1 activation, week-2 retention, avg players/DM)

**O que falta:** zero tracking de comportamento de usuário, zero funil, zero feature usage, zero cohort analysis.

---

## Decisão de Stack: Tracking Server-Side via Supabase

Em vez de adicionar PostHog/Mixpanel/Amplitude (SDKs pesados, complexidade de setup, custos crescentes), vamos usar o que já temos:

- **Tabela `analytics_events`** no Supabase — event sourcing leve
- **API route** `/api/track` — recebe eventos do client
- **SQL queries** contra dados existentes + tabela de eventos
- **Dashboard admin** expandido com as novas métricas

**Vantagens:** zero dependência nova, dados no mesmo banco, sem custo adicional, LGPD-friendly (dados ficam no nosso Supabase), queries SQL diretas.

**Limitações aceitas:** sem heatmaps, sem session replay avançado (Sentry já faz 1%), sem A/B testing nativo. Se precisar disso no futuro, PostHog é o upgrade natural.

---

## Mapeamento do Funil Completo

### Funil de Aquisição (Visitante → Usuário)

```
┌─────────────────────────────────────────────────────┐
│ 1. DESCOBERTA                                       │
│    LP pageview → Scroll depth → Section views       │
├─────────────────────────────────────────────────────┤
│ 2. INTERESSE                                        │
│    CTA click ("Testar Grátis" / "Criar Conta")      │
├─────────────────────────────────────────────────────┤
│ 3. ATIVAÇÃO GUEST                                   │
│    /try pageview → Encounter setup → Combat start   │
├─────────────────────────────────────────────────────┤
│ 4. REGISTRO                                         │
│    Sign-up start → Sign-up complete → Email confirm  │
├─────────────────────────────────────────────────────┤
│ 5. ATIVAÇÃO (Day-1)                                 │
│    First login → Create campaign → Create session   │
│    → Add combatants → Start combat → Share link     │
├─────────────────────────────────────────────────────┤
│ 6. AHA MOMENT                                       │
│    First combat completed → First player joined     │
├─────────────────────────────────────────────────────┤
│ 7. RETENÇÃO                                         │
│    Return visit (day 3) → Second session (week 1)   │
│    → Weekly active (week 2+)                        │
├─────────────────────────────────────────────────────┤
│ 8. CONVERSÃO (quando Pro existir)                   │
│    Upsell shown → Pricing visit → Checkout start    │
│    → Checkout complete → Pro activated              │
├─────────────────────────────────────────────────────┤
│ 9. EXPANSÃO                                         │
│    Player invite sent → Player joined → Viral coeff │
└─────────────────────────────────────────────────────┘
```

### Funil do Jogador (Player)

```
Link recebido → /join/[token] pageview → Registration form
  → Combatant registered → Combat viewed → Spell searched
  → Return visit (next session)
```

---

## Catálogo de Eventos

### Convenções
- Formato: `category:action` (snake_case)
- Propriedades: sempre incluem `timestamp`, `user_id` (nullable para anon), `session_id` (browser)
- Eventos server-side: gerados no backend, confiáveis
- Eventos client-side: gerados no frontend via `/api/track`, validados

### Eventos de Navegação (Client-side)

| Evento | Propriedades | Onde |
|--------|-------------|------|
| `page:view` | `path`, `referrer`, `utm_source`, `utm_medium`, `utm_campaign` | Todas as páginas |
| `page:scroll_depth` | `path`, `depth` (25/50/75/100) | LP apenas |
| `lp:section_view` | `section` (hero/features/how-it-works/comparison/cta) | LP |
| `lp:cta_click` | `cta` (try_free/signup/login/pricing) | LP |

### Eventos de Auth (Server-side)

| Evento | Propriedades | Onde |
|--------|-------------|------|
| `auth:signup_start` | `method` (email) | Sign-up page |
| `auth:signup_complete` | `user_id` | Trigger DB |
| `auth:login` | `user_id` | Login API |
| `auth:logout` | `user_id` | Logout action |

### Eventos de Combate (Server-side)

| Evento | Propriedades | Onde |
|--------|-------------|------|
| `combat:session_created` | `user_id`, `session_id`, `campaign_id`, `ruleset` | Session creation |
| `combat:encounter_created` | `user_id`, `encounter_id`, `combatant_count`, `player_count`, `monster_count` | Encounter creation |
| `combat:started` | `user_id`, `encounter_id`, `combatant_count` | Combat start |
| `combat:turn_advanced` | `encounter_id`, `round`, `turn_index` | Turn advance |
| `combat:ended` | `encounter_id`, `rounds_total`, `duration_seconds`, `combatants_defeated` | Combat end |
| `combat:hp_changed` | `encounter_id`, `combatant_type` (player/monster), `change_type` (damage/heal/temp) | HP action |
| `combat:condition_toggled` | `encounter_id`, `condition_name`, `action` (add/remove) | Condition toggle |

### Eventos de Feature Usage (Mix)

| Evento | Propriedades | Onde |
|--------|-------------|------|
| `oracle:search` | `query_length`, `filter` (monster/spell/condition/all), `result_count` | Command palette |
| `oracle:result_click` | `type` (monster/spell/condition), `entity_name` | Command palette |
| `preset:created` | `user_id`, `monster_count` | Presets page |
| `preset:loaded` | `user_id`, `preset_id` | Encounter setup |
| `share:link_generated` | `session_id` | Share button |
| `share:link_copied` | `session_id` | Copy button |
| `player:joined` | `session_id`, `token_id`, `anon_user_id` | Player join |
| `player:spell_searched` | `query` | Player view |
| `compendium:visited` | `user_id` | Compendium page |
| `settings:language_changed` | `from`, `to` | Settings |

### Eventos de Conversão (quando Pro existir)

| Evento | Propriedades | Onde |
|--------|-------------|------|
| `upsell:shown` | `type` (combat_end/save/return/export/multi_combat), `user_id` | Upsell components |
| `upsell:clicked` | `type`, `user_id` | Upsell CTA |
| `upsell:dismissed` | `type`, `user_id` | Dismiss button |
| `pricing:visited` | `user_id`, `source` (navbar/upsell/lp/settings) | Pricing page |
| `checkout:started` | `user_id`, `plan` (monthly/yearly) | Checkout API |
| `checkout:completed` | `user_id`, `plan`, `amount` | Stripe webhook |
| `checkout:canceled` | `user_id` | Checkout redirect |
| `subscription:canceled` | `user_id`, `tenure_days` | Stripe webhook |

---

## Schema: Tabela analytics_events

```sql
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT,              -- browser fingerprint para visitantes
  properties JSONB DEFAULT '{}',  -- dados específicos do evento
  page_path TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,                   -- hash do IP (não IP puro — LGPD)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para queries performáticas
CREATE INDEX idx_events_name ON analytics_events(event_name);
CREATE INDEX idx_events_user ON analytics_events(user_id);
CREATE INDEX idx_events_created ON analytics_events(created_at);
CREATE INDEX idx_events_name_created ON analytics_events(event_name, created_at);
CREATE INDEX idx_events_user_name ON analytics_events(user_id, event_name);

-- Partitioning (se volume crescer — pra depois)
-- Começar simples, particionar por mês quando passar de 1M rows

-- RLS: apenas admin lê, service_role escreve
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read events"
  ON public.analytics_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Service role inserts events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);
  -- INSERT via service_role key no API route, não via client
```

---

## Queries SQL Prontas

### 1. Funil LP → Signup → Ativação

```sql
-- Funil completo: LP visit → CTA click → Signup → First session
WITH funnel AS (
  SELECT
    COUNT(DISTINCT CASE WHEN event_name = 'page:view' AND page_path = '/' THEN anonymous_id END) AS lp_visitors,
    COUNT(DISTINCT CASE WHEN event_name = 'lp:cta_click' THEN anonymous_id END) AS cta_clicks,
    COUNT(DISTINCT CASE WHEN event_name = 'auth:signup_complete' THEN user_id END) AS signups,
    COUNT(DISTINCT CASE WHEN event_name = 'combat:session_created' THEN user_id END) AS activated
  FROM analytics_events
  WHERE created_at >= NOW() - INTERVAL '30 days'
)
SELECT
  lp_visitors,
  cta_clicks,
  ROUND(cta_clicks::numeric / NULLIF(lp_visitors, 0) * 100, 1) AS cta_rate_pct,
  signups,
  ROUND(signups::numeric / NULLIF(cta_clicks, 0) * 100, 1) AS signup_rate_pct,
  activated,
  ROUND(activated::numeric / NULLIF(signups, 0) * 100, 1) AS activation_rate_pct
FROM funnel;
```

### 2. Retenção por Cohort (Semana)

```sql
-- Cohort retention: % de usuários que voltaram por semana
WITH cohorts AS (
  SELECT
    u.id AS user_id,
    DATE_TRUNC('week', u.created_at) AS cohort_week
  FROM users u
),
activity AS (
  SELECT
    s.owner_id AS user_id,
    DATE_TRUNC('week', s.created_at) AS activity_week
  FROM sessions s
)
SELECT
  c.cohort_week,
  COUNT(DISTINCT c.user_id) AS cohort_size,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week THEN c.user_id END) AS week_0,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '1 week' THEN c.user_id END) AS week_1,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '2 weeks' THEN c.user_id END) AS week_2,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '3 weeks' THEN c.user_id END) AS week_3,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '4 weeks' THEN c.user_id END) AS week_4
FROM cohorts c
LEFT JOIN activity a ON c.user_id = a.user_id
GROUP BY c.cohort_week
ORDER BY c.cohort_week DESC;
```

### 3. Feature Usage Ranking

```sql
-- Top features por uso nos últimos 30 dias
SELECT
  event_name,
  COUNT(*) AS total_events,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT DATE_TRUNC('day', created_at)) AS active_days
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND event_name NOT LIKE 'page:%'
GROUP BY event_name
ORDER BY unique_users DESC;
```

### 4. Engajamento de Combate

```sql
-- Métricas de combate: duração, rounds, combatants
SELECT
  DATE_TRUNC('week', created_at) AS week,
  COUNT(*) AS combats_started,
  AVG((properties->>'rounds_total')::int) AS avg_rounds,
  AVG((properties->>'duration_seconds')::int / 60.0) AS avg_duration_min,
  AVG((properties->>'combatant_count')::int) AS avg_combatants,
  AVG((properties->>'combatants_defeated')::int) AS avg_defeated
FROM analytics_events
WHERE event_name = 'combat:ended'
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY week
ORDER BY week DESC;
```

### 5. Viral Coefficient

```sql
-- Coeficiente viral: quantos jogadores únicos por DM
WITH dm_players AS (
  SELECT
    s.owner_id AS dm_id,
    COUNT(DISTINCT st.anon_user_id) AS unique_players
  FROM sessions s
  JOIN session_tokens st ON st.session_id = s.id
  WHERE st.anon_user_id IS NOT NULL
    AND s.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY s.owner_id
)
SELECT
  COUNT(*) AS active_dms,
  SUM(unique_players) AS total_players,
  ROUND(AVG(unique_players), 1) AS avg_players_per_dm,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY unique_players) AS median_players
FROM dm_players;
```

### 6. Onde Usuários Desistem (Drop-off)

```sql
-- Funil de ativação: onde os signups param
WITH user_actions AS (
  SELECT
    u.id AS user_id,
    u.created_at AS signup_at,
    EXISTS(SELECT 1 FROM campaigns c WHERE c.owner_id = u.id) AS has_campaign,
    EXISTS(SELECT 1 FROM sessions s WHERE s.owner_id = u.id) AS has_session,
    EXISTS(SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE s.owner_id = u.id AND e.is_active = false AND e.round_number > 1
    ) AS has_completed_combat,
    EXISTS(SELECT 1 FROM session_tokens st
      JOIN sessions s ON s.id = st.session_id
      WHERE s.owner_id = u.id AND st.anon_user_id IS NOT NULL
    ) AS has_player_joined
  FROM users u
  WHERE u.created_at >= NOW() - INTERVAL '30 days'
)
SELECT
  COUNT(*) AS total_signups,
  COUNT(*) FILTER (WHERE has_campaign) AS created_campaign,
  COUNT(*) FILTER (WHERE has_session) AS created_session,
  COUNT(*) FILTER (WHERE has_completed_combat) AS completed_combat,
  COUNT(*) FILTER (WHERE has_player_joined) AS had_player_join,
  -- Drop-off rates
  ROUND(100.0 - (COUNT(*) FILTER (WHERE has_campaign)::numeric / COUNT(*) * 100), 1) AS drop_before_campaign_pct,
  ROUND(100.0 - (COUNT(*) FILTER (WHERE has_session)::numeric / NULLIF(COUNT(*) FILTER (WHERE has_campaign), 0) * 100), 1) AS drop_before_session_pct,
  ROUND(100.0 - (COUNT(*) FILTER (WHERE has_completed_combat)::numeric / NULLIF(COUNT(*) FILTER (WHERE has_session), 0) * 100), 1) AS drop_before_combat_pct
FROM user_actions;
```

### 7. Oracle Usage Patterns

```sql
-- O que mestres mais buscam no Oracle
SELECT
  properties->>'filter' AS search_type,
  COUNT(*) AS searches,
  AVG((properties->>'result_count')::int) AS avg_results,
  COUNT(*) FILTER (WHERE (properties->>'result_count')::int = 0) AS zero_results
FROM analytics_events
WHERE event_name = 'oracle:search'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY search_type
ORDER BY searches DESC;
```

### 8. Player Journey

```sql
-- Jornada do jogador: join → view → return
SELECT
  COUNT(DISTINCT CASE WHEN event_name = 'page:view' AND page_path LIKE '/join/%' THEN anonymous_id END) AS join_page_views,
  COUNT(DISTINCT CASE WHEN event_name = 'player:joined' THEN properties->>'anon_user_id' END) AS players_registered,
  COUNT(DISTINCT CASE WHEN event_name = 'player:spell_searched' THEN anonymous_id END) AS players_searched_spells
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days';
```

### 9. Conversão Pro (quando implementado)

```sql
-- Funil de conversão Pro
WITH conversion_funnel AS (
  SELECT
    COUNT(DISTINCT CASE WHEN event_name = 'upsell:shown' THEN user_id END) AS upsell_shown,
    COUNT(DISTINCT CASE WHEN event_name = 'upsell:clicked' THEN user_id END) AS upsell_clicked,
    COUNT(DISTINCT CASE WHEN event_name = 'pricing:visited' THEN user_id END) AS pricing_visited,
    COUNT(DISTINCT CASE WHEN event_name = 'checkout:started' THEN user_id END) AS checkout_started,
    COUNT(DISTINCT CASE WHEN event_name = 'checkout:completed' THEN user_id END) AS checkout_completed
  FROM analytics_events
  WHERE created_at >= NOW() - INTERVAL '30 days'
)
SELECT *,
  ROUND(upsell_clicked::numeric / NULLIF(upsell_shown, 0) * 100, 1) AS upsell_ctr_pct,
  ROUND(checkout_completed::numeric / NULLIF(checkout_started, 0) * 100, 1) AS checkout_completion_pct,
  ROUND(checkout_completed::numeric / NULLIF(upsell_shown, 0) * 100, 1) AS overall_conversion_pct
FROM conversion_funnel;
```

### 10. Daily Active Users (DAU/WAU/MAU)

```sql
-- DAU, WAU, MAU
SELECT
  (SELECT COUNT(DISTINCT user_id) FROM analytics_events
   WHERE created_at >= NOW() - INTERVAL '1 day' AND user_id IS NOT NULL) AS dau,
  (SELECT COUNT(DISTINCT user_id) FROM analytics_events
   WHERE created_at >= NOW() - INTERVAL '7 days' AND user_id IS NOT NULL) AS wau,
  (SELECT COUNT(DISTINCT user_id) FROM analytics_events
   WHERE created_at >= NOW() - INTERVAL '30 days' AND user_id IS NOT NULL) AS mau,
  -- DAU/MAU ratio (stickiness)
  ROUND(
    (SELECT COUNT(DISTINCT user_id)::numeric FROM analytics_events
     WHERE created_at >= NOW() - INTERVAL '1 day' AND user_id IS NOT NULL)
    / NULLIF(
      (SELECT COUNT(DISTINCT user_id) FROM analytics_events
       WHERE created_at >= NOW() - INTERVAL '30 days' AND user_id IS NOT NULL), 0)
    * 100, 1
  ) AS stickiness_pct;
```

---

## Gargalos Esperados & O Que Monitorar

| Gargalo | Indicador | Ação |
|---------|-----------|------|
| LP não converte | CTA click rate < 5% | Testar copy/posição dos CTAs |
| Signup abandono | Signup start vs complete < 70% | Simplificar form, verificar email flow |
| Não cria campanha | Signup → Campaign < 60% | Melhorar onboarding |
| Não completa combate | Session → Combat end < 50% | UX do combat tracker |
| Sem jogadores | Share rate < 30% | Tornar share mais proeminente |
| Sem retorno D7 | Week-1 retention < 25% | Email de re-engajamento |
| Upsell ignorado | Upsell CTR < 3% | Testar momento/copy do nudge |
