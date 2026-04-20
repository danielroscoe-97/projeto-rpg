# Prompt — Execute Épico B (Conteúdo + Conversão)

**Pré-requisito:** Épico A (fundação técnica) deve estar 100% mergeado em master antes de começar este. Ver [docs/PROMPT-seo-epic-A-foundation.md](./PROMPT-seo-epic-A-foundation.md).

---

## Contexto

Pocket DM site novo, fase experimental. Épico A destravou a máquina de conteúdo (blog em 21 arquivos + hub JSON-generator). Agora usamos pra acelerar cadência.

**Objetivos deste épico:**
1. **Ampliar superfície indexável PT-BR** — 3 hubs novos cobrindo queries de cauda longa sem detail-page dedicada (classes, raças, calculadora de encontro).
2. **Abrir frente EN** — US é mercado secundário (baseline: 243 impressões / 1 clique). Hub EN dedicado testa se conteúdo EN produz tração.
3. **Conversão** — tráfego que chega não converte bem pra `/try`. Sticky mobile CTA + CTA contextual por entidade.

**Leia antes:**
1. [docs/seo-architecture.md](./seo-architecture.md)
2. [docs/PROMPT-seo-epic-A-foundation.md](./PROMPT-seo-epic-A-foundation.md) — entenda o hub generator
3. [content/hubs/README.md](../content/hubs/README.md) — schema JSON (criado no Épico A)
4. [docs/seo-baseline-2026-04-17.md](./seo-baseline-2026-04-17.md) — queries âncora
5. `CLAUDE.md` SRD content compliance — não expor não-SRD em pages públicas

**⚠️ SRD Compliance:** Só referencie monstros/magias/classes que estejam nos whitelists de [data/srd/srd-*-whitelist.json](../data/srd/). Não linke pra conteúdo não-SRD. [filter-srd-public.ts](../scripts/filter-srd-public.ts) é autoridade.

---

## 🗂️ Stories

| Story | Descrição | Tempo | Prioridade |
|---|---|---:|---|
| B1 | Hub `/guias/classes-dnd-5e` (PT-BR) | 3h | P0 |
| B2 | Hub `/guias/racas-dnd-5e` (PT-BR) | 3h | P0 |
| B3 | Hub `/guias/calculadora-encontro-5e` (PT-BR) | 3h | P1 |
| B4 | Hub `/guides/dnd-5e-bestiary` (EN) | 2h | P1 |
| B5 | Hub `/guides/dnd-5e-spell-list` (EN) | 2h | P1 |
| B6 | Sticky mobile CTA component | 2h | P1 |
| B7 | CTA contextual em monster/spell detail pages | 3h | P2 |

**Total:** ~18h. Pode dividir em 2 agentes: um foca B1+B2+B3 (hubs PT), outro B4+B5+B6+B7 (EN + CTA).

**Commit + push ao final de CADA story.**

---

### B1 — Hub `/guias/classes-dnd-5e` (PT-BR, ~3h)

**Target queries:** `classes d&d 5e`, `lista de classes dnd 5e`, `todas as classes de D&D 5a edição`.

**Deliverable:** Arquivo `content/hubs/classes-dnd-5e.json` seguindo schema `HubContent`.

**Estrutura de seções:**
- **Kicker:** "Guia · Classes"
- **H1:** "Classes D&D 5e — Guia Completo das 12 Classes SRD"
- **Lead (~150 palavras):** Introdução ao sistema de classes 5e (hit die, proficiências, features, subclasses). Mencionar que há 12 no SRD, cada uma definindo um arquétipo.
- **Seções (conforme schema):**
  1. **"Classes por arquétipo"** — Guerreiros (Barbarian, Fighter, Paladin, Ranger), Magos (Wizard, Sorcerer, Warlock), Divinos (Cleric, Druid), Peritos (Rogue, Bard, Monk)
  2. **"Classes mais fáceis pra iniciantes"** — Fighter, Paladin, Barbarian (hit points + melee simples)
  3. **"Classes mais complexas"** — Wizard (preparação de magias), Druid (wildshape), Cleric (domínios)
