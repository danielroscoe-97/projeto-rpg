# Sprint Plan — Metodologia Pocket DM: Community Page & Dashboard Integration

**Data:** 2026-04-04
**Origem:** Party Mode session (Mary + Winston + John + Sally + Dani_)
**Epic pai:** `docs/epic-metodologia-pocket-dm.md`
**Epic derivado:** `docs/epic-methodology-community-page.md`

---

## Principios

1. **Dados reais desde o dia 1** — a barra mostra o numero real, mesmo que seja 12/5000
2. **Pagina como ferramenta de growth** — nao e informativa, e conversao
3. **Hooks organicos** — DMs descobrem, nao sao empurrados
4. **SRD-safe** — so dados agregados, nunca individuais
5. **Bilingual** — pt-BR + en em tudo

---

## Sprint Methodology-0 — Foundation (Infra de Dados)

> Pre-requisito para tudo. Cria a base de dados que alimenta a barra dourada.

### Epico METH-0: Data Foundation

| # | Story | Prioridade | Tamanho | Deps |
|---|-------|------------|---------|------|
| METH-0.1 | Excluded Accounts & Methodology Stats RPC | P0 | M | encounter_snapshots existente |
| METH-0.2 | API Endpoint `/api/methodology/stats` | P0 | P | METH-0.1 |

#### METH-0.1: Excluded Accounts & Methodology Stats RPC

**Objetivo:** Criar infra no Supabase para contar combates validos excluindo contas de teste.

**Acceptance Criteria:**
- [ ] Migration cria tabela `excluded_accounts` (user_id UUID PK, reason TEXT, created_at TIMESTAMPTZ)
- [ ] Insert na `excluded_accounts`: conta admin (danielroscoe97@gmail.com)
- [ ] RPC `get_methodology_stats()` retorna:
  ```json
  {
    "valid_combats": 147,
    "combats_with_dm_rating": 89,
    "unique_dms": 23,
    "current_phase": "collecting",
    "phase_target": 500
  }
  ```
- [ ] RPC filtra: `WHERE owner_id NOT IN (SELECT user_id FROM excluded_accounts)`
- [ ] RPC filtra: `WHERE encounter_snapshots.party_snapshot IS NOT NULL`
- [ ] RPC conta combates com `dm_difficulty_rating IS NOT NULL` separadamente
- [ ] RPC conta DMs distintos (`COUNT(DISTINCT owner_id)`)
- [ ] `current_phase` derivado: <500 = "collecting", <2000 = "exploratory", <5000 = "model_v1", >=5000 = "contextual"

**Notas tecnicas:**
- Reutilizar pattern de migrations existente (proximo numero sequencial)
- RPC deve ser `SECURITY DEFINER` com `search_path = public`
- Nao expor dados individuais — so agregados

---

#### METH-0.2: API Endpoint `/api/methodology/stats`

**Objetivo:** Endpoint publico cached que alimenta a barra dourada.

**Acceptance Criteria:**
- [ ] `GET /api/methodology/stats` retorna JSON com stats do RPC
- [ ] Response cached com `Cache-Control: public, s-maxage=300, stale-while-revalidate=60` (5min)
- [ ] Nao requer autenticacao (pagina publica)
- [ ] Rate limit basico (10 req/min por IP)
- [ ] Fallback graceful se RPC falhar: `{ valid_combats: 0, ... }`
- [ ] Response inclui `updated_at` timestamp

**Notas tecnicas:**
- Route handler em `app/api/methodology/stats/route.ts`
- Usar `createClient` server-side (service role nao necessario — RPC e public)
- ISR nao se aplica aqui — e route handler, nao page. Cache via headers.

---

## Sprint Methodology-1 — Pagina Publica MVP

> A pagina `/methodology` com a barra dourada funcionando com dados reais.

### Epico METH-1: Community Page

| # | Story | Prioridade | Tamanho | Deps |
|---|-------|------------|---------|------|
| METH-1.1 | MethodologyProgressBar Component | P0 | G | METH-0.2 |
| METH-1.2 | Methodology Page — Layout & 5 Sections | P0 | G | METH-1.1 |
| METH-1.3 | SEO, JSON-LD & i18n | P0 | M | METH-1.2 |
| METH-1.4 | Navigation Links (Footer + About) | P1 | P | METH-1.2 |

#### METH-1.1: MethodologyProgressBar Component

**Objetivo:** Componente reutilizavel da barra de HP dourada com milestones.

