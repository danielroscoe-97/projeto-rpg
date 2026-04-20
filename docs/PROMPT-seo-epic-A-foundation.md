# Prompt — Execute Épico A (Fundação Técnica SEO)

**Cole este prompt inteiro na próxima conversa com um agente novo.**

**Versão:** 2026-04-20 (revisão adversarial pós-party-mode)

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

## 📝 Revisão adversarial (party-mode 2026-04-20)

Este spec passou por crítica dos 9 agentes BMAD. Correções aplicadas:

- **A1 Python → TypeScript.** Projeto é TS; script de split também deve ser. Scripts em `.py` viram dívida de manutenção.
- **A1 dividido em 2 commits.** Commit 1 adiciona arquivos novos (split + registry). Commit 2 deleta o monolito. Isso permite revert trivial e revisão viável.
- **A1 exige baseline ANTES.** AC "bundle +5%" sem baseline capturado é decorativo.
- **A1 parity script automatizado.** Verificar 21 posts byte-a-byte à mão é inviável — script faz.
- **A2 trava decisão bi-locale.** `/guias/[slug]` + `/guides/[slug]` compartilham `content/hubs/*.json` filtrando por `locale`. Evita que Épico B improvise.
- **A3 URLs reais.** Removido `/about` (não existe). Usando rotas que de fato retornam 200.

---

## 🗂️ Stories

Ordem de execução (revisada):
```
A4 (doc, pré-req) → A1.0 (baseline) → A1.1 (split) → A1.2 (delete) → A3 (validate:seo) → A2 (hub generator bi-locale)
```

Total: ~10h. Executável por 1 agente em 2 dias. **Paralelização desencorajada** — A2 precisa de A1 mergeado, A3 valida produção pós-A1.

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

### A1 — Blog monolith split (~3h, P0, dividido em A1.0 / A1.1 / A1.2)

**Problema:** [components/blog/BlogPostContent.tsx](../components/blog/BlogPostContent.tsx) tem **325KB / 6735 linhas / 21 componentes React** (`BlogPost1`...`BlogPost21`, confirmado por grep em linhas 277, 422, 548, 691, 838, 968, 1163, 1659, 2033, 2429, 2858, 3206, 3540, 4425, 5292, 5616, 5698, 5889, 6041, 6259, 6487). Adicionar post novo requer edit em 3 lugares (componente, registry `BLOG_POSTS`, `CONTENT_MAP` em page.tsx). IDE lenta, merge conflicts frequentes, risco de 404 se esquecer um.

#### A1.0 — Baseline (obrigatório, ~5min)

Capturar bundle size atual pra poder comparar depois:
```bash
mkdir -p .tmp
rtk next build 2>&1 | tee .tmp/next-build-baseline.txt
```
Também capturar byte-size dos posts em produção (pra parity):
```bash
rtk npx tsx scripts/verify-blog-parity.ts --capture-baseline
# (criado na A1.1 abaixo, roda 1x ANTES do split e salva .tmp/parity-before.json)
```

Sem esse baseline, o AC "bundle não aumentou >5%" é decorativo.

#### A1.1 — Commit 1: Split (adiciona arquivos novos, preserva monolito)

1. **Criar** `scripts/split-blog-monolith.ts` (TypeScript, NÃO Python):
   - Lê `components/blog/BlogPostContent.tsx` com `fs.readFileSync`
   - Regex ou `ts-morph` pra extrair cada `export function BlogPost{N}() { ... }` (21 matches confirmados)
   - Identifica TODOS os helpers definidos ANTES de `BlogPost1` (linha 277) → vira `_shared.tsx`
   - Gera `components/blog/posts/post-{NN}-{slug}.tsx` (slug vem do registry `BLOG_POSTS` em [lib/blog/posts.ts](../lib/blog/posts.ts))
   - Cria `components/blog/posts/_shared.tsx` com helpers compartilhados (`H2`, `H3`, `Img`, `ExtLink`, `IntLink`, `ProdLink`, `Tip`, `BuildVariantProvider`, `BuildVariantToggle`, `Variant`, `StrategyBox`, `EbookCTA`, `CATEGORY_CTA` etc. — identificar todos lendo o arquivo original)
   - Cada `post-NN-slug.tsx` importa do `_shared.tsx` só o que usa
   - Script roda via `rtk npx tsx scripts/split-blog-monolith.ts`

