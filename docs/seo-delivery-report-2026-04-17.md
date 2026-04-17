# SEO Delivery Report — 2026-04-17

**What shipped across 3 SEO sprints triggered by the Search Console audit (18 clicks / 734 impressions / 4,698 "detected not indexed").**

All sprints merged and deployed to production (`pocketdm.com.br`).

---

## 📦 Deliverables by sprint

### Sprint 1 — Canonical Foundation

**Commits:** `cbb58f7` (feature) + `41968f2` (review fixes)

**Shipped:**
- ✅ [app/sitemap.ts](../app/sitemap.ts) — real `lastModified` from SRD bundle `mtime`, proper `changeFrequency`, `force-static` rendering
- ✅ [app/robots.ts](../app/robots.ts) — declared `host`, disallow `/r/` (short URLs)
- ✅ [.env.example](../.env.example) — documented `NEXT_PUBLIC_SITE_URL` canonical
- ✅ [docs/seo-baseline-2026-04-17.md](./seo-baseline-2026-04-17.md) — GSC snapshot
- ✅ [docs/seo-sprint-1-handoff.md](./seo-sprint-1-handoff.md) — Vercel + GSC user checklist

**Code review findings fixed (`41968f2`):**
- H1 — `BUILD_TIME` moved inside `sitemap()` function + `force-static` declared
- H2 — `SRD_LAST_UPDATED` now derived from bundle mtime (not hardcoded literal)
- M1 — Removed `/*?*` disallow from robots (canonical tag handles UTMs)
- M2 — Corrected misleading comment about priority (Google ignores since 2017)

---

### Sprint 2 — Metadata Helpers + URL Centralization

**Commits:** `75bb8f5` (sprint 2a — helpers + 10 detail pages) + `b1c4cc8` (sprint 2b — 46 pages URL cleanup)

**Shipped:**
- ✅ [lib/seo/site-url.ts](../lib/seo/site-url.ts) — `SITE_URL` constant + `siteUrl(path)` helper
- ✅ [lib/seo/metadata.ts](../lib/seo/metadata.ts) — typed builders for 5 entity types (monster, spell, feat, background, item) + shared JSON-LD helpers (`orgNode`, `breadcrumbList`, `articleLd`)
- ✅ **10 detail pages refactored** to use builders:
  - `app/monsters/[slug]/page.tsx` + `app/monstros/[slug]/page.tsx`
  - `app/spells/[slug]/page.tsx` + `app/magias/[slug]/page.tsx`
  - `app/feats/[slug]/page.tsx` + `app/talentos/[slug]/page.tsx`
  - `app/backgrounds/[slug]/page.tsx` + `app/antecedentes/[slug]/page.tsx`
  - `app/items/[slug]/page.tsx` + `app/itens/[slug]/page.tsx`
- ✅ **46 additional pages** with hardcoded `https://pocketdm.com.br/...` URLs converted to relative paths (resolve via `metadataBase`)
- ✅ Titles enriched with CR/level/school — targets actual GSC queries

**Example title change:**
- Before: `Axe Beak — D&D 5e Stat Block`
- After: `Axe Beak — CR 1/4 D&D 5e Stat Block`

**Code review findings fixed (included in `b1c4cc8`):**
- M1 — `monster.size` double-space when undefined → uses `filter(Boolean).join(" ")`
- M3 — Removed `keywords` array (Google ignores since 2009)
- H2 — Hardened `siteUrl()` against protocol-relative input (`//cdn.foo.com/x`)

---

### Sprint 3 — Rich Results + Review Fixes

**Commits:** `c52365d` (rich results) + `9017355` (review fixes + breadcrumbs)

**Shipped:**
- ✅ **5 new JSON-LD builders** in `lib/seo/metadata.ts`:
  - `websiteLd()` — WebSite + SearchAction (for sitelinks searchbox)
  - `organizationLd()` — Organization with `sameAs` social links
  - `webApplicationLd()` — WebApplication (GameApplication, free offer)
  - `collectionPageLd()` — CollectionPage + ItemList (top 10 entries)
  - `faqPageLd()` — FAQPage with Q&A pairs
