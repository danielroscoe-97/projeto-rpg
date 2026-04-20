# SEO Architecture — Pocket DM

**Canonical reference for future agents working on SEO in this project.**

Last updated: 2026-04-17 (post Sprint 3.7 — all 51 JSON-LD emitters use `jsonLdScriptProps`; all `url`/`item` inside JSON-LD go through `siteUrl()`).

---

## 🔒 Decisions that must NOT be reverted without review

### 1. Canonical domain is APEX (no www)

```
https://pocketdm.com.br       ← canonical (primary)
https://www.pocketdm.com.br   ← 301 → apex
http://pocketdm.com.br        ← 308 → https://pocketdm.com.br
http://www.pocketdm.com.br    ← 308 → https://www.pocketdm.com.br → 301 → apex
```

**Configured at:** Vercel Dashboard → Project → Settings → Domains (2026-04-17).

**Why apex instead of www:**
- Shorter, cleaner URLs (better for social sharing)
- Vercel defaults work out of the box
- Decision made after observing 4.698 "detected but not indexed" URLs in Search Console caused by domain fragmentation (http/https/www/non-www all seen as separate sites).

**If you ever need to switch to www:**
1. Invert the redirects on Vercel (www becomes primary, apex 301s to www).
2. Update `NEXT_PUBLIC_SITE_URL` in all 3 Vercel environments (Production, Preview, Development).
3. Re-verify with `curl -I` — all four variants (http/https × www/non-www) must converge on the chosen canonical.
4. Resubmit `sitemap.xml` in Search Console.
5. Expect 2-4 weeks of reindexing delay before GSC stabilizes.
6. **Do not do this without a strong reason.** Every switch resets GSC indexing.

**Verify canonical is working:**
```bash
curl -sI https://www.pocketdm.com.br | grep -iE "HTTP|Location"
# → HTTP/1.1 301 Moved Permanently
# → Location: https://pocketdm.com.br/
```

### 2. Locale strategy: Option B (separate URLs per locale, not prefix routing)

PT-BR: `/monstros`, `/magias`, `/classes-pt`, `/antecedentes`, `/itens`, `/talentos`, `/racas`
EN: `/monsters`, `/spells`, `/classes`, `/backgrounds`, `/items`, `/feats`, `/races`

Each page pair declares bidirectional `hreflang` alternates via `alternates.languages`.

**Why not URL prefix routing (`/en/*` and `/pt-BR/*`):**
- 83% of traffic is Brazil (GSC 2026-04-17). PT-BR needs to be at the root (default).
- next-intl uses cookie-based locale detection, not route-based.
- Existing URL structure (`/monstros` vs `/monsters`) was already semantic; switching to prefix would require 301s for every existing URL.

**Do not introduce `/en/*` or `/pt/*` route prefixes.** If a new locale is added (e.g., ES), follow the same pattern: semantic URLs in target language + bidirectional hreflang.

---

## 📁 File ownership

Every SEO-related file has a clear role. Do not duplicate logic across pages — use the helpers.

### Single source of truth

| File | Purpose |
|---|---|
| [lib/seo/site-url.ts](../lib/seo/site-url.ts) | `SITE_URL` constant + `siteUrl(path)` helper. All absolute URLs in JSON-LD MUST go through this. |
| [lib/seo/metadata.ts](../lib/seo/metadata.ts) | Typed metadata builders + JSON-LD builders. **Never emit JSON-LD without these.** |

### Metadata builders (lib/seo/metadata.ts)

**For detail pages** (entity-specific metadata):
- `monsterMetadata(monster, { slug, ptSlug, ptName?, locale })` — used by `/monsters/[slug]` + `/monstros/[slug]`
- `spellMetadata(spell, { slug, ptSlug, ptName?, locale })` — used by `/spells/[slug]` + `/magias/[slug]`
- `featMetadata(feat, { slug, ptName?, locale })` — used by `/feats/[slug]` + `/talentos/[slug]`
- `backgroundMetadata(bg, { slug, ptName?, locale })` — used by `/backgrounds/[slug]` + `/antecedentes/[slug]`
- `itemMetadata(item, { slug, ptName?, locale })` — used by `/items/[slug]` + `/itens/[slug]`

Each returns a full `Metadata` object with canonical, hreflang, OpenGraph, and Twitter tags. Locale-aware titles include structured data (CR, level, school) to target actual GSC queries.

**For generic routes** (`races`, `classes`, `subclasses`, index pages, landing pages):
Use `buildMetadata()` directly — same base builder with manual title/description.