2. **Criar** `scripts/verify-blog-parity.ts`:
   - Lê `BLOG_POSTS` do registry pra obter os 21 slugs
   - Modo `--capture-baseline`: pra cada slug, `curl http://localhost:3000/blog/{slug}`, extrai conteúdo do `<article>` (ou container principal), salva `.tmp/parity-before.json` com `{ slug, bytes, hash }`
   - Modo default: captura novamente, compara com `parity-before.json`, falha se qualquer post divergir mais que ±0.5% em bytes
   - Exige `next dev` rodando em localhost:3000

3. **Atualizar** [lib/blog/posts.ts](../lib/blog/posts.ts):
   - Adicionar campo `component: React.ComponentType<{}>` em cada entry de `BLOG_POSTS`
   - Preencher via import direto: `import BlogPost1 from "@/components/blog/posts/post-01-como-usar-combat-tracker-dnd-5e";`

4. **Simplificar** [app/blog/[slug]/page.tsx](../app/blog/[slug]/page.tsx):
   - Remover `CONTENT_MAP` hardcoded
   - Remover os 21 imports hardcoded do monolito
   - `const Content = post.component;` direto do registry
   - `if (!Content) notFound();` permanece

**Monolito permanece neste commit** pra facilitar diff/revert. Será deletado na A1.2.

**Commit A1.1:**
```
refactor(blog): epic A story 1.1 — split monolith into 21 per-post files

Scripted extraction via scripts/split-blog-monolith.ts. Each post lives
in components/blog/posts/post-NN-{slug}.tsx. Shared helpers moved to
_shared.tsx. Registry in lib/blog/posts.ts carries component ref
directly, eliminating CONTENT_MAP in app/blog/[slug]/page.tsx.

Monolith components/blog/BlogPostContent.tsx preserved this commit for
easy diff/revert; deleted in A1.2.

Parity verified via scripts/verify-blog-parity.ts — 21 posts byte-equivalent.
```

#### A1.2 — Commit 2: Delete monolith

1. Confirmar zero imports do monolito:
   ```bash
   rtk grep -rn "from.*BlogPostContent" --type ts --type tsx
   # Deve retornar 0 matches
   ```
2. Deletar `components/blog/BlogPostContent.tsx` (325KB, 6735 linhas)
3. Rebuild + rerun parity:
   ```bash
   rtk next build
   rtk npx tsx scripts/verify-blog-parity.ts
   ```
4. Comparar bundle size com baseline:
   ```bash
   diff <(grep "blog" .tmp/next-build-baseline.txt) <(rtk next build 2>&1 | grep "blog")
   ```

**Commit A1.2:**
```
refactor(blog): epic A story 1.2 — delete monolith BlogPostContent.tsx

Zero imports remain from components/blog/BlogPostContent.tsx after
A1.1 split. Deleting the 325KB / 6735-line file. Adding a new post
now = 1 file + 1 registry entry.

Bundle size delta vs baseline: {FILL IN from diff}
```

**Anti-patterns:**
```ts
// ❌ Não escreva o script em Python — projeto é TypeScript (usar tsx)
// ❌ Não converta pra MDX (scope explosion, URL risk — os 21 slugs têm tráfego GSC)
// ❌ Não mude nenhum slug de post (SEO regression garantida)
// ❌ Não duplique helpers em cada arquivo — extrai _shared.tsx
// ❌ Não inline componentes com dynamic import() — Next.js prefere static import pra generateStaticParams
// ❌ Não bundle split + delete no mesmo commit (revert vira pesadelo)
// ✅ Preserve EXATAMENTE o JSX de cada post (parity script confirma byte-level)
```

**Critério de aceite (consolidado A1.0 + A1.1 + A1.2):**
- [ ] `.tmp/next-build-baseline.txt` capturado ANTES do split (A1.0)
- [ ] `.tmp/parity-before.json` capturado ANTES do split (A1.0)
- [ ] `scripts/split-blog-monolith.ts` existe, rodável via `rtk npx tsx`
- [ ] `scripts/verify-blog-parity.ts` existe, exit 0 pós-split
- [ ] 21 arquivos em `components/blog/posts/post-NN-{slug}.tsx`
- [ ] `components/blog/posts/_shared.tsx` com helpers compartilhados
- [ ] `lib/blog/posts.ts` registry tem `component` field em cada entry
- [ ] `app/blog/[slug]/page.tsx` sem `CONTENT_MAP` ou imports hardcoded
- [ ] `components/blog/BlogPostContent.tsx` deletado (A1.2)
- [ ] `rtk npx tsc --noEmit` 0 errors
- [ ] `rtk next build` 0 errors, 0 warnings
- [ ] Bundle size do blog route não aumentou mais de 5% vs baseline
- [ ] Parity script exit 0 (21 posts byte-equivalent)

