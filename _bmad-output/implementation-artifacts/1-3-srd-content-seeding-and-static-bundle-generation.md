# Story 1.3: SRD Content Seeding & Static Bundle Generation

Status: review

## Story

As a **developer**,
I want SRD 5.1 and 5.2 monster and spell data seeded into the database and exported as static JSON bundles,
So that the rules oracle has complete, versioned content available via CDN and IndexedDB.

## Acceptance Criteria

1. **Given** the database schema from Story 1.2 is applied, **When** seed data is loaded, **Then** all SRD 5.1 (2014) monsters are inserted with `ruleset_version = '2014'`
2. **Given** the seed process completes, **Then** all SRD 5.2 (2024) monsters are inserted with `ruleset_version = '2024'`
3. **Given** the seed process completes, **Then** all SRD 5.1 (2014) spells are inserted with `ruleset_version = '2014'`
4. **Given** the seed process completes, **Then** all SRD 5.2 (2024) spells are inserted with `ruleset_version = '2024'`
5. **Given** the seed process completes, **Then** all 13 standard conditions are seeded into condition_types (already done via `supabase/seed.sql`)
6. **Given** the `scripts/generate-srd-bundles.ts` script runs, **Then** it produces: `monsters-2014.json`, `monsters-2024.json`, `spells-2014.json`, `spells-2024.json`, `conditions.json` in `/public/srd/`
7. **Given** each generated JSON file, **Then** it is valid JSON and contains the expected full SRD entity count (not placeholder data)
8. **Given** the full pipeline runs, **Then** 2014 and 2024 content coexist without overwriting (NFR26 — lossless versioning)

## Current State Assessment

### What Already Exists
- **DB schema**: `monsters`, `spells`, `condition_types` tables with `ruleset_version` ENUM exist (migration `003_srd_content.sql`)
- **Condition seed**: `supabase/seed.sql` seeds 13 Portuguese-language conditions — **DONE, no changes needed**
- **Bundle script**: `scripts/generate-srd-bundles.ts` exports from Supabase DB to `/public/srd/*.json` — **DONE, works correctly**
- **JSON bundles**: Files exist in `/public/srd/` but contain **PLACEHOLDER DATA ONLY**:
  - `monsters-2014.json` — 15 monsters (should be ~300+)
  - `monsters-2024.json` — 15 monsters (should be ~300+)
  - `spells-2014.json` — 3 spells (Fireball, Cure Wounds, Magic Missile) (should be ~300+)
  - `spells-2024.json` — 2 spells (Fireball, Cure Wounds) (should be ~300+)
- **SRD client**: `lib/srd/srd-loader.ts`, `srd-search.ts`, `srd-cache.ts` all exist and work with the JSON structure
- **package.json script**: `"generate-srd": "ts-node scripts/generate-srd-bundles.ts"` exists

### What Needs To Be Done
1. **Create a comprehensive SRD seeding script** that imports full 5e-database monster and spell data into Supabase
2. **Re-run `generate-srd-bundles.ts`** to produce full JSON bundles from the seeded database
3. **Validate** entity counts and data integrity in the output JSON files

## Tasks / Subtasks

