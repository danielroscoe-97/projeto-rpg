# Prompt — Execute Épico C (Instrumentação + Visibilidade)

**Pré-requisito:** Épico A (fundação) mergeado. Épico B (conteúdo) pode estar em paralelo — este épico não conflita.

---

## Contexto

Pocket DM fase experimental. Épicos A e B geram conteúdo e fundação. Sem **instrumentação**, voamos cego — não sabemos quais hubs funcionam, quais queries trazem tráfego que converte, quais páginas estão indexadas mas com CTR morto.

Este épico é **visibilidade** — transforma GSC + Vercel Analytics em sinais acionáveis dentro do repo, não em dashboards externos esquecidos.

**Objetivos:**
1. **GSC export automatizado** — script que puxa API weekly e joga em arquivo versionado
2. **Click-flow tracking** — rastrear SEO landing → `/try` → signup, por query de origem
3. **Content gap analysis** — cruzar queries GSC com páginas existentes, identificar o que falta
4. **Dashboard auto-atualizado** — monitoring markdown se atualiza sozinho (parcialmente)

**Leia antes:**
1. [docs/seo-monitoring.md](./seo-monitoring.md) — doc manual de ritual semanal (Sprint 4 T4.4)
2. [lib/analytics/track.ts](../lib/analytics/track.ts) — cliente de event tracking existente
3. [app/api/track/route.ts](../app/api/track/route.ts) — endpoint de eventos
4. [components/analytics/WebVitalsTracker.tsx](../components/analytics/WebVitalsTracker.tsx) — padrão Vercel Analytics custom events

---

## 🗂️ Stories

| Story | Descrição | Tempo | Prioridade |
|---|---|---:|---|
| C1 | GSC API export script (weekly) | 3h | P0 |
| C2 | SEO→/try→signup click-flow tracking | 3h | P1 |
| C3 | Content gap analysis script | 2h | P1 |
| C4 | Monitoring dashboard auto-update | 2h | P2 |

**Total:** ~10h.

---

### C1 — GSC API export (~3h, P0)

**Problema:** `docs/seo-monitoring.md` exige ritual manual toda segunda-feira (GSC → Performance → filtrar 7d → copiar números). Humano esquece. Precisamos automatizar o pull.

**Solução:**

1. Criar `scripts/gsc-export.ts`:
   - Usa Google Search Console API (oficial)
   - Auth: service account JSON key (não OAuth interativo) — doc Google "Using service accounts to access Search Console API"
   - Endpoint: `https://www.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query`
   - Pull: últimos 7, 28, e 90 dias separados
   - Dimensões: `query`, `page`, `country`, `device`
   - Output: `data/seo/gsc-{YYYY-MM-DD}.json` (dia da semana em que foi rodado)

2. Service account + env vars:
   - `GSC_SERVICE_ACCOUNT_EMAIL`
   - `GSC_SERVICE_ACCOUNT_KEY` (base64-encoded JSON)
   - `GSC_SITE` = `sc-domain:pocketdm.com.br`
   - **Human setup task (documentar em `docs/seo-workflow.md`):** criar service account no Google Cloud, adicionar como user do GSC property, exportar key

3. `package.json` script: `"seo:gsc-export": "tsx scripts/gsc-export.ts"`

4. GitHub Action (opcional): roda toda segunda 8am BRT, commita `data/seo/gsc-*.json` no repo. Se optar por não usar GHA agora, documentar "rode manual" em workflow.

**Anti-patterns:**
```ts
// ❌ OAuth interativo (quebra automação)
// ❌ Hardcodar service account key no código
// ❌ Commitar o JSON key (.gitignore obrigatório)
// ❌ Pull de 90 dias todo dia (rate limit GSC)
// ✅ Service account com escopo readonly
// ✅ Cache local diário — se já tem o JSON do dia, skip
```

