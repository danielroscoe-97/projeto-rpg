# Metodologia Pocket DM — Status Consolidado

**Data:** 2026-04-04
**Epic pai:** `docs/epic-metodologia-pocket-dm.md`
**Epic comunidade:** `docs/epic-methodology-community-page.md`
**Sprint plan:** `_bmad-output/implementation-artifacts/sprint-plan-methodology.md`

---

## Visao Geral das Fases

| Fase | Objetivo | Meta de Volume | Status |
|------|----------|----------------|--------|
| **Fase 0** | Coleta de dados | — | **DONE** (Sprints METH-0 a METH-3 + sessao 2026-04-04) |
| **Fase 1** | Analise Exploratoria | ~500 combates | **BLOQUEADO** (aguardando volume de dados) |
| **Fase 2** | Modelo Pocket DM v1 | ~2000 combates | BACKLOG |
| **Fase 3** | Modelo Pocket DM v2 (Contextual) | ~5000 combates | BACKLOG |
| **Fase 4** | Modelo Pocket DM v3 (Comunidade) | ~10000 combates | BACKLOG |

---

## O QUE ESTA IMPLEMENTADO E EM PRODUCAO

### Infraestrutura (Migrations 094-097)

| Item | Migration | Status |
|------|-----------|--------|
| Tabela `excluded_accounts` | 094 | Producao |
| RPC `get_methodology_stats()` (com quality tiers exclusivos) | 094 + 096 + 097 | Producao |
| RPC `get_user_methodology_contribution(p_user_id)` | 096 | Producao |
| RPC `get_similar_encounters(p_party_size, p_creature_count)` | 096 | Producao |
| Tabela `spell_tier_votes` (com CHECK length <= 100) | 096 + 097 | Producao |
| RPC `upsert_spell_tier_vote(p_spell_name, p_vote)` | 096 | Producao |
| RPC `get_spell_tier_stats(p_spell_name)` | 096 | Producao |
| Admin (danielroscoe97@gmail.com) excluido | 094 | Producao |
| 10 contas de teste excluidas | 095 | Producao |

### API Endpoints

| Endpoint | Metodo | Auth | Cache | Status |
|----------|--------|------|-------|--------|
| `/api/methodology/stats` | GET | Publico | 5min | Producao |
| `/api/methodology/contribution` | GET | Auth | — | Producao (usa RPC) |
| `/api/methodology/spell-vote` | GET | Publico | 5min | Producao |
| `/api/methodology/spell-vote` | POST | Auth (nao anon) | Rate: 10/min | Producao |
| `/api/methodology/similar` | GET | Publico | 5min | Producao |

### Pagina Publica `/methodology` (7 secoes)

| # | Secao | Componente | Status |
|---|-------|------------|--------|
| 1 | Barra Dourada + Quality Tiers | `MethodologyProgressBar` + `QualityTierBreakdown` | Producao |
| 2 | Headline | Server component | Producao |
| 3 | Como Funciona (3 cards SVG) | Server component | Producao |
| 4 | Por que o DMG Erra (comparacao) | Server component | Producao |
| 5 | CTA (signup + try free) | Server component | Producao |
| 6 | Preview: Encontros Similares | `SimilarEncounterPreview` (sliders + API) | Producao |
| 7 | Spell Tier Voting | `SpellTierVoting` (8 spells SRD-safe) | Producao |

### Dashboard Hooks (Area Logada DM)

| Hook | Componente | Trigger | Status |
|------|------------|---------|--------|
| Lab Badge | `PocketDmLabBadge` | Sempre visivel (DM-only) | Producao |
| Milestone Toast | `MethodologyMilestoneToast` | Cruza milestone [100..5000] | Producao |
| Researcher Badge | `ResearcherBadge` | >= 10 combates rated | Producao |
| Post-Combat Nudge | `PostCombatMethodologyNudge` | Fase `result` (Auth-only) | Producao |

### SEO & i18n