- [ ] Task 1: Create SRD data import script (AC: #1, #2, #3, #4)
  - [ ] 1.1 Source the 5e-database JSON files (MIT license) for SRD 5.1 and 5.2 monsters and spells
  - [ ] 1.2 Create `scripts/seed-srd-data.ts` that reads 5e-database JSON and inserts into Supabase `monsters` and `spells` tables
  - [ ] 1.3 Map 5e-database fields to the existing DB schema columns (see schema mapping below)
  - [ ] 1.4 Handle `ruleset_version` assignment: 5.1 content → '2014', 5.2 content → '2024'
  - [ ] 1.5 Use `ON CONFLICT (name, ruleset_version) DO NOTHING` to be idempotent
  - [ ] 1.6 Add `"seed-srd": "ts-node scripts/seed-srd-data.ts"` to package.json
- [ ] Task 2: Run full pipeline and generate bundles (AC: #6, #7)
  - [ ] 2.1 Seed data into local Supabase: `npm run seed-srd`
  - [ ] 2.2 Generate bundles: `npm run generate-srd`
  - [ ] 2.3 Verify output file counts match expected SRD totals
- [ ] Task 3: Validate data integrity (AC: #7, #8)
  - [ ] 3.1 Verify 2014 and 2024 entities are separate (no cross-contamination)
  - [ ] 3.2 Verify each monster has required fields: name, size, type, alignment, ac, hp, abilities, actions
  - [ ] 3.3 Verify each spell has required fields: name, level, school, casting_time, range, components, duration, description, classes
  - [ ] 3.4 Verify conditions.json still has 13 entries (unchanged)
  - [ ] 3.5 Commit the full JSON bundles to the repository

## Dev Notes

### SRD Data Source
- **Primary source**: [5e-database](https://github.com/5e-bits/5e-database) — MIT-licensed JSON, the definitive open SRD dataset
- **SRD 5.1 (2014)**: Covers ~325 monsters, ~300 spells from the original 2014 SRD
- **SRD 5.2 (2024)**: Updated 2024 revision with revised stat blocks and spells
- **License**: MIT (5e-database) + CC-BY-4.0 (SRD content itself) — both permit this use

### Database Schema Mapping (migration `003_srd_content.sql`)

**Monsters table columns:**
- `id` (UUID, auto-generated)
- `name` (TEXT, NOT NULL)
- `ruleset_version` (ENUM '2014'|'2024')
- `size`, `type`, `alignment` (TEXT)
- `armor_class` (INTEGER)
- `hit_points`, `hit_dice` (TEXT/INTEGER)
- `speed` (JSONB)
- `strength`, `dexterity`, `constitution`, `intelligence`, `wisdom`, `charisma` (INTEGER)
- `saving_throws`, `skills` (JSONB)
- `damage_resistances`, `damage_immunities`, `condition_immunities` (TEXT[])
- `senses`, `languages` (TEXT)
- `challenge_rating` (NUMERIC)
- `special_abilities`, `actions`, `legendary_actions`, `reactions` (JSONB)
- `created_at` (TIMESTAMPTZ)
- UNIQUE constraint on `(name, ruleset_version)`

**Spells table columns:**
- `id` (UUID, auto-generated)
- `name` (TEXT, NOT NULL)
- `ruleset_version` (ENUM '2014'|'2024')
- `level` (INTEGER)
- `school` (TEXT)
- `casting_time`, `range`, `duration` (TEXT)
- `components` (TEXT)
- `description` (TEXT)
- `higher_levels` (TEXT)
- `classes` (TEXT[])
- `ritual` (BOOLEAN)
- `concentration` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- UNIQUE constraint on `(name, ruleset_version)`

### Existing Client-Side Search Integration
- `lib/srd/srd-loader.ts` — Fetches `/public/srd/*.json` and parses. No changes needed; schema-agnostic array loading.
- `lib/srd/srd-search.ts` — Fuse.js search. Index keys must match the JSON field names in the bundles.
- `lib/srd/srd-cache.ts` — IndexedDB cache via `idb`. Caches by URL key. No changes needed.
- `components/srd/SrdInitializer` — Triggers bundle load on app mount. No changes needed.

### Anti-Patterns to Avoid
- **DO NOT modify the existing `supabase/seed.sql`** — it correctly seeds conditions and is referenced by `supabase db reset`
- **DO NOT modify `scripts/generate-srd-bundles.ts`** — it works correctly for exporting; the problem is missing source data
- **DO NOT use SQL migrations for monster/spell seeding** — use a separate script because the data volume is large and should be runnable independently
- **DO NOT change the JSON field names in bundles** — the SRD loader, search, and cache modules depend on the current structure
- **DO NOT include non-SRD copyrighted content** — only content from the official SRD under CC-BY-4.0

### File Structure
```
scripts/
  generate-srd-bundles.ts  ← EXISTS, no changes
  seed-srd-data.ts         ← NEW: imports 5e-database into Supabase
public/srd/
  monsters-2014.json       ← REPLACE: full SRD data
  monsters-2024.json       ← REPLACE: full SRD data
  spells-2014.json         ← REPLACE: full SRD data
  spells-2024.json         ← REPLACE: full SRD data
  conditions.json          ← KEEP: already correct (13 conditions)
supabase/
  seed.sql                 ← KEEP: conditions only, no changes
```

### Testing
- No unit tests required for the seeding script (one-time data pipeline)
- Validate output JSON manually or with a simple count assertion script
- Existing `srd-loader.test.ts` and `srd-search.test.ts` should still pass with the larger dataset

### Project Structure Notes
- Alignment with architecture: SRD pipeline follows `seed → export → CDN → IndexedDB` as documented
- `npm run generate-srd` requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars
- Vercel serves `/public/srd/*.json` at edge automatically (CDN, no config needed)

### References
- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — SRD Data Pipeline section]
- [Source: supabase/migrations/003_srd_content.sql — Schema definition]
- [Source: scripts/generate-srd-bundles.ts — Existing export script]
- [Source: lib/srd/ — Client-side SRD modules]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
