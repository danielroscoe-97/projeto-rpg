# Plano Abril 2026 — o que temos até 30/04

**Criado:** 2026-04-20
**Dias úteis restantes:** 8 (21, 22, 23, 24, 27, 28, 29, 30)
**Canal apex:** https://pocketdm.com.br
**Branch de trabalho:** `master` (push direto, sem PR — padrão do projeto)

> Este doc consolida o que está pendente entre as frentes ativas. Outras
> frentes (SEO, blog, player-identity docs) estão sendo tocadas em paralelo
> pelo Dani_ e agentes dedicados — este plano é o **mínimo** que fecha
> sprint Beta 4 + destrava Epic 02 sem gold-plating.

---

## 1. Estado de produção em 2026-04-20

- ✅ Flag `ff_hp_thresholds_v2` default `false` (bandas legacy 70/40/10) — em prod há ~15min
- ✅ HP Legend agora deriva % do flag — não dessincroniza mais
- ✅ Anon users não passam no gate de `useContentAccess` — chip "Outros livros" oculto
- ✅ `metadataBase` usa `SITE_URL` canônico — corrige Sentry `TypeError: Invalid URL`
- ✅ 8 ondas do release 2026-04-20 em prod (`docs/DELIVERY-RELEASE-2026-04-20.md`)
- ⚠️ Onda 2b Sidebar + Quick Switcher deployada **atrás da flag** `NEXT_PUBLIC_FEATURE_NEW_SIDEBAR` (OFF em prod)

---

## 2. ✅ Fechado nesta sessão (2026-04-20)

| Item | Commit | Status |
|---|---|---|
| Flag flip `ff_hp_thresholds_v2` → `false` | `eb9aa436` | ✅ em prod |
| Refactor `hp-status.ts` + `formatHpPct` + constantes | `d27a2785` | ✅ em prod |
| Fix HP Legend desync (lê flag + i18n `{pct}`) | `4601bf8c` | ✅ em prod |
| Fix anon gating em `useContentAccess` (SRD Compliance) | `fa7ef3bd` | ✅ em prod |
| Fix Sentry `TypeError: Invalid URL` em `app/layout.tsx` | `(novo)` | 🚀 deploy rolando |
| 23 unit tests novos + e2e `compendium-anon-gating` | (nos commits) | ✅ green |

---

## 3. 🔥 Must-ship até 30/04

Ordenado por **valor × esforço** e dependências.

### 3.1 — Sidebar nova (Onda 2b) em Production
- **Esforço:** 30min + 15min smoke × 2 ambientes
- **Bloqueio:** nenhum
- **Guia:** [docs/VERCEL-ACTIONS.md](VERCEL-ACTIONS.md) §2
- **Passos:**
  1. Vercel → adicionar `NEXT_PUBLIC_FEATURE_NEW_SIDEBAR=true` em **Preview**
  2. Redeploy, smoke com checklist do doc (Ctrl+B, Ctrl+K, chords `g d/c/p/s`, mobile drawer, guest não afeta)
  3. Promover env var pra **Production**
  4. Redeploy, repetir smoke
- **Critério de pronto:** flag ativa em prod, 48h sem rollback

### 3.2 — Sentry `push.t.d` (onboarding PostgrestError) — residual
- **Esforço:** 1-2h
- **Bloqueio:** nenhum; precisa do stack trace do Sentry pra achar o call-site exato
- **Root cause provável:** algum `await supabase.from(...)` em componente de onboarding rejeita com `PostgrestError` cru (`{ code, details, hint, message }`) — Sentry registra como "Object captured as exception"
- **Opções de fix:**
  - **Localizado:** achar o call-site, wrap em `new Error(error.message)` antes do reject
  - **Global:** no `ErrorTrackingProvider.tsx` normalizar rejeições de Supabase antes de capturar
- **Critério de pronto:** reissue com stack trace OU grupo de Sentry resolvido sem repetição em 7 dias