| Item | Status |
|------|--------|
| JSON-LD ResearchProject | Producao |
| Metadata bilingual (pt-BR + en) | Producao |
| Canonical `/methodology` | Producao |
| Namespace `methodology` (52 keys pt-BR + en) | Producao |
| Footer link "Metodologia" | Producao |

### Quality Tiers

| Tier | Criterio (excludente) |
|------|----------------------|
| **Gold** | `dm_difficulty_rating IS NOT NULL` AND `difficulty_votes >= 3` |
| **Silver** | Tem DM rating OU tem votos, MAS nao e Gold |
| **Bronze** | Valido (snapshots + combat_result) sem rating nem votos |

### Code Review Patches (7 aplicados)

| # | Patch | Status |
|---|-------|--------|
| 1 | Quality tiers excludentes (gold + silver + bronze = total) | Aplicado |
| 2 | "Silvery Barbs" removida (nao-SRD) → "Magic Missile" | Aplicado |
| 3 | Anon users bloqueados de votar (is_anonymous check) | Aplicado |
| 4 | Hardcoded PT strings movidas pra i18n | Aplicado |
| 5 | spell_name CHECK(char_length <= 100) no DB | Aplicado |
| 6 | AbortController no SimilarEncounterPreview | Aplicado |
| 7 | Rate-limit 10 req/min no POST spell-vote | Aplicado |

---

## O QUE FALTA — ORGANIZADO POR FASE

### Fase 1: Analise Exploratoria (~500 combates)

> **Bloqueante:** volume de dados. Precisa de ~500 combates validos em producao.
> **Quando comecar:** monitorar `/api/methodology/stats` — quando `valid_combats >= 300`, iniciar.

| # | Item | Tipo | Complexidade | Deps |
|---|------|------|-------------|------|
| F1-01 | **Tabela `encounter_features`** — materializar features por encounter | Migration + Script | G | Volume >= 300 |
| F1-02 | **Script `materialize-features.ts`** — batch job pra computar features de snapshots | Script | G | F1-01 |
| F1-03 | **Metricas derivadas** — difficulty_gap, dm_player_gap, lethality_index, efficiency_ratio, class_diversity_score | SQL + Script | M | F1-01 |
| F1-04 | **Dashboard admin de analise** — graficos de distribuicao (admin-only) | Pagina | G | F1-02, F1-03 |
| F1-05 | **Relatorio de hipoteses** — validar/invalidar as 6 hipoteses do epic | Doc | M | F1-04 |
| F1-06 | **Top 10 fatores** — identificar fatores que mais correlacionam com dificuldade percebida | Analise | M | F1-04 |
| F1-07 | **Preview descritivo com dados reais** — quando similar encounters tiver 5+ matches, mostrar rating medio real | Automatico | P | Ja implementado (SimilarEncounterPreview) |
| F1-08 | **Atualizar pagina /methodology** — mostrar "precisao atual" e top hipoteses | UI | M | F1-05 |

### Fase 2: Modelo Pocket DM v1 (~2000 combates)

> **Quando comecar:** apos Fase 1 concluida e `valid_combats >= 1500`.

| # | Item | Tipo | Complexidade | Deps |
|---|------|------|-------------|------|
| F2-01 | **`pocket-dm-calculator.ts`** — funcao pura: features → score 1.0-5.0 (< 100ms client-side) | Lib | G | F1-06 |
| F2-02 | **`pocket-dm-coefficients.ts`** — coeficientes do modelo (JSON estatico) | JSON | P | F2-01 |
| F2-03 | **`pocket-dm-features.ts`** — extrai features de um snapshot pra input do modelo | Lib | M | F1-01 |
| F2-04 | **`train-model.ts`** — script offline pra calcular coeficientes via regressao | Script | G | F2-01 |
| F2-05 | **`validate-model.ts`** — validacao MAE < 0.5, split 80/20 | Script | M | F2-04 |
| F2-06 | **`PocketDmBadge.tsx`** — badge no encounter builder: "Pocket DM: Moderado (3.2)" | Component | M | F2-01 |
| F2-07 | **Atualizar pagina /methodology** — score do modelo visivel no builder | UI | M | F2-06 |
| F2-08 | **Quality tiers (Gold/Silver/Bronze) com ponderacao** — peso diferente no treino | SQL | M | F2-04 |

