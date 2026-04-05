# SRD Data Protection Migration

**Date:** 2026-04-05
**Status:** Implemented and deployed

## Problem

All SRD data files (monsters, spells, items, translations) were stored in `public/srd/` and directly accessible via URL. This exposed:

1. **Non-SRD WotC content** — `monsters-2014.json` (6.5MB) contained 2,517 monsters including copyrighted content from Volo's, Mordenkainen's, etc.
2. **PT-BR translations** — `monster-descriptions-pt.json` (866KB) and `spell-descriptions-pt.json` (343KB) are our own intellectual property
3. **Whitelist files** — exposed the filtering logic
4. **No robots.txt blocking** — search engines could index raw JSON files
5. **Cache-Control: immutable, 1 year** — CDNs cached the full files permanently

Total exposed: ~13MB of mixed content served as public static assets.

## Solution: Dual-Mode Architecture

### Directory Structure

```
data/srd/                          # Server-only, NOT publicly accessible
├── monsters-2014.json (5.4MB)     # ALL monsters with is_srd markers
├── monsters-2024.json (964KB)     # ALL monsters with is_srd markers
├── spells-2014.json (370KB)       # ALL spells with is_srd markers
├── spells-2024.json (372KB)       # ALL spells with is_srd markers
├── items.json (2.0MB)             # ALL items with srd markers
├── monster-descriptions-pt.json   # PT-BR translations (IP)
├── spell-descriptions-pt.json     # PT-BR translations (IP)
├── monster-names-pt.json          # EN→PT slug maps
├── spell-names-pt.json            # EN→PT slug maps
├── monster-lore.json              # Narrative lore EN
├── monster-lore-pt.json           # Narrative lore PT
├── srd-monster-whitelist.json     # 419 SRD monster slugs
├── srd-spell-whitelist.json       # 361 SRD spell slugs
├── srd-item-whitelist.json        # 1,145 SRD item IDs
├── monsters-mad.json              # MAD CC-licensed
├── monsters-mad-reddit.json       # MAD Reddit CC-licensed
├── conditions.json                # All SRD conditions
├── feats.json                     # All SRD feats
└── classes-srd.json               # All SRD classes

public/srd/                        # Publicly accessible, SRD-ONLY
├── monsters-2014.json (875KB)     # 419 SRD monsters only
├── monsters-2024.json (647KB)     # 346 SRD monsters only
├── spells-2014.json (348KB)       # 302 SRD spells only
├── spells-2024.json (349KB)       # 302 SRD spells only
├── items.json (679KB)             # 1,145 SRD/Basic items only
├── monsters-mad.json (746KB)      # MAD CC-licensed (safe)
├── conditions.json (54KB)         # All SRD (safe)
├── feats.json (25KB)              # All SRD (safe)
└── classes-srd.json (7.7KB)       # All SRD (safe)
```

### Data Flow

```
Supabase DB
    │
    ▼
scripts/generate-srd-bundles.ts  →  data/srd/ (full data)
    │
    ▼
scripts/filter-srd-public.ts    →  public/srd/ (SRD-only)
    │
    ▼
lib/srd/srd-mode.ts             →  Controls fetch URLs per user type
```

### Access Model

| User Type | Data Source | Monsters Available | "Completo" Button |
|-----------|-----------|-------------------|------------------|
| Guest (`/try`) | `/srd/*.json` (static) | 419 SRD + 346 SRD 2024 + 357 MAD | Locked + toast |
| Logged-in (normal) | `/srd/*.json` (static) | Same as guest | Locked + toast |
| Beta tester | `/api/srd/full/*.json` | ALL 2,517+ monsters | Works |
| Admin | `/api/srd/full/*.json` | ALL 2,517+ monsters | Works |

### 3 Layers of Defense

1. **Server layout** (`app/app/layout.tsx`): Checks `content_whitelist` + `is_admin` → passes `fullData` prop only to beta testers
2. **API route** (`/api/srd/full/`): Same DB check — returns 403 Forbidden for non-beta
3. **Client UI**: "Completo" button visible but locked with `Lock` icon and toast for non-beta

### SEO Impact

- `robots.txt` now blocks `/srd/` (raw JSON files)
- `X-Robots-Tag: noindex, nofollow` on all `/srd/*` responses
- Compendium HTML pages (`/monsters/*`, `/monstros/*`, `/spells/*`, `/magias/*`) are NOT affected — they remain fully indexable

### Files Modified

**New files (5):**
- `data/srd/` — 19 files (full data + translations)
- `lib/srd/srd-mode.ts` — Guest/auth mode control
- `scripts/filter-srd-public.ts` — SRD-only bundle generator
- `app/api/srd/full/[...path]/route.ts` — Beta-gated API

**Modified files (14+):**
- `lib/srd/srd-data-server.ts` — Paths → `data/srd/`
- `lib/srd/srd-loader.ts` — URLs via `srdDataUrl()`
- `lib/srd/srd-cache.ts` — Mode-aware cache keys
- `lib/hooks/useMonsterTranslation.ts` — Import path
- `components/srd/SrdInitializer.tsx` — `fullData` prop
- `components/combat/MonsterSearchPanel.tsx` — Locked button + toast
- `components/compendium/MonsterBrowser.tsx` — Same
- `app/app/layout.tsx` — Beta check + conditional `fullData`
- `app/robots.ts` — `/srd/` disallow
- `next.config.ts` — Cache 1d + X-Robots-Tag
- `scripts/generate-srd-bundles.ts` — Output → `data/srd/`
- `messages/pt-BR.json` + `messages/en.json` — Beta toast i18n
- `CLAUDE.md` — Updated documentation
- 8 SSG pages — Imports → `@/data/srd/`

### Maintenance

After updating data in `data/srd/`:
```bash
npx tsx scripts/filter-srd-public.ts
```

Expected counts:
- Monsters: ~1,122 public (419 SRD + 346 SRD 2024 + 357 MAD)
- Spells: ~604 public (302 + 302)
- Items: ~1,145 public (SRD/Basic)
