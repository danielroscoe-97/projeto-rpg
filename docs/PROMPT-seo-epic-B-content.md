# Prompt — Execute Épico B (Conteúdo + Conversão)

**Versão:** 2026-04-20 (revisão adversarial pós-party-mode)

**Pré-requisitos:**
1. Épico A (fundação técnica) 100% mergeado em master. Ver [docs/PROMPT-seo-epic-A-foundation.md](./PROMPT-seo-epic-A-foundation.md).
2. **FORTEMENTE RECOMENDADO:** Épico C story 1 (GSC export) rodado pelo menos 1x — o JSON gerado em `data/seo/gsc-*.json` permite priorizar hubs por query real com volume, evitando chute.

---

## Contexto

Pocket DM site novo, fase experimental. Épico A destravou a máquina de conteúdo (blog em 21 arquivos + hub JSON-generator bi-locale). Agora usamos pra acelerar cadência.

**Objetivos deste épico:**
1. **Ampliar superfície indexável PT-BR** — até 3 hubs novos cobrindo queries de cauda longa.
2. **Abrir frente EN** — US é mercado secundário (baseline: 243 impressões / 1 clique). Testar se conteúdo EN produz tração. Rota `/guides/[slug]` já criada no Épico A.
3. **Conversão** — tráfego que chega não converte bem pra `/try`. Sticky mobile CTA + CTA contextual por entidade.

**Leia antes:**
1. [docs/seo-architecture.md](./seo-architecture.md)
2. [docs/PROMPT-seo-epic-A-foundation.md](./PROMPT-seo-epic-A-foundation.md) — entenda o hub generator e o loader bi-locale
3. [content/hubs/README.md](../content/hubs/README.md) — schema JSON (criado no Épico A)
4. [docs/seo-baseline-2026-04-17.md](./seo-baseline-2026-04-17.md) — queries âncora
5. `data/seo/gsc-*.json` (se Épico C.1 rodou) — queries com volume real
6. `CLAUDE.md` SRD content compliance — não expor não-SRD em pages públicas

**⚠️ SRD Compliance:** Só referencie monstros/magias/classes que estejam nos whitelists de [data/srd/srd-*-whitelist.json](../data/srd/). Não linke pra conteúdo não-SRD. [filter-srd-public.ts](../scripts/filter-srd-public.ts) é autoridade.

---

## 📝 Revisão adversarial (party-mode 2026-04-20)

Correções aplicadas vs versão inicial:

- **Target queries são HIPÓTESES até GSC.1 validar.** Mary: "target sem volume = chute". Cada hub agora tem seção "Status de validação: validada por GSC | hipótese".
- **B3 calculadora:** verificado que `/calculadora-encontro` + `/methodology` existem e são públicas (não quebrará CTA).
- **B4/B5 EN:** rota `/guides/[slug]` já existe desde Épico A (A2 bi-locale). Este épico só precisa dropar os JSONs.
- **B1-B5 reduzido pra 3 hubs obrigatórios + 2 opcionais.** Em vez de 5 no total, trava 3 (1 PT + 2 EN — traduções de hubs existentes são baixo risco, alto valor) e deixa os 2 hubs PT novos (classes, raças) como opcionais GUIADOS por GSC.
- **B7 anti-pattern:** documentado que `?add=` query param precisa ser testado com `GuestCombatClient` real antes de shipar.

---

## 🗂️ Stories

| Story | Descrição | Tempo | Prioridade | Status |
|---|---|---:|---|---|
| **B4** | Hub `/guides/dnd-5e-bestiary` (EN, tradução de bestiario-dnd-5e) | 2h | **P0** | Obrigatório |
| **B5** | Hub `/guides/dnd-5e-spell-list` (EN, tradução de lista-magias) | 2h | **P0** | Obrigatório |
| **B6** | Sticky mobile CTA | 2h | **P0** | Obrigatório |
| B7 | CTA contextual em monster/spell detail pages | 3h | P1 | Recomendado |
| B1 | Hub `/guias/classes-dnd-5e` (PT-BR) | 3h | P2 | **SÓ se GSC valida query** |
| B2 | Hub `/guias/racas-dnd-5e` (PT-BR) | 3h | P2 | **SÓ se GSC valida query** |
| B3 | Hub `/guias/calculadora-encontro-5e` (PT-BR) | 3h | P2 | **SÓ se GSC valida query** |

**Total obrigatório (P0+P1):** ~9h. Total máximo (se todos hubs passarem validação GSC): ~18h.

**Commit + push ao final de CADA story.**

---

