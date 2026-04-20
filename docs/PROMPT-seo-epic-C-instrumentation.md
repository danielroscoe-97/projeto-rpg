# Prompt — Execute Épico C (Instrumentação + Visibilidade)

**Versão:** 2026-04-20 (revisão adversarial pós-party-mode — escopo reduzido pesadamente)

**Pré-requisito:** Épico A (fundação) mergeado. C1 pode (e idealmente deve) rodar **ANTES** do Épico B pra guiar priorização de hubs PT.

---

## Contexto

Pocket DM fase experimental. Épicos A e B geram conteúdo e fundação. Sem **instrumentação**, voamos cego — não sabemos quais hubs funcionam, quais queries trazem tráfego que converte, quais páginas estão indexadas mas com CTR morto.

Este épico é **visibilidade** — transforma GSC + Vercel Analytics em sinais acionáveis dentro do repo.

**Objetivos (reduzidos):**
1. **GSC export automatizado** (C1) — script que puxa API weekly
2. **Click-flow tracking** (C2) — rastrear SEO landing → `/try` → signup

**NÃO faz mais:**
- ~~C3 content gap analysis~~ — adiado. Roda manualmente quando tiver 60d+ de dados. Criar script agora é gold plating.
- ~~C4 dashboard auto-update~~ — adiado. Parsing de markdown pra economizar 5min/semana é desperdício em fase experimental.

**Leia antes:**
1. [docs/seo-monitoring.md](./seo-monitoring.md) — doc manual de ritual semanal (Sprint 4 T4.4)
2. [lib/analytics/track.ts](../lib/analytics/track.ts) — cliente de event tracking existente
3. [app/api/track/route.ts](../app/api/track/route.ts) — endpoint de eventos
4. [components/analytics/WebVitalsTracker.tsx](../components/analytics/WebVitalsTracker.tsx) — padrão Vercel Analytics custom events
5. [supabase/migrations/](../supabase/migrations/) — **padrão real de migrations do projeto: `00N_nome.sql`** (próximo número = 006)

---

## 📝 Revisão adversarial (party-mode 2026-04-20)

Correções aplicadas:

- **Barry:** "C3 e C4 são gold-plating pra fase experimental." Removidos. Re-avaliar após 60d+ de GSC data.
- **Amelia:** spec original dizia `migrations/XXX_seo_funnel_events.sql`. Projeto usa `supabase/migrations/00N_nome.sql`. Próximo número confirmado: **006**.
- **Barry:** C1 exige setup GCP (service account, GSC API access) — documentar como **pré-requisito humano** explícito, não esconder.
- **Mary:** C1 idealmente roda ANTES do Épico B (valida queries target). Ordem do roadmap atualizada.

---

## 🗂️ Stories (reduzido: 4 → 2)

| Story | Descrição | Tempo | Prioridade |
|---|---|---:|---|
| **C1** | GSC API export script (weekly) | 3h + ~30min setup humano | P0 |
| **C2** | SEO→/try→signup click-flow tracking | 3h | P1 |

**Total:** ~6h. Épico encolheu de 10h pra 6h cortando gold-plating.

---

### 🧑 Pré-requisito humano (fora do épico, ~30min Daniel)

Antes de começar C1, Daniel precisa executar:

1. **Criar projeto no Google Cloud** (ou reutilizar se já houver): https://console.cloud.google.com
2. **Habilitar Search Console API** no projeto
3. **Criar service account:** IAM & Admin → Service Accounts → Create
4. **Exportar JSON key:** service account → Keys → Add Key → JSON
5. **Adicionar service account email como user do GSC property** `sc-domain:pocketdm.com.br`:
   - https://search.google.com/search-console → Settings → Users and permissions → Add user (email do service account, permission: Restricted)
6. **Salvar env vars em Vercel (Production) + `.env.local`:**
   - `GSC_SERVICE_ACCOUNT_EMAIL=<email>`
   - `GSC_SERVICE_ACCOUNT_KEY=<base64 do JSON key>`
   - `GSC_SITE=sc-domain:pocketdm.com.br`
7. Documentar setup step-by-step em `docs/seo-workflow.md` após terminar

