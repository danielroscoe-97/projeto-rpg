# SPEC — Tracking do Funil de Convites (WhatsApp-first)

> **Status:** Especificado, não implementado
> **Data:** 2026-04-21
> **Origem:** Party Mode session (Mary, Winston, John, Sally, Quinn) após baseline de retenção `docs/retention-metrics-baseline-2026-04-21.md` identificar `campaign_invites` como feature morta
> **Motivação:** O fluxo real de convite é `session_tokens` → link colado no WhatsApp → player abre → joina. O app hoje não enxerga o trecho WhatsApp, o que impede qualquer diagnóstico do funil

---

## 1. Problema

Fluxo atual medido:

```
DM cria campanha  ──→  gera session_token  ──→  [BUZIO: WhatsApp]  ──→  player abre /join-campaign/[code]  ──→  joina
                          1.746 rows/30d                                  507 player:joined/30d        378 members/30d
```

**Gaps de visibilidade:**

1. Não sabemos quantas pessoas **viram** o link (reach)
2. Não sabemos quantos **abriram** mas não completaram o cadastro (vazamento de landing → signup)
3. Não sabemos **quanto tempo** um link ficou dormente antes do primeiro landing (DM esqueceu de colar? Grupo frio?)
4. Não distinguimos **re-share** (DM reenvia follow-up) de **primeira divulgação**
5. O KPI `campaign_invites.accept_rate_30d` está morto — precisa substituto

## 2. Objetivos

**Primário:** Responder duas perguntas por link:

- **Reach** — quantos dispositivos distintos abriram o link
- **Conversion** — quantos dos que abriram viraram `campaign_member`

**Secundário:** Classificar o estado de cada link em um de 4 buckets acionáveis (`dormant` / `opened_no_join` / `converting` / `saturated`) pra futuras intervenções UX.

**Não-objetivos (nesta spec):**

- Identificar pessoas físicas (fingerprint, cross-device tracking) — LGPD + sem ROI claro
- Mostrar o funil pro DM na UI (Onda B, spec separada)
- Enviar nudges automáticos pra DMs (Onda C, spec separada)

---

## 3. Escopo — Onda A (observability-only, zero impacto funcional)

### 3.1 Eventos

Três eventos, todos no schema `analytics_events`. Catálogo atual em [app/api/track/route.ts](app/api/track/route.ts) precisa adicionar os novos nomes ao allowlist.

#### `invite_link:generated`

Emitido quando um `session_token` é criado. Hoje existe como `share:link_generated` (cliente-side) — precisa ser complementado com emissão server-side no endpoint que cria o token, para garantir que dispara **toda** geração (inclusive via API).

```typescript
{
  event_name: "invite_link:generated",
  user_id: <dm_user_id>,
  properties: {
    token_id: <session_token.id>,
    campaign_id: <session_token.campaign_id>,
    generated_via: "dashboard" | "campaign_hq" | "player_invite_dialog",
    is_first_for_campaign: boolean,
  }
}
```

#### `invite_link:landed`

**NOVO.** Emitido no server-side render de [app/join-campaign/[code]/page.tsx](app/join-campaign/[code]/page.tsx) — primeira GET request por browser.

```typescript
{
  event_name: "invite_link:landed",
  user_id: null,  // landing é pré-auth
  anonymous_id: <cookie-based>,
  properties: {
    token_id: <resolved from code>,
    is_bot: boolean,
    is_self_view: boolean,       // landing do IP que gerou o token
    time_since_generated_minutes: number,
    ua_family: "chrome" | "safari" | "firefox" | "other",
    device_type: "mobile" | "desktop" | "tablet",
    referrer_host: string | null,  // quando presente
  }
}
```

**Filtros (Quinn):**

- `is_bot` — user-agent match contra lista de bots conhecidos (`facebookexternalhit`, `WhatsApp/`, `Googlebot`, `TelegramBot`, etc.). Bots ainda disparam o evento mas com flag true, para que queries possam filtrar.
- `is_self_view` — `ip_hash` do landing igual ao `ip_hash` do `invite_link:generated` do mesmo token. Também flag, não block.
- **Dedup de re-views do mesmo player:** aplicado na view materializada (§3.3), não no evento. Evento captura cada hit bruto.

#### `invite_link:consumed`

