# Prompt — Execute Épico A (Fundação Técnica SEO)

**Cole este prompt inteiro na próxima conversa com um agente novo.**

---

## Contexto (leia antes de tocar em código)

Você é um engenheiro sênior no **Pocket DM** (`pocketdm.com.br`), Next.js 15 D&D 5e combat tracker. Site novo (<1 mês de idade), fase experimental, foco em preparar **terreno fértil para crescimento orgânico** (SEO PT-BR + EN). Sem metas de número fixas, sem deadline; o KPI implícito é **cadência de experimentação** — quanto menor a fricção pra criar conteúdo, mais experimentos rodamos.

Este épico é a **fundação técnica** que destrava os próximos épicos (Conteúdo + Instrumentação). Objetivo final do Épico A: **agentes futuros conseguem criar hub pages e blog posts novos em <30min cada, sem edit de código spaghetti**.

**LEIA NESSA ORDEM antes de qualquer edit:**
1. [docs/seo-architecture.md](./seo-architecture.md) — padrões canônicos + decisões travadas
2. [docs/seo-delivery-report-2026-04-17.md](./seo-delivery-report-2026-04-17.md) — o que já foi entregue nos Sprints 1–3.8 + Sprint 4
3. `CLAUDE.md` seção "SEO Canonical Decisions" — regras imutáveis
4. [lib/seo/site-url.ts](../lib/seo/site-url.ts) + [lib/seo/metadata.ts](../lib/seo/metadata.ts) — helpers que você vai consumir/estender

**Commits recentes de referência (qualidade/formato):**
- `9ba3a47f` fix(seo): force-normalize SITE_URL to apex
- `ff40c92d` fix(seo): sprint 3.8 schema.org validity fixes
- `1add0f21` chore(seo): remove keywords meta tag (27 files)
- `e92ebdc2` feat(seo): Sprint 4 hub pages

---

## ⚠️ Regras imutáveis (CLAUDE.md — não reverter)

- **Canonical é apex** (`https://pocketdm.com.br`, sem www). Vercel redireciona www→apex. `SITE_URL` em `lib/seo/site-url.ts` força normalização.
- **Locale via semantic URL** (`/monstros` vs `/monsters`), NÃO route-prefix (`/en/*`).
- **Todo URL em JSON-LD via `siteUrl()`** — nunca relative, nunca hardcoded.
- **Todo `<script type="application/ld+json">` usa `jsonLdScriptProps()`** (XSS-safe).
- **Não restaurar `keywords` meta tag** — Google ignora desde 2009.
- **Detail pages usam os builders tipados** (`monsterMetadata`, `spellMetadata`, `articleLd`, `breadcrumbList`, `collectionPageLd`).

---

## 🗂️ Stories

Ordem de execução:
```
A4 (doc, pré-req) → A1 (blog split) + A3 (validate:seo) paralelo → A2 (hub generator)
```

Total: ~10h. Executável por 1 agente em 2 dias ou 2 agentes em 1.

**Commit + push ao final de CADA story. Nunca >15min uncommitted.**

---

### A4 — Doc de branch/worktree discipline (~1h, P0 pré-req)

**Problema:** Sessões anteriores deste projeto tiveram chaos multi-agente — arquivos sobrescritos em checkout, commits bundled sob mensagens erradas, stash geral perdendo trabalho. Spec `feedback_multi_agent_commits.md` em memória captura alguns aprendizados; formalizar em doc de projeto.

**Deliverable:** [docs/seo-workflow.md](./seo-workflow.md) (~300 palavras) descrevendo:

1. **Quando usar worktree vs branch em master**
   - Worktree (`git worktree add ...`) quando: local master tem commits não-pushed de outro agente E você precisa pushar algo isolado
   - Branch normal quando: fluxo solo, master sincronizado
2. **Branch naming convention**
   - `seo/sprint-N-story-slug` ou `seo/epic-X-story-Y-slug`
3. **Commit cadence**
   - Após cada story completa: typecheck clean → commit → push
   - Nunca >15min sem commit em branch compartilhada
4. **Como lidar com git index.lock** — ver memory `feedback_multi_agent_commits.md`
5. **Como reagir se arquivo for revertido** — stash push específico de arquivos, nunca `git stash` geral
6. **Checklist pós-push** — `curl` smoke tests contra produção com nocache param

**Critério de aceite:**
- [ ] Doc no caminho acima, salvo e commitado
- [ ] Vincular da `docs/seo-architecture.md` na seção "Related docs"
- [ ] Adicionar 1 linha em `CLAUDE.md` apontando pra esse doc (seção SEO Canonical Decisions)

**Commit message:**
```
docs(seo): epic A story 4 — branch/worktree discipline
```

