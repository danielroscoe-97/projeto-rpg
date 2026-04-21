# Retention Metrics — Baseline Execution (Fase 1)

> **Execução:** 2026-04-21T17:10:50Z (UTC)
> **Commit:** `7997899bf6d09df48209a4721d8e93496e3b620e` (branch `master`)
> **SPEC origem:** [docs/SPEC-retention-metrics.md](SPEC-retention-metrics.md) — Fase 1 "Queries manuais"
> **Método:** script throwaway `scripts/run-retention-queries.ts` via `npx tsx` usando `SUPABASE_SERVICE_ROLE_KEY` (read-only; zero INSERT/UPDATE/DELETE). Queries originais do SPEC adaptadas para JS API + agregação em memória (não há `exec_sql` RPC em prod).
> **Raw JSON por query:** `observability/retention-baseline-2026-04-21/*.json`

---

## Veredicto de launch — quick snapshot

| # | Métrica | Valor atual | Target | Status |
|---|---|---|---|---|
| Q1 | DM Return Rate 7d | **10.5%** (2/19 DMs) | ≥40% | CRÍTICO (abaixo do limite de revisão <30%) |
| Q2 | Sessions/DM/week (avg últimas 4 semanas completas) | **61.88** | ≥1.5 | "Atinge" (mas 95%+ é ruído de drafts — ver §2) |
| Q3 | Time to 1st combat (mediana) | **0.0 dias** | ≤7d | Atinge (mas ver §3 — campanhas são criadas JIT junto ao combate) |
| Q4a | Player Join Rate (session tokens) | **59%** (1003/1699) | ≥60% | Fica 1pp abaixo — borderline |
| Q4b | Invite acceptance rate | **0%** (0/9; 7 expirados) | n/a | RED-FLAG operacional |
| Q5a | Entity Graph adoption (≥5 edges) | **0%** (0/204) | ≥30% | Abaixo — mas feature ainda em rampa |
| Q6 | DAU/WAU/MAU | 3 / 12 / 114 | DAU:MAU ≥20% | **2.6%** — produto ocasional |

**Interpretação de 1 linha:** a única métrica primária que objetivamente está saudável sob o target é Q3 mediana (0 dias), e isso é artefato do fluxo de criação (campanha + encounter lazy-criados no mesmo segundo). Q1 (return 7d) em 10.5% é o sinal mais forte de que o produto ainda não formou hábito — consistente com a hipótese do ROADMAP §2.1 de que o baseline beta-test 3 estaria <20%.

---

## 1 — Q1: DM Return Rate 7d (target ≥40%)

| Campo | Valor |
|---|---|
| DMs elegíveis (primeira campanha 7–37d atrás) | **19** |
| DMs que "retornaram" (sinal em D+1..D+7) | **2** |
| **Return rate 7d** | **10.5%** |
| Janela | 2026-03-15 → 2026-04-14 |
| Filtros aplicados | admins excluídos (1 user_id); drafts não foram filtrados (coluna ausente em prod) |

**Status:** CRÍTICO — target §6 do SPEC: ≥40%. Valor atual <30% (threshold de "critical, revisar onboarding"). Isso valida Gap #1 do ROADMAP.

**Nota sobre schema:** nem `campaigns.deleted_at` (SPEC §2.1 — mig 121 referenciada) nem `sessions.is_draft` (mig 160) existem no Supabase de prod. Ver §9 "Schema drift".

**Query usada (adaptada JS):** 3 sinais de "retorno" — (1) criou nova sessão, (2) emitiu evento `combat:started`/`session:created`/`campaign:opened` em `analytics_events`, (3) editou algum `campaign_npcs`.