**Sem esse setup, C1 é impossível.** Se Daniel preferir adiar, C1 é opcional — pula pra C2 sozinho e Épico B roda sem validação GSC de queries.

---

### C1 — GSC API export (~3h, P0)

**Problema:** `docs/seo-monitoring.md` exige ritual manual toda segunda-feira (GSC → Performance → filtrar 7d → copiar números). Humano esquece. Precisamos automatizar o pull.

**Solução:**

1. Criar `scripts/gsc-export.ts`:
   - Usa Google Search Console API (oficial, lib `googleapis` ou fetch direto)
   - Auth: service account JSON key (não OAuth interativo) — via env vars acima
   - Endpoint: `https://www.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query`
   - Pull: últimos 7, 28, e 90 dias separados
   - Dimensões: `query`, `page`, `country`, `device`
   - Output: `data/seo/gsc-{YYYY-MM-DD}.json` (dia da semana em que foi rodado)

2. `.gitignore` entries:
   - Adicionar `*.gsa.json` (service account keys se baixadas localmente)
   - `data/seo/gsc-*.json` — **NÃO gitignorar**; é versionado (histórico de evolução)

3. `package.json` script: `"seo:gsc-export": "tsx scripts/gsc-export.ts"`

4. Documentar em `docs/seo-workflow.md`:
   - Setup humano (pré-req acima)
   - "Rode `npm run seo:gsc-export` toda segunda manhã"
   - "Commita o JSON gerado em data/seo/gsc-YYYY-MM-DD.json"

5. **NÃO adicionar GitHub Action agora.** Manter manual — Daniel decide se/quando automatiza.

**Anti-patterns:**
```ts
// ❌ OAuth interativo (quebra automação)
// ❌ Hardcodar service account key no código
// ❌ Commitar o JSON key (.gitignore obrigatório)
// ❌ Pull de 90 dias todo dia (rate limit GSC; rodar 1x/semana basta)
// ❌ Adicionar GitHub Action agora (gold-plating, Daniel prefere controle)
// ✅ Service account com escopo readonly
// ✅ Cache local diário — se já tem o JSON do dia, skip
```

**AC:**
- [ ] Script roda em <1min
- [ ] Produz arquivo `data/seo/gsc-YYYY-MM-DD.json` com campos: `period_7d`, `period_28d`, `period_90d`, cada um com `top_queries`, `top_pages`, `countries`, `devices`
- [ ] Service account setup documentado em `docs/seo-workflow.md`
- [ ] `.gitignore` inclui `*.gsa.json`
- [ ] Daniel testa com env vars reais + primeiro JSON commitado em `data/seo/`

**Commit:** `feat(seo): epic C story 1 — GSC API export script`

---

### C2 — SEO click-flow tracking (~3h, P1)

**Problema:** `trackEvent('page:view')` existe mas não capturamos de onde veio o visitante (referrer/UTM) nem se converteu (chegou em `/try` → iniciou combate → criou conta). Sem isso, não sabemos qual query de Google gera signup real.

**Solução:**

1. **Estender `PageViewTracker`** ([components/analytics/PageViewTracker.tsx](../components/analytics/PageViewTracker.tsx)):
   - Capturar `document.referrer` → parse Google search referrer → extrair query term se presente na URL de origem
   - Salvar query + landing page em `sessionStorage` como `pocketdm_seo_entry`: `{ query, landing_page, referrer, ts }`
   - Na PRIMEIRA page view da sessão apenas (subsequent navigation não sobrescreve)

2. **Hook em eventos existentes** pra carregar entry context:
   - `trackEvent('combat:start')` (buscar em [lib/stores/guest-combat-store.ts](../lib/stores/guest-combat-store.ts)) — adicionar `seo_entry` se presente em sessionStorage
   - `trackEvent('auth:signup')` — idem
   - Isso permite report "esta query gerou X signups"

3. **Migration Supabase** — `supabase/migrations/006_seo_funnel_events.sql`:

```sql
create table public.seo_funnel_events (
  id           bigserial primary key,
  ts           timestamptz not null default now(),
  anon_id      text,                          -- from cookie / localStorage
  event_type   text not null,                 -- 'landing' | 'combat_start' | 'signup'
  query        text,                          -- SEO query if extractable
  landing_page text,                          -- first URL of session
  referrer     text,
  meta         jsonb                          -- overflow for future fields
);

create index seo_funnel_events_ts_idx on public.seo_funnel_events (ts desc);
create index seo_funnel_events_event_type_idx on public.seo_funnel_events (event_type);

-- RLS: only service role can read/write (dashboard query uses service role key via server)
alter table public.seo_funnel_events enable row level security;
create policy "service role only" on public.seo_funnel_events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
```

4. **Endpoint de report** `app/api/analytics/seo-funnel/route.ts`:
   - GET retorna JSON agregado: top queries de entrada nos últimos 30d × conversão (signup rate, combat start rate)
   - Auth via Supabase (só Daniel acessa) — conferir email contra `daniel@awsales.io` ou whitelist
   - Query agregação SQL com `count(*) filter (where event_type = ...)` pra evitar 3 queries

**Anti-patterns:**
```ts
// ❌ Capturar referrer query em toda page view (só na primeira)
// ❌ Storar em localStorage (não queremos cross-session persistência)
// ❌ Mandar query literal pro Google Analytics — privacidade
// ❌ Usar path "migrations/" — projeto usa "supabase/migrations/" com prefix 00N
// ✅ Hash ou normalize query se armazenar — ou manter só em sessionStorage até evento terminal
// ✅ Respeitar DNT (já tem check em lib/analytics/track.ts)
// ✅ Service role para write (endpoint /api/track já faz? conferir)
```

**AC:**
- [ ] Session entry capture funcional — test manual: simular Google referrer + landing page aparece em sessionStorage
- [ ] Endpoint `/api/analytics/seo-funnel` retorna agregação (auth-gated)
- [ ] Migration `supabase/migrations/006_seo_funnel_events.sql` criada e aplicada localmente via `supabase db push` (ou equivalente do projeto)
- [ ] RLS policy em place (só service role lê/escreve)
- [ ] Evento `combat:start` e `auth:signup` carregam `seo_entry` e persistem em `seo_funnel_events`
- [ ] Manual test: visita com referrer fake → combat start → signup → query aparece na tabela
- [ ] `rtk npx tsc --noEmit` + `rtk next build` limpos

**Commit:** `feat(seo): epic C story 2 — SEO click-flow tracking + funnel report`

---

## 🔄 Ordem de execução recomendada

**Ideal (C1 antes de Épico B):**
```
Day 1:
  Setup humano GCP + GSC (30min Daniel)
  C1 GSC export (3h)
  ✅ Primeiro JSON commitado
  → Épico B pode agora validar queries antes de criar hubs

Day 2 (após Épico B terminar ou em paralelo):
  C2 click-flow tracking (3h)
```

**Se setup GCP adiado:**
```
Pula C1 temporariamente.
C2 standalone (3h) — funnel sem query GSC, ainda captura referrer.
C1 depois quando service account estiver pronta.
```

## Validação pós-épico

```bash
# C1
npm run seo:gsc-export                                  # produz data/seo/gsc-*.json
ls data/seo/gsc-*.json                                  # existe

# C2
# Manual: visitar via referrer simulado (devtools → Network → set Referer),
#         ver sessionStorage "pocketdm_seo_entry"
# Manual: completar /try → chegar em signup → conferir seo_funnel_events no Supabase dashboard
curl -s 'https://pocketdm.com.br/api/analytics/seo-funnel' -H 'Cookie: ...' | jq
```

## 🚫 NÃO faz neste épico

- ❌ Hub pages novos (Épico B)
- ❌ Blog split / refactor (Épico A)
- ❌ C3 content gap analysis — **adiado**. Só fazer com 60d+ de dados GSC.
- ❌ C4 dashboard auto-update — **adiado**. Parsing de markdown pra 5min/semana é desperdício.
- ❌ Looker Studio / BI externa
- ❌ GitHub Actions pra auto-run semanal — Daniel decide depois

---

## 📝 COMMIT EARLY, COMMIT OFTEN

Padrão Épico A/B. Push após cada story. Este épico tem menos risco de merge (scripts + migrations isolados), mas mantém disciplina.

Bom trabalho, mestre. 🧙‍♂️