- **Iconic (6):** Fighter, Wizard, Paladin, Druid, Rogue, Bard — blurb de 2 linhas cada
- **closingParagraphs:** Como usar no Pocket DM (link `/classes-pt`, `/talentos`, `/racas`)
- **internalLinkCluster:** Links pros outros hubs + compendiums (magias, bestiário, itens, antecedentes, talentos)
- **CTA:** Primary = `/try` "Iniciar Combate", Secondary = `/classes-pt` "Abrir Compêndio"
- **tracked_queries:** `["classes d&d 5e", "lista de classes dnd 5e", "classes dnd 5e srd"]`

**linkPath dos items** deve ser `/classes-pt` (não `/classes` — que é EN). Slugs das classes são EN (`wizard`, `cleric`, etc.) — ver [data/srd/classes-srd.json](../data/srd/classes-srd.json).

**Critério de aceite:**
- [ ] JSON válido conforme schema `HubContent`
- [ ] Pelo menos 30 links internos (30+ items entre seções + iconic + internalLinkCluster)
- [ ] ~800–1200 palavras de conteúdo autoral (somando lead + descs + blurbs + closing)
- [ ] URL `/guias/classes-dnd-5e` 200 OK após deploy
- [ ] Sitemap inclui (auto via Épico A)
- [ ] Rich Results Test passa (`Article` + `BreadcrumbList`)

**Commit:** `content(seo): epic B story 1 — hub /guias/classes-dnd-5e (PT-BR)`

---

### B2 — Hub `/guias/racas-dnd-5e` (PT-BR, ~3h)

**Target queries:** `raças d&d 5e`, `raças de personagem dnd`, `lista de raças dnd 5e`.

**Arquivo:** `content/hubs/racas-dnd-5e.json`

**Estrutura:**
- **H1:** "Raças D&D 5e — Guia das 9 Raças SRD de Personagem"
- **Lead:** Raças no 5e (tamanho, velocidade, bônus de atributo, traços, subraças). SRD tem 9.
- **Seções:**
  1. **"Raças do SRD"** — Humano, Elfo, Anão, Halfling, Meio-Elfo, Meio-Orc, Tiefling, Draconato, Gnomo
  2. **"Raças por atributo bônus"** — Força (Meio-Orc, Draconato), Destreza (Elfo, Halfling), Constituição (Anão), Inteligência (Gnomo, Tiefling), Sabedoria (Humano variant), Carisma (Meio-Elfo, Tiefling, Draconato)
  3. **"Raças mais populares em BR"** — Humano Variante, Tiefling, Meio-Elfo (opinião autoral baseada em comunidades)
- **Iconic:** Elfo, Anão, Tiefling, Draconato, Meio-Elfo, Halfling
- **linkPath:** `/racas` — slugs ver [lib/srd/races-data.ts](../lib/srd/races-data.ts)
- **tracked_queries:** `["raças d&d 5e", "raças dnd 5e srd", "lista de raças dnd"]`

**AC igual ao B1.**

**Commit:** `content(seo): epic B story 2 — hub /guias/racas-dnd-5e (PT-BR)`

---

### B3 — Hub `/guias/calculadora-encontro-5e` (PT-BR, ~3h)

**Target queries:** `calculadora encontro d&d 5e`, `cr calculator 5e`, `como balancear encontro dnd`, `encounter difficulty calculator`.

**Arquivo:** `content/hubs/calculadora-encontro-5e.json`

**Estrutura:**
- **H1:** "Calculadora de Encontro D&D 5e — Como Balancear Combates"
- **Lead:** Explicar XP budget, dificuldade (fácil/médio/difícil/mortal), por que a fórmula oficial do DMG 2014 é imprecisa e por que Pocket DM mudou a abordagem (link para `/methodology`).
- **Seções:**
  1. **"Como funciona a dificuldade oficial"** — XP budget × tamanho do grupo × multiplicador de monstros
  2. **"Por que a DMG é imprecisa"** — link pro `/methodology`, resumo em 3 parágrafos
  3. **"Monstros por CR"** — reutilizar estrutura do `/guias/bestiario-dnd-5e` com links a monstros icônicos por tier