**AC:**
- [ ] Script roda em <1min
- [ ] Produz arquivo `data/seo/gsc-YYYY-MM-DD.json` com campos: `period_7d`, `period_28d`, `period_90d`, cada um com `top_queries`, `top_pages`, `countries`, `devices`
- [ ] Service account setup documentado em `docs/seo-workflow.md`
- [ ] `.gitignore` inclui qualquer file de credencial local (`*.gsa.json`)
- [ ] Roda sem erros com env vars reais (Daniel testa)

**Commit:** `feat(seo): epic C story 1 — GSC API export script`

---

### C2 — SEO click-flow tracking (~3h, P1)

**Problema:** `trackEvent('page:view')` existe mas não capturamos de onde veio o visitante (referrer/UTM) nem se converteu (chegou em `/try` → iniciou combate → criou conta). Sem isso, não sabemos qual query de Google gera signup real.

**Solução:**

1. **Extender `PageViewTracker`** ([components/analytics/PageViewTracker.tsx](../components/analytics/PageViewTracker.tsx)):
   - Capturar `document.referrer` (já faz) → parse Google search referrer → extrair query term se presente na URL de origem
   - Salvar query + landing page em `sessionStorage` como `pocketdm_seo_entry`: `{ query, landing_page, referrer, ts }`
   - Na PRIMEIRA page view da sessão apenas (subsequent navigation não sobrescreve)

2. **Hook em eventos existentes** pra carregar entry context:
   - `trackEvent('combat:start')` (já existe? buscar em `lib/stores/guest-combat-store.ts`) — adicionar `seo_entry` se presente em sessionStorage
   - `trackEvent('auth:signup')` — idem
   - Isso permite report "esta query gerou X signups"

3. **Endpoint de report** `app/api/analytics/seo-funnel/route.ts`:
   - GET retorna JSON agregado: top queries de entrada nos últimos 30d × conversão (signup rate, combat start rate)
   - Read-only, auth via Supabase (só Daniel acessa)
   - Grava em tabela `seo_funnel_events` (criar migration)

4. **Migration:** `migrations/XXX_seo_funnel_events.sql` — tabela com `ts`, `anon_id`, `query`, `landing_page`, `event_type` (`landing` | `combat_start` | `signup`)

**Anti-patterns:**
```ts
// ❌ Capturar referrer query em toda page view (só na primeira)
// ❌ Storar em localStorage (não queremos cross-session)
// ❌ Mandar query literal pro Google Analytics — privacidade
// ✅ Hash ou normalize query se armazenar — ou manter só em sessionStorage até evento terminal
// ✅ Respeitar DNT (já tem check em lib/analytics/track.ts)
```

**AC:**
- [ ] Session entry capture funcional — test manual: Google-search-like referrer + landing page aparece em sessionStorage
- [ ] Endpoint `/api/analytics/seo-funnel` retorna agregação
- [ ] Migration criada + `migrations/` doc lista
- [ ] Evento `combat:start` e `auth:signup` carregam seo_entry

**Commit:** `feat(seo): epic C story 2 — SEO click-flow tracking + funnel report`

---

### C3 — Content gap analysis (~2h, P1)

**Problema:** GSC mostra queries que geram impressão mas não temos página dedicada. Detectar manualmente é trabalhoso. Script automatiza.

**Solução:**

1. Criar `scripts/content-gap-analysis.ts`:
   - Lê `data/seo/gsc-*.json` mais recente (do C1)
   - Para cada query com >10 impressões e posição >20:
     - Busca qual URL do site apareceu
     - Compara com sitemap — tem página dedicada pra essa query?
     - Se não, classifica como "gap candidate"
   - Output: `docs/seo-content-gaps-YYYY-MM-DD.md` com tabela: query | impressões | posição | página atual | sugestão

