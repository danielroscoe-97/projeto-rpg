# Story 4.5: CR Calculator

Status: ready-for-dev

## Story

As a **DM**,
I want an automatic CR calculator during encounter setup,
so that I can quickly assess if an encounter is Easy, Medium, Hard, or Deadly for my party.

## Acceptance Criteria

1. Badge in encounter setup: "Facil" (green), "Medio" (yellow), "Dificil" (orange), "Mortal" (red). Updates instantly on add/remove monster.
2. Party config: "Nivel do grupo" and "Numero de jogadores" fields. Persisted in encounter state.
3. DMG 2014 formula: XP sum x group multiplier (1x->4x) vs per-level thresholds. Used by default for ruleset 2014.
4. DMG 2024 formula: CR budget system (Low/Moderate/High/Deadly). Used by default for ruleset 2024.
5. Toggle to switch between 2014/2024 formula regardless of ruleset.
6. All computation client-side (<=50ms). No server requests. XP/CR data from local SRD JSON.
7. Pro-gated via `useFeatureGate('cr_calculator')`. Free users see ProBadge.

## Tasks / Subtasks

- [ ] Task 1: CRCalculator component (AC: #1, #2)
  - [ ] `components/combat/CRCalculator.tsx`
  - [ ] Party inputs: level (1-20), player count (1-10)
  - [ ] Difficulty badge with color coding

- [ ] Task 2: DMG 2014 calculation (AC: #3)
  - [ ] XP thresholds per level (PHB p.82 table -- hardcoded)
  - [ ] Group multiplier: 1 monster=1x, 2=1.5x, 3-6=2x, 7-10=2.5x, 11-14=3x, 15+=4x
  - [ ] Compare adjusted XP vs thresholds

- [ ] Task 3: DMG 2024 calculation (AC: #4)
  - [ ] CR budget tables (hardcoded)
  - [ ] Low (<50%), Moderate (50-75%), High (75-100%), Deadly (>100%)

- [ ] Task 4: Formula toggle (AC: #5)
  - [ ] Default based on session `ruleset_version`
  - [ ] Toggle switch to override

- [ ] Task 5: Feature gate (AC: #7)
  - [ ] Wrap with `ProGate` using `useFeatureGate('cr_calculator')`
  - [ ] Free users see ProBadge instead

- [ ] Task 6: Edge cases
  - [ ] No players added: "Adicione jogadores para calcular dificuldade"
  - [ ] Homebrew monster without CR: excluded with warning

## Dev Notes

### Files to Create
- New: `components/combat/CRCalculator.tsx`
- New: `lib/utils/cr-calculator.ts` (pure calculation functions)
- Modify: `components/combat/EncounterSetup.tsx` -- integrate calculator

### XP Thresholds (2014) -- Reference Table
Level 1: Easy 25, Medium 50, Hard 75, Deadly 100
Level 5: Easy 250, Medium 500, Hard 750, Deadly 1100
... (full table in PHB p.82)

### Anti-Patterns
- **DON'T** make server requests -- all client-side
- **DON'T** forget group multiplier in 2014 formula
- **DON'T** block rendering while calculating -- should be <=50ms

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md -- Story 4.5]
- [Source: _bmad-output/planning-artifacts/epics.md -- Epic 4, FR62]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