### Fase 3: Modelo Pocket DM v2 — Contextual (~5000 combates)

> **Quando comecar:** apos Fase 2 validada e `valid_combats >= 4000`.

| # | Item | Tipo | Complexidade | Deps |
|---|------|------|-------------|------|
| F3-01 | **Sinergia de monstros** — pares que geram dificuldade acima do esperado | Analise + Lib | G | F2-01 |
| F3-02 | **Class matchups** — resistencias vs composicao melee/caster | Analise + Lib | G | F2-01 |
| F3-03 | **Curva de nivel** — dificuldade percebida muda por tier (1-4, 5-10, 11-16, 17-20) | Analise | M | F2-01 |
| F3-04 | **Fadiga de sessao** — encounters no final da sessao percebidos como mais dificeis | Analise | M | F1-01 |
| F3-05 | **Historico da campanha** — calibracao por campanha (efeito "Dark Souls") | Analise + SQL | G | F2-01 |
| F3-06 | **`PocketDmInsights.tsx`** — tooltips contextuais: "Este encontro tende a ser mais dificil pra parties sem healer" | Component | G | F3-01, F3-02 |
| F3-07 | **Sugestoes de ajuste** — "Considere remover 1 Goblin pra trazer pra Moderado" | Lib + UI | G | F3-06 |

### Fase 4: Modelo Pocket DM v3 — Comunidade (~10000 combates)

> **Quando comecar:** apos Fase 3 estavel.

| # | Item | Tipo | Complexidade | Deps |
|---|------|------|-------------|------|
| F4-01 | **Calibracao por campanha** — "Sua campanha tende a achar mais facil — ajustando" | Lib + SQL | G | F3-05 |
| F4-02 | **Comparativo publico** — "73% dos grupos votaram este como Dificil" | UI + API | M | F2-01 |
| F4-03 | **Leaderboard "Avaliador Confiavel"** — gamificar votacao consistente | Tabela + UI | G | F2-01 |
| F4-04 | **API publica** — `POST /api/pocket-dm/predict` pra integracao com outros tools | API | M | F2-01 |
| F4-05 | **Spell tier voting results** — pagina dedicada com resultados agregados | Pagina | M | Spell voting ja existe |
| F4-06 | **Opt-in data sharing** — DMs compartilham dados anonimizados | GDPR + SQL | M | — |

---

## ITENS TECNICOS PENDENTES (independentes de volume)

| # | Item | Prioridade | Complexidade | Notas |
|---|------|------------|-------------|-------|
| T-01 | **Adicionar novas contas de teste ao excluded_accounts conforme criadas** | Ongoing | P | Rodar INSERT manual ou criar admin UI |
| T-02 | **Indice em `spell_tier_votes(spell_name)`** — GROUP BY fica lento com volume | P2 | P | Criar quando tabela tiver > 1000 rows |
| T-03 | **Case-insensitive matching em spell_name** — DB exato vs UI toLower | P2 | P | Normalizar pra lowercase no INSERT ou usar CITEXT |
| T-04 | **contribution RPC nao filtra excluded_accounts** — admin pode ver badge | P3 | P | Adicionar check ou aceitar (admin nao e usuario real) |
| T-05 | **GRANT nao re-emitido no 096** — preservado pelo CREATE OR REPLACE | P3 | P | Verificar em ambiente novo |

---

## METRICAS DE SUCESSO (do epic pai)