**Acceptance Criteria:**
- [ ] Componente `components/methodology/MethodologyProgressBar.tsx`
- [ ] Props: `{ current: number, target: number, milestones: Milestone[] }`
- [ ] Visual: barra dourada com gradiente `gold` → `gold-light` (#D4A853 → #E8C87A)
- [ ] Numero grande centralizado: "1,247 / 5,000 combates analisados"
- [ ] Milestones como divisorias na barra com icone + label:
  - 500: "Fase 1" (icone lupa)
  - 2,000: "Fase 2" (icone engrenagem)
  - 5,000: "Fase 3" (icone cerebro)
- [ ] Milestone atingido: icone ganha glow dourado
- [ ] Milestone futuro: icone opaco (opacity-40)
- [ ] Animacao: `ember-float` particulas sutis no fill da barra
- [ ] Responsivo: mobile full-width, milestones viram dots com tooltip
- [ ] Classe `.pixel-art` nos icones de milestone
- [ ] Acessivel: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [ ] Skeleton loading state enquanto fetch nao completa

**Notas tecnicas:**
- Reutilizar animacoes de `globals.css` (ember-float, rune-pulse)
- Usar cores do tailwind config (gold, gold-light, gold-dark)
- Icones de milestone: Lucide icons (Search, Cog, Brain) ou pixel-art custom
- Componente client-side (usa fetch pra API)

---

#### METH-1.2: Methodology Page — Layout & 5 Sections

**Objetivo:** Pagina publica `/methodology` com as 5 secoes definidas no epic.

**Acceptance Criteria:**
- [ ] Rota: `app/methodology/page.tsx` (server component com metadata)
- [ ] Layout: Navbar + conteudo + Footer (mesmo pattern de `/about`)
- [ ] **Secao 1 — Barra Dourada**: `<MethodologyProgressBar>` com dados reais via fetch
- [ ] **Secao 2 — Headline**: 
  - H1: "Estamos construindo o calculo de dificuldade mais preciso de D&D"
  - Subtitulo: "Baseado em dados reais de combates, nao tabelas estaticas"
- [ ] **Secao 3 — Como Funciona**: 3 cards horizontais (coluna em mobile)
  - Card 1: icone espada + "Rode um combate" + descricao
  - Card 2: icone estrela + "Vote na dificuldade" + descricao
  - Card 3: icone pocao + "O modelo aprende" + descricao
- [ ] **Secao 4 — Por que o DMG Erra**: 
  - Comparacao lado a lado DMG vs Pocket DM
  - Estilo visual: 2 cards contrastantes (cinza apagado vs dourado vibrante)
  - Copy que gera identificacao: "O DMG diz Easy. Sua party quase morreu."
- [ ] **Secao 5 — CTA**:
  - Nao logado: "Crie sua conta gratuita e comece a contribuir" → `/signup`
  - Logado: "Rode seu proximo combate" → `/app/session/new`
  - Estilo: botao gold grande centralizado
- [ ] **Teaser Spell Tiers**: banner sutil antes do footer
  - "Em breve: Tier de Magias — vote se Fireball e realmente nivel 3."
  - Visual discreto (border-border, text-muted-foreground)
- [ ] Metricas secundarias abaixo da barra: DMs contribuindo, taxa de votacao
- [ ] Dark theme consistente com resto do site
- [ ] Mobile-first responsive

**Notas tecnicas:**
- Seguir pattern da `/about` page (server component, Navbar, Footer)
- Pixel art assets dos cards: reutilizar `/public/art/icons/` existentes
- CTA logado/nao-logado: checar session server-side ou usar client component

---

#### METH-1.3: SEO, JSON-LD & i18n

**Objetivo:** Otimizar pagina para SEO e suportar bilingual.

**Acceptance Criteria:**
- [ ] Metadata pt-BR:
  - Title: "Metodologia Pocket DM — Calculo de Dificuldade Baseado em Dados Reais"
  - Description: ~155 chars sobre o projeto e convite pra contribuir
- [ ] Metadata en:
  - Title: "Pocket DM Methodology — Data-Driven Difficulty Calculator"
  - Description: English equivalent
- [ ] `alternates.canonical: "/methodology"`
- [ ] `alternates.languages: { "pt-BR": "/methodology", en: "/methodology" }`
- [ ] JSON-LD tipo `ResearchProject`:
  ```json
  {
    "@type": "ResearchProject",
    "name": "Pocket DM Methodology",
    "description": "...",
    "url": "https://pocketdm.com.br/methodology",
    "funder": { "@type": "Organization", "name": "Pocket DM" }
  }
  ```
- [ ] Todo texto da pagina usa sistema de traducao existente (ou inline conditional)
- [ ] Open Graph image (reutilizar ou criar OG card com barra dourada)

---

#### METH-1.4: Navigation Links (Footer + About)

**Objetivo:** Tornar a pagina acessivel via navegacao do site.

**Acceptance Criteria:**
- [ ] Link "Metodologia" / "Methodology" no Footer, secao de links do site
- [ ] Mencao na pagina `/about` com link: "Conhega a Metodologia Pocket DM →"
- [ ] Nao adicionar na Navbar principal (nao e feature core — manter limpa)

---

## Sprint Methodology-2 — Dashboard Hooks

> Integrar hooks no dashboard e recap pra direcionar DMs pra /methodology.

### Epico METH-2: Dashboard Integration

| # | Story | Prioridade | Tamanho | Deps |
|---|-------|------------|---------|------|
| METH-2.1 | PocketDmLabBadge no Dashboard | P0 | P | METH-1.2 |
| METH-2.2 | PostCombatMethodologyNudge | P1 | M | METH-1.2 |
| METH-2.3 | MethodologyMilestoneToast | P1 | M | METH-0.2 |

#### METH-2.1: PocketDmLabBadge no Dashboard

**Objetivo:** Icone visual no dashboard header que linka pra /methodology.

**Acceptance Criteria:**
- [ ] Componente `components/dashboard/PocketDmLabBadge.tsx`
- [ ] Visual: icone beaker/pocao pixel-art (16x16 ou 20x20)
- [ ] Animacao: `rune-pulse` sutil (2s cycle, opacity 0.7→1.0)
- [ ] Tooltip on hover: "Metodologia Pocket DM — Ajude a ciencia do RPG"
- [ ] Click → navega pra `/methodology`
- [ ] Posicao: ao lado do `StreakBadge` no header do `DashboardOverview`
- [ ] Visivel pra todos os DMs (role !== "player")
- [ ] i18n: tooltip em pt-BR e en
- [ ] Nao aparece pra players-only (so DMs contribuem dados)

**Integracao:**
- Adicionar no `DashboardOverview.tsx` ao lado do `<StreakBadge />`
- Passar traducao do tooltip via props `translations`

---

#### METH-2.2: PostCombatMethodologyNudge

**Objetivo:** Card sutil no recap pos-combate direcionando pra /methodology.

**Acceptance Criteria:**
- [ ] Componente `components/combat/PostCombatMethodologyNudge.tsx`
- [ ] Visual: card com borda dourada sutil, texto + link
- [ ] Copy: "Seu combate alimentou a Metodologia Pocket DM. Veja o progresso →"
- [ ] Link: `/methodology`
- [ ] **Trigger conditions** (TODAS devem ser true):
  - DM deu rating (dm_difficulty_rating IS NOT NULL)
  - Encounter tem snapshot valido (party_snapshot IS NOT NULL)
  - Nao e guest mode
  - Nao foi dismissed nos ultimos 7 dias (localStorage `methodology_nudge_dismissed`)
- [ ] Botao "X" pra dismiss — salva timestamp em localStorage
- [ ] Posicao: abaixo do `RecapActions`, antes do footer do recap
- [ ] i18n: pt-BR + en
- [ ] Nao aparece em guest combat (GuestCombatClient)

**Integracao:**
- Adicionar no `CombatSessionClient.tsx` na fase de recap
- Verificar que NAO aparece em `GuestCombatClient.tsx`
- Respeitar Combat Parity Rule: so Auth mode (nao Guest, nao Anon)

---

#### METH-2.3: MethodologyMilestoneToast

**Objetivo:** Toast dourado quando a comunidade atinge milestone.

**Acceptance Criteria:**
- [ ] Componente `components/dashboard/MethodologyMilestoneToast.tsx`
- [ ] Milestones: [100, 250, 500, 1000, 2000, 3000, 5000]
- [ ] Logica:
  1. No mount do dashboard, fetch `/api/methodology/stats`
  2. Comparar `valid_combats` com `localStorage.methodology_last_milestone`
  3. Se cruzou novo milestone: mostrar toast
  4. Salvar novo milestone em localStorage
- [ ] Visual: toast dourado no topo, icone de celebracao pixel-art
- [ ] Copy: "A comunidade atingiu {N} combates analisados! Veja o progresso →"
- [ ] Auto-dismiss em 8s
- [ ] Link pra `/methodology`
- [ ] Nao bloqueia interacao (position fixed, z-index adequado)
- [ ] i18n: pt-BR + en

**Integracao:**
- Renderizar no layout do dashboard (`app/app/dashboard/layout.tsx` ou dentro de `DashboardOverview`)
- Usar toast system existente se houver, senao componente standalone

---

## Sprint Methodology-3 — Easter Egg & Gamificacao

> Recompensar contribuidores e criar senso de ownership pessoal.

### Epico METH-3: Gamification

| # | Story | Prioridade | Tamanho | Deps |
|---|-------|------------|---------|------|
| METH-3.1 | ResearcherBadge & Personal Counter | P1 | M | METH-0.1 |
| METH-3.2 | Spell Tiers Teaser Banner | P2 | P | METH-1.2 |

#### METH-3.1: ResearcherBadge & Personal Counter

**Objetivo:** Easter egg no dashboard que revela contribuicao pessoal do DM.

**Acceptance Criteria:**
- [ ] RPC `get_user_methodology_contribution(user_id)` retorna:
  ```json
  { "total_combats": 23, "rated_combats": 18, "is_researcher": true }
  ```
- [ ] `is_researcher = true` quando `rated_combats >= 10`
- [ ] Componente `components/dashboard/ResearcherBadge.tsx`
- [ ] **Estado normal** (< 10 combates rated): nao aparece
- [ ] **Estado desbloqueado** (>= 10): 
  - Card no dashboard com borda dourada animada (gold glow)
  - Icone pixel-art de pergaminho ou luneta
  - Texto: "Voce e um Pesquisador Pocket DM"
  - Subtexto: "Seus {N} combates estao moldando o futuro do calculo de dificuldade"
  - Link: "Ver progresso da comunidade →" → `/methodology`
- [ ] Animacao de "reveal" na primeira vez que aparece (fade-in + scale)
- [ ] Flag em localStorage `researcher_badge_seen` pra nao repetir animacao
- [ ] i18n: pt-BR + en
- [ ] Posicao: entre Quick Actions e campanhas no dashboard

**Notas tecnicas:**
- RPC filtra `WHERE owner_id = $1 AND dm_difficulty_rating IS NOT NULL`
- Nao contar encounters de contas excluidas (mas o user nao estaria nessa lista)
- Fetch no mount do dashboard (pode ser lazy — nao bloqueia render)

---

#### METH-3.2: Spell Tiers Teaser Banner

**Objetivo:** Banner teaser sobre futuro sistema de votacao de spell tiers.

**Acceptance Criteria:**
- [ ] Banner na pagina `/methodology` antes do footer
- [ ] Copy: "Em breve: Tier de Magias — Fireball e realmente nivel 3? Vote e descubra."
- [ ] Visual: borda tracejada dourada, icone de magia pixel-art, texto muted
- [ ] Nao clicavel (nao tem pra onde ir ainda)
- [ ] i18n: pt-BR + en
- [ ] Pode ser removido ou atualizado quando spell voting for implementado

---

## Resumo de Sprints

| Sprint | Epico | Stories | Estimativa | Deps |
|--------|-------|---------|------------|------|
| Methodology-0 | METH-0: Data Foundation | 2 | 1-2 dias | encounter_snapshots existente |
| Methodology-1 | METH-1: Community Page | 4 | 1 sprint (5-7 dias) | METH-0 |
| Methodology-2 | METH-2: Dashboard Hooks | 3 | 1 sprint (3-5 dias) | METH-1 |
| Methodology-3 | METH-3: Gamification | 2 | 3-4 dias | METH-0, METH-1 |

**Total: 11 stories, ~3-4 sprints**

---

## Ordem de Execucao Recomendada

```
METH-0.1 (excluded_accounts + RPC)
  └─→ METH-0.2 (API endpoint)
        └─→ METH-1.1 (progress bar component)
              └─→ METH-1.2 (page layout)
                    ├─→ METH-1.3 (SEO + i18n)
                    ├─→ METH-1.4 (nav links)
                    ├─→ METH-2.1 (lab badge)
                    ├─→ METH-2.2 (post-combat nudge)
                    └─→ METH-2.3 (milestone toast)
                          └─→ METH-3.1 (researcher badge)
                                └─→ METH-3.2 (spell teaser)
```

**Paralelizaveis**: Apos METH-1.2, stories 1.3, 1.4, 2.1, 2.2, 2.3 podem rodar em paralelo.

---

## Checklist Pre-Sprint

- [ ] Confirmar numero da proxima migration (verificar ultimo em `supabase/migrations/`)
- [ ] Confirmar email do admin na `excluded_accounts` (danielroscoe97@gmail.com)
- [ ] Verificar se ja existe algum endpoint em `/api/methodology/`
- [ ] Verificar assets pixel-art disponiveis em `/public/art/icons/`
- [ ] Confirmar pattern de i18n usado no projeto (inline vs JSON files)
