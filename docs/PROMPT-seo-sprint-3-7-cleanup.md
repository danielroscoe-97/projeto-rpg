# Prompt — Execute Sprint 3.7 (Completar Migração JSON-LD)

**Cole este prompt inteiro na próxima conversa com um agente novo.**

---

## 🚨 Contexto crítico (leia antes de tocar em código)

Você é um engenheiro sênior no **Pocket DM** (`pocketdm.com.br`), Next.js 15 D&D 5e combat tracker.

Um audit holístico feito em 2026-04-17 (ver `docs/seo-delivery-report-2026-04-17.md`) revelou que os Sprints 1-3 SEO **entregaram menos do que documentaram**. O objetivo do Sprint 3.7 é **alinhar o código com as promessas dos docs**.

**LEIA NESSA ORDEM antes de qualquer edit:**
1. `docs/seo-architecture.md` — padrões canônicos (decisões travadas)
2. `docs/seo-delivery-report-2026-04-17.md` — o que foi entregue (e as lacunas)
3. `CLAUDE.md` seção "SEO Canonical Decisions" — regras imutáveis
4. `lib/seo/site-url.ts` e `lib/seo/metadata.ts` — os helpers que você vai consumir

---

## 📊 O que o audit descobriu (findings a corrigir)

### 🔴 CRITICAL C1 — `jsonLdScriptProps` usado em apenas ~18 de ~51 emissores de JSON-LD

Os docs afirmam "migrated all 17 JSON-LD renderers" mas **~33 páginas ainda emitem `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }} />` inline**, sem o helper centralizado.

**Algumas têm `.replace(/</g, "\\u003c")`** (XSS-safe), outras **não têm escape nenhum** (XSS-vulnerable).

**Pages afetadas (lista completa):**

**SRD detail pages (JSON-LD inline, usam helpers mas script sem wrapper):**
- `app/monsters/[slug]/page.tsx` — **sem escape**
- `app/monstros/[slug]/page.tsx` — **sem escape**
- `app/spells/[slug]/page.tsx` — **sem escape**
- `app/magias/[slug]/page.tsx` — **sem escape**
- `app/feats/[slug]/page.tsx` — tem escape
- `app/talentos/[slug]/page.tsx` — tem escape
- `app/backgrounds/[slug]/page.tsx` — tem escape
- `app/antecedentes/[slug]/page.tsx` — tem escape
- `app/items/[slug]/page.tsx` — tem escape
- `app/itens/[slug]/page.tsx` — tem escape

**Race/class/subclass detail pages (JSON-LD inline + URLs relativas):**
- `app/races/[slug]/page.tsx`
- `app/racas/[slug]/page.tsx`
- `app/classes/[slug]/page.tsx`
- `app/classes-pt/[slug]/page.tsx`
- `app/classes/[slug]/subclasses/[subSlug]/page.tsx`
- `app/classes-pt/[slug]/subclasses/[subSlug]/page.tsx`

**Landing/tool pages:**
- `app/dice/page.tsx`, `app/dados/page.tsx`
- `app/ability-scores/page.tsx`, `app/atributos/page.tsx`
- `app/actions/page.tsx`, `app/acoes-em-combate/page.tsx`
- `app/rules/page.tsx`, `app/regras/page.tsx`
- `app/encounter-builder/page.tsx`, `app/calculadora-encontro/page.tsx`
- `app/conditions/page.tsx`, `app/condicoes/page.tsx`
- `app/diseases/page.tsx`, `app/doencas/page.tsx`
- `app/damage-types/page.tsx`, `app/tipos-de-dano/page.tsx`
- `app/methodology/page.tsx`
- `app/methodology/spell-tiers/page.tsx`
- `app/ebook/guia-mestre-eficaz/page.tsx` (3 scripts)
- `app/about/page.tsx` (2 scripts)

### 🔴 CRITICAL C2 — URLs relativas em JSON-LD `item`, `url`, `publisher.url`

Schema.org **exige URLs absolutas** em `BreadcrumbList.itemListElement.item`. Google Rich Results não renderiza breadcrumb com URL relativa.

**Padrão errado encontrado em ~27 arquivos:**
```ts
{ "@type": "ListItem", position: 1, name: "Home", item: "/" }
{ "@type": "Organization", url: "/", logo: { url: "/icons/..." } }
```

**Deve ser:**
```ts
{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") }
```

Ou melhor — usar os builders `breadcrumbList()` e `articleLd()` que já fazem isso automaticamente.

### 🟠 HIGH H1 — `sitemap.ts` e `robots.ts` redeclaram `BASE_URL`

**Arquivos:** `app/sitemap.ts:23` e `app/robots.ts:4`
```ts
// ❌ Hoje (drift do single-source-of-truth):
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pocketdm.com.br";

// ✅ Deveria:
import { SITE_URL } from "@/lib/seo/site-url";
const BASE_URL = SITE_URL; // (ou só usar SITE_URL direto)
```

### 🟡 MEDIUM M3 — `articleLd` emite `name` E `headline` (redundante)

