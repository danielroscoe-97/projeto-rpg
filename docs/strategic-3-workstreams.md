# Plano Estratégico — 3 Workstreams Paralelas

> **Data:** 2026-04-04
> **Objetivo:** Organizar TODA a estratégia do Pocket DM em 3 frentes independentes que podem ser executadas em paralelo com agentes AI.
> **Autor:** Dani_ + BMAD Party Mode

---

## Status Update: 2026-04-04

### WS1 — SEO & Content
- ✅ SEO title duplication fixed (2026-04-04)
- ✅ Race name accents fixed for PT-BR meta tags (2026-04-04)
- ✅ Breadcrumb/navbar overlap fixed (2026-04-04)
- ✅ 1,122 monsters + 604 spells indexed
- ✅ Sitemap, robots, JSON-LD, hreflang live
- 🔄 Blog posts PT-BR: in progress (user working on it)
- 📋 Blog posts EN: not started

### WS2 — Product & Features
- ✅ G-01 Turn Notifications: RESOLVED (vibrate + audio + tab flash + overlay)
- ✅ G-04 Shared Notes: RESOLVED (search, collapsible chips, auto-save, NPC links)
- ✅ G-05 Character Builder: RESOLVED (ability scores, avatar upload, full CRUD)
- ✅ Sprint Demo-Ready: 8 bug fixes deployed (touch targets, overflow, SEO, etc.)
- ✅ CAT-1 Player Join: fixed (duplicate combatant + timeout cleanup)
- ✅ Sticky turn header: deployed across Guest/Auth/Player views
- ✅ Tour player path: filters DM-only steps for players
- ✅ NPC visible by default: migration 100
- 📋 G-02 PWA/Offline: not started
- 📋 G-03 D&D Beyond Import: not started

### WS3 — Marketing & Growth
- 🔄 Video demo: user finalizing (sent to editor for audio/visual effects)
- 📋 QR code cards: not started
- 📋 Events BH (Taverna de Ferro, Pixel Bar): planned for May 2026
- ✅ Beta testers: 1 active group (Lucas + 3 players)

