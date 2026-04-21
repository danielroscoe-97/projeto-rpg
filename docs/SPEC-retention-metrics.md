# SPEC — Retention Metrics Instrumentation

> **Status:** Pronto para implementação
> **Origem:** [docs/ROADMAP-pos-linguagem-ubiqua.md](ROADMAP-pos-linguagem-ubiqua.md) §2 — Gap #1 (Métricas primárias não instrumentadas bloqueiam critério de launch)
> **Princípio:** "Retenção > Novidade" (§1 do ROADMAP)
> **Data:** 2026-04-21
> **Dono sugerido:** PM + Dev (via §4 do ROADMAP)

---

## 1. Objetivo estratégico

O projeto atravessa a transição "beta test 3 concluído → launch de nova frente" sem baseline documentado de retenção. Hoje medimos **atividade bruta** (signups, top events, funnel) via [components/admin/MetricsDashboard.tsx](../components/admin/MetricsDashboard.tsx) + RPCs de [supabase/migrations/102_admin_metrics_rpc.sql](../supabase/migrations/102_admin_metrics_rpc.sql) e [127_admin_analytics_rpcs.sql](../supabase/migrations/127_admin_analytics_rpcs.sql). Isso responde *"quanta gente entrou hoje?"*, mas **não** *"a gente que entrou volta em 7 dias?"* — que é a pergunta que define se o produto tem fit.

**Premissa central do ROADMAP (§1):** toda onda prioriza "mestre/jogador volta ao app" antes de "nova feature wow". Sem instrumentação de retenção, qualquer decisão pós-launch sobre onde investir (Entity Graph? Player HQ? Auto-invite?) vira chute.

Este spec fecha Gap #1: define exatamente **quais queries rodar**, **onde**, **com que frequência**, e **como interpretar**. Não é um redesign do dashboard existente — é o complemento que falta para declarar "pronto para launch" por §2.3 do ROADMAP.

**Escopo:** apenas medição (querying + visualização). Não muda regras de negócio, combat flow, nem schema de usuário. Usa o máximo possível do que já existe (tabela `analytics_events`, tabela `analytics_daily`, padrão RPC admin).

---

## 2. Métricas primárias (retenção)

Conforme §2.1 do ROADMAP. Cada métrica abaixo é executável: tem **definição operacional**, **SQL query** contra o schema atual ([supabase/migrations/](../supabase/migrations/)), **janela**, **normalização** e **edge cases** tratados.

### 2.1 DM Return Rate 7d — target ≥40%

**Definição operacional.** Dado um DM que criou sua primeira campanha na semana S, ele "retornou" se em qualquer momento entre o dia D+1 e D+7 após a criação ele produziu **pelo menos um evento de produção** (criou sessão/encounter, editou NPC/nota, iniciou combate, ou gerou evento `combat:started`/`session:created` em `analytics_events`).

**Unidade de normalização:** DMs elegíveis = usuários com `campaigns.owner_id = user.id` cuja **primeira** campanha foi criada ≥ 7 dias atrás. Excluímos usuários criados há < 7 dias (ainda não tiveram janela completa de observação).

**Janela:** rolling 30 dias — ou seja, coortes das últimas 4 semanas agregadas, ponderadas por tamanho. Relatório separado por coorte semanal para ver tendência.

**Query (baseline):**

```sql
-- DM Return Rate 7d (agregado últimos 30d)
WITH first_campaign AS (
  SELECT
    owner_id AS user_id,
    MIN(created_at) AS first_campaign_at
  FROM campaigns
  WHERE is_archived = false  -- mig 121 (soft-delete via is_archived/archived_at)
  GROUP BY owner_id
),
eligible_dms AS (
  SELECT user_id, first_campaign_at
  FROM first_campaign
  WHERE first_campaign_at < now() - interval '7 days'
    AND first_campaign_at >= now() - interval '37 days'  -- janela 30d + buffer
),
returned AS (
  SELECT DISTINCT e.user_id
  FROM eligible_dms e
  WHERE EXISTS (
    -- Sinal 1: criou sessão/encounter entre D+1 e D+7
    SELECT 1 FROM sessions s
    WHERE s.owner_id = e.user_id
      AND s.created_at > e.first_campaign_at + interval '1 day'
      AND s.created_at <= e.first_campaign_at + interval '7 days'
  ) OR EXISTS (
    -- Sinal 2: editou entidade
    SELECT 1 FROM campaign_npcs n
    JOIN campaigns c ON c.id = n.campaign_id
    WHERE c.owner_id = e.user_id
      AND n.updated_at > e.first_campaign_at + interval '1 day'
      AND n.updated_at <= e.first_campaign_at + interval '7 days'
  ) OR EXISTS (
    -- Sinal 3: evento analytics autenticado
    SELECT 1 FROM analytics_events a
    WHERE a.user_id = e.user_id
      AND a.event_name IN ('combat:started', 'session:created', 'campaign:opened')
      AND a.created_at > e.first_campaign_at + interval '1 day'
      AND a.created_at <= e.first_campaign_at + interval '7 days'
  )
)
SELECT
  (SELECT COUNT(*) FROM eligible_dms) AS total_dms,
  (SELECT COUNT(*) FROM returned) AS returned_dms,
  ROUND(
    100.0 * (SELECT COUNT(*) FROM returned) / NULLIF((SELECT COUNT(*) FROM eligible_dms), 0),
    1
  ) AS return_rate_7d_pct;
```

**Edge cases:**