- ✅ [app/page.tsx](../app/page.tsx) — homepage emits WebSite + Organization + WebApplication + FAQPage
- ✅ [app/faq/page.tsx](../app/faq/page.tsx) — FAQPage
- ✅ **12 index pages** refactored to use `collectionPageLd()` with absolute URLs

**Code review findings fixed (`9017355`):**
- H1 — `jsonLdScriptProps()` helper for uniform XSS-safe `</script>` escaping; migrated all 17 JSON-LD renderers
- M1 — `faqPageLd()` accepts optional `description`; `/faq` restored top-level description

**Added in `9017355`:**
- ✅ **BreadcrumbList JSON-LD on all 14 index pages** — enables SERP breadcrumb rich result ("Início › Monstros" instead of raw path)

### Sprint 3.6 — Blog migration (post-audit)

**Context:** During Sprint 3 the blog was overlooked in the JSON-LD helper migration. Caught in a subsequent audit and fixed.

**Shipped:**
- ✅ [app/blog/[slug]/page.tsx](../app/blog/[slug]/page.tsx) — migrated to `articleLd()` + `breadcrumbList()` + `jsonLdScriptProps()`. XSS escape now consistent with rest of the site. Removed inline `BASE_URL` constant in favor of `siteUrl()` via the builders.
- ✅ [app/blog/page.tsx](../app/blog/page.tsx) — added `CollectionPage` JSON-LD (listing all 21 posts) + `BreadcrumbList`. Previously had no structured data.

