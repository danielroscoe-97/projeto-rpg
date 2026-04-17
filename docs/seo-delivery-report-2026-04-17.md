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

**Validated manually by user on Rich Results Test (2026-04-17):**
- ✅ `/` → WebApplication detected, warning about optional `aggregateRating` only
- ℹ️ `/monstros` → no rich result (CollectionPage isn't a rich-result type; breadcrumbs added after test)
- ✅ `/monsters/axe-beak` → Article + BreadcrumbList detected

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

## ❌ NOT done (Sprint 4 scope — deferred)

These were in the original 4-sprint plan but were not executed. Documenting here so a future agent can pick up:

### Sprint 4 — Escala e Monitoramento (originally proposed)

1. **Blog dinâmico** — Migrate `app/blog/[slug]/page.tsx` from hardcoded `CONTENT_MAP` to file-based MDX discovery. Currently every new blog post requires editing the `CONTENT_MAP` array; scalability friction.

2. **Internal linking audit** — Verify monster detail pages link to:
   - Related monsters (same CR, same type)
   - Spells the monster casts
   - Classes/backgrounds that reference them
   Dense internal graphs help Google crawl and distribute authority.

3. **Hub pages for cauda-longa**:
   - `/guias/bestiário-dnd-5e` — evergreen cluster page
   - `/guias/lista-magias-dnd-5e` — spell cluster
   These pages capture long-tail queries GSC shows are being searched (e.g., "monstros por CR d&d 5e").

4. **RSS feed URL audit** — Verify `app/blog/rss/route.ts` emits absolute apex URLs.

5. **Monitoring dashboard** — `docs/seo-monitoring.md` with weekly query-anchor tracking (position deltas, CTR changes). Optional: Looker Studio connected to GSC API.

6. **Core Web Vitals instrumentation** — Replace reverted Vercel Speed Insights with custom `web-vitals` npm package → Vercel Analytics custom events (or Sentry Performance).

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