### B4 — Hub `/guides/dnd-5e-bestiary` (EN, ~2h) [P0]

**Target queries:** `dnd 5e bestiary`, `d&d 5e monsters list`, `srd bestiary`.
**Status:** Hipótese (validar em GSC após 14d). US tem 243 impressões no baseline 2026-04-17.

**Arquivo:** `content/hubs/dnd-5e-bestiary.json` com `locale: "en"`.

Estrutura espelha `/guias/bestiario-dnd-5e` mas em inglês. linkPath `/monsters`, slugs EN. Breadcrumb "Home › Guides › D&D 5e Bestiary".

**Dica:** Traduza o JSON existente `content/hubs/bestiario-dnd-5e.json` (do Épico A) — não reinvente a estrutura.

**Rota:** `app/guides/[slug]/page.tsx` já existe (criado no Épico A via A2 bi-locale). Só dropar o JSON. URL final: `/guides/dnd-5e-bestiary`.

**tracked_queries:** `["dnd 5e bestiary", "d&d 5e monsters", "srd bestiary", "dnd monsters list"]`

**AC:**
- [ ] JSON válido com `locale: "en"`
- [ ] URL `/guides/dnd-5e-bestiary` retorna 200
- [ ] Todos links internos apontam pra rotas EN (`/monsters/*`, NÃO `/monstros/*`)
- [ ] Sitemap inclui (auto via A2)
- [ ] JSON-LD em inglês (`inLanguage: "en"`)

**Commit:** `content(seo): epic B story 4 — hub /guides/dnd-5e-bestiary (EN)`

---

### B5 — Hub `/guides/dnd-5e-spell-list` (EN, ~2h) [P0]

Igual B4 mas pra magias. Espelha `/guias/lista-magias-dnd-5e`. linkPath `/spells`.

**tracked_queries:** `["d&d 5e spell list", "dnd 5e spells", "srd spells", "dnd spellbook"]`

**Commit:** `content(seo): epic B story 5 — hub /guides/dnd-5e-spell-list (EN)`

---

### B6 — Sticky mobile CTA component (~2h) [P0]

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
- [ ] Funciona em 2 hubs existentes (`/guias/bestiario-dnd-5e` + `/guias/lista-magias-dnd-5e`)
- [ ] Evento `trackEvent('cta:sticky_mobile_click', { hub: slug })` disparado no click (usar `@/lib/analytics/track`)

**Commit:** `feat(seo): epic B story 6 — sticky mobile CTA for hub pages`

---

### B7 — CTA contextual em monster/spell detail pages (~3h) [P1]

**Problema:** Detail pages têm CTA genérico `<PublicCTA>` que manda pra `/try`. Quem chegou na Tarrasca quer ver a Tarrasca no combat — CTA devia pré-preencher.

**Solução:** Estender `components/public/PublicCTA.tsx` ou criar variant `components/public/ContextualCTA.tsx`:

- Aceita prop `{ entityType: "monster" | "spell"; entitySlug: string; entityName: string }`
- CTA primary: "Iniciar combate com {entityName}" (ou EN equivalent)
- href: `/try?add={entityType}:{entitySlug}`

**IMPORTANTE — validar antes de shipar:**
1. `/try` (GuestCombatClient) já aceita query params? Buscar em [components/guest/GuestCombatClient.tsx](../components/guest/GuestCombatClient.tsx) e [lib/stores/guest-combat-store.ts](../lib/stores/guest-combat-store.ts).
2. Se **NÃO**, estender o cliente pra ler `?add=` no mount e adicionar a entidade na store. Test manual antes de merge.
3. Se **SIM**, documentar o formato aceito no JSDoc do componente.
4. Para spells: CTA secundário "Ver no grimório" → hub `/guias/lista-magias-dnd-5e#...`

**Regra Combat Parity (CLAUDE.md):** Aplica só no guest (`/try`) pois é entry-point SEO. Anon (`/join`) e Auth (`/invite`) não são destino de SEO. Documentar essa exceção no commit.

**AC:**
- [ ] Validou se GuestCombatClient aceita `?add=` (se não, estendeu)
- [ ] Monster detail pages (PT + EN) usam ContextualCTA
- [ ] Spell detail pages (PT + EN) usam ContextualCTA
- [ ] `/try?add=monster:tarrasque` abre com Tarrasca pré-selecionada no tracker (guest) — **testado manualmente**
- [ ] Evento `trackEvent('cta:contextual_click', { entity_type, entity_slug })` no click
- [ ] CTA genérico continua em hubs (não em detail) — não sobrescrever
- [ ] Build + typecheck limpo