### 3.3 — Finding #1 QA beta 4: chip `⚔ [object` no filtro de tipo
- **Esforço:** 30min
- **Bloqueio:** nenhum
- **Local:** `components/combat/MonsterSearchPanel.tsx` (grupo "Tipo")
- **Sintoma:** primeiro chip renderiza como literal `⚔ [object` (provavelmente `[object Object]` truncado)
- **Hipótese:** está mapeando `types` array esperando `string[]` mas recebe `Array<{value, label}>`
- **Critério de pronto:** chip mostra tipo real ("Aberração", "Besta", etc.), todos 13 tipos renderizam

### 3.4 — Destravar E2E do Player Identity
Os 3 tickets abaixo desbloqueiam a implementação do **Epic 02** (que não cabe em abril, mas a prep deve ficar pronta).

| Ticket | Esforço | Owner sugerido |
|---|---|---|
| pgTap harness para RLS tests | 2-3d | Winston |
| E2E test hooks (`window.__pocketdm_supabase`, `NEXT_PUBLIC_E2E_MODE`) | 1-2d | Amelia |
| `data-testid` contract para claim UI | 1d | Sally |

**Detalhe em:** [docs/HANDOFF-player-identity-session-3.md §3](HANDOFF-player-identity-session-3.md)

**Critério de pronto:**
- 5 tests que hoje estão `.skip` em 01-F passam
- 3 E2E Playwright specs de identity-upgrade rodam em CI
- PR aberto → Epic 02 pode arrancar em maio

### 3.5 — Entity Graph Fase 3b (Location hierarchy)
- **Esforço:** 1 sessão (~4-6h)
- **Bloqueio:** nenhum (migração 146 já em prod com anti-cycle trigger)
- **Guia:** [docs/PROMPT-execucao-ondas-3b-3g-e-6.md §FASE 3b](PROMPT-execucao-ondas-3b-3g-e-6.md)
- **Entrega:**
  - `LocationParentSelect` component (dropdown com anti-cycle client-side)
  - `LocationForm` ganha campo "Local pai"
  - `LocationList` renderiza como árvore expansível
  - Breadcrumb no detalhe
  - i18n PT-BR + EN paridade
- **Critério de pronto:** Mestre cria "Porto Azul > Taverna do Pêndulo", UI mostra árvore, ciclo bloqueado client+DB

### 3.6 — Entity Graph Fase 3c (Links NPC↔Local) — stretch
- **Esforço:** 1 sessão (~4-6h)
- **Bloqueio:** Fase 3b (compartilha componentes)
- **Guia:** [docs/PROMPT-execucao-ondas-3b-3g-e-6.md §FASE 3c](PROMPT-execucao-ondas-3b-3g-e-6.md)
- **Entrega:**
  - `EntityTagSelector` genérico
  - `NpcForm` seção "Morada"
  - `LocationCard` seção "Habitantes"
- **Critério de pronto:** NPC Viktor linkado a Taverna aparece em ambas as fichas

---

## 4. 📅 Fora do escopo de abril (backlog honesto)

Estimativas de [HANDOFF-player-identity-session-3.md](HANDOFF-player-identity-session-3.md) e [PROMPT-execucao-ondas-3b-3g-e-6.md](PROMPT-execucao-ondas-3b-3g-e-6.md).

### Player Identity — épicos grandes
| Epic | Escopo | Estimativa |
|---|---|---|
| 02 | Player Dashboard + Invite | 20-30d |
| 03 | Conversion Moments | 20-30d |
| 04 | Player-as-DM Upsell | 35-45d |

**Release travada como big-bang** — os 3 épicos entram juntos. ~80-105d concentrados.

### Entity Graph UI — fases 3d a 3g
| Fase | Escopo | Estimativa |
|---|---|---|
| 3d | Facções (sede + membros) | 1 sessão |
| 3e | Notas linkadas + migração 151 | 1 sessão |
| 3f | Agrupamento e filtros (lista/árvore/tipo) | 1 sessão |
| 3g | Mapa visual focus + busca universal | 1 sessão (opcional) |

### Onda 6 Polish
- Deletar components legados de sidebar (após 2 semanas sem rollback)
- Mini Mind-Map real na sidebar
- RLS SQL rewrite (PERFORM em DO $$ blocks)
- Test coverage gaps (Briefing, AppSidebar, Notes Inspector, CombatInvite)
- Copy cleanup (i18n `briefing.*` órfãs, `privacy_notice`)
- Daily Notes automáticas (PRD §7.10)