| Metrica | Target Fase 0 | Atual | Target Fase 1 | Target Fase 2 |
|---------|--------------|-------|---------------|---------------|
| Volume de dados | — | **0 combates** | 500 | 2000 |
| MAE do modelo | — | — | — | < 0.5 |
| % combates com DM rating | — | 0% | 30% | 50% |
| DMs usando Pocket DM label | — | — | awareness | 20% preferem |
| Visitas unicas /methodology | — | TBD | 100/mes | 300/mes |
| CTR pagina → cadastro | — | TBD | 5% | 8% |
| DMs com badge "Pesquisador" | — | 0 | — | 20% dos DMs ativos |

---

## DECISOES DE DESIGN REGISTRADAS

1. **Barra primeiro, headline depois** — numero dourado e o hook visual (Sally)
2. **Rating mantem 1-5** — nao simplificar pra 3 opcoes (Dani_, 2026-04-04)
3. **Quality tiers excludentes** — gold + silver + bronze = total, sem overlap (Code Review, 2026-04-04)
4. **Spell voting SRD-only** — featured spells devem estar no SRD whitelist (Code Review, 2026-04-04)
5. **Anon users nao votam** — apenas contas reais (Code Review, 2026-04-04)
6. **Preview descritivo antes do modelo** — lookup descritivo com ~5+ matches (Mary)
7. **Trigger > batch pra materializacao** — features computadas no insert (Winston)
8. **Easter egg por discovery** — card dourado que revela ao clicar (Sally)
9. **Guest mode inferior by design** — nudge/voting sao Auth-only

---

## ARQUIVOS-CHAVE

### Migrations
| Arquivo | O que faz |
|---------|-----------|
| `supabase/migrations/094_methodology_stats.sql` | excluded_accounts + get_methodology_stats RPC |
| `supabase/migrations/095_exclude_test_accounts.sql` | 10 contas seed excluidas |
| `supabase/migrations/096_methodology_quality_tiers_spell_voting.sql` | Quality tiers, spell voting, contribution RPC, similar encounters |
| `supabase/migrations/097_methodology_review_patches.sql` | Exclusive tiers + spell_name CHECK |

### API
| Arquivo | O que faz |
|---------|-----------|
| `app/api/methodology/stats/route.ts` | Stats publicas agregadas (cached 5min) |
| `app/api/methodology/contribution/route.ts` | Contribuicao pessoal do DM (auth) |
| `app/api/methodology/spell-vote/route.ts` | GET stats + POST voto (auth, rate-limited) |
| `app/api/methodology/similar/route.ts` | Preview de encontros similares (publico) |

### Componentes
| Arquivo | O que faz |
|---------|-----------|
| `components/methodology/MethodologyProgressBar.tsx` | Barra dourada + milestones + quality tiers |
| `components/methodology/QualityTierBreakdown.tsx` | Badge Gold/Silver/Bronze |
| `components/methodology/SpellTierVoting.tsx` | Votacao interativa de spell tiers |
| `components/methodology/SimilarEncounterPreview.tsx` | Sliders + preview de encontros similares |
| `components/dashboard/PocketDmLabBadge.tsx` | Badge beaker no dashboard |
| `components/dashboard/MethodologyMilestoneToast.tsx` | Toast de milestone |
| `components/dashboard/ResearcherBadge.tsx` | Easter egg 10+ combates |
| `components/combat/PostCombatMethodologyNudge.tsx` | Nudge pos-combate (Auth-only) |

### Pagina
| Arquivo | O que faz |
|---------|-----------|
| `app/methodology/page.tsx` | Pagina publica com 7 secoes |

### Epicsdocs
| Arquivo | O que faz |
|---------|-----------|
| `docs/epic-metodologia-pocket-dm.md` | Epic pai — visao completa, fases, schema, pipeline |
| `docs/epic-methodology-community-page.md` | Epic comunidade — pagina, dashboard hooks, gamificacao |
| `docs/methodology-status-2026-04-04.md` | **ESTE DOCUMENTO** — status consolidado |