**Commit:** `feat(seo): epic B story 7 — contextual CTA on monster/spell detail pages`

---

### ⏳ B1/B2/B3 — Hubs PT opcionais (~9h total, P2)

**CONDIÇÃO:** Criar SÓ se GSC (do Épico C.1) mostrar que a query tem pelo menos **30 impressões em 28 dias** e posição média pior que 10. Abaixo disso, é chute; melhor esperar dado ou focar em hub EN.

**Validação antes de começar (por hub):**
```bash
# Supondo data/seo/gsc-2026-04-XX.json disponível
rtk npx tsx scripts/check-hub-opportunity.ts --query="classes d&d 5e"
# Script a criar em 10min (se não existir): lê gsc-*.json, filtra query, retorna impressões + posição média
```

Se a query não passar o threshold, pula o hub e documenta em `docs/seo-epic-backlog.md` com a razão ("aguardar N dias pra re-avaliar").

---

#### B1 — Hub `/guias/classes-dnd-5e` (PT-BR, ~3h) [P2, condicional]

**Target queries (hipótese):** `classes d&d 5e`, `lista de classes dnd 5e`, `todas as classes de D&D 5a edição`.

**Arquivo:** `content/hubs/classes-dnd-5e.json`.

**Estrutura:**
- **Kicker:** "Guia · Classes"
- **H1:** "Classes D&D 5e — Guia Completo das 12 Classes SRD"
- **Lead (~150 palavras):** Introdução ao sistema de classes 5e (hit die, proficiências, features, subclasses). Confirmar count de classes no SRD conferindo `data/srd/classes-srd.json` (atualmente 12 mas pode mudar com SRD 2024).
- **Seções:**
  1. **"Classes por arquétipo"** — Guerreiros, Magos, Divinos, Peritos (agrupar conforme classes realmente no whitelist)
  2. **"Classes mais fáceis pra iniciantes"** — Fighter, Paladin, Barbarian (hit points + melee simples)
  3. **"Classes mais complexas"** — Wizard, Druid, Cleric (preparação, wildshape, domínios)
- **Iconic (6):** Fighter, Wizard, Paladin, Druid, Rogue, Bard — blurb de 2 linhas cada
- **closingParagraphs:** Como usar no Pocket DM (link `/classes-pt`, `/talentos`, `/racas` — todas confirmadas existem)
- **internalLinkCluster:** Links pros outros hubs + compendiums (magias, bestiário, itens, antecedentes, talentos)
- **CTA:** Primary = `/try` "Iniciar Combate", Secondary = `/classes-pt` "Abrir Compêndio"
- **tracked_queries:** `["classes d&d 5e", "lista de classes dnd 5e", "classes dnd 5e srd"]`

**linkPath dos items** deve ser `/classes-pt` (confirmado existe). Slugs das classes são EN (`wizard`, `cleric`, etc.) — ver [data/srd/classes-srd.json](../data/srd/classes-srd.json).

**AC:**
- [ ] Validação GSC passou (>=30 impressões / 28d) OU Daniel aprovou manualmente skip da validação
- [ ] JSON válido conforme schema `HubContent`
- [ ] Pelo menos 30 links internos
- [ ] ~800–1200 palavras de conteúdo autoral (lead + descs + blurbs + closing)
- [ ] URL `/guias/classes-dnd-5e` 200 OK após deploy
- [ ] Sitemap inclui (auto via Épico A)
- [ ] Número de classes confere com whitelist (não reivindicar 12 se whitelist tem 13)

**Commit:** `content(seo): epic B story 1 — hub /guias/classes-dnd-5e (PT-BR)`

---

#### B2 — Hub `/guias/racas-dnd-5e` (PT-BR, ~3h) [P2, condicional]

**Target queries (hipótese):** `raças d&d 5e`, `raças de personagem dnd`, `lista de raças dnd 5e`.

**Arquivo:** `content/hubs/racas-dnd-5e.json`

**Estrutura:**
- **H1:** "Raças D&D 5e — Guia das Raças SRD de Personagem" (número confirmar em [lib/srd/races-data.ts](../lib/srd/races-data.ts))
- **Lead:** Raças no 5e (tamanho, velocidade, bônus de atributo, traços, subraças)
- **Seções:**
  1. **"Raças do SRD"** — listar as raças realmente no whitelist
  2. **"Raças por atributo bônus"** — Força / Destreza / Constituição / Inteligência / Sabedoria / Carisma
  3. **"Raças mais populares em BR"** — Humano Variante, Tiefling, Meio-Elfo (opinião autoral baseada em comunidades)