**Arquivo:** `lib/seo/metadata.ts` linha ~263

```ts
// ❌ Hoje:
return {
  "@type": "Article",
  name,       // ← remover
  headline: name,
  ...
};
```

Google Article schema recomenda só `headline`. `name` é herdado de `Thing` mas é redundante.

---

## 📋 Escopo — o que fazer

### Commit 1 — Lib foundation (~10 min)

1. `lib/seo/metadata.ts` — remover `name` de `articleLd()` (M3)
2. `app/sitemap.ts` — `import { SITE_URL } from "@/lib/seo/site-url"; const BASE_URL = SITE_URL;` (H1)
3. `app/robots.ts` — idem (H1)
4. **COMMIT** imediatamente: `fix(seo): sprint 3.7 commit 1/5 — lib foundation (drop name, SITE_URL import)`
5. **PUSH** logo após o commit

### Commit 2 — SRD detail pages XSS fix (~15 min)

Migrar 10 detail pages do padrão inline `<script>` pra `jsonLdScriptProps()`:
- monsters, monstros, spells, magias, feats, talentos, backgrounds, antecedentes, items, itens (cada um tem `/[slug]/page.tsx`)

Padrão:
```ts
// 1. Adicionar import:
import { ..., jsonLdScriptProps } from "@/lib/seo/metadata";

// 2. Substituir os scripts:
// ANTES:
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
/>
// DEPOIS:
<script {...jsonLdScriptProps(jsonLdArticle)} />
```

**Dica:** Use Python pra batch (está funcionando, ver `.claude/worktrees/migrate_scripts.py` no repo). Padrões a substituir:
- `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(X) }} />`
- `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(X).replace(/</g, "\\u003c") }} />`

Ambos viram `<script {...jsonLdScriptProps(X)} />`.

**COMMIT + PUSH:** `fix(seo): sprint 3.7 commit 2/5 — SRD detail pages jsonLdScriptProps migration`

### Commit 3 — Races/classes/subclasses full refactor (~20 min)

6 páginas que ainda têm JSON-LD inline com URLs relativas (C1 + C2 combinados):
- `app/races/[slug]/page.tsx`
- `app/racas/[slug]/page.tsx`
- `app/classes/[slug]/page.tsx`
- `app/classes-pt/[slug]/page.tsx`
- `app/classes/[slug]/subclasses/[subSlug]/page.tsx`
- `app/classes-pt/[slug]/subclasses/[subSlug]/page.tsx`

Para cada: substituir o `function XJsonLd(...)` inline por chamadas aos builders:
```ts
import { articleLd, breadcrumbList, jsonLdScriptProps } from "@/lib/seo/metadata";

function RaceJsonLd({ race, slug }) {
  const name = `${race.nameEn} — D&D 5e Race`;
  const description = `${race.nameEn}, ${race.size} race with ${...}`;
  const path = `/races/${slug}`;

  const jsonLdArticle = articleLd({
    name, description, path,
    imagePath: "/opengraph-image",  // fallback OG root
    locale: "en",
  });

  const jsonLdBreadcrumb = breadcrumbList([
    { name: "Home", path: "/" },   // EN → "Home", PT → "Início"
    { name: "Races", path: "/races" },
    { name: race.nameEn, path },
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLdArticle)} />
      <script {...jsonLdScriptProps(jsonLdBreadcrumb)} />
    </>
  );
}
```

**Atenção:** `breadcrumbList()` e `articleLd()` já fazem `siteUrl()` internamente. Resolve C2 de graça.

Classes PT usam "Início" em vez de "Home". Subclasses têm 4 níveis no breadcrumb.

**COMMIT + PUSH:** `fix(seo): sprint 3.7 commit 3/5 — races/classes/subclasses full refactor`

### Commit 4 — Landing/tool pages (~20 min)

17 landing pages com JSON-LD inline + URLs relativas. Lista acima na seção C1.

Cada uma emite um `Article` simples + `BreadcrumbList`. Padrão similar ao Commit 3 mas sem dados dinâmicos (são landing pages estáticas):

```ts
// Exemplo para /dice:
const jsonLdArticle = articleLd({
  name: "Virtual Dice Roller — D&D 5e",
  description: "Free online D&D 5e dice roller...",
  path: "/dice",
  imagePath: "/opengraph-image",
  locale: "en",
});

const jsonLdBreadcrumb = breadcrumbList([
  { name: "Home", path: "/" },
  { name: "Dice", path: "/dice" },
]);
```

**Atenção especial:**
- `app/ebook/guia-mestre-eficaz/page.tsx` tem 3 scripts JSON-LD (Article, Course ou similar, FAQPage possivelmente). Preserve a lógica mas migre os wrappers.
- `app/about/page.tsx` tem 2 scripts.
- PT pages usam "Início", EN usa "Home".

**COMMIT + PUSH:** `fix(seo): sprint 3.7 commit 4/5 — landing pages jsonLdScriptProps + absolute URLs`

### Commit 5 — Docs update reflecting reality (~10 min)

