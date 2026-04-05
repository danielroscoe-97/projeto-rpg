# Workstream 1: SEO & Conteúdo

> **Data:** 2026-04-04
> **Responsável:** Agente dedicado (pode rodar independente)
> **Objetivo:** Dominar buscas PT-BR e construir presença EN long-tail
> **Métrica principal:** 10.000 impressões Google em 90 dias
> **Doc master:** `docs/strategic-3-workstreams.md`

---

## Contexto Estratégico

O Pocket DM tem **~4.000 páginas indexáveis** (monstros, magias, classes, raças, ferramentas interativas, blog). Em PT-BR, **não existe competição** — somos literalmente os únicos. Em EN, competimos com 5e.tools, D&D Beyond, Roll20 Wiki — caminho é por long-tail keywords.

### Ativos SEO Existentes (Wave 1 + 2 + 3 + 4 — JÁ IMPLEMENTADOS)

| Tipo | Volume | Rota |
|---|---|---|
| Monstros SRD (2014 + 2024 + MAD) | 1.122 × 2 locales = 2.244 | /monsters/[slug], /monstros/[slug] |
| Magias SRD | 604 × 2 locales = 1.208 | /spells/[slug], /magias/[slug] |
| Condições | 2 páginas index | /conditions, /condicoes |
| Doenças | 2 páginas index | /diseases, /doencas |
| Tipos de Dano | 2 páginas index | /damage-types, /tipos-de-dano |
| Atributos | 2 páginas index | /ability-scores, /atributos |
| Ações em Combate | 2 páginas index | /actions, /acoes-em-combate |
| Classes | 14 páginas (index + 12 detail) | /classes, /classes/[slug] |
| Raças | 20 páginas (index + 9 detail × 2 locales) | /races/[slug], /racas/[slug] |
| Dice Roller | 2 páginas | /dice, /dados |
| Encounter Builder | 2 páginas | /encounter-builder, /calculadora-encontro |
| Rules Reference | 2 páginas | /rules, /regras |
| Blog Posts | 5 artigos PT-BR | /blog/[slug] |
| Landing, About, FAQ, Pricing | 4 páginas | /, /about, /faq, /pricing |
| **TOTAL** | **~3.500+ páginas** | |

### Infraestrutura SEO (JÁ IMPLEMENTADA)

- robots.ts (permite /, bloqueia /app/, /admin/, /auth/, /api/)
- sitemap.ts dinâmico
- JSON-LD: Organization, WebApplication, SoftwareApplication, FAQPage, Article
- hreflang PT-BR ↔ EN em todas as páginas
- OG tags + Twitter cards
- Google verification + Bing verification
- Canonical tags em todas as páginas
- RSS feed

---

## PLANO DE EXECUÇÃO

### FASE A — Otimização de Páginas Existentes (Prioridade 🟡 P1)

**Objetivo:** Garantir que as 3.500+ páginas existentes estejam 100% otimizadas.

#### A.1 — BreadcrumbList Schema em Monstros e Magias
- [ ] Adicionar JSON-LD `BreadcrumbList` em `/monsters/[slug]` e `/monstros/[slug]`
- [ ] Adicionar JSON-LD `BreadcrumbList` em `/spells/[slug]` e `/magias/[slug]`
- [ ] Testar com Google Rich Results Test
- **Impacto:** Rich snippets no Google (breadcrumb trail visível nos resultados)
- **Esforço:** P (pequeno) — template único aplicado a todas as páginas

#### A.2 — Meta Descriptions Compelling
- [ ] Auditar meta descriptions de todas as páginas index (/monsters, /spells, /classes, /races, /conditions, /diseases, /damage-types, /ability-scores, /actions, /rules)
- [ ] Garantir que cada meta description tem CTA implícito + keyword + diferencial
- [ ] Formato sugerido: "[Conteúdo] — [Diferencial] | Pocket DM"
- **Esforço:** P

#### A.3 — Internal Linking
- [ ] Adicionar links cruzados entre páginas relacionadas (ex: spell page → monster que usa a spell)
- [ ] Adicionar "Monstros relacionados" no footer de cada monster page (mesmo CR, mesmo tipo)
- [ ] Adicionar "Magias desta classe" linkando /spells filtrado por classe
- **Esforço:** M (médio) — requer lógica de matching

#### A.4 — Sitemap Validation
- [ ] Submeter sitemap no Google Search Console (se não feito)
- [ ] Submeter sitemap no Bing Webmaster Tools
- [ ] Verificar que todas as 3.500+ URLs estão no sitemap
- [ ] Monitorar indexação (quantas páginas indexadas vs submetidas)
- **Esforço:** P

---

### FASE B — Blog Posts Fase 2 (Prioridade 🟡 P1)

**Objetivo:** 6 artigos educacionais PT-BR otimizados para keywords com zero competição.

**Calendário:** 2 posts por mês (Jun-Ago 2026)