---

### A3 — Script manual `validate:seo` (~2h, P2)

**Problema:** Regressões SEO (tipo o bug do www canonical que vazou em produção sem ninguém notar) só foram pegas por curl manual pós-deploy. Sem visibilidade automatizada.

**Solução — comando lean, não CI gate:**

1. Criar `scripts/validate-seo.ts` (executável via `npm run validate:seo`):
   - Fetch de 5 URLs **que comprovadamente existem em produção** (verificadas 2026-04-20):
     - `/` (home)
     - `/monsters/axe-beak` (monster detail EN)
     - `/spells/fireball` (spell detail EN — confirmar que `fireball` está no whitelist em `data/srd/srd-spell-whitelist.json`; senão trocar por spell SRD-safe)
     - `/guias/bestiario-dnd-5e` (hub PT)
     - `/blog/como-usar-combat-tracker-dnd-5e` (blog post)
   - Pra cada URL:
     - Parseia `<link rel="canonical" href="...">` → deve começar com `https://pocketdm.com.br` (apex, sem www)
     - Parseia todos `<script type="application/ld+json">` → `JSON.parse` deve succeed
     - Pra cada JSON-LD: se tem `url`, `image`, `item`, `logo`, `mainEntityOfPage` → deve ser absoluto começando com `https://pocketdm.com.br`
     - Article JSON-LD deve ter `headline`
     - BreadcrumbList deve ter `itemListElement` com `position` + `name` + `item`
   - Imprime report colorido: ✓ green / ✗ red com URL + issue
   - Exit code 1 se qualquer falha

2. Adicionar `package.json` scripts:
   - `"validate:seo": "tsx scripts/validate-seo.ts"` (default: localhost:3000)
   - `"validate:seo:prod": "tsx scripts/validate-seo.ts --env=production"`

3. Documentar em `docs/seo-workflow.md` (do A4):
   - "Rode `npm run validate:seo:prod` após cada deploy importante"
   - "Se aparecer regressão, investigar ANTES de shipar mais conteúdo"

**Anti-patterns:**
```ts
// ❌ Não automatize em CI agora (scope experimental, gold-plating)
// ❌ Não use Google Rich Results API (auth + rate limit, overhead)
// ❌ Não faça assertion complexa via schema-dts — validação estrutural simples basta
// ❌ Não teste URL que não existe (/about foi removido do spec; sempre verifica HTTP 200 antes)
// ✅ Script é rodável local + em prod; agente futuro sabe quando rodar
```

**Critério de aceite:**
- [ ] `scripts/validate-seo.ts` existe e roda em <30s
- [ ] Passa nos 5 URLs atualmente em produção (validado via `curl -sI` antes de escrever o script — todas devem retornar 200)
- [ ] Falha de propósito ao testar com URL fake (tipo `/url-que-nao-existe`) pra confirmar asserts funcionam
- [ ] Documentado em `docs/seo-workflow.md`

**Commit message:**
```
feat(seo): epic A story 3 — validate:seo manual check script

scripts/validate-seo.ts fetch 5 sample URLs (/, /monsters/axe-beak,
/spells/fireball, /guias/bestiario-dnd-5e, /blog/...). Valida canonical
apex + JSON-LD structural correctness (absolute URLs, required fields).
Roda via npm run validate:seo[:prod]. Exit 1 on any regression.

Manual step após deploys importantes — não é CI gate ainda (fase
experimental, evitar gold-plating).
```

---

### A2 — Hub page generator JSON-driven bi-locale (~4h, P1)

**Problema:** Sprint 4 criou 2 hubs manualmente (`/guias/bestiario-dnd-5e` + `/guias/lista-magias-dnd-5e`). Cada um tem ~500 linhas de page.tsx repetidas: metadata, JSON-LD builders, PublicNav, sections com arrays de items, grids, CTAs. Criar hub novo = copy-paste + ajustar. Errado.

**Decisão travada (Winston, party-mode 2026-04-20):** Rota dinâmica **deve suportar PT + EN no mesmo épico**. Se deixar EN pro Épico B, o agente do B vai improvisar e criar duplicação. Solução abaixo cobre os dois locales.