- **Guest (`/try`)** — Não conta: guests não têm `user_id` nem `campaigns.owner_id`. Ficam fora da métrica (são medidos pelo funnel de conversão guest → signup já instrumentado em `guest_funnel` RPC).
- **Anônimo (`/join`)** — Não conta como DM (é player). Nunca cria campanhas. Entra em §2.4 "Player join rate".
- **Churned + voltou** — Se um DM criou campanha em janeiro e fez login em abril, a "primeira campanha" dele é em janeiro (a coorte já fechou). Aceita: queremos retenção *da coorte*, não agregado vitalício.
- **Admin / staff** — Filtrar `WHERE user_id NOT IN (SELECT id FROM users WHERE is_admin = true)` se a base for grande; em escala atual (< 1000 DMs) não distorce materialmente.
- **Soft-deleted campaigns (mig 121)** — Contam para "criou primeira" mas `is_archived = false` garante que não estamos cruzando com lixo. Se DM arquivou e recriou, a primeira continua valendo.

**Como interpretar:** baseline beta test 3 provavelmente <20% (sem instrumentação antes). Launch target ≥40% = o produto tem hábito formado. <30% = critical, revisar onboarding (Onda 1 show-stoppers). >50% = product-market fit forte.

---

### 2.2 Sessions per DM per week — target ≥1.5

**Definição operacional.** Entre DMs *ativos* na semana (ao menos 1 sessão criada OU 1 combate iniciado na semana ISO corrente), média de sessões criadas por DM. Só conta DMs ativos para evitar diluição com usuários fantasmas.

**Nota terminológica:** "Session" aqui se refere a `sessions.id` (mig 002 + 120 — a work unit "pre-session / active / completed / cancelled"), **não** a `encounters` (combate). Um DM pode rodar 3 combates numa mesma sessão de mesa; conta como 1 sessão, 3 encounters. A métrica alternativa "encounters per DM per week" deve coexistir (§3.4).

**Janela:** semana ISO corrente completa (seg-dom) OU últimas 4 semanas agregadas (escolher via param). Relatório semanal rolling permite ver sazonalidade.

**Query:**

```sql
-- Sessions per active DM per week (últimas 4 semanas)
WITH weekly_activity AS (
  SELECT
    date_trunc('week', s.created_at) AS week_start,
    s.owner_id AS user_id,
    COUNT(*) AS sessions_count
  FROM sessions s
  WHERE s.created_at >= now() - interval '4 weeks'
  GROUP BY 1, 2
)
SELECT
  week_start,
  COUNT(DISTINCT user_id) AS active_dms,
  SUM(sessions_count) AS total_sessions,
  ROUND(AVG(sessions_count)::numeric, 2) AS avg_sessions_per_dm
FROM weekly_activity
GROUP BY week_start
ORDER BY week_start DESC;
```

**Edge cases:**

- **DM que só planeja, não roda** — Cria `sessions` com `status='planned'` sem nunca ativar. Contam; o target ≥1.5 é **criação**, não conclusão (conclusão = §2.6 secundária).
- **Sessões deletadas** — Se sessions ganhar soft-delete no futuro, adicionar `deleted_at IS NULL`. Hoje (mig 160) não tem; idempotente.
- **Semana parcial** — Excluir `week_start = date_trunc('week', now())` do ranking (dados incompletos).
- **Guest / Anônimo** — Fora da métrica (não autenticam como DM).

**Como interpretar:** <1.0 = produto é "ferramenta ocasional" (uma vez por quinzena). 1.5+ = ritmo semanal consistente, tipicamente 1 sessão de mesa por semana + planejamento. 2.5+ = uso intensivo.

---

### 2.3 Campaign creation → 1st combat — target ≤7 dias (mediana)

**Definição operacional.** Para cada campanha criada, tempo (em horas) entre `campaigns.created_at` e o `MIN(encounters.started_at)` (primeira sessão de combate real, não planejada) em alguma sessão daquela campanha. Encounters com `started_at IS NULL` são excluídos (backfill de mig 141 cobre histórico; novas entradas sempre têm via trigger).

**Por que mediana, não média:** DMs que abandonam distorcem a média para cima (campanhas órfãs de 120 dias). Mediana isola o DM "típico que realmente usa".

**Janela:** campanhas criadas nos últimos 60 dias (para dar tempo de maturação).

**Query:**

```sql
-- Time to 1st combat (mediana + quartis)
WITH campaign_first_combat AS (
  SELECT
    c.id AS campaign_id,
    c.owner_id,
    c.created_at AS campaign_at,
    MIN(e.started_at) AS first_combat_at
  FROM campaigns c
  JOIN sessions s ON s.campaign_id = c.id
  JOIN encounters e ON e.session_id = s.id
  WHERE c.created_at >= now() - interval '60 days'
    AND c.is_archived = false
    AND e.started_at IS NOT NULL
  GROUP BY c.id, c.owner_id, c.created_at
),
deltas AS (
  SELECT
    EXTRACT(EPOCH FROM (first_combat_at - campaign_at))/3600 AS hours_to_combat
  FROM campaign_first_combat
)
SELECT
  COUNT(*) AS campaigns_with_combat,
  ROUND(percentile_cont(0.25) WITHIN GROUP (ORDER BY hours_to_combat)::numeric / 24, 1) AS p25_days,
  ROUND(percentile_cont(0.50) WITHIN GROUP (ORDER BY hours_to_combat)::numeric / 24, 1) AS p50_days_median,
  ROUND(percentile_cont(0.75) WITHIN GROUP (ORDER BY hours_to_combat)::numeric / 24, 1) AS p75_days,
  -- Proxy de conversão: % de campanhas criadas que chegaram a combate
  (SELECT COUNT(*) FROM campaigns WHERE created_at >= now() - interval '60 days' AND is_archived = false)::numeric AS total_campaigns_created,
  ROUND(
    100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM campaigns WHERE created_at >= now() - interval '60 days' AND is_archived = false), 0),
    1
  ) AS conversion_to_combat_pct
FROM deltas;
```