- **Iconic:** 6 raças com blurbs
- **linkPath:** `/racas` (confirmado existe)
- **tracked_queries:** `["raças d&d 5e", "raças dnd 5e srd", "lista de raças dnd"]`

**AC igual ao B1 + validação GSC.**

**Commit:** `content(seo): epic B story 2 — hub /guias/racas-dnd-5e (PT-BR)`

---

#### B3 — Hub `/guias/calculadora-encontro-5e` (PT-BR, ~3h) [P2, condicional]

**Target queries (hipótese):** `calculadora encontro d&d 5e`, `cr calculator 5e`, `como balancear encontro dnd`, `encounter difficulty calculator`.

**Pré-verificado:** `/calculadora-encontro` e `/methodology` existem e são públicas (2026-04-20). CTA pode apontar sem medo.

**Arquivo:** `content/hubs/calculadora-encontro-5e.json`

**Estrutura:**
- **H1:** "Calculadora de Encontro D&D 5e — Como Balancear Combates"
- **Lead:** Explicar XP budget, dificuldade, por que a fórmula oficial do DMG 2014 é imprecisa e por que Pocket DM mudou a abordagem (link para `/methodology`).
- **Seções:**
  1. **"Como funciona a dificuldade oficial"** — XP budget × tamanho do grupo × multiplicador
  2. **"Por que a DMG é imprecisa"** — link pro `/methodology`, resumo em 3 parágrafos
  3. **"Monstros por CR"** — reutilizar estrutura do `/guias/bestiario-dnd-5e` com links a monstros icônicos por tier
- **closingParagraphs:** Como usar no `/calculadora-encontro` do Pocket DM, link pros blogs `/blog/guia-challenge-rating-dnd-5e` e `/blog/como-montar-encontro-balanceado-dnd-5e`
- **CTA:** Primary = `/calculadora-encontro` "Abrir Calculadora", Secondary = `/try` "Iniciar Combate"
- **tracked_queries:** `["calculadora encontro d&d 5e", "cr calculator 5e", "encounter difficulty calculator", "como balancear encontro dnd"]`

**AC igual ao B1 + validação GSC.**

**Commit:** `content(seo): epic B story 3 — hub /guias/calculadora-encontro-5e (PT-BR)`

---

## 🔄 Ordem de execução recomendada

### Cenário A — GSC (Épico C.1) rodou antes (ideal)
```
Day 1: B4 (bestiary EN) → B5 (spells EN) → B6 (sticky CTA)  # ~6h
Day 2: B7 (contextual CTA)                                   # ~3h
Day 3: Validar B1/B2/B3 contra GSC. Executar só os que passam. # 0-9h
```

### Cenário B — Sem dados GSC ainda
```
Day 1: B4 + B5 + B6 (low-risk, traduções + UI)  # ~6h
Day 2: B7 contextual CTA                         # ~3h
AGUARDAR Épico C.1 antes de B1/B2/B3.
```

## Validação pós-épico

```bash
# Conteúdo novo (obrigatórios P0)
curl -sI https://pocketdm.com.br/guides/dnd-5e-bestiary    # 200
curl -sI https://pocketdm.com.br/guides/dnd-5e-spell-list  # 200

# Se B1/B2/B3 entraram:
curl -sI https://pocketdm.com.br/guias/classes-dnd-5e          # 200
curl -sI https://pocketdm.com.br/guias/racas-dnd-5e             # 200
curl -sI https://pocketdm.com.br/guias/calculadora-encontro-5e  # 200

# Sitemap cresceu
curl -s https://pocketdm.com.br/sitemap.xml | grep -c "guias\|guides"

# Sticky CTA + contextual
# Manual: abrir /guides/dnd-5e-bestiary em mobile viewport, ver sticky
# Manual: abrir /monstros/tarrasca (ou /monsters/tarrasque), clicar CTA → /try com Tarrasca pré-carregada

npm run validate:seo:prod
```

## 🚫 NÃO faz neste épico

- ❌ GSC export script (Épico C)
- ❌ Click-flow dashboard (Épico C)
- ❌ Rewrite de title/description de páginas existentes (fase prematura, aguardar 30d de dados)
- ❌ Criar posts de blog novos (usar o split do A1 quando for hora)
- ❌ Hub pages sem validação GSC em queries PT-BR não-triviais (B1/B2/B3 condicionais)

---

## 📝 COMMIT EARLY, COMMIT OFTEN

Padrão Épico A. Push após cada story. Nunca >15min uncommitted.

Bom trabalho, mestre. 🧙‍♂️