| # | Título | Keyword Target | Tipo | Prioridade |
|---|---|---|---|---|
| 6 | Como montar um encontro balanceado no D&D 5e | encounter building D&D | Tutorial | 🟡 |
| 7 | Guia de Challenge Rating: como calcular dificuldade | challenge rating D&D 5e | Guia | 🟡 |
| 8 | 10 monstros que todo mestre de D&D deveria usar | melhores monstros D&D | Listicle | 🟡 |
| 9 | Como mestrar D&D pela primeira vez: guia para iniciantes | como mestrar D&D | Tutorial | 🟡 |
| 10 | Música ambiente para RPG: como escolher a trilha certa | musica para RPG | Guia | 🟢 |
| 11 | Teatro da mente vs grid: qual usar? | teatro da mente D&D | Comparativo | 🟢 |

**Formato de cada post:**
```
- 1.500-2.500 palavras
- h1 com keyword principal
- 3-5 subheadings (h2/h3) com keywords secundárias
- 1-3 screenshots do Pocket DM em contexto
- Internal links para páginas do compêndio (/monsters, /spells)
- CTA no final → /try (Testar Grátis)
- JSON-LD Article schema
- Meta description compelling
- OG image customizada
```

**Prompt para agente escrever cada post:**
```
Escreva um blog post para o Pocket DM sobre "[TÍTULO]".

Contexto:
- Pocket DM é combat tracker D&D 5e gratuito para mesas presenciais
- Público: DMs brasileiros (PT-BR nativo)
- Tom: direto, acessível, sem ser infantil. Premium.
- Keyword principal: "[KEYWORD]"
- Deve incluir links internos para /monsters, /spells, /conditions quando relevante
- Deve terminar com CTA para /try (Testar Grátis)
- 1.500-2.500 palavras
- Formato: Markdown com frontmatter (title, description, date, slug, keywords)

Referências de estilo: ver posts existentes em app/blog/
```

---

### FASE C — Blog Posts EN (Prioridade 🟢 P2, Q4 2026)

**Objetivo:** Traduzir os 5 melhores posts por tráfego para EN.

- [ ] Após 3 meses, analisar quais posts PT-BR geraram mais tráfego
- [ ] Traduzir top 5 para EN (não machine translate — adaptar para público US/global)
- [ ] Publicar em /blog/en/[slug] com hreflang
- [ ] Keywords EN: "dnd combat tracker", "best dm tools 2026", "how to speed up dnd combat"

**Não fazer agora.** Esperar dados do Search Console.

---

### FASE D — Monitoramento e Iteração (Contínuo)

#### D.1 — Monitoramento Semanal
- [ ] Google Search Console: impressões, cliques, posição média
- [ ] Bing Webmaster: páginas indexadas
- [ ] Verificar se novas páginas foram indexadas (coverage report)
- **Ferramenta:** Google Search Console (grátis), Bing Webmaster (grátis)

#### D.2 — Monitoramento Mensal
- [ ] Keywords PT-BR Tier 1: posição para cada keyword mapeada
- [ ] Keywords EN long-tail: alguma aparecendo?
- [ ] Blog posts: qual gerou mais impressões?
- [ ] Decisão: qual keyword atacar no próximo post?

#### D.3 — GEO Monitoring (IA Citations)
- [ ] Testar perguntas nas IAs mensalmente:
  - "melhor combat tracker D&D" (PT-BR)
  - "best free dnd combat tracker" (EN)
  - "combat tracker for in-person dnd" (EN)
  - "ferramentas para mestre de RPG" (PT-BR)
- [ ] Documentar resultados em planilha
- [ ] Se Pocket DM aparecer → registrar e monitorar consistência
- [ ] Se não aparecer → identificar o que as IAs estão citando e por quê

---

## Métricas de Sucesso

| Métrica | Meta 30 dias | Meta 90 dias | Meta 180 dias |
|---|---|---|---|
| Páginas indexadas (Google) | 100+ | 1.000+ | 3.000+ |
| Impressões Google (PT-BR) | 500 | 5.000 | 20.000 |
| Cliques orgânicos | 20 | 200 | 1.000 |
| Posição média (Tier 1 PT-BR) | 30-50 | Top 10 | Top 5 |
| Blog posts publicados | 5 (feito) | 8 | 11 |
| Menção em IA (manual) | 0 | 0-1 | 1+ |

---

## Riscos Específicos desta Workstream

| Risco | Mitigação |
|---|---|
| Google demora pra indexar 3.500 páginas | Sitemap submetido + páginas têm internal linking |
| Blog posts não ranqueiam | Keywords PT-BR sem competição — quase impossível não ranquear |
| Conteúdo SRD é commodity | Diferencial = interatividade + bilíngue + design |
| 5e.tools domina EN | Não competir em EN head terms; focar long-tail |

---

## Checklist de "Done" por Item

Cada entrega desta workstream deve:
- [ ] Build passando (`rtk next build`)
- [ ] Página acessível em produção (deploy Vercel)
- [ ] JSON-LD validado (Google Rich Results Test)
- [ ] Meta tags presentes (title, description, OG, canonical, alternates)
- [ ] Mobile responsive (375px sem scroll horizontal)
- [ ] CTA para /try presente
- [ ] Links internos para compêndio quando relevante

---

> **Última atualização:** 2026-04-04