---

### A1 — Blog monolith split (~3h, P0)

**Problema:** [components/blog/BlogPostContent.tsx](../components/blog/BlogPostContent.tsx) tem **325KB / 6735 linhas / 21 componentes React** (`BlogPost1`...`BlogPost21`). Adicionar post novo requer edit em 3 lugares (componente, registry `BLOG_POSTS`, `CONTENT_MAP` em page.tsx). IDE lenta, merge conflicts frequentes, risco de 404 se esquecer um.

**Solução — split into per-post files + registry:**

1. **Criar script** `scripts/split-blog-monolith.py`:
   - Parseia `components/blog/BlogPostContent.tsx`
   - Extrai cada `export function BlogPost{N}() { ... }`
   - Gera `components/blog/posts/post-{NN}-{slug}.tsx` (número zero-padded + slug)
   - Cria `components/blog/posts/_shared.tsx` com TODOS os helpers (`H2`, `H3`, `Img`, `ExtLink`, `IntLink`, `ProdLink`, `Tip`, `BuildVariantProvider`, `BuildVariantToggle`, `Variant`, `StrategyBox`, `EbookCTA`, `CATEGORY_CTA` etc.) — referenciar tipo: "leia o arquivo original e identifique todos os helpers export function / const definidos antes do primeiro `BlogPost1`"
   - Cada `post-NN-slug.tsx` importa do `_shared.tsx` só o que usa

2. **Atualizar registry** em [lib/blog/posts.ts](../lib/blog/posts.ts):
   - Adicionar campo `component: React.ComponentType<{}>` em cada entry de `BLOG_POSTS`
   - Preencher via import direto: `import { default as BlogPost1 } from "@/components/blog/posts/post-01-como-usar-combat-tracker-dnd-5e";`

3. **Simplificar** [app/blog/\[slug\]/page.tsx](../app/blog/[slug]/page.tsx):
   - Remover `CONTENT_MAP` hardcoded (linhas 71–93)
   - Remover os 21 imports hardcoded (linhas 8–30)
   - `const Content = post.component;` direto do registry
   - `if (!Content) notFound();` permanece

4. **Deletar** o antigo `components/blog/BlogPostContent.tsx` após confirmação de que nada mais importa dele:
   - `rtk grep -rn "from.*BlogPostContent" --type ts --type tsx` deve retornar 0

**Anti-patterns:**
```ts
// ❌ Não converta pra MDX (scope explosion, URL risk — os 21 slugs têm tráfego GSC)
// ❌ Não mude nenhum slug de post (SEO regression garantida)
// ❌ Não duplique helpers em cada arquivo — extrai _shared.tsx
// ❌ Não inline o componente com dynamic import() — Next.js prefere static import pra generateStaticParams
// ✅ Preserve EXATAMENTE o JSX de cada post (visual regression test confirmará)
```

**Critério de aceite:**
- [ ] 21 arquivos em `components/blog/posts/post-NN-{slug}.tsx`
- [ ] `components/blog/posts/_shared.tsx` com helpers compartilhados
- [ ] `lib/blog/posts.ts` registry tem `component` field em cada entry
- [ ] `app/blog/[slug]/page.tsx` sem `CONTENT_MAP` ou imports hardcoded
- [ ] `components/blog/BlogPostContent.tsx` deletado
- [ ] `rtk tsc --noEmit` 0 errors
- [ ] `rtk next build` 0 errors, 0 warnings
- [ ] 21 posts renderizam com mesmo conteúdo (curl + grep + wc -c em cada URL — comparar bytes antes/depois em HTML body do post)
- [ ] Bundle size do blog route não aumentou mais de 5% (ver output de `next build`)

**Commit message:**
```
refactor(blog): epic A story 1 — split 325KB monolith into 21 per-post files

Scripted extraction via scripts/split-blog-monolith.py. Each post lives
in components/blog/posts/post-NN-{slug}.tsx. Shared helpers moved to
_shared.tsx. Registry in lib/blog/posts.ts now carries component ref
directly, eliminating CONTENT_MAP in app/blog/[slug]/page.tsx.

Adding a new post = 1 file + 1 registry entry. Zero URL regression
(all 21 slugs preserved).
```

---

### A2 — Hub page generator JSON-driven (~4h, P1)

**Problema:** Sprint 4 criou 2 hubs manualmente (`/guias/bestiario-dnd-5e` + `/guias/lista-magias-dnd-5e`). Cada um tem ~500 linhas de page.tsx repetidas: metadata, JSON-LD builders, PublicNav, sections com arrays de items, grids, CTAs. Criar hub novo = copy-paste + ajustar. Errado.

**Solução — rota dinâmica lida de JSON:**