```sql
-- Equivalente SQL puro (SPEC §2.1) — não executado por falta de exec_sql RPC
WITH first_campaign AS (
  SELECT owner_id AS user_id, MIN(created_at) AS first_campaign_at
  FROM campaigns
  -- WHERE deleted_at IS NULL  -- coluna não existe em prod
  GROUP BY owner_id
),
eligible_dms AS (
  SELECT user_id, first_campaign_at
  FROM first_campaign
  WHERE first_campaign_at < now() - interval '7 days'
    AND first_campaign_at >= now() - interval '37 days'
),
returned AS (
  SELECT DISTINCT e.user_id FROM eligible_dms e
  WHERE EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.owner_id = e.user_id
      AND s.created_at > e.first_campaign_at + interval '1 day'
      AND s.created_at <= e.first_campaign_at + interval '7 days'
  ) OR EXISTS (
    SELECT 1 FROM campaign_npcs n
    JOIN campaigns c ON c.id = n.campaign_id
    WHERE c.owner_id = e.user_id
      AND n.updated_at > e.first_campaign_at + interval '1 day'
      AND n.updated_at <= e.first_campaign_at + interval '7 days'
  ) OR EXISTS (
    SELECT 1 FROM analytics_events a
    WHERE a.user_id = e.user_id
      AND a.event_name IN ('combat:started', 'session:created', 'campaign:opened')
      AND a.created_at > e.first_campaign_at + interval '1 day'
      AND a.created_at <= e.first_campaign_at + interval '7 days'
  )
)
SELECT (SELECT COUNT(*) FROM eligible_dms) AS total_dms,
       (SELECT COUNT(*) FROM returned) AS returned_dms,
       ROUND(100.0 * (SELECT COUNT(*) FROM returned) / NULLIF((SELECT COUNT(*) FROM eligible_dms), 0), 1) AS return_rate_7d_pct;
```

---

## 2 — Q2: Sessions per DM per week (target ≥1.5)

**Filtros aplicados:** admins excluídos (901 de 2090 sessions); drafts **não excluídos** (coluna `is_draft` ausente em prod — mig 160 não aplicada).

| Semana (Mon) | Active DMs | Total sessions | Avg/DM | Observação |
|---|---|---|---|---|
| 2026-04-20 | 3 | 4 | **1.33** | semana parcial (currentWeek) |
| 2026-04-13 | 4 | 175 | **43.75** | |
| 2026-04-06 | 11 | 346 | **31.45** | pico de inscrições |
| 2026-03-30 | 4 | 588 | **147.0** | outlier — provável beta tester churning |
| 2026-03-23 | 3 | 76 | **25.33** | |

**Overall avg (4 semanas completas, exclui semana parcial):** **61.88 sessões/DM/semana**.

**Status:** numerically acima do target (≥1.5), porém o valor é **inutilizável** como KPI real até que mig 160 (`sessions.is_draft`) seja aplicada em prod. Há forte sinal de que a maior parte de `sessions.created_at` em prod é de drafts abandonados (fluxo DM → setup → fecha aba; o sweeper de mig 159 só roda após 72h).

**Ação recomendada para Fase 2:** aplicar mig 160 + mig 159 em prod *antes* de escrever a RPC `admin_sessions_per_dm_weekly()`, senão o dashboard vai refletir o mesmo ruído.

**Query:**

```sql
WITH weekly_activity AS (
  SELECT date_trunc('week', s.created_at) AS week_start,
         s.owner_id AS user_id,
         COUNT(*) AS sessions_count
  FROM sessions s
  WHERE s.created_at >= now() - interval '4 weeks'
  -- AND s.is_draft = false   -- coluna não existe em prod (mig 160 não aplicada)
  GROUP BY 1, 2
)
SELECT week_start,
       COUNT(DISTINCT user_id) AS active_dms,
       SUM(sessions_count) AS total_sessions,
       ROUND(AVG(sessions_count)::numeric, 2) AS avg_sessions_per_dm
FROM weekly_activity
GROUP BY week_start
ORDER BY week_start DESC;
```

---

## 3 — Q3: Campaign creation → 1st combat (target mediana ≤7 dias)

| Campo | Valor |
|---|---|
| Campanhas criadas nos últimos 60 dias (não-admin) | **201** |
| Campanhas que chegaram a combate | **183** |
| Conversion to combat | **91.0%** |
| p25 (dias) | **0.0** |
| **p50 (mediana)** | **0.0** |
| p75 (dias) | **0.0** |

**Status:** matematicamente atinge o target (≤7 dias), mas o valor "0 dias" é explicado por um artefato do flow: em prod, campanha e primeiro encounter são criados no mesmo segundo quando o DM vem do fluxo "New Combat" direto. Sampled evidence abaixo.

**Spot-check da amostra (20 campanhas mais antigas da janela):**

