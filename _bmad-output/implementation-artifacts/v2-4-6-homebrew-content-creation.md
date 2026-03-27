# Story 4.6: Homebrew Content Creation

Status: ready-for-dev

## Story

As a **DM (Pro)**,
I want to create custom monsters, spells, and items,
so that I can use homebrew content in my sessions and have it searchable alongside SRD content.

## Acceptance Criteria

1. Migration 011 creates tables: `homebrew_monsters`, `homebrew_spells`, `homebrew_items`. Each: `id`, `user_id`, `name`, `data` (JSONB), `ruleset_version`, `created_at`, `updated_at`. RLS: user sees only their own.
2. "Criar Homebrew" button (Pro-gated via `useFeatureGate('homebrew')`). 3 tabs: Monstro, Magia, Item.
3. Monster form: name, CR, type, size, HP, AC, stats, abilities, actions. Spell form: name, level, school, casting_time, range, components, duration, desc, classes. Item form: name, type, rarity, description, properties, attunement.
4. Saved to respective table with `data` as JSONB. Toast confirms.
5. Homebrew appears in Compendium search (Fuse.js merge). Purple "Homebrew" badge. Scoped to user.
6. Edit and delete supported. Delete requires confirmation dialog.
7. Free users: ProGate blocks with upsell.

## Tasks / Subtasks

- [ ] Task 1: Migration 011 (AC: #1)
  - [ ] Create `supabase/migrations/011_homebrew.sql`
  - [ ] 3 tables as specified
  - [ ] RLS: `auth.uid() = user_id` for all operations

- [ ] Task 2: Homebrew creator component (AC: #2, #3)
  - [ ] `components/homebrew/HomebrewCreator.tsx` with 3 tabs
  - [ ] Monster/Spell/Item forms with required fields
  - [ ] Validation via Zod schemas

- [ ] Task 3: CRUD operations (AC: #4, #6)
  - [ ] Create: insert with JSONB data
  - [ ] Edit: pre-fill form, update on save
  - [ ] Delete: confirmation dialog "Tem certeza?" -> delete from table

- [ ] Task 4: Fuse.js search merge (AC: #5)
  - [ ] Load homebrew data from Supabase on-demand
  - [ ] Merge with SRD index
  - [ ] Purple "Homebrew" badge on results

- [ ] Task 5: Feature gate (AC: #2, #7)
  - [ ] Wrap with ProGate using `useFeatureGate('homebrew')`

## Dev Notes

### Files to Create/Modify
- New: `supabase/migrations/011_homebrew.sql`
- New: `components/homebrew/HomebrewCreator.tsx`
- New: `components/homebrew/HomebrewBadge.tsx`
- Modify: Compendium search -- merge homebrew into Fuse.js index

### i18n Keys
- `homebrew.create`, `homebrew.edit`, `homebrew.delete`, `homebrew.confirm_delete`, `homebrew.badge`
- `homebrew.monster.*`, `homebrew.spell.*`, `homebrew.item.*` (form field labels)

### Anti-Patterns
- **DON'T** include homebrew in static SRD bundles -- load on-demand from Supabase
- **DON'T** show other users' homebrew content
- **DON'T** require strict JSONB schema -- keep flexible for future extension

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md -- Story 4.6]
- [Source: _bmad-output/planning-artifacts/architecture.md -- V2.2 Schema homebrew tables]
- [Source: _bmad-output/planning-artifacts/epics.md -- Epic 4, FR63]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