Já existe como `player:joined`. Adicionar `token_id` e `time_since_landing_minutes` às properties existentes.

```typescript
{
  event_name: "player:joined",
  user_id: <new_member_user_id>,
  properties: {
    ...existing,
    token_id: <if_joined_via_token>,                  // NOVO
    time_since_landing_minutes: number | null,        // NOVO — null se não achou landing prévio
  }
}
```

### 3.2 Catálogo de eventos — update em [app/api/track/route.ts](app/api/track/route.ts)

Adicionar ao `ALLOWED_EVENTS`:

```typescript
// Invite funnel (Onda A — WhatsApp-first tracking)
"invite_link:generated",
"invite_link:landed",
// invite_link:consumed é um alias do player:joined existente, não precisa entrada nova
```

### 3.3 View materializada `invite_funnel_per_token`

Migration nova (número a reservar na ordem cronológica quando for implementar). Pseudo-schema:

```sql
CREATE MATERIALIZED VIEW invite_funnel_per_token AS
SELECT
  st.id AS token_id,
  st.campaign_id,
  st.owner_id AS dm_user_id,
  st.created_at AS generated_at,

  -- Reach metrics (landings, filtered)
  COUNT(DISTINCT landings.ip_hash) FILTER (
    WHERE landings.is_bot = false AND landings.is_self_view = false
  ) AS distinct_ip_landings_count,

  COUNT(landings.id) FILTER (
    WHERE landings.is_bot = false AND landings.is_self_view = false
  ) AS total_landings_count,

  MIN(landings.created_at) FILTER (
    WHERE landings.is_bot = false AND landings.is_self_view = false
  ) AS first_landing_at,

  MAX(landings.created_at) FILTER (
    WHERE landings.is_bot = false AND landings.is_self_view = false
  ) AS last_landing_at,

  -- Conversion metrics (joins)
  COUNT(DISTINCT joins.user_id) AS consumed_count,
  MIN(joins.created_at) AS first_consumed_at,

  -- Derived state
  CASE
    WHEN COUNT(landings.id) = 0
         AND NOW() - st.created_at > INTERVAL '72 hours'
      THEN 'dormant'
    WHEN COUNT(landings.id) > 0
         AND COUNT(DISTINCT joins.user_id) = 0
         AND NOW() - MIN(landings.created_at) > INTERVAL '48 hours'
      THEN 'opened_no_join'
    WHEN COUNT(DISTINCT joins.user_id) > 0
         AND (NOW() - MAX(landings.created_at) < INTERVAL '7 days'
              OR MAX(landings.created_at) IS NULL)
      THEN 'converting'
    ELSE 'saturated'
  END AS status

FROM session_tokens st
LEFT JOIN analytics_events landings
  ON landings.event_name = 'invite_link:landed'
  AND landings.properties ->> 'token_id' = st.id::text
LEFT JOIN analytics_events joins
  ON joins.event_name = 'player:joined'
  AND joins.properties ->> 'token_id' = st.id::text
GROUP BY st.id, st.campaign_id, st.owner_id, st.created_at;

CREATE UNIQUE INDEX ON invite_funnel_per_token (token_id);
```

**Refresh:** `pg_cron` a cada 15 min — `SELECT cron.schedule('refresh_invite_funnel', '*/15 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY invite_funnel_per_token');`

### 3.4 Queries-KPI pra substituir `campaign_invites.accept_rate_30d`

A spec de retenção [docs/SPEC-retention-metrics.md](docs/SPEC-retention-metrics.md) §2.1 deve substituir o KPI de Player Join Rate via `campaign_invites` por:

```sql
-- Reach médio por link (30d)
SELECT AVG(distinct_ip_landings_count) FROM invite_funnel_per_token
WHERE generated_at >= NOW() - INTERVAL '30 days';

-- Join rate por link (30d) — % de links com ≥1 consumed
SELECT
  (COUNT(*) FILTER (WHERE consumed_count >= 1))::float / NULLIF(COUNT(*), 0) AS join_rate
FROM invite_funnel_per_token
WHERE generated_at >= NOW() - INTERVAL '30 days';

-- Distribuição de estados (30d)
SELECT status, COUNT(*) FROM invite_funnel_per_token
WHERE generated_at >= NOW() - INTERVAL '30 days'
GROUP BY status;
```

---

## 4. Fora de escopo (parkado)