**Solução — 2 rotas dinâmicas compartilhando `content/hubs/*.json` via loader helper:**

1. **Criar schema** em `lib/seo/hub-types.ts`:

```ts
export interface HubItem {
  slug: string;
  name: string;
  url?: string; // optional override (defaults to `${linkPath}/${slug}` when linkPath set)
}

export interface HubSection {
  anchor: string;        // for URL #anchor
  label: string;         // section H2
  desc?: string;         // section lead paragraph
  linkPath: string;      // base path for item slugs (e.g. "/monstros", "/monsters")
  items: HubItem[];
}

export interface HubIconic extends HubItem {
  blurb: string;
  level?: string;        // for spells
}

export interface HubContent {
  slug: string;                      // URL slug after /guias/ or /guides/
  locale: "pt-BR" | "en";
  metaTitle: string;
  metaDescription: string;
  h1: string;
  kicker: string;                    // "Guia · Bestiário" etc.
  lead: string;                      // first paragraph
  sections: HubSection[];
  iconic?: HubIconic[];
  closingParagraphs?: string[];
  internalLinkCluster?: HubItem[];
  ctaHeadline: string;
  ctaSub: string;
  ctaPrimaryHref: string;
  ctaPrimaryLabel: string;
  ctaSecondaryHref?: string;
  ctaSecondaryLabel?: string;
  tracked_queries: string[];         // GSC queries this hub targets (Epic C uses)
}
```

2. **Criar loader** `lib/seo/hub-loader.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { HubContent } from "./hub-types";

const HUBS_DIR = join(process.cwd(), "content/hubs");

export function loadAllHubs(): HubContent[] {
  return readdirSync(HUBS_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => JSON.parse(readFileSync(join(HUBS_DIR, f), "utf8")) as HubContent);
}

export function loadHub(slug: string, locale: "pt-BR" | "en"): HubContent | null {
  return loadAllHubs().find((h) => h.slug === slug && h.locale === locale) ?? null;
}

export function hubSlugsForLocale(locale: "pt-BR" | "en"): string[] {
  return loadAllHubs().filter((h) => h.locale === locale).map((h) => h.slug);
}
```

3. **Migrar os 2 hubs existentes pra JSON**:
   - `content/hubs/bestiario-dnd-5e.json` (locale: `pt-BR`)
   - `content/hubs/lista-magias-dnd-5e.json` (locale: `pt-BR`)
   - Documentar schema em `content/hubs/README.md`

4. **Criar componente template** `components/seo/HubPageTemplate.tsx` que renderiza `HubContent` → JSX (copia layout dos 2 hubs atuais, parameterizado, bi-locale aware via `content.locale`).

5. **Criar 2 rotas dinâmicas**:
   - `app/guias/[slug]/page.tsx` (PT-BR):
     ```ts
     export async function generateStaticParams() {
       return hubSlugsForLocale("pt-BR").map((slug) => ({ slug }));
     }

     export async function generateMetadata({ params }) {
       const hub = loadHub(params.slug, "pt-BR");
       if (!hub) return {};
       return buildMetadata({ title: hub.metaTitle, description: hub.metaDescription, path: `/guias/${hub.slug}` });
     }

     export default function Page({ params }) {
       const hub = loadHub(params.slug, "pt-BR");
       if (!hub) notFound();
       return <HubPageTemplate content={hub} />;
     }
     ```
   - `app/guides/[slug]/page.tsx` (EN): idêntico mas com `"en"` e `path: /guides/${hub.slug}`

6. **Deletar** `app/guias/bestiario-dnd-5e/page.tsx` e `app/guias/lista-magias-dnd-5e/page.tsx` (substituídos pela rota dinâmica).

7. **Atualizar sitemap** `app/sitemap.ts`: gerar entradas `/guias/{slug}` e `/guides/{slug}` dinamicamente via `loadAllHubs()` (substitui as 2 entradas hardcoded).