**Edge cases:**

- **DM que cria campanha vazia de teste** — Polui numerador. Mitigação: complementar com filtro `c.id IN (SELECT campaign_id FROM campaign_npcs)` se necessário. Não aplicado por default (teste é sinal válido de intenção).
- **Combate iniciado em sessão deletada** — Se sessions ganhar soft-delete, a JOIN precisa filtrar. Hoje OK.
- **Encounters com `started_at` NULL antigos** — Cobertos por mig 141 backfill (usa `created_at` como proxy). Prefira filtrar `e.started_at IS NOT NULL` para evitar duplicidade de lógica.
- **Segunda campanha do mesmo DM** — Conta sim (não filtramos por primeira). Comportamento esperado: se DM tem 3 campanhas, todas contam para a distribuição.

**Como interpretar:** mediana ≤ 7 dias = DM de fato *usa* o que cria. Mediana de 14+ dias = fricção alta entre "cadastro inicial" e "mesa rodando" — investigar Onda 1 (botão criar sessão, cards interativos, B04). `conversion_to_combat_pct` <50% = usuários criam campanha mas desistem antes da primeira sessão — top blocker.

---

### 2.4 Player join rate — target ≥60%

**Definição operacional.** Entre convites enviados (linha em `session_tokens` OU `campaign_invites`), % que resultou em jogador efetivamente entrando (definido abaixo por fonte).

**Duas fontes de invite, duas sub-métricas:**

**(a) Via session token (`/join/{token}`)** — fluxo do DM ao iniciar combate. "Entrou" = `session_tokens.anon_user_id IS NOT NULL` OU `session_tokens.player_name IS NOT NULL`.

```sql
-- Join rate via session tokens (últimos 30d)
SELECT
  COUNT(*) AS tokens_created,
  COUNT(*) FILTER (WHERE anon_user_id IS NOT NULL OR player_name IS NOT NULL) AS tokens_used,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE anon_user_id IS NOT NULL OR player_name IS NOT NULL) / NULLIF(COUNT(*), 0),
    1
  ) AS join_rate_pct
FROM session_tokens
WHERE created_at >= now() - interval '30 days'
  AND is_active = true;
```

**(b) Via campaign invite email (`/invite/{token}`)** — fluxo auth.

```sql
-- Join rate via campaign invites (últimos 30d)
SELECT
  COUNT(*) AS invites_sent,
  COUNT(*) FILTER (WHERE status = 'accepted') AS invites_accepted,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'accepted') / NULLIF(COUNT(*), 0),
    1
  ) AS acceptance_rate_pct,
  COUNT(*) FILTER (WHERE status = 'expired') AS invites_expired
FROM campaign_invites
WHERE created_at >= now() - interval '30 days';
```

**Edge cases:**

- **DM gerou 3 tokens pro mesmo jogador** (testou, regerou) — Overcounts "tokens_created". Mitigação V2: `COUNT(DISTINCT session_id, player_name)` se `player_name` preenchido. V1 aceita ruído.
- **Jogador abandonou antes do combate** — Se entrou (`last_seen_at` preenchido) mas nunca voltou, conta como "joined" (essa parte é sucesso — próxima métrica seria "active during combat").
- **Guest (`/try`)** — Fora da métrica (não tem invite).
- **Invite acceptance** — Status `expired` é sinal claro de DM mandando convite tarde demais (campanha já pausada). Considerar cap de 7 dias (mig 025 já tem).

**Como interpretar:** <40% = link quebra em algum lugar, DMs precisam mandar o link 2x (WhatsApp UX), ou reconnection rule falhando. ≥60% = fluxo fluido. A expectativa pós-F19 (Auto-invite, Onda 5) é **subir ≥80%** — pois jogador não precisa nem clicar no link externo.

---

## 3. Métricas secundárias (engajamento)

### 3.1 Entidades criadas por campanha

**Por quê:** proxy direto de "investimento" do DM na campanha. Campanhas com >10 entidades (NPCs + locais + notas + facções + quests) tipicamente têm retenção 3x maior (hipótese a validar pós-launch).

```sql
-- Distribuição de entidades por campanha (campanhas ativas, últimos 30d)
WITH entity_counts AS (
  SELECT
    c.id AS campaign_id,
    c.name,
    c.owner_id,
    (SELECT COUNT(*) FROM campaign_npcs WHERE campaign_id = c.id) AS npc_count,
    (SELECT COUNT(*) FROM campaign_locations WHERE campaign_id = c.id) AS location_count,
    (SELECT COUNT(*) FROM campaign_notes WHERE campaign_id = c.id) AS note_count,
    (SELECT COUNT(*) FROM campaign_factions WHERE campaign_id = c.id) AS faction_count
  FROM campaigns c
  WHERE c.is_archived = false
    AND c.updated_at >= now() - interval '30 days'
)
SELECT
  ROUND(AVG(npc_count + location_count + note_count + faction_count)::numeric, 1) AS avg_entities,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY (npc_count + location_count + note_count + faction_count)) AS median_entities,
  percentile_cont(0.9) WITHIN GROUP (ORDER BY (npc_count + location_count + note_count + faction_count)) AS p90_entities,
  COUNT(*) FILTER (WHERE (npc_count + location_count + note_count + faction_count) >= 10) AS campaigns_10plus_entities,
  COUNT(*) AS total_campaigns
FROM entity_counts;
```

