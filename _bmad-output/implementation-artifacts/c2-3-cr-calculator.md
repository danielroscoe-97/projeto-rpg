# Story C.2.3: CR Calculator — Dificuldade do Encontro

Status: ready-for-dev

## Story

As a **DM**,
I want to see the encounter difficulty based on party level and monster CRs,
so that I can balance encounters.

## Acceptance Criteria

1. Encounter setup shows difficulty rating: Easy, Medium, Hard, Deadly
2. Calculation follows D&D 5e encounter building rules (XP thresholds by level)
3. Updates in real-time as monsters are added/removed
4. Supports both 2014 and 2024 CR calculation methods
5. Shows XP budget vs total monster XP
6. i18n

## Tasks / Subtasks

- [ ] Task 1: CR calculation logic (AC: #2, #4)
  - [ ] New: `lib/utils/cr-calculator.ts`
- [ ] Task 2: Difficulty display in EncounterSetup (AC: #1, #3)
- [ ] Task 3: XP budget display (AC: #5)
- [ ] Task 4: i18n (AC: #6)
- [ ] Task 5: Tests for calculation

## Dev Notes

### Files to Modify/Create

- New: `lib/utils/cr-calculator.ts`
- New: `lib/utils/cr-calculator.test.ts`
- Modify: `components/combat/EncounterSetup.tsx` — difficulty indicator

### Anti-Patterns

- **DON'T** block encounter creation based on difficulty — advisory only
- **DON'T** hardcode XP tables — load from SRD data

### References

- [Source: _bmad-output/implementation-artifacts/v2-4-5-cr-calculator.md]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