**Validated manually by user on Rich Results Test (2026-04-17):**
- ✅ `/` → WebApplication detected, warning about optional `aggregateRating` only
- ℹ️ `/monstros` → no rich result (CollectionPage isn't a rich-result type; breadcrumbs added after test)
- ✅ `/monsters/axe-beak` → Article + BreadcrumbList detected

### Sprint 3.7 — Migration Cleanup (post-audit, 2026-04-17)

**Context:** An audit of Sprint 1-3 discovered that the docs said "migrated all JSON-LD renderers to `jsonLdScriptProps`" but in reality only ~18 of ~51 emitters had been migrated. 4 SRD detail pages had inline scripts with NO `</script>` escape (XSS vulnerable). Many pages had `item: "/"` and `url: "/"` (relative) inside JSON-LD, which Google Rich Results ignores. Sprint 3.7 closed the gap.

**Shipped — 5 sequential commits:**

1. **Lib foundation** (commit 1/5)
   - ✅ [lib/seo/metadata.ts](../lib/seo/metadata.ts) `articleLd` — dropped redundant `name` field (Google uses `headline` for Article).
   - ✅ [app/sitemap.ts](../app/sitemap.ts) + [app/robots.ts](../app/robots.ts) — now import `SITE_URL` from `lib/seo/site-url.ts` instead of re-declaring `process.env.NEXT_PUBLIC_SITE_URL || "https://..."` (single source of truth).

2. **SRD detail pages** (commit 2/5) — 10 files migrated to `jsonLdScriptProps()`:
   - `monsters/[slug]`, `monstros/[slug]`, `spells/[slug]`, `magias/[slug]` (these 4 had NO escape — XSS fix)
   - `feats/[slug]`, `talentos/[slug]`, `backgrounds/[slug]`, `antecedentes/[slug]`, `items/[slug]`, `itens/[slug]` (had escape, now use the helper uniformly)

3. **Races / classes / subclasses** (commit 3/5) — 6 files fully refactored from inline JSON-LD to the builders (`articleLd` + `breadcrumbList` + `jsonLdScriptProps`). Net: –196 LOC.
   - `races/[slug]`, `racas/[slug]`, `classes/[slug]`, `classes-pt/[slug]`, `classes/[slug]/subclasses/[subSlug]`, `classes-pt/[slug]/subclasses/[subSlug]`

4. **Landing / tool pages** (commit 4/5) — 20 pages migrated via batch scripts (`.claude/worktrees/migrate_jsonld.py` + `migrate_absolute_urls.py`):
   - Tools: `dice/dados`, `encounter-builder/calculadora-encontro`
   - References: `ability-scores/atributos`, `actions/acoes-em-combate`, `rules/regras`, `conditions/condicoes`, `diseases/doencas`, `damage-types/tipos-de-dano`
   - Content: `methodology`, `methodology/spell-tiers`, `about`, `ebook/guia-mestre-eficaz`
   - **Schemas preserved** (WebApplication for tools, ItemList for atributos, ResearchProject for methodology) — NOT downgraded to Article.
   - Absolute URLs applied to `url`/`item` values inside JSON-LD (siteUrl() wrap). openGraph URLs remain relative (resolve via metadataBase).

5. **Docs update** (commit 5/5, this one) — this section.

**Final validation:**
```bash
grep -rn 'dangerouslySetInnerHTML.*JSON.stringify' app/
# → 0 results

grep -rn 'item: "/' app/
# → 0 results

grep -rn 'url: "/"' app/
# → 1 result (app/layout.tsx openGraph — correct, resolves via metadataBase)

rtk npx tsc --noEmit
# → 0 errors
```

**After 3.7:**
- 100% of app/ pages use `jsonLdScriptProps()` (XSS-safe, uniform).
- All JSON-LD URLs are absolute (Google Rich Results renders BreadcrumbList).
- `SITE_URL` is the single source of truth for the canonical domain.

---

## ✅ Originally planned vs delivered

| Task | Original plan | Status | Notes |
|---|---|---|---|
| Canonical unification (www vs apex) | Sprint 1 | ✅ | User configured apex on Vercel |
| `NEXT_PUBLIC_SITE_URL` env var | Sprint 1 | ✅ | |
| Submit sitemap on GSC | Sprint 1 (user) | ⏳ | Pending Daniel's action — see handoff doc |
| Create GSC Domain Property | Sprint 1 (user) | ⏳ | Pending Daniel's action |
| Request reindex for 10 anchor pages | Sprint 1 (user) | ⏳ | Pending Daniel's action |
| Refactor sitemap (timestamps, changeFreq) | Sprint 1 | ✅ | |
| Refactor robots (host, `/r/`) | Sprint 1 | ✅ | |
| Baseline snapshot doc | Sprint 1 | ✅ | |
| Create `lib/seo/site-url.ts` | Sprint 2 | ✅ | |
| Create `lib/seo/metadata.ts` builders | Sprint 2 | ✅ | 5 entity types |
| `generateMetadata` for detail pages | Sprint 2 | ✅ | 10 pages (EN + PT) |
| hreflang bidirectional | Sprint 2 | ✅ | via `buildMetadata` alternates |
| Slug-map PT↔EN file | Sprint 2 | ⚠️ | Not created as separate file — logic inlined in builders via `toMonsterSlugPt()`/`toSpellSlugPt()` (already existed in `srd-data-server.ts`). Functionally equivalent. |
| Canonical relative paths | Sprint 2 | ✅ | 46 pages + 10 detail = 56 files |
| Homepage JSON-LD (WebSite/Org/App) | Sprint 3 | ✅ | |
| CollectionPage on indexes | Sprint 3 | ✅ | 14 indexes |
| FAQPage on `/faq` | Sprint 3 | ✅ | Homepage also has FAQPage |
| Article on blog posts | (pre-existing) | ✅ | Not touched — already worked |
| BreadcrumbList on detail pages | (pre-existing) | ✅ | Article + Breadcrumb per detail page |
| BreadcrumbList on indexes | Sprint 3 | ✅ | Added in `9017355` |
| Rich Results Test validation | Sprint 3 | ✅ | Done manually by user |

---

## ✅ Sprint 4 — Escala e Marketing (DONE 2026-04-17)

### T4.1 — Core Web Vitals instrumentation

**Commit:** `55e29c47 feat(seo): sprint 4.1 — Core Web Vitals instrumentation`

- ✅ Instalado `web-vitals@^5.2.0` (~5KB, free, open-source)
- ✅ [components/analytics/WebVitalsTracker.tsx](../components/analytics/WebVitalsTracker.tsx) — `"use client"`, monta `onLCP/onCLS/onINP/onFCP/onTTFB` e emite custom events via `@vercel/analytics` `track()`
- ✅ Produção-only (`process.env.NODE_ENV === "production"`) — não polui dev
- ✅ CLS multiplicado por 1000 antes do envio (Vercel Analytics só aceita inteiros — preserva resolução sub-unitária)
- ✅ Montado em [app/layout.tsx](../app/layout.tsx) dentro do `<body>`
- ✅ Typecheck limpo

Substitui Vercel Speed Insights (revertido no commit `c77b0fb` — pago, fora do plano Pro).

### T4.2 — Blog dinâmico MDX (SKIP intencional, documentado)

**Decisão:** Não executado neste sprint. Justificativa:

- `components/blog/BlogPostContent.tsx` é um monolito de **325KB / 6735 linhas / 21 componentes React** com customização heavy (`H2`, `H3`, `Img`, `ExtLink`, `IntLink`, `ProdLink`, `Tip`, `BuildVariantProvider`, `BuildVariantToggle`, `Variant`, `StrategyBox`, `EbookCTA`, `CATEGORY_CTA` — 15+ componentes específicos)
- Migrar pra MDX exigiria: mapear todos esses componentes via `components` prop do pipeline MDX + rewrite do JSX custom de cada post em markdown
- Effort real: ~15-20h (spec estimava 3h — subestimado)
- Risco: quebrar 21 URLs que têm tráfego no GSC baseline (spec alerta: "mudá-los é suicídio")
- Trade-off: valor de "adicionar novo post em 1 lugar" é baixo — posts novos são infrequentes; risco > benefício

**Alternativa recomendada (future sprint):** Split incremental do monolito em 21 arquivos `components/blog/posts/post-{slug}.tsx` mantendo o formato React, com registry em `lib/blog/posts.ts` co-locando slug + lazy-load. Entrega 80% do valor do MDX (scalability) com ~5% do risco (URL preservadas, componentes preservados).

### T4.3 — Hub pages long-tail

**Commit:** `e92ebdc2` (bundled commit — ver nota abaixo)

- ✅ [app/guias/bestiario-dnd-5e/page.tsx](../app/guias/bestiario-dnd-5e/page.tsx) — H1 "Bestiário D&D 5e Completo — 1.122 Monstros com Stat Blocks"
  - Seções: intro SRD 5.1, monstros por CR (5 tiers), monstros por tipo (5 categorias), 6 icônicos, como usar, CTA
  - ~950 palavras originais PT-BR
  - ~40 links internos (`/monstros/*`, `/magias`, `/itens`, `/blog/*`, etc.)
  - JSON-LD: `articleLd` + `breadcrumbList` via `jsonLdScriptProps` (XSS-safe)

- ✅ [app/guias/lista-magias-dnd-5e/page.tsx](../app/guias/lista-magias-dnd-5e/page.tsx) — H1 "Lista de Magias D&D 5e — Grimório Completo por Classe e Nível"
  - Seções: intro (como funciona magia), por nível (truques a 9), por classe (8 conjuradores), 6 icônicas, como usar no tracker, CTA
  - ~1100 palavras originais PT-BR
  - ~45 links internos (`/magias/*`, `/classes-pt/*`, outros hubs)
  - JSON-LD: `articleLd` + `breadcrumbList` via `jsonLdScriptProps`

- ✅ [app/sitemap.ts](../app/sitemap.ts) — 2 entradas novas adicionadas em `staticPages`, priority 0.8, monthly

**Nota sobre o commit**: As 3 mudanças acima foram bundled no commit `e92ebdc2 fix(feedback): allow changing vote before submit` junto com um fix não-relacionado de `DifficultyRatingStrip`. Commit message é misleading. Pode ser limpo com `git rebase -i` e `--edit` da mensagem se for relevante para auditoria.

### T4.4 — Monitoring dashboard

**Criado:** [docs/seo-monitoring.md](./seo-monitoring.md)

- ✅ Ritual semanal (segunda-feira, 15 min) — GSC Performance + spot check queries-âncora
- ✅ Tabela de query-âncora tracking (17 queries, baseline + 30/60/90d columns)
- ✅ Metas agregadas (cliques, impressões, CTR, indexed URLs) — do baseline
- ✅ Links úteis (GSC, Rich Results Test pros URLs-sample, Vercel Analytics)
- ✅ 4 gatilhos de alerta de regressão (posição, indexação, CTR, CWV)
- ✅ Instruções opcionais pra Looker Studio se escala passar de 30 queries

**Comparações marcadas no calendário:**
- 2026-05-17 — 30d
- 2026-06-17 — 60d
- 2026-07-17 — 90d

### Outros items originalmente listados pra Sprint 4 (deferred)

1. **Internal linking audit automatizado** — Verificar que monster detail pages linkam pra magias/classes relacionadas. Não executado neste sprint (depende de análise manual ou script de cross-reference). Nota: os dois hubs novos (T4.3) já criam uma densa rede de links internos manuais pra monsters e spells icônicos.

2. **RSS feed URL audit** — `app/blog/rss/route.ts` não foi auditado. Risk check pendente (emite apex URLs? verificar antes do próximo deploy).

### Other deferred items

- **Per-route OpenGraph images for feats/backgrounds/items/races/classes/subclasses** — Currently these fall back to the site-default `/opengraph-image`. Monster/spell detail pages already have route-level OG generators.
- **`aggregateRating` on homepage** — Warning in Rich Results Test. Requires real user ratings (don't fake); defer until 20+ users and a rating opt-in UI.
- **Carousel rich result** — Would require `ItemList` top-level on indexes (currently nested inside `CollectionPage`) and per-item Article schema. Complex; unclear ROI for the bestiary use case.
- **Structured data for Monster/Spell** — Google doesn't have official schema types; we use `Article` + BreadcrumbList which works.

---

## 📅 Pending user actions (from Sprint 1 handoff)

Daniel still needs to complete these in Vercel + GSC. See [docs/seo-sprint-1-handoff.md](./seo-sprint-1-handoff.md) for full checklist.

- [x] 1. Redirect canônico verificado (done 2026-04-17)
- [x] 2. `NEXT_PUBLIC_SITE_URL` no Vercel (done — já era apex)
- [x] 3. Deploy master (done via Vercel auto-deploy post-merge)
- [ ] 4. Criar/verificar Domain Property no GSC (`pocketdm.com.br`)
- [ ] 5. Enviar `https://pocketdm.com.br/sitemap.xml` no GSC
- [ ] 6. Solicitar reindex nas 10 páginas âncora
- [ ] 7. Verificar `robots.txt` e `sitemap.xml` no ar
- [ ] 8. Anotar 2026-05-17 no calendário para comparação 30d

**Nothing blocks further code work, but the GSC actions accelerate reindexing.**

---

## 📊 Baseline → Goals (30/60/90d)

| Métrica | 2026-04-17 baseline | 30d goal (2026-05-17) | 60d (2026-06-17) | 90d (2026-07-17) |
|---|---|---|---|---|
| Cliques/28d | 18 | 100+ | 300+ | 500+ |
| Impressões/28d | 734 | 3.000+ | 6.000+ | 10.000+ |
| CTR | 2,45% | 3,3% | 4,5% | 5%+ |
| URLs indexadas | 119 | 1.500+ | 2.500+ | 3.000+ |
| Detectadas não indexadas | 4.698 | <1.500 | <800 | <500 |
| Queries top 3 | 2 | 10+ | 20+ | 30+ |
| Queries top 10 | 8 | 30+ | 60+ | 80+ |

---

## 🏗️ For future agents

**Start here**: [docs/seo-architecture.md](./seo-architecture.md) — architectural decisions, file ownership, anti-patterns, validation flow.

**Key files to understand**:
- `lib/seo/site-url.ts` (20 lines, single source of truth)
- `lib/seo/metadata.ts` (~400 lines, all builders)
- `app/sitemap.ts`, `app/robots.ts` (SEO infrastructure)
- `app/page.tsx` (homepage — reference implementation for multi-schema JSON-LD)

**Key decisions — do not revert without review:**
1. Canonical is apex (`pocketdm.com.br`, no www) — see Architecture doc for reason + how to switch if ever needed.
2. Locale strategy is Option B (semantic URLs per locale, not route prefix) — 83% of traffic is Brazil, PT-BR is default.
3. JSON-LD always uses absolute URLs via `siteUrl()`. Next.js `Metadata` uses relative paths via `metadataBase`.
4. All `<script type="application/ld+json">` MUST use `jsonLdScriptProps()` helper (XSS safety).

**Contact trail**: Daniel Roscoe (owner) — `daniel@awsales.io`