### 3.2 Tempo médio em Campaign HQ

**Por quê:** briefing redesign (SPEC-campaign-dashboard-briefing.md) só vale se DM **gasta tempo** olhando.

**Instrumentação:** emitir evento `campaign:hq_opened` + `campaign:hq_closed` em `analytics_events`. Duração = delta entre eventos sequenciais da mesma `session`. Requer tracking de `session_id` client-side (anonymous_id já serve de proxy).

```sql
-- Tempo médio em Campaign HQ (pós-instrumentação)
WITH hq_sessions AS (
  SELECT
    e_open.anonymous_id,
    e_open.user_id,
    e_open.properties->>'campaign_id' AS campaign_id,
    e_open.created_at AS opened_at,
    (
      SELECT MIN(e_close.created_at)
      FROM analytics_events e_close
      WHERE e_close.event_name = 'campaign:hq_closed'
        AND e_close.user_id = e_open.user_id
        AND e_close.properties->>'campaign_id' = e_open.properties->>'campaign_id'
        AND e_close.created_at > e_open.created_at
        AND e_close.created_at < e_open.created_at + interval '30 minutes'
    ) AS closed_at
  FROM analytics_events e_open
  WHERE e_open.event_name = 'campaign:hq_opened'
    AND e_open.created_at >= now() - interval '30 days'
)
SELECT
  COUNT(*) AS sessions_measured,
  ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - opened_at)))::numeric, 0) AS avg_seconds,
  ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (closed_at - opened_at)))::numeric, 0) AS median_seconds
FROM hq_sessions
WHERE closed_at IS NOT NULL;
```

### 3.3 Reopens of Player HQ

**Por quê:** jogador que reabre a ficha 3x/semana está engajado na campanha. Proxy de retenção do player (não DM).

**Instrumentação:** evento `player:hq_opened` com `user_id` + `campaign_id`. Contar eventos distintos por dia, por usuário, últimos 7 dias.

```sql
-- Reopens médios de Player HQ por jogador (últimos 7d)
WITH daily_opens AS (
  SELECT
    user_id,
    date_trunc('day', created_at) AS day,
    COUNT(*) AS opens
  FROM analytics_events
  WHERE event_name = 'player:hq_opened'
    AND created_at >= now() - interval '7 days'
    AND user_id IS NOT NULL
  GROUP BY user_id, day
)
SELECT
  COUNT(DISTINCT user_id) AS active_players,
  ROUND(AVG(opens)::numeric, 1) AS avg_opens_per_day,
  SUM(opens) AS total_opens
FROM daily_opens;
```

### 3.4 Entity Graph adoption (NOVO — diferencial competitivo)

**Por quê:** Entity Graph é a Onda 3 do ROADMAP e o #1 pedido do beta test (12 feedbacks). Se DMs não adotam **depois** de shipado, toda a justificativa da onda cai. Medir adoção é pré-requisito para decidir investir em Ondas 3b-3f (hierarquia de locais, links ricos, daily notes).

**Métrica composta — 3 sub-métricas:**

**(a) % campanhas com ≥5 edges.** Threshold baseado no `BriefingMindMapPreview` (SPEC-campaign-dashboard-briefing §3.4) que só renderiza se `edges >= 5`.

```sql
SELECT
  COUNT(DISTINCT c.id) FILTER (
    WHERE (SELECT COUNT(*) FROM campaign_mind_map_edges e WHERE e.campaign_id = c.id) >= 5
  ) AS campaigns_with_graph,
  COUNT(DISTINCT c.id) AS total_campaigns,
  ROUND(
    100.0 * COUNT(DISTINCT c.id) FILTER (
      WHERE (SELECT COUNT(*) FROM campaign_mind_map_edges e WHERE e.campaign_id = c.id) >= 5
    ) / NULLIF(COUNT(DISTINCT c.id), 0),
    1
  ) AS graph_adoption_pct
FROM campaigns c
WHERE c.is_archived = false
  AND c.created_at >= now() - interval '60 days';
```

**(b) Edges criados por semana (velocity).** Medição de engajamento contínuo (não apenas setup inicial).

```sql
SELECT
  date_trunc('week', created_at) AS week,
  COUNT(*) AS edges_created,
  COUNT(DISTINCT campaign_id) AS active_campaigns_linking
FROM campaign_mind_map_edges
WHERE created_at >= now() - interval '8 weeks'
GROUP BY 1
ORDER BY 1 DESC;
```

**(c) Diversidade de relationships usados.** Se DMs só usam `linked_to` (genérico), o grafo não tem semântica — Entity Graph virou decoração. Desejado: >4 relationships distintos em uso ativo.

```sql
SELECT
  relationship,
  COUNT(*) AS usage_count,
  COUNT(DISTINCT campaign_id) AS campaigns_using
FROM campaign_mind_map_edges
WHERE created_at >= now() - interval '30 days'
GROUP BY relationship
ORDER BY usage_count DESC;
```