- **closingParagraphs:** Como usar no `/calculadora-encontro` do Pocket DM, link pros blogs `/blog/guia-challenge-rating-dnd-5e` e `/blog/como-montar-encontro-balanceado-dnd-5e`
- **CTA:** Primary = `/calculadora-encontro` "Abrir Calculadora", Secondary = `/try` "Iniciar Combate"
- **tracked_queries:** `["calculadora encontro d&d 5e", "cr calculator 5e", "encounter difficulty calculator", "como balancear encontro dnd"]`

**AC igual ao B1.**

**Commit:** `content(seo): epic B story 3 — hub /guias/calculadora-encontro-5e (PT-BR)`

---

### B4 — Hub `/guides/dnd-5e-bestiary` (EN, ~2h)

**Target queries:** `dnd 5e bestiary`, `d&d 5e monsters list`, `srd bestiary`.

**Arquivo:** `content/hubs/dnd-5e-bestiary.json` com `locale: "en"`.

Estrutura espelha `/guias/bestiario-dnd-5e` mas em inglês. linkPath `/monsters`, slugs EN. Breadcrumb "Home › Guides › D&D 5e Bestiary".

**Dica:** Traduza o JSON existente `content/hubs/bestiario-dnd-5e.json` (do Épico A) — não reinvente a estrutura.

**Rota EN:** Criar `app/guides/[slug]/page.tsx` espelhando `app/guias/[slug]/page.tsx` se rota dinâmica do Épico A não cobre ambos locales. Alternativa: incluir locale no JSON (já tem) e ter `app/guides/[slug]/page.tsx` + `app/guias/[slug]/page.tsx` ambas lendo `content/hubs/*.json` mas filtrando por `locale`. Consultar o agente do Épico A antes.

**tracked_queries:** `["dnd 5e bestiary", "d&d 5e monsters", "srd bestiary", "dnd monsters list"]`

**Commit:** `content(seo): epic B story 4 — hub /guides/dnd-5e-bestiary (EN)`

---

### B5 — Hub `/guides/dnd-5e-spell-list` (EN, ~2h)

Igual B4 mas pra magias. Espelha `/guias/lista-magias-dnd-5e`. linkPath `/spells`.

**tracked_queries:** `["d&d 5e spell list", "dnd 5e spells", "srd spells", "dnd spellbook"]`

**Commit:** `content(seo): epic B story 5 — hub /guides/dnd-5e-spell-list (EN)`

---

### B6 — Sticky mobile CTA component (~2h)

**Problema:** Mobile CTR 7,87% (vs desktop 1,32%) — mobile converte melhor mas CTA atual não é sticky. Usuário rola o hub, perde o CTA, sai sem clicar.

**Deliverable:** `components/seo/StickyMobileCTA.tsx`

- Client component (`"use client"`)
- Visível apenas em viewport `<md` (Tailwind `md:hidden`)
- Fixed bottom, z-index alto, safe-area-inset-bottom
- Aparece após scroll de 300px (usar `IntersectionObserver` ou `window.scrollY`)
- Desaparece quando chega perto do CTA main do hub (não duplicar visualmente)
- Conteúdo: label + CTA primary (`/try`)
- Props: `{ label: string; href?: string; ctaText?: string }` com defaults pra D&D guias

**Onde montar:** No `HubPageTemplate` (componente do Épico A) — incluir o sticky como render final dentro do `<main>`.

**Anti-patterns:**
```tsx
// ❌ Não use position:fixed sem safe-area — quebra em iOS notch
// ❌ Não anime entrada/saída com transition pesada — mobile perf sensível
// ✅ Use Tailwind translate-y para hide animado, 200ms
// ✅ Teste em Safari iOS real — Chrome mobile devtools mente sobre safe-area
```

**AC:**
- [ ] Renderiza só em mobile (`md:hidden`)
- [ ] Aparece após 300px scroll
- [ ] Desaparece quando main CTA entra no viewport
- [ ] Funciona em 2 hubs existentes
- [ ] Evento `trackEvent('cta:sticky_mobile_click', { hub: slug })` disparado no click (usar `@/lib/analytics/track`)