1. **Criar esquema** em `content/hubs/README.md` documentando o formato + exemplo completo. Schema sugerido (TypeScript, em `lib/seo/hub-types.ts`):

```ts
export interface HubItem {
  slug: string;
  name: string;
  url?: string; // optional override (defaults to `/${linkPath}/${slug}` when linkPath set)
}

export interface HubSection {
  anchor: string;         // for URL #anchor
  label: string;          // section H2
  desc?: string;          // section lead paragraph
  linkPath: string;       // base path for item slugs (e.g. "/monstros")
  items: HubItem[];
}

export interface HubIconic extends HubItem {
  blurb: string;
  level?: string; // for spells
}

export interface HubContent {
  slug: string;                      // URL slug after /guias/
  locale: "pt-BR" | "en";
  metaTitle: string;
  metaDescription: string;
  h1: string;
  kicker: string;                    // "Guia · Bestiário" etc.
  lead: string;                      // first paragraph
  sections: HubSection[];
  iconic?: HubIconic[];
  closingParagraphs?: string[];      // text blocks after sections
  internalLinkCluster?: HubItem[];   // "mais guias: ..." footer links
  ctaHeadline: string;
  ctaSub: string;
  ctaPrimaryHref: string;
  ctaPrimaryLabel: string;
  ctaSecondaryHref?: string;
  ctaSecondaryLabel?: string;
  tracked_queries: string[];         // GSC queries this hub targets (used by Epic C monitoring)
}
```

2. **Mover os 2 hubs existentes pra JSON**:
   - `content/hubs/bestiario-dnd-5e.json`
   - `content/hubs/lista-magias-dnd-5e.json`

3. **Criar componente template** `components/seo/HubPageTemplate.tsx` que renderiza `HubContent` → JSX (copia layout dos 2 hubs atuais, parameterizado).

4. **Substituir** `app/guias/[slug]/page.tsx` (dynamic route, `generateStaticParams` lendo `content/hubs/*.json`):
   - `generateStaticParams` = `readdirSync("content/hubs").map(f => ({ slug: f.replace(".json", "") }))`
   - `generateMetadata({ params })` = lê JSON, gera `buildMetadata()` usando `metaTitle`/`metaDescription`
   - `Page` component = lê JSON, passa pra `<HubPageTemplate>`
   - JSON-LD: `articleLd()` + `breadcrumbList()` via `jsonLdScriptProps()`

5. **Deletar** `app/guias/bestiario-dnd-5e/page.tsx` e `app/guias/lista-magias-dnd-5e/page.tsx` (substituídos pela rota dinâmica).

6. **Atualizar sitemap** `app/sitemap.ts`: gerar entradas `/guias/{slug}` dinamicamente lendo `content/hubs/*.json` (substitui as 2 entradas hardcoded).