**Targets (pós Onda 3 shipada + 30d de uso):**
- (a) ≥30% das campanhas com ≥5 edges — prova que não é feature "curiosa" e sim usada.
- (b) Crescimento semanal de edges criados (sem decay após mês 1).
- (c) ≥4 relationships distintos com uso consistente (não apenas `linked_to`).

---

## 4. Instrumentação técnica

### 4.1 O que já temos

| Componente | Onde | Status |
|---|---|---|
| Tabela `analytics_events` (event-sourcing, ip_hash, sendBeacon) | [supabase/migrations/013_analytics_events.sql](../supabase/migrations/013_analytics_events.sql) | Ativa, RLS admin-only read |
| Tabela `analytics_daily` (aggregated daily counters) | [supabase/migrations/041_analytics_daily.sql](../supabase/migrations/041_analytics_daily.sql) | Ativa, mas sem cron de refresh documentado |
| Client-side tracker (DNT-aware, beacon + fallback) | [lib/analytics/track.ts](../lib/analytics/track.ts) | Pronto; basta chamar `trackEvent(name, props)` |
| Server-side tracker (service_role, IP hash diário) | [lib/analytics/track-server.ts](../lib/analytics/track-server.ts) | Pronto |
| RPCs admin (day1 activation, week2 retention, event funnel, combat stats) | [102_admin_metrics_rpc.sql](../supabase/migrations/102_admin_metrics_rpc.sql), [127_admin_analytics_rpcs.sql](../supabase/migrations/127_admin_analytics_rpcs.sql) | Ativos |
| Dashboard `/admin` com KPIs | [app/admin/page.tsx](../app/admin/page.tsx), [components/admin/MetricsDashboard.tsx](../components/admin/MetricsDashboard.tsx) | Ativo — só precisa ganhar novos widgets |
| Vercel Analytics (page views, web vitals) | [app/layout.tsx](../app/layout.tsx) linha 153 (`<Analytics />`) | Ativo mas não correlacionado com user_id |
| Encounter duration (`started_at` trigger + `duration_seconds`) | [141_encounter_started_at_trigger.sql](../supabase/migrations/141_encounter_started_at_trigger.sql), [103_encounter_time_analytics.sql](../supabase/migrations/103_encounter_time_analytics.sql) | Backfilled + trigger ativo |

**Conclusão:** 80% do encanamento já existe. Não precisamos reinventar infraestrutura. O que falta é **as queries novas + 3-4 eventos adicionais + widgets no dashboard existente**.

### 4.2 Gaps

| # | Gap | Severidade | Proposta |
|---|---|---|---|
| G1 | RPCs das 4 métricas primárias não existem | Alto | Criar mig `159_retention_metrics_rpcs.sql` com `admin_dm_return_rate_7d()`, `admin_sessions_per_dm_weekly()`, `admin_time_to_first_combat()`, `admin_player_join_rate()` |
| G2 | Eventos `campaign:hq_opened`, `campaign:hq_closed`, `player:hq_opened`, `entity_graph:edge_created` não emitidos | Médio | Adicionar `trackEvent()` nos componentes relevantes ([app/app/campaigns/[id]/page.tsx](../app/app/campaigns/%5Bid%5D/page.tsx), [components/player/PlayerHQ.tsx]) |
| G3 | `analytics_daily` não tem cron — tabela existe mas não é atualizada | Médio | Scheduled Supabase Function (pg_cron) ou Vercel Cron diário 03:00 UTC chamando `POST /api/admin/aggregate-daily` |
| G4 | Dashboard admin não tem seção "Retention" | Baixo | Adicionar `RetentionPanel` em `MetricsDashboard.tsx` com os 4 KPIs + trendline |
| G5 | Métricas por coorte (ex: DMs que signaram na mesma semana) não agregadas | Baixo | V2 — materialized view `mv_dm_cohorts` |

### 4.3 Trade-offs de stack

| Stack | Prós | Contras | Veredicto |
|---|---|---|---|
| **Supabase-first (atual) + RPCs + materialized views + Vercel Cron** | Zero custo extra (plano Pro Supabase já pago), dados no mesmo DB → JOINs baratos, LGPD trivial (dados no mesmo locale BR se `eu-central-1` ou `sa-east-1`), RLS já resolve auth admin, padrão estabelecido no projeto | Refresh de materialized views precisa cron (configurar), queries precisam SECURITY DEFINER para evitar recursão RLS | **RECOMENDADO para fases 1-3** |
| **PostHog (self-hosted)** | Session replay, funnels visuais, feature flags A/B integrados, retention chart nativo, cohort builder UI | +$0-50/mês (cloud) ou operação self-hosted (Docker, Postgres dedicado, retention policy), dados fora do Supabase (precisa sync), GDPR/LGPD + consent cookie-wall complexo para mercado BR, curva de aprendizado | **Reavaliar na Fase 4** após 90d de dados quantitativos |
| **Vercel Analytics (já integrado)** | Zero-config, web vitals gratuitos no plano Pro, privacy-first por default | Não correlaciona `user_id` (só page views), não cobre eventos de produto, sem SQL access — ruim para retention cohort | Manter para web vitals / page views; não usar para retention |
| **Mixpanel / Amplitude** | Top-tier para product analytics | $$$ (plano pago começa em $20-50/mês por MTU), cold start alto, dados fora do BR (LGPD risk), overkill pro estágio | **Não recomendado neste estágio** |

**Decisão:** Fase 1-3 ficam em **Supabase-first**. Se retenção subir e ficar sério ($5k+ MRR), considerar PostHog na Fase 4 para funnel visual e A/B. Pre-launch, simplicidade vence.