---

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                    POCKET DM — ESTRATÉGIA Q2-Q4 2026            │
├─────────────────┬─────────────────────┬─────────────────────────┤
│  WORKSTREAM 1   │   WORKSTREAM 2      │   WORKSTREAM 3          │
│  SEO & Conteúdo │   Produto & Features│   Marketing & Growth    │
│                 │                     │                         │
│  Objetivo:      │   Objetivo:         │   Objetivo:             │
│  Dominar busca  │   Fechar gaps       │   Adquirir usuários     │
│  PT-BR + EN     │   críticos e        │   e construir           │
│                 │   proteger moats    │   presença de marca     │
│                 │                     │                         │
│  Métrica:       │   Métrica:          │   Métrica:              │
│  10K impressões │   0 gaps críticos   │   100 cadastros         │
│  Google/90 dias │   abertos           │   em 90 dias            │
├─────────────────┼─────────────────────┼─────────────────────────┤
│  Doc:           │   Doc:              │   Doc:                  │
│  workstream-1-  │   workstream-2-     │   workstream-3-         │
│  seo-content.md │   product-features  │   marketing-growth.md   │
│                 │   .md               │                         │
└─────────────────┴─────────────────────┴─────────────────────────┘
```

---

## Por que 3 Frentes?

1. **Independência** — Cada workstream pode rodar sem depender das outras
2. **Paralelismo** — 3 agentes podem trabalhar simultaneamente
3. **Clareza** — Cada frente tem escopo, métricas e entregáveis próprios
4. **Gerenciabilidade** — Dani_ pode verificar progresso de cada uma separadamente

---

## Workstream 1: SEO & Conteúdo

**Doc completo:** `docs/workstream-1-seo-content.md`

**Escopo:** Tudo relacionado a ranquear no Google, Bing e IAs. Blog posts, structured data, monitoramento, otimizações de páginas existentes.

**Entregáveis principais:**
- ✅ SEO title duplication fixed, race accents fixed, breadcrumb overlap fixed
- ✅ 1,122 monsters + 604 spells indexed with sitemap, robots, JSON-LD, hreflang
- 🔄 6 blog posts PT-BR (in progress — user working on it)
- 📋 BreadcrumbList schema em monstros/magias
- 📋 Monitoramento Search Console + Bing
- 📋 Preparação para blog posts EN (Q4)

**Tempo estimado:** Contínuo, com entregas a cada 1-2 semanas

**Dependências externas:** Nenhuma (tudo é código + conteúdo)

---

## Workstream 2: Produto & Features Críticas

**Doc completo:** `docs/workstream-2-product-features.md`

**Escopo:** Fechar gaps críticos do gap analysis, proteger moats, melhorar conversão. Foco em features que impactam diretamente retenção e proposta de valor.

**Entregáveis principais:**
- ✅ G-01 Turn Notifications (vibrate + audio + tab flash + overlay)
- ✅ G-04 Shared Notes (search, collapsible chips, auto-save, NPC links)
- ✅ G-05 Character Builder (ability scores, avatar upload, full CRUD)
- ✅ CAT-1 Player Join fixed (duplicate combatant + timeout cleanup)
- ✅ Sticky turn header deployed across Guest/Auth/Player views
- ✅ Tour player path filters DM-only steps for players
- ✅ NPC visible by default (migration 100)
- ✅ Sprint Demo-Ready: 8 bug fixes deployed (touch targets, overflow, SEO, etc.)
- 📋 Onboarding tour (guest → cadastro)
- 📋 Nudges contextuais "Upgrade to Pro"
- 📋 Spell slots tracker (feedback beta)
- 📋 G-02 PWA + offline (H2)
- 📋 G-03 D&D Beyond Import

**Tempo estimado:** Sprints de 1-2 semanas cada feature

**Dependências externas:** Supabase (push notifications), Stripe (Pro nudges)

---

## Workstream 3: Marketing, Growth & Vídeo

**Doc completo:** `docs/workstream-3-marketing-growth.md`

**Escopo:** Tudo que não é código de produto nem SEO técnico. Vídeo YouTube (HTML animado), playbook de eventos, Reddit/comunidade, Instagram, parcerias, GEO.

**Entregáveis principais:**
- 🔄 Vídeo "Pocket DM em 3 min" — user finalizing (sent to editor for audio/visual effects)
- ✅ Beta testers: 1 active group (Lucas + 3 players)
- 📋 Playbook evento bar RPG (Taverna de Ferro, Pixel Bar) — planned for May 2026
- 📋 Templates de posts Reddit/Instagram
- 📋 Materiais impressos (QR code cards)
- 📋 Estratégia GEO (aparecer nas IAs)

**Tempo estimado:** 2-3 semanas para materiais base, depois contínuo

**Dependências externas:** Impressão de cartões, acesso aos bares, conta Instagram

---

## Matriz de Prioridade Cruzada

| Prioridade | Item | Workstream | Impacto | Status |
|---|---|---|---|---|
| 🔴 P0 | Turn notifications push | WS2 | Completa proposta real-time | ✅ DONE |
| 🔴 P0 | Vídeo YouTube (HTML) | WS3 | Sinal #1 pra GEO/IAs | 🔄 Finalizing |
| 🔴 P0 | Onboarding tour | WS2 | Conversão guest → cadastro | 📋 TODO |
| 🟡 P1 | 6 blog posts PT-BR | WS1 | Tráfego orgânico | 🔄 In progress |
| 🟡 P1 | Eventos BH (Taverna/Pixel) | WS3 | Canal paralelo ao SEO | 📋 May 2026 |
| 🟡 P1 | BreadcrumbList schema | WS1 | Rich snippets Google | 📋 TODO |
| 🟡 P1 | Pro nudges contextuais | WS2 | Receita | 📋 TODO |
| 🟢 P2 | Blog posts EN | WS1 | Mercado internacional | 📋 TODO |
| 🟢 P2 | Product Hunt | WS3 | Backlinks + visibilidade | 📋 TODO |
| 🟢 P2 | PWA + offline | WS2 | Confiabilidade mesa | 📋 TODO |

---

## Como Executar com Agentes

### Iniciar Workstream 1 (SEO):
```
"Implemente o plano em docs/workstream-1-seo-content.md. 
Comece pelo item de maior prioridade não concluído."
```

### Iniciar Workstream 2 (Produto):
```
"Implemente o plano em docs/workstream-2-product-features.md. 
Comece pelo item de maior prioridade não concluído. 
Respeite CLAUDE.md (combat parity, reconnection, SRD compliance)."
```

### Iniciar Workstream 3 (Marketing):
```
"Execute o plano em docs/workstream-3-marketing-growth.md. 
Comece pelo vídeo HTML animado (item P0)."
```

---

## Documentos de Referência

| Doc | Conteúdo | Relevância |
|---|---|---|
| `docs/competitive-moats-strategy.md` | 5 moats defensáveis | WS2, WS3 |
| `docs/market-research-ttrpg-2026.md` | Dados de mercado | WS1, WS3 |
| `docs/gap-analysis-competitors-2026-03-30.md` | 10 gaps críticos | WS2 |
| `docs/estrategia-marketing-completa.md` | Marketing digital | WS1, WS3 |
| `docs/monetization-strategy.md` | Modelo freemium | WS2, WS3 |
| `docs/projecao-crescimento-2026-2027.md` | Projeções financeiras | WS3 |
| `docs/epic-seo-supremo.md` | Plano SEO waves | WS1 |
| `docs/innovation-strategy.md` | Análise estratégica | Todas |
| `docs/competitive-analysis-masterapp-2026-03-30.md` | Análise MasterApp | WS2, WS3 |
| `docs/brand-guide.md` | Identidade visual | WS3 |

---

## Checkpoints de Revisão

| Quando | O que revisar | Como |
|---|---|---|
| Semanal | Progresso de cada workstream | Checar TODOs no doc de cada WS |
| Quinzenal | Google Search Console | Impressões, cliques, posições |
| Mensal | Métricas cruzadas | Cadastros, trials, conversão |
| Trimestral | Revisão estratégica completa | Party mode com todos os agentes |

---

> **Última atualização:** 2026-04-04 (status update with WS1/WS2/WS3 progress)