1. `docs/seo-delivery-report-2026-04-17.md` — adicionar seção "Sprint 3.7 — Migration Cleanup (post-audit)" após Sprint 3.6
2. `docs/seo-architecture.md` — remover claims imprecisos, adicionar linha: "All 51 JSON-LD emitters now use jsonLdScriptProps (Sprint 3.7 cleanup)"
3. Confirmar `CLAUDE.md` seção "SEO Canonical Decisions" ainda bate com realidade

**COMMIT + PUSH:** `docs(seo): sprint 3.7 — update delivery report with cleanup audit`

---

## ⚠️ Regras imutáveis (CLAUDE.md)

- **Canônico é apex** — `https://pocketdm.com.br`, sem www. NÃO reverter.
- **Locale via semantic URL** (`/monstros` vs `/monsters`), NÃO route-prefix.
- **Todo URL em JSON-LD via `siteUrl()`** — NUNCA hardcoded ou relativo.
- **Todo `<script type="application/ld+json">` usa `jsonLdScriptProps()`** — isso é o que esse sprint conserta.
- **NÃO restaurar `keywords` meta tag** — Google ignora desde 2009.
- **NÃO mexer em arquivos do Sprint 4** se outros agentes ainda estiverem trabalhando:
  - `components/analytics/WebVitalsTracker.tsx` (T4.1 — já done)
  - `content/blog/*.mdx`, `lib/blog/posts.ts` (T4.2 — skip intencional)
  - `app/guias/*` (T4.3 — pode ou não ter sido feito)
  - `docs/seo-monitoring.md` (T4.4 — já done)

---

## 🧪 Validação

### Após cada commit
```bash
rtk npx tsc --noEmit   # Deve passar sem erros
```

### Antes do último push
```bash
# Confirme que não resta inline JSON-LD sem o helper
grep -rn "dangerouslySetInnerHTML=.*JSON.stringify" app/ | grep -v ".backup"
# Esperado: ZERO resultados
```

### Após deploy (1-2 min)
```
https://search.google.com/test/rich-results?url=https://pocketdm.com.br/races/elf
https://search.google.com/test/rich-results?url=https://pocketdm.com.br/classes/barbarian
https://search.google.com/test/rich-results?url=https://pocketdm.com.br/classes-pt/guerreiro/subclasses/champion
```

Esperado:
- `/races/elf` → BreadcrumbList + Article detectados (antes: vazio)
- `/classes/*` → idem
- Subclasses → idem

---

## 📝 COMMIT EARLY, COMMIT OFTEN

**CRÍTICO:** Há múltiplos agentes trabalhando no repo em paralelo. Se você acumular trabalho sem comitar, arquivos podem ser sobrescritos ao trocar de branch ou ao outro agente sincronizar.

**Regra:** Nunca tenha >15 min de trabalho uncommitted. Commit individual por batch, push logo após.

**Se git index.lock aparecer:**
```bash
# Outro processo git ativo. Espera 30s e tenta de novo.
# Se persistir por 2min, verifica: ls .git/index.lock
# NUNCA rm index.lock sem confirmar que nenhum processo git tá rodando
```

**Se arquivo for revertido:**
- Sinal de que outro agente sincronizou pelo fs
- Pare, cheque `git status`, decida se re-faz ou se o outro agente já fez

---

## 🌳 Setup de branch

```bash
cd "c:/Projetos Daniel/projeto-rpg"
rtk git checkout master
rtk git pull --ff-only origin master
rtk git checkout -b seo/sprint-3-7-migration
# Execute os 5 commits na ordem, push após cada.
# No final: rtk git checkout master && rtk git merge --no-ff seo/sprint-3-7-migration && rtk git push origin master
```

---

## 🎯 Critério de aceite final

- [ ] `grep -rn "dangerouslySetInnerHTML=.*JSON.stringify" app/` retorna **0 resultados**
- [ ] `grep -rn "item: \"/\"" app/` retorna **0 resultados** (URLs absolutas via builders)
- [ ] `tsc --noEmit` passa
- [ ] Rich Results Test confirma BreadcrumbList em 3 detail pages sample (races, classes, subclass)
- [ ] `docs/seo-delivery-report-2026-04-17.md` inclui seção Sprint 3.7
- [ ] 5 commits pushed, master up-to-date

---

## 📚 Files de referência — exemplos DO CÓDIGO QUE JÁ FUNCIONA

Antes de escrever do zero, copie o padrão de pages que **já estão migrados corretamente**:
- `app/monsters/page.tsx` (index — usa `collectionPageLd` + `breadcrumbList` + `jsonLdScriptProps`)
- `app/blog/page.tsx` (migrado no Sprint 3.6 — boa referência)

---

## Contato

Daniel Roscoe (owner) — `daniel@awsales.io`

Commits anteriores como referência de qualidade:
- `67bd1234` Sprint 3.6 — blog migration
- `9017355` Sprint 3 fixes + breadcrumbs
- `c52365d2` Sprint 3 — rich results

Boa caça, mestre. 🧙‍♂️