### SEO (frente paralela — owner: Mary/Winston/Sally/Amelia)
- Épico A: fundação técnica (~10h)
- Épico C.1: GSC export (~6h — roda ANTES do B)
- Épico B: hubs EN + hubs PT condicionais (~9-18h)
- **Detalhe:** [docs/seo-roadmap-2026-04-20.md](seo-roadmap-2026-04-20.md)

---

## 5. 🗓️ Sugestão de cadência (8 dias úteis)

Plano **conservador** — cada linha é um dia útil, pode comprimir se 3.5/3.6 arrancarem rápido.

| Dia | Data | Foco |
|---|---|---|
| 1 | seg 21/04 | 3.1 Ativar sidebar Preview + smoke |
| 2 | ter 22/04 | 3.1 Promover sidebar Production + smoke; monitor Sentry fix deploy (24h de janela) |
| 3 | qua 23/04 | 3.3 Fix `⚔ [object` + 3.2 triage Sentry onboarding (pedir stack trace) |
| 4 | qui 24/04 | 3.4 Kickoff tickets destrava-E2E (spawn 3 agentes paralelos: Winston/Amelia/Sally) |
| 5 | seg 27/04 | 3.4 Landing: pgTap harness + E2E hooks em review |
| 6 | ter 28/04 | 3.4 data-testid contract + tests `.skip` destravados |
| 7 | qua 29/04 | 3.5 Entity Graph Fase 3b (Location hierarchy) |
| 8 | qui 30/04 | 3.6 Entity Graph Fase 3c (Links NPC↔Local) — **stretch** se 3.5 fechou |

**Se tudo correr:** Epic 02 arranca em maio com E2E pronto + 2 fases de Entity Graph UI no ar.
**Se derrapar:** Fase 3c vai pra maio; prioridade é 3.1→3.4.

---

## 6. 🚨 Riscos conhecidos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Sentry `TypeError: Invalid URL` não sumir após deploy | Baixa | SITE_URL já blindado; monitorar nas próximas 24h e, se aparecer, investigar fonte não-óbvia (Edge runtime) |
| Sidebar em Production quebra navegação em mobile | Baixa | Checklist 2.3 de VERCEL-ACTIONS cobre viewport iPhone; rollback via env var em 1min |
| Tickets E2E tomam mais que estimado | Média | Comprimir 3.4 em 3 agentes paralelos desde dia 4; aceitar que data-testid pode derrapar pra maio |
| Entity Graph 3c esbarra em scope guard (mig 147) | Baixa | 14 tests já passing + 12 aguardando Supabase CI; foundation sólida |
| Finding #1 (`⚔ [object`) exige refactor maior que 30min | Baixa | Se for tipo estrutural, escopar separado e manter na lista de polish |

---

## 7. ✅ Critério de "abril fechado" (minimum bar)

Até 30/04 23:59 BRT:

- [ ] Sidebar nova ativa em Production (sem rollback em 48h)
- [ ] Sentry `TypeError: Invalid URL` com 0 events nas últimas 24h
- [ ] Sentry `push.t.d` onboarding triaged (fix ou issue fechada com motivo)
- [ ] Finding #1 QA (`⚔ [object`) resolvido
- [ ] 3 tickets destrava-E2E merged (pgTap + test hooks + testid contract)
- [ ] Tests `.skip` em `01-F-testing-contract` passando
- [ ] Entity Graph Fase 3b em prod
- [ ] **Bônus:** Fase 3c em prod

**Não faz parte do minimum bar (aceitável deslizar pra maio):** Epic 02 scaffold, Fases 3d-3g, Onda 6 polish completa, SEO Épicos.

---

## 8. Comunicação

- Reporte no final de cada item: commit(s) + link pro smoke/check
- Bloqueio de >4h: pedir ajuda em vez de tentar destravar sozinho
- Qualquer mudança em regra IMUTÁVEL (Combat Parity, Reconnection, SRD Compliance, SEO Canonical): **pausa + review**
- Push direto pra `master` segue autorizado pelo padrão do projeto