2. Heurística de sugestão:
   - Se query tem "d&d 5e" + noun (monster/spell/class) + nome não-SRD → skip (não vamos criar)
   - Se query tem "d&d 5e" + adjective (best/list/guide) → sugere "hub page /guias/{slug}"
   - Se query é nome SRD direto → deveria já ter detail page (investigar por que não aparece em pos 1–5)

**AC:**
- [ ] Roda em <30s
- [ ] Output em `docs/seo-content-gaps-YYYY-MM-DD.md`
- [ ] Identifica pelo menos 5 gaps no primeiro run (base atual tem queries tipo "cr calculator 5e" pos 83, "lemure d&d" pos 71 — são candidatos a gap)

**Commit:** `feat(seo): epic C story 3 — content gap analysis from GSC data`

---

### C4 — Monitoring dashboard auto-update (~2h, P2)

**Problema:** [docs/seo-monitoring.md](./seo-monitoring.md) tem tabela de query-âncoras com colunas "30d", "60d", "90d" que precisam ser preenchidas manualmente a cada marco. GSC export (C1) já tem os dados — por que não preencher automaticamente?

**Solução:**

1. Criar `scripts/update-seo-dashboard.ts`:
   - Lê `data/seo/gsc-*.json` mais recente
   - Parseia `docs/seo-monitoring.md`
   - Para cada query-âncora na tabela:
     - Busca posição atual no JSON
     - Atualiza coluna correspondente (30d/60d/90d baseado em data)
     - Calcula delta vs baseline
   - Escreve de volta com seção "Last updated: YYYY-MM-DD"

2. Cron ou manual:
   - `npm run seo:dashboard-update`
   - Se GHA foi adicionado no C1, incluir esse script na mesma action (após export)

**Anti-patterns:**
```
// ❌ Reescrever seção manual ou histórica do doc — preserve tudo que não é a tabela
// ❌ Perder o conteúdo histórico (preserve linhas de commit log)
// ✅ Use marcador <!-- auto-updated:start --> ... <!-- auto-updated:end --> ao redor da tabela
```

**AC:**
- [ ] Script atualiza só a seção entre marcadores
- [ ] Último deltas calculados corretamente
- [ ] Roda sem erro com `data/seo/gsc-*.json` presente
- [ ] Falha gracefully se JSON ausente (log + exit 0)

**Commit:** `feat(seo): epic C story 4 — auto-update seo-monitoring dashboard from GSC data`

---

## 🔄 Ordem de execução recomendada

Dependência forte: C1 antes de C3 e C4 (eles consomem output de C1).

```
Day 1:
  C1 (GSC export) — 3h
  C2 (click-flow) — 3h (paralelo com C1 se 2 agentes, independente)

Day 2:
  C3 (content gap) — 2h
  C4 (dashboard auto) — 2h
```

## Validação pós-épico

```bash
# Script GSC export
npm run seo:gsc-export                                  # produz data/seo/gsc-*.json
ls data/seo/gsc-*.json                                  # existe

# Click-flow
# Manual: visitar via referrer simulado, ver sessionStorage "pocketdm_seo_entry"
# Manual: completar /try → chegar em signup → ver evento com query de origem

# Content gap
npm run seo:content-gap                                 # produz docs/seo-content-gaps-*.md
cat docs/seo-content-gaps-$(date +%F).md | head -20

# Dashboard update
npm run seo:dashboard-update
git diff docs/seo-monitoring.md                          # mostra só a tabela entre marcadores
```

## 🚫 NÃO faz neste épico

- ❌ Hub pages novos (Épico B)
- ❌ Blog split / refactor (Épico A, já mergeado)
- ❌ Looker Studio / BI externa (mencionado em `docs/seo-monitoring.md` como opcional — só fazer se escala justificar)

---

## 📝 COMMIT EARLY, COMMIT OFTEN

Padrão Épico A/B. Push após cada story. Este épico tem menos risco de merge (scripts isolados), mas mantém disciplina.

Bom trabalho, mestre. 🧙‍♂️