### 4.1 Onda B — UX do funil no CampaignCard

Badge por campanha mostrando estado (`dormant` / `opened_no_join` / `converting` / `saturated`) + CTAs contextuais:

- `dormant` → "Abrir no WhatsApp com texto pronto" (`wa.me/?text=...`)
- `opened_no_join` → "3 pessoas viram. Ver a tela que eles veem."
- `converting` → "2 players entraram. Esperando mais 1."
- `saturated` → botão "Arquivar link" ou silenciar badge

**Pré-requisito:** Onda A rodando por ≥2 semanas com dados reais. Sem isso, não sabemos os thresholds dos estados.

### 4.2 Onda C — Nudges proativos

Pipeline cron:

- Link `dormant` há 72h → toast no próximo login do DM
- Link `opened_no_join` há 48h → email de investigação UX

**Pré-requisito:** Onda B shippada e validada (gesto manual do DM pra ver) antes de automatizar.

### 4.3 Rejeitados desta iteração

- **Fingerprinting de browser** — traz dor de LGPD sem sinal incremental real vs `ip_hash` + `ua_family`.
- **Share sheet nativo / `navigator.share()`** — UX da Onda B, não instrumentação.
- **Botão "Mandar no WhatsApp" com texto pronto** — UX da Onda B.
- **Deprecate do `campaign_invites` email flow** — decisão de produto separada; recomendado em [docs/diagnostic-campaign-invites-zero-accept.md](docs/diagnostic-campaign-invites-zero-accept.md).

---

## 5. Riscos e mitigações

| # | Risco | Mitigação |
|---|---|---|
| R1 | `invite_link:landed` dispara pra cada preview do WhatsApp/Telegram, inflando reach | Flag `is_bot`; queries usam `FILTER (is_bot = false)` |
| R2 | DM abrindo próprio link pra conferir conta como reach | Flag `is_self_view`; excluído nas queries |
| R3 | Player faz F5 5x na landing → 5 landings | Dedup por `ip_hash` dentro de janela de 30min na view materializada (pode ser uma camada extra de CTE) |
| R4 | `pg_cron` não está habilitado no projeto Supabase | Verificar `SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';` antes de implementar; fallback é refresh manual via endpoint `/api/admin/refresh-funnel` chamado por Vercel Cron |
| R5 | Cardinalidade de `analytics_events` cresce — `landed` dispara muito mais que `generated` | Accept; retention policy do SPEC §8 R7 já é 18 meses |
| R6 | Re-share de link é indistinguível no evento — só via padrão temporal de landings (2º burst N dias depois) | Aceitar; é possível detectar na análise pós-fato |

---

## 6. Critério de implementação

A Onda A está pronta pra shipar quando:

- [ ] 2 novos eventos adicionados ao `ALLOWED_EVENTS` em [app/api/track/route.ts](app/api/track/route.ts)
- [ ] `trackServerEvent("invite_link:generated", ...)` emitido no endpoint server-side que cria `session_tokens` (paralelo ao `share:link_generated` client-side existente)
- [ ] `trackServerEvent("invite_link:landed", ...)` emitido em [app/join-campaign/[code]/page.tsx](app/join-campaign/[code]/page.tsx) com filtros `is_bot` / `is_self_view` aplicados
- [ ] `trackEvent("player:joined", ...)` (existente) estendido com `token_id` e `time_since_landing_minutes`
- [ ] Migration da view materializada + índice
- [ ] `pg_cron` schedule OU endpoint fallback
- [ ] Spec de retenção atualizada com as 3 queries-KPI
- [ ] `rtk tsc --noEmit` clean, `rtk jest` sem regressões

**Estimativa:** 1 sessão focada (~4h).

---

## 7. Histórico de decisões

| Data | Decisão | Origem |
|---|---|---|
| 2026-04-21 | Medir reach E conversion (não um só) | Daniel (party mode) |
| 2026-04-21 | Não fazer fingerprinting — ficar em `ip_hash` + `ua_family` | Winston |
| 2026-04-21 | Separar em 3 ondas (A=analytics, B=UX, C=automação) | John |
| 2026-04-21 | Filtros anti-bot e anti-self-view como flags, não como blocks | Quinn |
| 2026-04-21 | Parkar Onda A — zero impacto funcional, shipar quando houver decisão esperando os dados | Daniel |