**Anti-patterns:**
```ts
// ❌ Não use rota estática por hub — derrota o propósito
// ❌ Não parseie JSON em runtime via fetch — ler com fs no module-scope (build-time)
// ❌ Não adicione `content/hubs/*.json` ao .gitignore — é conteúdo versionado
// ❌ Não quebre os 2 URLs existentes (/guias/bestiario-dnd-5e + /guias/lista-magias-dnd-5e têm tráfego de teste)
// ✅ Preserve visual — screenshot antes/depois deve bater
```

**Critério de aceite:**
- [ ] `content/hubs/bestiario-dnd-5e.json` + `lista-magias-dnd-5e.json` existem
- [ ] `app/guias/[slug]/page.tsx` rota dinâmica funcional
- [ ] Rotas antigas `/app/guias/bestiario-dnd-5e/page.tsx` + `/app/guias/lista-magias-dnd-5e/page.tsx` removidas
- [ ] URLs `/guias/bestiario-dnd-5e` + `/guias/lista-magias-dnd-5e` retornam 200 com mesmo conteúdo
- [ ] Adicionar arquivo `content/hubs/teste.json` (um sample mínimo) resulta em `/guias/teste` acessível sem edit de código — remover depois do teste
- [ ] Sitemap inclui automaticamente hubs novos
- [ ] JSON-LD (Article + BreadcrumbList) presente e válido
- [ ] `rtk tsc --noEmit` + `rtk next build` limpos
- [ ] `tracked_queries` field populado em ambos JSONs (pra Épico C usar)

**Commit message:**
```
feat(seo): epic A story 2 — JSON-driven hub page generator

Rota dinâmica app/guias/[slug]/page.tsx lê content/hubs/*.json em build
time. Criar hub novo = drop 1 arquivo JSON. Sitemap auto-inclui.

Os 2 hubs existentes (bestiario + lista-magias) migrados pra JSON;
rotas estáticas removidas. Schema em lib/seo/hub-types.ts.

tracked_queries field pré-populado pra Epic C monitoring cruzar
performance GSC por hub automaticamente.
```

---

### A3 — Script manual `validate:seo` (~2h, P2)

**Problema (reduzido do gold-plating original):** Regressões SEO (tipo o bug do www canonical que vazou em produção sem ninguém notar) só foram pegas por curl manual pós-deploy. Sem visibilidade automatizada.

**Solução — comando lean, não CI gate:**

1. Criar `scripts/validate-seo.ts` (executável via `npm run validate:seo`):
   - Fetch de 5 URLs sample em produção: `/`, `/monsters/axe-beak`, `/guias/bestiario-dnd-5e`, `/blog/como-usar-combat-tracker-dnd-5e`, `/about`
   - Pra cada URL:
     - Parseia `<link rel="canonical" href="...">` → deve começar com `https://pocketdm.com.br` (apex, sem www)
     - Parseia todos `<script type="application/ld+json">` → `JSON.parse` deve succeed
     - Pra cada JSON-LD: se tem `url`, `image`, `item`, `logo`, `mainEntityOfPage` → deve ser absoluto começando com `https://pocketdm.com.br`
     - Article JSON-LD deve ter `headline`
     - BreadcrumbList deve ter `itemListElement` com `position` + `name` + `item`
   - Imprime report colorido: ✓ green / ✗ red com URL + issue
   - Exit code 1 se qualquer falha

2. Adicionar `package.json` scripts:
   - `"validate:seo": "tsx scripts/validate-seo.ts"` (manual local)
   - `"validate:seo:prod": "tsx scripts/validate-seo.ts --env=production"`

3. Documentar em `docs/seo-workflow.md` (do A4):
   - "Rode `npm run validate:seo:prod` após cada deploy importante"
   - "Se aparecer regressão, investigar ANTES de shipar mais conteúdo"

**Anti-patterns:**
```ts
// ❌ Não automatize em CI agora (scope experimental, gold-plating)
// ❌ Não use Google Rich Results API (auth + rate limit, overhead)
// ❌ Não faça assertion complexa via schema-dts — validação estrutural simples basta
// ✅ Script é rodável local + em prod; agente futuro sabe quando rodar
```

**Critério de aceite:**
- [ ] `scripts/validate-seo.ts` existe e roda em <30s
- [ ] Passa nos 5 URLs atualmente em produção
- [ ] Falha de propósito ao testar com URL fake pra confirmar asserts funcionam
- [ ] Documentado em `docs/seo-workflow.md`

**Commit message:**
```
feat(seo): epic A story 3 — validate:seo manual check script

scripts/validate-seo.ts fetch 5 sample URLs, valida canonical apex +
JSON-LD structural correctness (absolute URLs, required fields).
Roda via npm run validate:seo[:prod]. Exit 1 on any regression.

Manual step após deploys importantes — não é CI gate ainda (fase
experimental, evitar gold-plating).
```

---

## 🔄 Ordem de execução recomendada

```
Day 1:
  [A4] 1h — doc workflow (pré-req, informa A1+A2+A3)
  [A1] 3h — blog split
  ✅ push A4 + A1, verifica produção

Day 2:
  [A3] 2h — validate:seo script (paralelo com A2 se 2 agentes)
  [A2] 4h — hub generator (depende de A1 estar limpo no repo)
  ✅ push A2 + A3, roda validate:seo:prod, fecha épico
```

## Validação pós-épico (final de Day 2)

```bash
rtk npx tsc --noEmit               # 0 errors
rtk next build                      # 0 errors, 0 warnings
npm run validate:seo:prod           # green em 5 URLs
curl -sI https://pocketdm.com.br/guias/bestiario-dnd-5e  # 200 OK
curl -sI https://pocketdm.com.br/guias/lista-magias-dnd-5e  # 200 OK
```

---

## 🚫 Escopo — o que Épico A NÃO faz

- ❌ Criar hub pages novos (isso é Épico B)
- ❌ Escrever CTA novo / conversão (Épico B)
- ❌ GSC export / click-flow (Épico C)
- ❌ Migração blog pra MDX (custo/benefício ruim, vide Sprint 4 T4.2 skip)

Se algo parecer importante mas não for exatamente A1/A2/A3/A4, anote em `docs/seo-epic-backlog.md` e continua.

---

## 📝 COMMIT EARLY, COMMIT OFTEN

Ambiente multi-agente. Commit+push após cada story. Nunca >15min uncommitted. Ver memória `feedback_multi_agent_commits.md` e `docs/seo-workflow.md` (que você vai criar no A4).

Bom trabalho, mestre. 🧙‍♂️