```
camp 717db249  none                 (nunca combateu)
camp bf026289  none
camp afa4f142  none
camp bbb88ae0  none
camp e392c8b7  none
camp 3a3a4955  2026-03-25T16:02:26  diff=0.00h  <-- criada junto c/ campanha
camp 7c25352f  2026-03-26T01:57:20  diff=0.08h
camp ccdf77bb  2026-03-26T13:06:46  diff=0.00h
camp 2f3e00a3  2026-03-26T23:26:56  diff=0.11h
camp 34c72a70  2026-03-30T18:05:06  diff=0.00h
camp 21c99bcc  2026-04-16T00:58:50  diff=337.65h  <-- 14 dias, caso "normal"
...
```

**Interpretação:** o target ≤7d foi calibrado para um fluxo onboarding-primeiro (DM cria campanha, depois sessão, depois encounter). O fluxo atual em produção é combat-first (landing /app/combat/new → cria tudo lazy no submit). A métrica só fica útil após excluir campanhas criadas dentro de ±5min do encounter, OU após Onda 1 da UX que segrega setup de combate.

**Ação para SPEC:** considerar refinar a definição operacional (§2.3) — sugestão: `(first_combat_at - campaign_at) > interval '5 minutes'`, para evitar auto-criação.

**Query:**

```sql
WITH campaign_first_combat AS (
  SELECT c.id AS campaign_id, c.owner_id, c.created_at AS campaign_at,
         MIN(e.started_at) AS first_combat_at
  FROM campaigns c
  JOIN sessions s ON s.campaign_id = c.id
  JOIN encounters e ON e.session_id = s.id
  WHERE c.created_at >= now() - interval '60 days'
    AND e.started_at IS NOT NULL
    -- AND c.deleted_at IS NULL  -- coluna não existe
  GROUP BY c.id, c.owner_id, c.created_at
),
deltas AS (
  SELECT EXTRACT(EPOCH FROM (first_combat_at - campaign_at))/3600 AS hours_to_combat
  FROM campaign_first_combat
)
SELECT COUNT(*) AS campaigns_with_combat,
       ROUND(percentile_cont(0.25) WITHIN GROUP (ORDER BY hours_to_combat)::numeric / 24, 1) AS p25_days,
       ROUND(percentile_cont(0.50) WITHIN GROUP (ORDER BY hours_to_combat)::numeric / 24, 1) AS p50_days_median,
       ROUND(percentile_cont(0.75) WITHIN GROUP (ORDER BY hours_to_combat)::numeric / 24, 1) AS p75_days
FROM deltas;
```

> **Fix sugerido ao SPEC §2.3 (deixar em log):** o último bloco do snippet tem um `FROM deltas;` após o `SELECT ... conversion_to_combat_pct;` — parser-erro. O `FROM deltas` tem que estar logo após a cláusula `SELECT`, não depois do `;`.

---

## 4 — Q4: Player Join Rate (target ≥60%)

### 4a — Via session tokens (`/join/{token}`)

| Campo | Valor |
|---|---|
| Tokens criados (últimos 30d, is_active=true) | **1699** |
| Tokens usados (anon_user_id OR player_name preenchido) | **1003** |
| **Join rate** | **59.0%** |

**Status:** a 1pp do target de 60%. Considerar saudável mas monitorar.

### 4b — Via campaign_invites (`/invite/{token}`)

| Campo | Valor |
|---|---|
| Convites enviados (30d) | **9** |
| Aceitos | **0** |
| Expirados | **7** |
| Pendentes | **2** |
| **Acceptance rate** | **0.0%** |

**Status:** RED-FLAG operacional. Zero aceitação em 30d com 7 expirando = ou (a) convites via email não estão sendo entregues/clicados; ou (b) fluxo de convite está quebrado; ou (c) baseado no volume baixíssimo (9), praticamente ninguém está usando o fluxo email-invite vs. session-token. Investigar.

**Query:**

```sql
-- (a) session tokens
SELECT COUNT(*) AS tokens_created,
       COUNT(*) FILTER (WHERE anon_user_id IS NOT NULL OR player_name IS NOT NULL) AS tokens_used,
       ROUND(100.0 * COUNT(*) FILTER (WHERE anon_user_id IS NOT NULL OR player_name IS NOT NULL) / NULLIF(COUNT(*), 0), 1) AS join_rate_pct
FROM session_tokens
WHERE created_at >= now() - interval '30 days'
  AND is_active = true;

-- (b) campaign invites
SELECT COUNT(*) AS invites_sent,
       COUNT(*) FILTER (WHERE status = 'accepted') AS invites_accepted,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'accepted') / NULLIF(COUNT(*), 0), 1) AS acceptance_rate_pct,
       COUNT(*) FILTER (WHERE status = 'expired') AS invites_expired
FROM campaign_invites
WHERE created_at >= now() - interval '30 days';
```

