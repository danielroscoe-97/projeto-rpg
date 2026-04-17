# Prompt — Execute Sprint 4 SEO (Escala + Marketing)

**Cole este prompt inteiro na próxima conversa com um agente novo.**

---

## Contexto (leia antes de executar)

Você é um engenheiro sênior trabalhando no **Pocket DM** (`pocketdm.com.br`), um D&D 5e combat tracker em Next.js 15 com foco em SEO orgânico PT-BR + EN.

Nos últimos dias, foram executados **3 sprints de SEO** (+ fixes) que estabeleceram:
- Canonical apex (sem www)
- Helpers centralizados em `lib/seo/site-url.ts` e `lib/seo/metadata.ts`
- Metadata tipada + JSON-LD (Article, BreadcrumbList, CollectionPage, FAQPage, WebSite, Organization, WebApplication, FAQPage)
- XSS-safe script rendering via `jsonLdScriptProps()`
- ~70 páginas refatoradas, 9 commits deployados

**LEIA ESSES DOCS ANTES DE TOCAR EM QUALQUER CÓDIGO:**
1. `docs/seo-architecture.md` — decisões travadas, file ownership, anti-patterns
2. `docs/seo-delivery-report-2026-04-17.md` — o que foi entregue e o que ficou pendente (Sprint 4 = você)
3. `docs/seo-baseline-2026-04-17.md` — métricas GSC de 2026-04-17 (18 clicks/734 impr/4698 não-indexadas)
4. `CLAUDE.md` (seção "SEO Canonical Decisions — REGRAS IMUTÁVEIS") — o que NÃO reverter

**Decisões travadas que você NÃO pode violar:**
- Canonical é apex (`pocketdm.com.br`, sem www)
- Locale via semantic URL (`/monstros` PT + `/monsters` EN), NÃO route-prefix (`/en/*`)
- Todo URL em JSON-LD passa por `siteUrl()` (import de `lib/seo/site-url.ts`)
- Todo `<script type="application/ld+json">` usa `jsonLdScriptProps()` (XSS safety)
- Metadata de detail pages usa os builders tipados (`monsterMetadata`, `spellMetadata`, etc.)
- NUNCA restaurar `keywords` meta tag (Google ignora desde 2009)

---

## Escopo — 4 tasks em ordem de ROI

Execute na ordem abaixo. Cada task deve ser **um branch + um commit próprio** (`seo/sprint-4-{n}-{shortname}`), com typecheck limpo, push para master e deploy auto-verificado.

### T4.1 — Core Web Vitals instrumentation (🥇 prioridade 1, ~1-2h)

**Problema:** Vercel Speed Insights foi revertido (commit `c77b0fb` — pago, não está no plano Pro). Site está sem coleta de LCP/CLS/INP → impossível saber se Google penaliza por velocidade.

**Solução:**
1. Instalar `web-vitals` npm package (~5KB, free, open-source)
2. Criar componente `components/analytics/WebVitalsTracker.tsx` que:
   - Usa `onLCP`, `onCLS`, `onINP`, `onFCP`, `onTTFB` do `web-vitals`
   - Envia cada métrica via `track()` do Vercel Analytics (`@vercel/analytics` já instalado) como custom events com atributos `{ name, value, id, navigationType }`
   - Renderiza `null` (efeito-apenas)
3. Montar o componente em `app/layout.tsx` dentro do `<body>` (não no `<head>` — precisa de client-side)
4. Fazer o componente `"use client"`
5. Não instrumentar em dev (`if (process.env.NODE_ENV === "production")` ou similar)

**Critério de aceite:**
- Console do browser em produção: dispara eventos Vercel Analytics tipo `LCP`, `CLS`, etc. após carregar a página
- Vercel Analytics dashboard mostra custom events em 5-10 min
- `tsc --noEmit` limpo
- Bundle size não infla mais de 10KB gzipped

**Anti-pattern:** Não criar nova rota `/api/vitals` — use o Vercel Analytics SDK direto.

**Validar:** Instale o addon "Web Vitals" do Chrome DevTools e navegue algumas páginas — os eventos devem aparecer no Vercel Analytics nos últimos 30min.

---

### T4.2 — Blog dinâmico (matar `CONTENT_MAP` hardcoded, 🥈 prioridade 2, ~3h)