### JSON-LD builders (lib/seo/metadata.ts)

- `orgNode()` — Organization node (embedded in Article publisher)
- `breadcrumbList(items)` — BreadcrumbList with absolute URLs
- `articleLd({ name, description, path, imagePath, locale })` — Article for detail pages
- `websiteLd({ description?, searchPath? })` — WebSite + SearchAction (homepage only)
- `organizationLd({ description?, sameAs? })` — Organization (homepage only)
- `webApplicationLd({ description?, featureList? })` — WebApplication (homepage only)
- `collectionPageLd({ name, description, path, locale, items })` — CollectionPage + ItemList (compendium indexes)
- `faqPageLd({ questions, description? })` — FAQPage (homepage + /faq)

### XSS-safe script renderer

- `jsonLdScriptProps(data)` — ALWAYS use this to render JSON-LD in a `<script>` tag.

```tsx
<script {...jsonLdScriptProps(myLd)} />
```

**Do not inline `dangerouslySetInnerHTML` for JSON-LD.** The helper escapes `</script>` consistently. A new caller forgetting the escape creates a latent script-injection risk.

---

## 🗺️ Sitemap & Robots

### [app/sitemap.ts](../app/sitemap.ts)

- **Rendering mode**: `force-static` (locked). Generated at build time.
- **`lastModified` for SRD content**: derived from `mtime` of `data/srd/*.json` bundles via `getSrdLastUpdated()`. If you regenerate bundles (`scripts/filter-srd-public.ts` or `scripts/generate-srd-bundles.ts`), Google will see fresh `lastModified` automatically — no manual bump needed.
- **`lastModified` for static pages**: `BUILD_TIME` (each deploy).
- **`lastModified` for blog posts**: reads from `BLOG_POSTS[i].date`.
- **`changeFrequency`**:
  - `yearly` for SRD detail pages (they don't change)
  - `monthly` for indexes (SRD regenerations)
  - `weekly` for blog index and home
  - `yearly` for old blog posts, legal

Do not set `changeFrequency: "always"` or `"daily"` unless content actually changes that often — Google penalizes exaggerations.

### [app/robots.ts](../app/robots.ts)

Disallowed paths (do not serve content that should index from these):
- `/app/` — auth-gated app UI
- `/admin/`, `/auth/`, `/api/` — internal
- `/join/`, `/invite/` — private campaign links
- `/try/combat/` — active combat state (session-specific)
- `/r/` — short URL redirects
- `/srd/` — raw JSON bundles (served via Vercel headers with `X-Robots-Tag: noindex`)

**`host` is declared** — crawlers know the canonical domain directly.

**Do not add `/*?*`** to disallow query strings. Canonical tags handle UTMs. The disallow pattern inflates "Excluded by robots" noise in GSC.

---

## 🔎 Structured Data Map

Summary of what schema each surface emits:

| Surface | Schemas | Eligible Rich Result |
|---|---|---|
| `/` (home) | WebSite + Organization + WebApplication + FAQPage | Sitelinks searchbox, FAQ accordion, App |
| `/faq` | FAQPage | FAQ accordion |
| `/blog` | CollectionPage | None (Collection not supported) |
| `/blog/[slug]` | Article + BreadcrumbList | Article + breadcrumbs |
| Compendium indexes (12 pages) | CollectionPage + BreadcrumbList | Breadcrumbs |
| Compendium detail pages | Article + BreadcrumbList | Breadcrumbs (and possibly Article) |

**CollectionPage does NOT generate a visible rich result in SERP** (per Google's supported list). We emit it for semantic correctness. Breadcrumbs DO — that's why indexes also emit BreadcrumbList.

Not implemented (future work):
- `aggregateRating` on homepage (needs real user ratings; don't fake — Google penalizes)
- Per-route OpenGraph images for feats/backgrounds/items (currently fall back to site default `/opengraph-image`)
- `Product` schema on items (not validated worth the effort)
- `Review` schema for spell tiers (would need structured user reviews)

---

## 🌐 Environment Variable

```
NEXT_PUBLIC_SITE_URL=https://pocketdm.com.br
```

**Consumers** (search codebase for this to audit):
- `lib/seo/site-url.ts` → feeds all canonical/JSON-LD URL generation
- `app/layout.tsx` → `metadataBase: new URL(defaultUrl)`
- `app/sitemap.ts` → sitemap URLs
- `app/robots.ts` → declared `host`
- Stripe checkout/billing-portal → redirect URLs
- Email templates (Resend) → absolute links
- RSS feed (`app/blog/rss`)

**When changing**:
1. Vercel env var (Production + Preview + Development)
2. `.env.local` (local dev)
3. `.env.example` documentation
4. Re-verify with `curl` that Vercel redirects converge on this URL

---

## 📊 Baseline & Monitoring

Baseline snapshot from GSC on 2026-04-17: [docs/seo-baseline-2026-04-17.md](./seo-baseline-2026-04-17.md)

**Queries to monitor** (GSC > Search Results > Queries):
- `bestiário d&d 5e` (pos 8, CTR 0% → target CTR ≥4%)
- `tabela de atributos d&d` (pos 8, CTR 0%)
- `misty step 5e` (pos 38 → target top 10)
- `helmed horror 5e` (pos 16)
- `magias d&d 5e` (pos 30)
- `fly 5e` (pos 30, 1 click achieved)
- `dm tracker` (pos 7)
- `combat tracker dnd` (pos 38, 1 click)

**Compare at 30 / 60 / 90 days** after 2026-04-17 deploy.

---

## ⚠️ Anti-patterns — DO NOT DO

```
// ❌ NEVER hardcode the domain in pages
url: "https://pocketdm.com.br/monsters"
// ✅ Use the helper (or rely on metadataBase for relative paths)
url: siteUrl("/monsters")  // absolute (JSON-LD)
url: "/monsters"            // relative (Next.js Metadata — metadataBase resolves)

// ❌ NEVER emit JSON-LD without the script helper
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(myLd) }} />
// ✅ Always use the helper (consistent XSS escape)
<script {...jsonLdScriptProps(myLd)} />

// ❌ NEVER add route-prefix locale (/en/*, /pt-BR/*) — it conflicts with decision #2
// ❌ NEVER restore `keywords` meta tag — Google has ignored it since 2009; dead weight
// ❌ NEVER fake aggregateRating — Google penalizes
// ❌ NEVER add `/*?*` to robots.txt — canonical tags handle UTMs; the disallow inflates GSC noise
// ❌ NEVER call generateMetadata with hardcoded title — use the locale-aware builders
// ❌ NEVER change canonical direction (www vs apex) casually — weeks of reindexing reset
```

---

## 🧪 Validation & Debugging

After any SEO-touching PR:

```bash
# 1. Typecheck
rtk npx tsc --noEmit

# 2. Verify sitemap generates
rtk npm run dev
curl -s http://localhost:3000/sitemap.xml | grep -c "<loc>"   # ~2000 expected
curl -s http://localhost:3000/robots.txt                       # Host: and Disallow: rules

# 3. Production validation
curl -sI https://pocketdm.com.br/robots.txt                    # 200 OK
curl -sI https://pocketdm.com.br/sitemap.xml                   # 200 OK
```

**Rich Results Test** (after deploy):
```
https://search.google.com/test/rich-results?url=https://pocketdm.com.br/
https://search.google.com/test/rich-results?url=https://pocketdm.com.br/monstros
https://search.google.com/test/rich-results?url=https://pocketdm.com.br/monsters/axe-beak
https://search.google.com/test/rich-results?url=https://pocketdm.com.br/faq
```

Expected:
- `/` → WebApplication + FAQPage detected
- `/monstros` → BreadcrumbList detected (CollectionPage ignored by validator — that's OK)
- `/monsters/axe-beak` → Article + BreadcrumbList detected
- `/faq` → FAQPage detected

---

## 🔗 Related docs

- [docs/seo-workflow.md](./seo-workflow.md) — Branch/commit/deploy discipline for multi-agent SEO work
- [docs/seo-baseline-2026-04-17.md](./seo-baseline-2026-04-17.md) — GSC metrics snapshot for 30/60/90d comparison
- [docs/seo-sprint-1-handoff.md](./seo-sprint-1-handoff.md) — Search Console / Vercel checklist from Sprint 1
- [docs/seo-delivery-report-2026-04-17.md](./seo-delivery-report-2026-04-17.md) — What got shipped in 3 SEO sprints
- [docs/seo-roadmap-2026-04-20.md](./seo-roadmap-2026-04-20.md) — 3-epic roadmap for next 30 days (Epic A/B/C)
- [docs/plano-seo-externo-2026-04-11.md](./plano-seo-externo-2026-04-11.md) — External SEO strategy
- [docs/epic-seo-supremo.md](./epic-seo-supremo.md) — Previous SEO epic