**Anti-patterns:**
```ts
// ❌ Não use rota estática por hub — derrota o propósito
// ❌ Não parseie JSON em runtime via fetch — ler com fs no module-scope (build-time)
// ❌ Não adicione `content/hubs/*.json` ao .gitignore — é conteúdo versionado
// ❌ Não quebre os 2 URLs existentes (/guias/bestiario-dnd-5e + /guias/lista-magias-dnd-5e)
// ❌ Não crie só rota PT e deixa EN pro Épico B (improvisação = duplicação)
// ✅ Preserve visual — screenshot antes/depois deve bater
// ✅ A rota /guides/[slug] funciona desde o Épico A, mesmo que ainda não tenha hub EN (Épico B adiciona)
```

**Critério de aceite:**
- [ ] `lib/seo/hub-types.ts` + `lib/seo/hub-loader.ts` criados
- [ ] `content/hubs/bestiario-dnd-5e.json` + `content/hubs/lista-magias-dnd-5e.json` existem
- [ ] `content/hubs/README.md` documenta o schema + exemplo
- [ ] `app/guias/[slug]/page.tsx` rota dinâmica PT funcional
- [ ] `app/guides/[slug]/page.tsx` rota dinâmica EN funcional (pode ter 0 hubs EN; precisa compilar)
- [ ] Rotas antigas `/app/guias/bestiario-dnd-5e/page.tsx` + `/app/guias/lista-magias-dnd-5e/page.tsx` removidas
- [ ] URLs `/guias/bestiario-dnd-5e` + `/guias/lista-magias-dnd-5e` retornam 200 com mesmo conteúdo
- [ ] Adicionar arquivo `content/hubs/teste.json` (sample mínimo PT) resulta em `/guias/teste` acessível sem edit de código — **remover depois do teste**
- [ ] Sitemap inclui automaticamente hubs novos (PT + EN)
- [ ] JSON-LD (Article + BreadcrumbList) presente e válido
- [ ] `rtk npx tsc --noEmit` + `rtk next build` limpos
- [ ] `tracked_queries` field populado em ambos JSONs (pra Épico C usar)

**Commit message:**
```
feat(seo): epic A story 2 — JSON-driven bi-locale hub page generator

Rotas dinâmicas app/guias/[slug]/page.tsx (PT) + app/guides/[slug]/page.tsx
(EN) leem content/hubs/*.json em build time via lib/seo/hub-loader.ts,
filtrando por locale. Criar hub novo = drop 1 JSON. Sitemap auto-inclui.

Os 2 hubs existentes (bestiario + lista-magias) migrados pra JSON;
rotas estáticas removidas. Schema em lib/seo/hub-types.ts.

tracked_queries pré-populado pra Epic C monitoring.

Decisão bi-locale travada aqui (não no Épico B) pra evitar improviso
sobre locale filtering.
```

---

## 🔄 Ordem de execução recomendada

```
Day 1 (~6h):
  [A4] 1h — doc workflow (pré-req, informa A1+A2+A3)
  [A1.0] 5min — capturar baselines
  [A1.1] 2h — script split + registry + page.tsx cleanup
  [A1.2] 45min — delete monolith + rebuild + parity
  ✅ push A4 + A1.1 + A1.2, verifica produção

Day 2 (~4h):
  [A3] 2h — validate:seo script
  [A2] 4h — hub generator bi-locale (depende de A1 limpo)
  ✅ push A2 + A3, roda validate:seo:prod, fecha épico
```

## Validação pós-épico (final de Day 2)

```bash
rtk npx tsc --noEmit                # 0 errors
rtk next build                       # 0 errors, 0 warnings
npm run validate:seo:prod            # green em 5 URLs reais
rtk npx tsx scripts/verify-blog-parity.ts  # 21 posts byte-equivalent
curl -sI https://pocketdm.com.br/guias/bestiario-dnd-5e    # 200
curl -sI https://pocketdm.com.br/guias/lista-magias-dnd-5e  # 200
# Se criou hub EN teste durante A2, remover antes do push final
```

---

## 🚫 Escopo — o que Épico A NÃO faz

- ❌ Criar hub pages com conteúdo novo (isso é Épico B — mas a rota EN `/guides/[slug]` é criada aqui)
- ❌ Escrever CTA novo / conversão (Épico B)
- ❌ GSC export / click-flow (Épico C)
- ❌ Migração blog pra MDX (custo/benefício ruim, vide Sprint 4 T4.2 skip)

Se algo parecer importante mas não for A1/A2/A3/A4, anote em `docs/seo-epic-backlog.md` e continua.

---

## 📝 COMMIT EARLY, COMMIT OFTEN

Ambiente multi-agente. Commit+push após cada story (A1 em 2 commits). Nunca >15min uncommitted. Ver memória `feedback_multi_agent_commits.md` e `docs/seo-workflow.md` (criado no A4).

Bom trabalho, mestre. 🧙‍♂️
