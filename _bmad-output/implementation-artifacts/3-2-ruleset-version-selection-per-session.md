---
story_key: 3-2-ruleset-version-selection-per-session
epic: 3
story_id: 3.2
status: done
created: 2026-03-24
updated: 2026-03-24
---

# Story 3.2: Ruleset Version Selection per Session

## Story

As a **DM**,
I want to select a ruleset version (2014 or 2024) per session before combat begins,
So that all monster and spell lookups default to the correct version for my group.

## Acceptance Criteria

- AC1: Given the encounter builder, the DM can select ruleset version (2014 or 2024) before starting combat
- AC2: The selected ruleset version is persisted on the session record in the database (FR4)
- AC3: Monster search results are filtered to the selected version by default
- AC4: Each monster search result displays a visible version badge ("2014" or "2024") (FR20)
- AC5: Given a session with a selected ruleset version, the version is visible on the session/combat page
- AC6: The RulesetSelector is a reusable standalone component

## Tasks / Subtasks

### Task 1: Create RulesetSelector Component
- [x] 1.1 Create `components/session/RulesetSelector.tsx` — controlled component accepting `value`, `onChange` props
- [x] 1.2 Render two toggle buttons: "2014" | "2024", active state highlighted
- [x] 1.3 Write tests: renders correctly, selection fires onChange, correct active state shown

### Task 2: Refactor EncounterBuilder to Use RulesetSelector
- [x] 2.1 Replace inline ruleset buttons in EncounterBuilder with `<RulesetSelector />`
- [x] 2.2 Add version badge ("2014"/"2024") to each monster search result row (FR20)

### Task 3: Session Page Ruleset Display
- [x] 3.1 Confirmed `app/app/session/[id]/page.tsx` displays the session's ruleset version in the header ("Ruleset 2014/2024" label)

## Dev Notes

- `RulesetSelector` lives in `components/session/` alongside other session-setup components
- Version badge on search results: small colored pill showing "2014" or "2024" next to the monster name
- AC2 (DB persistence) was already implemented in Story 3.1 via `createEncounterWithCombatants`
- AC3 (filtered search) was already implemented in Story 3.1 via `searchMonsters(query, version)`
- Main new work: RulesetSelector component, version badge on results, tests

## Dev Agent Record

### Implementation Plan
DB persistence (AC2) and filtered search (AC3) were already implemented in Story 3.1. New work: `RulesetSelector` component extracted into reusable controlled component, version badge added to search results, EncounterBuilder refactored to use both.

### Debug Log
No issues.

### Completion Notes
8 new tests added (RulesetSelector + VersionBadge). 50 total tests passing. TypeScript clean. Key changes:
- `components/session/RulesetSelector.tsx` — `RulesetSelector` (toggle buttons) + `VersionBadge` (inline pill)
- `EncounterBuilder.tsx` — replaced inline buttons with `<RulesetSelector />`, added `<VersionBadge />` to each result row
- Session page header already had `Ruleset {version}` from Story 3.1

## File List

- `components/session/RulesetSelector.tsx` (created)
- `components/session/RulesetSelector.test.tsx` (created)
- `components/session/EncounterBuilder.tsx` (modified — uses RulesetSelector + VersionBadge)

## Change Log

| Date | Change |
|------|--------|
| 2026-03-24 | Story created |
| 2026-03-24 | Implementation complete — 8 tests added, 50 total passing, status → review |