**Problema:** [app/blog/[slug]/page.tsx:72-94](app/blog/[slug]/page.tsx#L72-L94) tem um `CONTENT_MAP` com 21 imports manuais (`BlogPost1`...`BlogPost21`). Adicionar novo post requer edit em 3 lugares + risco de 404 se esquecer um.

**Solução — file-based MDX discovery:**

1. Migrar para **MDX nativo Next.js** usando `@next/mdx` OU `next-mdx-remote/rsc`. Escolha `next-mdx-remote/rsc` se já houver algum outro uso de MDX no projeto; senão `@next/mdx` é mais simples.

2. Criar `content/blog/*.mdx` — **um arquivo por post**. Frontmatter YAML:
   ```yaml
   ---
   slug: "como-usar-combat-tracker-dnd-5e"
   title: "Como usar um combat tracker em D&D 5e"
   description: "..."
   date: "2026-02-15"
   category: "tutorial"
   lang: "pt-BR"  # ou "en"
   keywords: ["combat tracker", "d&d 5e"]
   ogTitle: "Como usar combat tracker | Pocket DM"
   ---
   
   # Conteúdo do post em markdown
   ```

3. Extrair os 21 `BlogPost*` components (em `components/blog/BlogPostContent.tsx`) para arquivos MDX individuais. **Atenção:** esses componentes têm JSX custom (Image, Link, seções). Você vai precisar mapear componentes custom pro pipeline MDX (via `components` prop).

4. Reescrever `app/blog/[slug]/page.tsx`:
   - `generateStaticParams` lê `content/blog/` via `fs.readdirSync`
   - Cada post parsed com `gray-matter` (separar frontmatter de content)
   - Content renderizado com MDX
   - Eliminar `CONTENT_MAP` e o array `BLOG_POSTS` em `lib/blog/posts.ts` (ou manter como reader que parsa os MDX)

5. `app/blog/page.tsx` continua chamando `BLOG_POSTS` — mas agora a função lê do disco.

6. Sitemap (`app/sitemap.ts`) já importa `BLOG_POSTS` — se você mudar a API, verifique que continua funcionando.

**Critério de aceite:**
- Deletar um post: remove `content/blog/{slug}.mdx` — 404 correto na página, sitemap exclui, sem edits em outros lugares
- Adicionar novo post: drop de um `.mdx` em `content/blog/` + deploy = funciona
- Todos os 21 posts existentes continuam funcionando com os mesmos URLs
- SEO: metadata e JSON-LD ainda funcionam (usam `articleLd`, `breadcrumbList`, `jsonLdScriptProps` do `lib/seo/metadata.ts`)
- `tsc --noEmit` limpo
- Build passa: `rtk next build`

**Cuidados:**
- Não quebre os URLs existentes — todos os slugs atuais (21 posts) têm tráfego no GSC; mudá-los é suicídio
- Blog posts com `-en` suffix (2 posts) continuam sendo EN — mantém detecção via `lang` do frontmatter agora (melhor que suffix check)
- Preserve `revalidate = 86400` e `generateStaticParams`

**Anti-pattern:** Não use `remark-frontmatter` sem o pipeline completo (ele não extrai, só ignora). Use `gray-matter` para parse robusto.

---

### T4.3 — Hub pages de cauda-longa (🥉 prioridade 3, ~4-6h)

**Problema:** GSC mostra que brasileiros buscam queries long-tail específicas que não temos landing page dedicada pra capturar. Exemplos do baseline:
- `bestiário d&d 5e` (pos 8, CTR 0% — apontando para `/monstros`)
- `monstros por CR d&d 5e` (pos 18)
- `lista de magias d&d 5e` (pos 30)
- `magias por classe d&d 5e` (long-tail)

Criar **2 páginas de cluster/hub** evergreen — conteúdo denso (800-1500 palavras) + grid de links internos para detail pages. Objetivo: domínio relevante pra keyword, distribui autoridade pras detail pages.

**Páginas a criar:**

1. **`app/guias/bestiario-dnd-5e/page.tsx`** (PT-BR)
   - H1: "Bestiário D&D 5e Completo — 1.122 Monstros com Stat Blocks"
   - Seções:
     - Intro (o que é o SRD 5.1, o que é D&D)
     - Monstros por CR (grids de 10-15 monstros mais buscados por CR tier)
     - Monstros por tipo (Dragon, Undead, Fiend, etc.)
     - Monstros icônicos (Tarrasque, Beholder, Pit Fiend, Lich) — cada um com link pra detail
     - CTA pro `/try` (combat tracker)
   - Metadata: canonical `/guias/bestiario-dnd-5e`, alternate en → `/guides/dnd-5e-bestiary-complete` (não crie a EN agora — só alternates futuros)
   - JSON-LD: `Article` + `BreadcrumbList` (Início › Guias › Bestiário)
   - Internal links **densos**: cada monstro mencionado vira `<Link href="/monstros/{slug}">`

2. **`app/guias/lista-magias-dnd-5e/page.tsx`** (PT-BR)
   - H1: "Lista de Magias D&D 5e — Grimório Completo por Classe e Nível"
   - Seções:
     - Intro (como magia funciona no 5e, escolas de magia)
     - Magias por classe (top 10 de Mago, Clérigo, Druida, Bardo, Paladino, Feiticeiro, Bruxo, Patrulheiro)
     - Magias por nível (Truques, Nível 1, 2, ..., 9)
     - Magias icônicas (Wish, Fireball, Cure Wounds, Misty Step, Counterspell)
   - Mesma estrutura de metadata + JSON-LD

**Critérios de aceite:**
- Cada página tem mínimo 800 palavras de conteúdo original (não copia de SRD — autoral)
- Mínimo 30 links internos para detail pages por página
- JSON-LD passa Rich Results Test
- Metadata usa `buildMetadata()` ou template inline consistente com resto do site
- Adicionar ao sitemap (`app/sitemap.ts`): priority 0.8, changeFrequency "monthly"
- Adicionar ao menu de navegação (PublicNav) se existir seção "Guias"

**Anti-pattern:** Não gere conteúdo com IA sem revisar — Google penaliza AI content inflado. Prefira autoral curto (~1000 palavras) a AI-long (~3000).

**Dica:** Veja `app/methodology/page.tsx` como referência de página de conteúdo com JSON-LD Article.

---

### T4.4 — Dashboard de monitoramento (~1h)

**Problema:** Sem tracking sistemático das query-anchors do baseline. Sem isso, em 30 dias ninguém vai lembrar de comparar.

**Entrega:** `docs/seo-monitoring.md` com:

1. **Tabela de query-anchors** (copiar de `docs/seo-baseline-2026-04-17.md`)
   - Cada query com baseline position + data
   - Coluna vazia pra "2026-05-17 position" (30d)
   - Coluna vazia pra "2026-06-17 position" (60d)
   - Coluna vazia pra "2026-07-17 position" (90d)
   - Delta calculado manualmente

2. **Checklist semanal** — "toda segunda-feira":
   - Abrir GSC Performance tab, filtrar últimos 7 dias
   - Anotar: cliques, impressões, CTR, pages indexed
   - Spot check: 3 queries-anchors aleatórias — posição subiu/desceu?

3. **Links úteis** pré-formatados:
   - GSC Performance
   - Rich Results Test pros 5 URLs-sample
   - Sitemap pings

4. **Alerta de regressão** — "se posição média da query-anchor cair >5 posições em 1 semana, investigar"

**Opcional (se sobrar tempo):** Looker Studio connector do GSC — mais poderoso mas toma tempo extra.

---

## Ordem de execução + commits

1. Criar branch `seo/sprint-4-1-core-web-vitals`, executar T4.1, typecheck, commit, merge master, push.
2. Criar branch `seo/sprint-4-2-blog-mdx`, executar T4.2, typecheck + build passing, commit, merge master, push.
3. Criar branch `seo/sprint-4-3-hub-pages`, executar T4.3, typecheck, commit, merge master, push.
4. Criar branch `seo/sprint-4-4-monitoring`, executar T4.4 (só docs), commit, merge master, push.
5. Atualizar `docs/seo-delivery-report-2026-04-17.md` marcando Sprint 4 items como DONE.

**Se alguma task bloqueia** (e.g. MDX exige mudanças grandes), pare, documente no PR, e continue pros outros. T4.1 e T4.4 são independentes e baratos.

---

## Validação pós-deploy

Após cada merge:

```bash
# Typecheck
rtk npx tsc --noEmit

# Build
rtk next build

# Site no ar
curl -sI https://pocketdm.com.br/sitemap.xml
curl -sI https://pocketdm.com.br/guias/bestiario-dnd-5e  # depois de T4.3

# Rich Results
# Abrir em navegador:
# https://search.google.com/test/rich-results?url=https://pocketdm.com.br/guias/bestiario-dnd-5e
```

---

## Regra de ouro

**Se não souber, leia os docs primeiro.** `docs/seo-architecture.md` responde 90% das dúvidas sobre patterns. Não invente solução nova quando existe um builder em `lib/seo/metadata.ts`.

**Use o memory system** — se aprender algo não-óbvio durante o sprint (ex: "o plan Pro da Vercel não tem Speed Insights"), salve como memory type `project` pra futuros agentes.

---

## Contato

Daniel Roscoe (owner) — `daniel@awsales.io`

Commits anteriores como referência de qualidade/formato:
- `67bd1234` (Sprint 3.6) — blog migration
- `90173552` (Sprint 3 fixes) — breadcrumbs + jsonLdScriptProps
- `c52365d2` (Sprint 3) — rich results JSON-LD

Bom trabalho, mestre. 🧙‍♂️