---

## 5 — Q5: Entity Graph adoption (composta)

Tabela usada: `campaign_mind_map_edges`.

### 5a — Campanhas com ≥5 edges

| Campo | Valor |
|---|---|
| Total campanhas (últimos 60d) | **204** |
| Campanhas com ≥5 edges | **0** |
| **Graph adoption** | **0.0%** |

### 5b — Edges criados por semana (últimas 8 semanas)

| Semana | Edges criados | Campanhas ativas linkando |
|---|---|---|
| 2026-04-06 | 45 | 45 |
| 2026-03-30 | 126 | 126 |

### 5c — Diversidade de relationships (últimos 30d)

| Relationship | Usage | Campanhas |
|---|---|---|
| `lives_in` | 171 | 171 |

**Status:** abaixo do target (30%), mas fora do gate de launch por SPEC §6. Observações fortes:

1. **0 campanhas com ≥5 edges** mas 171 edges espalhados por 171 campanhas diferentes (média exata de 1 edge/campanha). Indica que edges são criados automaticamente (provavelmente no onboarding ou via CSV/scripting), e **não** por uso manual do grafo.
2. **Apenas 1 relationship type** (`lives_in`) em 30 dias. Target de ≥4 distintos não está próximo.
3. Sem edges em 2026-04-13 ou 2026-04-20 (últimas 2 semanas) — sinal de **decay após seed inicial**.

**Query:** ver SPEC §3.4 (3 sub-queries).

---

## 6 — Q6: DAU / WAU / MAU (SPEC §9 Anexo)

| Métrica | Valor |
|---|---|
| DAU | **3** |
| WAU | **12** |
| MAU | **114** |
| **DAU/MAU stickiness** | **2.6%** |

**Status:** abaixo de 10% = "produto ocasional" conforme interpretação do SPEC §9. Filtro: admins excluídos.

**Query:**

```sql
SELECT COUNT(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '1 day') AS dau,
       COUNT(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '7 days') AS wau,
       COUNT(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '30 days') AS mau,
       ROUND(100.0 * COUNT(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '1 day') /
             NULLIF(COUNT(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '30 days'), 0), 1) AS dau_mau_stickiness_pct
FROM analytics_events
WHERE user_id IS NOT NULL;
```

---

## 7 — Q7: Coorte semanal de DMs (últimas 12 semanas)

| Cohort week | Size | W+1 retained | W+2 retained | W+4 retained |
|---|---|---|---|---|
| 2026-04-20 | 1 | 0 | 0 | 0 |
| 2026-04-13 | 3 | 0 | 0 | 0 |
| 2026-04-06 | 11 | 0 | 0 | 0 |
| 2026-03-30 | 4 | 2 | 2 | 0 |
| 2026-03-23 | 2 | 0 | 1 | 0 |

**Status:** 3 das 5 coortes têm 0 retenção em W+1/W+2/W+4 — reforça Q1. Cohort de 2026-03-30 (4 DMs) teve 50% retenção em W+1 → W+2, é o melhor resultado histórico da janela.

---

## 8 — Q8: Combat health (SPEC §9 — complemento de Q3)

| Campo | Valor |
|---|---|
| Total encounters (30d) | **1744** |
| Encounters completed (is_active=false) | **250** |
| **Completion rate** | **14.3%** |
| Duração média (min) | **22.6** |
| Rounds médios | **3.1** |

**Status:** RED-FLAG — SPEC interpreta completion <60% como "DMs abandonam combates no meio, investigar B04 perf + UX de fim". Aqui temos 14.3%, que é dramaticamente abaixo. Caveat: a métrica confunde "combate planejado que DM nunca iniciou" com "combate iniciado e abandonado". Filtrar `started_at IS NOT NULL` daria um número mais representativo — adicionar ao SPEC.

## 9 — Q9: Onboarding funnel (últimos 30d, por unique user)

| Evento | Unique users |
|---|---|
| `auth:signup_start` | **5** |
| `auth:login` | **45** |
| `campaign:created` | **0** |
| `session:created` | **0** |
| `combat:started` | **14** |
| `combat:ended` | **6** |
| `player:joined` | **1** |

