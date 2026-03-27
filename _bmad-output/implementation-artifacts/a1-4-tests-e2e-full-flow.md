# Story A.1.4: Teste E2E — Fluxo Completo DM -> Jogador -> Combate

Status: ready-for-dev

## Story

As a **developer**,
I want an end-to-end test covering the complete session lifecycle,
so that the critical path is regression-proof.

## Acceptance Criteria

1. E2E framework chosen and configured (Playwright recommended)
2. Test covers: DM login -> create encounter -> add combatants -> start combat
3. Test covers: Player opens session link -> joins -> sees initiative board
4. Test covers: DM advances turn -> player sees turn change in real-time
5. Test covers: DM applies damage -> player sees HP bar update
6. Test covers: DM ends combat -> player sees end state
7. Tests run in CI-compatible headless mode
8. Test uses test database (not production)

## Tasks / Subtasks

- [ ] Task 1: Install and configure Playwright (AC: #1, #7)
  - [ ] `npm install -D @playwright/test`
  - [ ] Create `playwright.config.ts`
- [ ] Task 2: Create test helpers (AC: #8)
  - [ ] Auth helpers (DM login, player anonymous join)
  - [ ] Database seed/cleanup
- [ ] Task 3: Write DM flow test (AC: #2)
  - [ ] Login -> dashboard -> new encounter -> add combatants -> start
- [ ] Task 4: Write Player join test (AC: #3)
  - [ ] Open link -> enter name -> see board
- [ ] Task 5: Write realtime sync test (AC: #4, #5)
  - [ ] Two browser contexts: DM + Player
  - [ ] DM acts -> Player sees change
- [ ] Task 6: Write combat end test (AC: #6)

## Dev Notes

### Files to Modify/Create

- New: `playwright.config.ts`
- New: `e2e/helpers/auth.ts`
- New: `e2e/helpers/db.ts`
- New: `e2e/combat-full-flow.spec.ts`
- Modify: `package.json` — add playwright scripts

### Context

The full flow is: DM creates encounter -> adds combatants -> generates link -> player joins -> DM starts combat -> initiative rolls -> turns advance -> HP changes -> combat ends. No E2E tests exist.

### Dependencies

A.1.1, A.1.2, A.1.3

### Anti-Patterns

- **DON'T** use Cypress — Playwright is lighter, better CI, native multi-tab
- **DON'T** test against production — use local Supabase
- **DON'T** rely on fixed waits — use Playwright's auto-waiting

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — Test Coverage]
- [Source: _bmad-output/planning-artifacts/architecture.md — Testing]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