### 4.4 Custo e volume esperado

- `analytics_events` hoje: ~10-50 eventos/sessão × ~50 sessões/semana = ~2500 eventos/semana = ~10k/mês. Plano Pro Supabase (8GB DB) suporta ~100M rows antes de ficar apertado.
- Nova `analytics_events` com os 4 eventos extras (§4.2 G2): +20% volume = negligível.
- `analytics_daily` agregada: 1 linha/dia = 365/ano. Desprezível.
- Retention policy sugerida: **`analytics_events` TRUNCATE por month após 18 meses**. LGPD-compliant (base legal "interesse legítimo" + anonimização via ip_hash diário já implementada em [track-server.ts:21-31](../lib/analytics/track-server.ts#L21-L31)).

---

## 5. Dashboard

### 5.1 MVP — SQL no editor Supabase (Fase 1)

**Onde:** Supabase Dashboard → SQL Editor → salvar como "Saved Queries" com os 4 nomes das métricas primárias.

**Como operar:** Daniel abre o editor 1x/semana (sexta 09:00), roda os 4, anota em planilha. Custo zero, setup em 10 minutos.

**Entregável:** §9 Anexo tem os 4 queries copy-paste prontos.

### 5.2 V1 — Widgets em `/admin` (Fase 3)

**Onde:** estender [components/admin/MetricsDashboard.tsx](../components/admin/MetricsDashboard.tsx) com um `RetentionPanel` novo acima do painel atual.

Layout proposto:

```
┌─ RETENTION (últimos 30d) ──────────────────────────────────┐
│  [DM Return 7d]  [Sessions/DM/wk]  [Time to 1st combat]    │
│    45% (↑3)         1.8 (↑0.2)         4.2d (↓0.8)         │
│                                                             │
│  [Player Join Rate]  [Entity Graph adoption]                │
│     72%                  34%                                │
│                                                             │
│  Trend (weekly): [sparkline DM return] [sparkline sessions]│
└─────────────────────────────────────────────────────────────┘
```

Delta (↑/↓) vs. período anterior equivalente. Cor semafórica (verde se acima do target, amber entre 80-100% do target, vermelho abaixo).

**Endpoint:** `GET /api/admin/metrics/retention` → usa RPCs da mig 159, retorna JSON com os 5 KPIs + trendline de 8 semanas.

### 5.3 V2 — Email semanal (opcional, Fase 4)

Vercel Cron → Edge Function → `/api/admin/metrics/retention` → envia HTML via Resend para `danielroscoe97@gmail.com` toda segunda 08:00. Conteúdo: os 5 KPIs + 1 insight narrativo ("Esta semana: DM return subiu 5pp — driver provável: Onda 3 shipada em 2026-05-10").

**Decisão:** MVP + V1 são suficientes para launch. V2 é polish pós-launch (Fase 4).

---

## 6. Definição de "pronto para launch"

Conforme §2.3 do ROADMAP: **Launch = Ondas 0+1+2 + bug B04 concluídos + métricas primárias instrumentadas**.

"Métricas primárias instrumentadas" = **esta SPEC concluída até Fase 2 (queries rodáveis + RPCs + `/admin/metrics` widget)**. Fase 3 (widgets visuais bonitinhos) é desejável mas não bloqueia.

**Checklist binário (launch gate):**

- [ ] Query §2.1 (DM Return Rate 7d) roda sem erro no Supabase SQL editor
- [ ] Query §2.2 (Sessions per DM per week) roda
- [ ] Query §2.3 (Time to 1st combat) roda
- [ ] Query §2.4 (Player Join Rate) roda
- [ ] Migration `159_retention_metrics_rpcs.sql` mergeada com as 4 RPCs
- [ ] Endpoint `GET /api/admin/metrics/retention` responde com JSON válido
- [ ] Widget `RetentionPanel` visível em `/admin` para `is_admin = true`
- [ ] Evento `campaign:hq_opened` emitido em [app/app/campaigns/[id]/page.tsx](../app/app/campaigns/%5Bid%5D/page.tsx)
- [ ] Evento `player:hq_opened` emitido em rota correspondente
- [ ] 7 dias de dados coletados pós-merge (baseline pré-launch documentado)
- [ ] LGPD: retention policy `analytics_events` configurada (18 meses)
- [ ] `rtk tsc` + `rtk vitest` + `rtk build` verdes

Secundárias (§3) e Entity Graph adoption (§3.4) **não bloqueiam launch** — são monitoradas pós Onda 3.

---

## 7. Fases de implementação

### Fase 1 — Queries manuais (1 sessão, ~3h)

**Entregável:** arquivo `docs/SQL-retention-queries.sql` com as 4 queries primárias + 3 secundárias em formato copy-paste. Daniel salva no Supabase SQL editor como "Saved Queries".

**Por que primeiro:** zero risco de deploy, validação imediata do schema. Se alguma query falhar por causa de schema drift, resolve antes de codar dashboard.

**Dependências:** nenhuma.

### Fase 2 — Migration 159 + endpoint (1 sessão, ~4h)

**Entregável:**
1. `supabase/migrations/159_retention_metrics_rpcs.sql` com 4 funções SECURITY DEFINER (mesmo padrão de mig 102/127).
2. `app/api/admin/metrics/retention/route.ts` — admin-gated, chama as RPCs, retorna JSON.
3. Teste: `rtk vitest run app/api/admin/metrics/retention`.
4. Backfill dos eventos `campaign:hq_opened` / `player:hq_opened` em 3-4 call sites.

**Dependências:** Fase 1.

**Gate de launch atingido após esta fase.**

### Fase 3 — RetentionPanel UI (2 sessões, ~6h)

**Entregável:**
1. `components/admin/RetentionPanel.tsx` — 5 MetricCards + 2 sparklines (usa `recharts` já no projeto).
2. Integração no `MetricsDashboard.tsx` (topo da página).
3. i18n PT-BR/EN para rótulos (`messages/*.json` namespace `admin.retention.*`).
4. Testes visuais com dados seed.

**Dependências:** Fase 2.

### Fase 4 — PostHog OU email semanal (opcional, futuro)

**Entregável condicional:**
- Se MRR ≥ $1k/mês pós-launch: instalar PostHog self-hosted OR Cloud (mediante consent banner + política LGPD explícita). Migração progressiva dos eventos (dual-write por 30d, depois corta `analytics_events` para telemetria pesada mantendo-a só para auditoria).
- Caso contrário: Resend email semanal com snapshot dos KPIs.

**Dependências:** launch + 90d de dados + decisão de produto sobre session replay.

---

## 8. Riscos e mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | **LGPD — tracking por `user_id` sem consentimento explícito** | Média | Alto | Pré-launch: adicionar banner de consent opt-out (não opt-in) ancorado em "interesse legítimo de produto + anonimização via hash IP diário". Base legal LGPD art. 7 IX. Consultar advogado se MRR > $5k. Documentar em política de privacidade existente. |
| R2 | **Cardinalidade alta em `analytics_events`** (trackar `combatant_id`, `monster_slug` por evento) | Média | Médio | Regra: `properties` JSONB só contém contagens/enums, NUNCA IDs de entidades que aparecem milhões de vezes. Campo `user_id` indexado (mig 013), busca por coorte é barata. Se `properties` cresce >10KB/row, split em tabela `analytics_events_detail`. |
| R3 | **Multi-device — user abre /admin no PC e no celular, conta 2 "ativos"** | Baixa | Baixo | Métricas de retenção usam `user_id` (auth), não `anonymous_id` — deduplicação automática. Métricas guest/anon ficam com `anonymous_id` (conhecido e aceito como sub-medida). Pra DAU, usar `COUNT(DISTINCT user_id)`. |
| R4 | **Queries das RPCs não escalam** (ex: EXISTS correlated subquery em 100k usuários) | Baixa hoje, média em 12 meses | Médio | RPCs usam STABLE + SECURITY DEFINER (padrão mig 102/127). Para escala: introduzir `mv_dm_first_activity` materialized view (Fase 3+) refresh diário via cron. Benchmark em staging com `EXPLAIN ANALYZE` antes de prod. |
| R5 | **Métrica manipulada pelo próprio DM** (beta tester Daniel logando 10x para "ajudar") | Alta (durante beta) | Baixo | Filtrar `WHERE NOT is_admin` no dashboard (não exclui do raw — permite debug). Documentar: "baseline honesto é coorte excluindo staff". |
| R6 | **Evento `hq_opened` sem `hq_closed` correspondente** (tab fechada sem unload handler) | Alta | Médio | §3.2 fallback: timeout 30min na query. Evento de `pagehide` + `sendBeacon` (já funciona em `track.ts`) mitiga. Aceitar ~5% de sessões sem closed_at. |
| R7 | **`analytics_events` explode sem retention policy** | Baixa hoje, média em 18 meses | Médio | Cron mensal: `DELETE FROM analytics_events WHERE created_at < now() - interval '18 months'`. Criar mig 160 para documentar. |
| R8 | **Métrica engana** (target 40% atingido mas apenas porque 90% dos DMs são power users) | Média | Alto | Sempre acompanhar métrica primária com **distribuição** (p25/p50/p75), não só média. Dashboard V1 mostra histograma de sessions/DM. |

---

## 9. Anexo — SQL queries prontas (copy-paste)

> **Como usar:** abrir Supabase Dashboard → SQL Editor → New Query → colar. Cada bloco é standalone e retorna resultados em <1s para o volume atual (<50k rows em `analytics_events`, <1k campaigns).

### Q1 — DM Return Rate 7d

Ver §2.1 acima. Target ≥40%.

### Q2 — Sessions per DM per week

Ver §2.2 acima. Target ≥1.5.

### Q3 — Campaign creation → 1st combat

Ver §2.3 acima. Target mediana ≤7d.

### Q4 — Player Join Rate (session tokens)

Ver §2.4 acima. Target ≥60%.

### Q5 — Entity Graph adoption (composta)

Ver §3.4 acima (3 sub-queries).

### Q6 — DAU/WAU/MAU combinado

```sql
SELECT
  COUNT(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '1 day')  AS dau,
  COUNT(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '7 days') AS wau,
  COUNT(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '30 days') AS mau,
  ROUND(
    100.0 *
    COUNT(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '1 day') /
    NULLIF(COUNT(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '30 days'), 0),
    1
  ) AS dau_mau_stickiness_pct
FROM analytics_events
WHERE user_id IS NOT NULL;
```

DAU/MAU ratio: 20%+ = saudável, 10-20% = médio, <10% = produto ocasional.

### Q7 — Coorte semanal de DMs

```sql
-- Coorte semanal de DMs por primeira campanha + semana N retenção
WITH dms AS (
  SELECT owner_id AS user_id, date_trunc('week', MIN(created_at)) AS cohort_week
  FROM campaigns
  WHERE is_archived = false
  GROUP BY owner_id
),
activity AS (
  SELECT
    d.cohort_week,
    d.user_id,
    date_trunc('week', s.created_at) AS activity_week
  FROM dms d
  LEFT JOIN sessions s ON s.owner_id = d.user_id
)
SELECT
  cohort_week,
  COUNT(DISTINCT user_id) AS cohort_size,
  COUNT(DISTINCT user_id) FILTER (WHERE activity_week = cohort_week + interval '1 week') AS week_1_retained,
  COUNT(DISTINCT user_id) FILTER (WHERE activity_week = cohort_week + interval '2 weeks') AS week_2_retained,
  COUNT(DISTINCT user_id) FILTER (WHERE activity_week = cohort_week + interval '4 weeks') AS week_4_retained
FROM activity
WHERE cohort_week >= now() - interval '12 weeks'
GROUP BY cohort_week
ORDER BY cohort_week DESC;
```

### Q8 — Combat health (média de duração + completion rate)

```sql
-- Complemento a §2.3 — mostra se combates realmente terminam
SELECT
  COUNT(*) AS total_encounters,
  COUNT(*) FILTER (WHERE is_active = false) AS completed_encounters,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE is_active = false) / NULLIF(COUNT(*), 0),
    1
  ) AS completion_pct,
  ROUND(AVG(duration_seconds)::numeric / 60, 1) FILTER (WHERE duration_seconds > 0) AS avg_duration_min,
  ROUND(AVG(round_number)::numeric, 1) FILTER (WHERE round_number > 1) AS avg_rounds
FROM encounters
WHERE created_at >= now() - interval '30 days';
```

Se completion_pct < 60% = DMs abandonam combates no meio (investigar B04 perf, UX do fim de combate).

### Q9 — Onboarding funnel (já instrumentado em analytics_events)

```sql
-- Funnel de eventos-chave (reusa RPC existente admin_event_funnel; expõe aqui como query)
SELECT
  event_name,
  COUNT(DISTINCT COALESCE(user_id::text, anonymous_id)) AS unique_users
FROM analytics_events
WHERE created_at >= now() - interval '30 days'
  AND event_name IN (
    'auth:signup_start', 'auth:login',
    'campaign:created', 'session:created',
    'combat:started', 'combat:ended',
    'player:joined'
  )
GROUP BY event_name
ORDER BY
  CASE event_name
    WHEN 'auth:signup_start' THEN 1
    WHEN 'auth:login' THEN 2
    WHEN 'campaign:created' THEN 3
    WHEN 'session:created' THEN 4
    WHEN 'combat:started' THEN 5
    WHEN 'player:joined' THEN 6
    WHEN 'combat:ended' THEN 7
  END;
```

---

## 10. Fora de escopo

- **A/B testing framework** — PostHog resolveria; deixar para Fase 4.
- **Session replay (LogRocket / FullStory)** — LGPD + custo alto, pós-MRR.
- **Churn prediction ML** — absurdo pro estágio.
- **Alertas automáticos** ("métrica caiu 20%") — V2 após 90d de baseline.
- **Revenue metrics** (MRR, ARPU, LTV) — tracked em Stripe (mig 017), sistema próprio, fora deste spec.
- **Custom dashboards por DM** ("quero ver MINHAS sessões") — interessante pós Onda 6 polish.
- **Exportação CSV dos dados** — Supabase já tem via SQL editor (`Download CSV`); não precisa UI.

---

## 11. Dependências e sequenciamento

1. **Pré-requisito:** Onda 0 (Linguagem Ubíqua) mergeada — algumas queries usam `sessions` (já ubíquo) e referem a nomes de eventos que podem mudar.
2. **Pré-requisito soft:** Onda 1 B04 (perf fix) — se queries rodarem lentas em prod, o dashboard vira lento. Improvável <1s nos volumes atuais.
3. **Integra com:** [SPEC-campaign-dashboard-briefing.md](SPEC-campaign-dashboard-briefing.md) — o briefing emite `campaign:hq_opened`, alimentando §3.2.
4. **Prepara para:** [SPEC-entity-graph-implementation.md](SPEC-entity-graph-implementation.md) — §3.4 Entity Graph adoption é a métrica que valida se a Onda 3 foi um acerto.
5. **Bloqueia:** declaração de "pronto para launch" no §2.3 do ROADMAP — sem Fase 2 desta spec mergeada, launch fica com ponto de interrogação sobre sucesso.

---

## 12. Log de decisões

| Data | Decisão | Origem |
|---|---|---|
| 2026-04-21 | Supabase-first para retention (não PostHog na fase inicial) | §4.3 trade-off (custo + LGPD + stack estabelecido) |
| 2026-04-21 | DM Return Rate mede "qualquer sinal de produção" D+1..D+7, não só login | §2.1 — evita falso positivo de DM que abre dashboard e sai |
| 2026-04-21 | Time to 1st combat usa mediana, não média | §2.3 — resistente a outliers (campanhas órfãs) |
| 2026-04-21 | Entity Graph adoption promovida à secundária com 3 sub-métricas | §3.4 — é o diferencial competitivo (ROADMAP §3 Onda 3) |
| 2026-04-21 | Launch gate = Fase 1 + Fase 2 concluídas | §6 checklist binário |
| 2026-04-21 | Retention policy `analytics_events` = 18 meses | §4.4 + R7 — LGPD-aware, baixo custo de storage |