**Status:** `campaign:created` e `session:created` em **0** unique users é um red-flag para instrumentação — esses eventos não estão sendo emitidos no client. Consistent com Gap #2 do SPEC §4.2. **Prioridade alta para Fase 2**: adicionar `trackEvent("campaign:created", ...)` e `trackEvent("session:created", ...)` nos paths relevantes; sem isso, o sinal 2 de Q1 ("evento analytics autenticado") está quebrado.

---

## 10 — Schema drift vs. SPEC

Ao executar, encontrei as seguintes discrepâncias entre o SPEC e o schema em prod:

| Coluna / objeto | SPEC (§) | Status em prod | Impacto |
|---|---|---|---|
| `campaigns.deleted_at` (soft-delete, mig 121) | §2.1, §2.3, §3.1, §3.4 | **NÃO EXISTE** | Queries rodam sem filtro — risco baixo hoje (sem deletes ainda) |
| `sessions.is_draft` (mig 160) | §2.2 | **NÃO EXISTE** | Q2 fica inutilizável — drafts compõem maior parte das sessions |
| `campaign_mind_map_edges` table | §3.4 | existe | OK |
| `users.is_admin` | §2.1 edge case | existe | OK — aplicado como filtro |
| `encounters.started_at`, `duration_seconds` | §2.3, §8 | existem | OK |
| `analytics_events` eventos `campaign:created`, `session:created` | Q9 / §4.2 G2 | **NÃO EMITIDOS** | Sinal 2 de Q1 parcialmente cego |

**Recomendação de SPEC update (deixar em log):**

1. §2.1 / §2.3 / §3.4 — remover `AND ... deleted_at IS NULL` até mig 121 ser aplicada, OU criar mig 165 que adicione `deleted_at` e backfill.
2. §2.2 — adicionar nota "exige mig 160 aplicada antes de rodar em prod".
3. §2.3 — considerar filtro `hours_to_combat > 0.1` (exclui auto-create do mesmo segundo), conforme seção 3 acima.
4. §2.3 — fix SQL syntax: `FROM deltas;` precisa estar antes do `;`, não depois.

---

## 11 — Checklist Fase 1 (SPEC §6)

- [x] Query §2.1 (DM Return Rate 7d) roda — 10.5%
- [x] Query §2.2 (Sessions per DM per week) roda — ver caveat drafts
- [x] Query §2.3 (Time to 1st combat) roda — ver caveat auto-create
- [x] Query §2.4 (Player Join Rate) roda — 59% tokens, 0% invites
- [x] Queries secundárias (§3) rodadas — adoção Entity Graph 0%
- [x] Anexo §9 (DAU/WAU/MAU, coortes, combat health, onboarding funnel) — todas rodadas
- [x] Baseline documentado em este arquivo + JSONs em `observability/retention-baseline-2026-04-21/*.json`

**Fase 1 concluída.** Próximo passo segue para Fase 2 (migration 159 + endpoint).

---

## 12 — Próximo passo (Fase 2)

Conforme SPEC §7:

1. **Pré-requisito recomendado** (adicionado pós-baseline): aplicar `mig 160 sessions_is_draft` em prod **antes** de codar as RPCs — senão Q2 continuará tóxica.
2. Criar `supabase/migrations/165_retention_metrics_rpcs.sql` com 4 funções SECURITY DEFINER:
   - `admin_dm_return_rate_7d()`
   - `admin_sessions_per_dm_weekly()`
   - `admin_time_to_first_combat()`
   - `admin_player_join_rate()`
3. Criar `app/api/admin/metrics/retention/route.ts` (admin-gated, chama as 4 RPCs, retorna JSON).
4. Emitir eventos faltantes (`campaign:created`, `session:created`, `campaign:hq_opened`, `player:hq_opened`) — 4 call sites (G2 do SPEC).
5. Refresh diário: criar materialized view candidata (`mv_dm_cohorts`) ou cron → `analytics_daily.refresh()`.
6. Teste: `rtk vitest run app/api/admin/metrics/retention`.
7. Re-rodar esta baseline após 7 dias com dados novos instrumentados para comparar.

**Gate de launch (§6) só é atingido após Fase 2 concluída.**

---

## 13 — Arquivos de suporte

- Raw JSONs por query: `observability/retention-baseline-2026-04-21/_all.json` + `q1..q9_*.json`
- SPEC: `docs/SPEC-retention-metrics.md`
- Script throwaway (não commitado): `scripts/run-retention-queries.ts` (pode ser deletado ou promovido a Fase 2 artifact)
