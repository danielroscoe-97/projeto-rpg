# Story C.2.4: Homebrew Content Creation (Monsters, Spells, Items)

Status: ready-for-dev

## Story

As a **DM**,
I want to create custom monsters, spells, and items,
so that I can use homebrew content in my encounters.

## Acceptance Criteria

1. DM can create custom monster with all stat block fields
2. DM can create custom spell with all fields
3. DM can create custom item with name, description, properties
4. Homebrew content saved per-user in `homebrew_*` tables
5. Homebrew content appears in search alongside SRD content (with "Homebrew" badge)
6. DM can edit and delete their homebrew content
7. Homebrew monsters selectable when building encounters
8. i18n

## Tasks / Subtasks

- [ ] Task 1: Monster creation form (AC: #1)
- [ ] Task 2: Spell creation form (AC: #2)
- [ ] Task 3: Item creation form (AC: #3)
- [ ] Task 4: Database CRUD (AC: #4, #6)
- [ ] Task 5: Search integration (AC: #5)
  - [ ] Add homebrew to Fuse.js index
- [ ] Task 6: Encounter integration (AC: #7)
- [ ] Task 7: i18n (AC: #8)
- [ ] Task 8: Tests

## Dev Notes

### Files to Modify/Create

- New: `components/homebrew/MonsterCreator.tsx`
- New: `components/homebrew/SpellCreator.tsx`
- New: `components/homebrew/ItemCreator.tsx`
- New: `lib/supabase/homebrew.ts` — CRUD operations
- Modify: `lib/srd/search.ts` — include homebrew in index

### Anti-Patterns

- **DON'T** validate homebrew against SRD rules — DMs can create anything
- **DON'T** share homebrew between users (future feature)
- **DON'T** allow homebrew to override SRD content

### References

- [Source: _bmad-output/implementation-artifacts/v2-4-6-homebrew-content-creation.md]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
