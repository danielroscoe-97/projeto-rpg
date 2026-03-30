# Bundle Audit Baseline

> **Data:** 2026-03-30
> **Build:** Next.js (webpack mode, production)

---

## JS Bundle (First Load)

| Metric | Value |
|--------|-------|
| Total JS chunks | 77 |
| Total JS size (uncompressed) | 2.70 MB |
| Largest chunk | 227.2 KB |

### Top 10 Largest Chunks

| Size (KB) | Chunk |
|-----------|-------|
| 227.2 | 0~2_skdi7b62u.js |
| 219.2 | 0c_2ls.jti0z8.js |
| 144.7 | 0m11qyveyy~yy.js |
| 120.5 | 12dbxguq-sfr9.js |
| 118.8 | 0r-0-u.ec9t_m.js |
| 110.0 | 03~yq9q893hmn.js |
| 106.7 | 05.3.qblp1e2..js |
| 83.0  | 06u-t4ggdo7t4.js |
| 83.0  | 0diollq-32h6m.js |
| 80.3  | 0mo8lp3sm2f7s.js |

---

## SRD Bundles (Runtime Fetch, not in JS bundle)

| Bundle | Raw | Gzipped |
|--------|-----|---------|
| monsters-2014.json | 6,302 KB | 990 KB |
| monsters-2024.json | 1,057 KB | 134 KB |
| spells-2014.json | 665 KB | 143 KB |
| spells-2024.json | 425 KB | 87 KB |
| items.json | 2,209 KB | 463 KB |
| conditions.json | 53 KB | 12 KB |
| **Total** | **10,711 KB** | **1,829 KB** |

---

## Audio Assets

| Directory | Size |
|-----------|------|
| public/sounds/ | 15 MB |

---

## Key Dependencies (Heavy)

| Package | Role |
|---------|------|
| framer-motion | Animations |
| @sentry/nextjs | Error tracking |
| @supabase/supabase-js | Realtime + DB |
| fuse.js | Client-side search |
| cmdk | Command palette |
| react-markdown | Markdown rendering |
| stripe | Billing |

---

## Top 5 Optimization Opportunities

1. **Lazy SRD by version** — monsters-2014 alone is 990KB gzipped; most DMs use only one version. Load preferred version first, defer other to idle callback. **Est. impact: -50% initial SRD load.**

2. **Code splitting heavy routes** — Admin, billing, homebrew, tour components are bundled even for combat-only users. Dynamic imports with `next/dynamic`. **Est. impact: -15-20% first load JS for combat route.**

3. **SrdSearchProvider abstraction** — Decouple Fuse.js from srd-store to enable future hybrid search (client + server). Pure refactor, no perf change now, but enables chunked SRD loading later.

4. **framer-motion tree-shaking** — Verify all imports are named imports (`{ motion, AnimatePresence }`), not wildcard. Already likely correct but worth auditing.

5. **Audio lazy loading** — 15MB of sounds in public/; SW should cache-on-first-use, not pre-cache.