**Commit:** `feat(seo): epic B story 6 — sticky mobile CTA for hub pages`

---

### B7 — CTA contextual em monster/spell detail pages (~3h)

**Problema:** Detail pages têm CTA genérico `<PublicCTA>` que manda pra `/try`. Quem chegou na Tarrasca quer ver a Tarrasca no combat — CTA devia pré-preencher.

**Solução:** Estender `components/public/PublicCTA.tsx` ou criar variant `components/public/ContextualCTA.tsx`:

- Aceita prop `{ entityType: "monster" | "spell"; entitySlug: string; entityName: string }`
- CTA primary: "Iniciar combate com {entityName}" (ou EN equivalent)
- href: `/try?add={entityType}:{entitySlug}`
- `/try` (GuestCombatClient) já aceita query params? Se não, estender — ver [components/guest/GuestCombatClient.tsx](../components/guest/GuestCombatClient.tsx) e [lib/stores/guest-combat-store.ts](../lib/stores/guest-combat-store.ts).
- Para spells: CTA secundário "Ver no grimório" → hub `/guias/lista-magias-dnd-5e#...`

**Regra Combat Parity (CLAUDE.md):** Aplica só no guest (`/try`) pois é entry-point SEO. Anon (`/join`) e Auth (`/invite`) não são destino de SEO. Documentar essa exceção no commit.

**AC:**
- [ ] Monster detail pages (PT + EN) usam ContextualCTA
- [ ] Spell detail pages (PT + EN) usam ContextualCTA
- [ ] `/try?add=monster:tarrasque` abre com Tarrasca pré-selecionada no tracker (guest)
- [ ] Evento `trackEvent('cta:contextual_click', { entity_type, entity_slug })` no click
- [ ] CTA genérico continua em hubs (não em detail) — não sobrescrever
- [ ] Build + typecheck limpo

**Commit:** `feat(seo): epic B story 7 — contextual CTA on monster/spell detail pages`

---

## 🔄 Ordem de execução recomendada

Paralelizável se 2 agentes:
```
Agent 1 (PT conteúdo):
  B1 (classes) → B2 (racas) → B3 (calculadora)

Agent 2 (EN + conversão):
  B4 (bestiary EN) → B5 (spells EN) → B6 (sticky CTA) → B7 (contextual CTA)
```

Solo: B1 → B4 → B2 → B5 → B3 → B6 → B7 (intercala PT/EN pra não cansar).

## Validação pós-épico

```bash
# Conteúdo novo
curl -sI https://pocketdm.com.br/guias/classes-dnd-5e          # 200
curl -sI https://pocketdm.com.br/guias/racas-dnd-5e             # 200
curl -sI https://pocketdm.com.br/guias/calculadora-encontro-5e  # 200
curl -sI https://pocketdm.com.br/guides/dnd-5e-bestiary          # 200
curl -sI https://pocketdm.com.br/guides/dnd-5e-spell-list        # 200

# Sitemap cresceu 5 entradas (de 7 para 12 em /guias e /guides combinados)
curl -s https://pocketdm.com.br/sitemap.xml | grep -c "guias\|guides"

# Sticky CTA + contextual
# Manual: abrir /guias/classes-dnd-5e em mobile viewport, ver sticky
# Manual: abrir /monstros/tarrasca, clicar CTA → /try com Tarrasca pré-carregada

npm run validate:seo:prod
```

## 🚫 NÃO faz neste épico

- ❌ GSC export script (Épico C)
- ❌ Click-flow dashboard (Épico C)
- ❌ Rewrite de title/description de páginas existentes (fase prematura, aguardar 30d de dados)
- ❌ Criar posts de blog novos (usar o split do A1 quando for hora)

---

## 📝 COMMIT EARLY, COMMIT OFTEN

Padrão Épico A. Push após cada story. Nunca >15min uncommitted.

Bom trabalho, mestre. 🧙‍♂️
