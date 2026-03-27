# Story B.2.6: HP Bar Tooltips/Legenda

Status: ready-for-dev

## Story

As a **player**,
I want to understand what the HP bar colors mean,
so that I can gauge how hurt a combatant is.

## Acceptance Criteria

1. Hovering/tapping on HP bar shows tooltip: "Leve (>70%)" / "Moderado (>40%)" / "Grave (>10%)" / "Crítico (≤10%)"
2. English equivalents: "Light (>70%)" / "Moderate (>40%)" / "Heavy (>10%)" / "Critical (≤10%)"
3. Tooltip appears on both DM and Player views
4. DM sees exact HP numbers in tooltip additionally
5. Players see ONLY the tier name (no numbers — anti-metagaming)
6. First-time players see a brief legend overlay explaining HP colors (dismissible, shown once via localStorage)
7. i18n for all strings

## Tasks / Subtasks

- [ ] Task 1: HP bar tooltip (AC: #1, #2, #3)
  - [ ] Use shadcn/ui Tooltip component
  - [ ] Calculate tier from current/max HP
- [ ] Task 2: DM vs Player tooltip content (AC: #4, #5)
  - [ ] DM: "Moderado — 25/60 HP"
  - [ ] Player: "Moderado"
- [ ] Task 3: First-time legend (AC: #6)
  - [ ] Small overlay with color legend
  - [ ] Dismissible, localStorage flag
- [ ] Task 4: i18n (AC: #7)
- [ ] Task 5: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `components/combat/CombatantRow.tsx` — add tooltip to HP bar
- New: `components/combat/HPLegendOverlay.tsx` — first-time legend
- Modify: `components/player/PlayerInitiativeBoard.tsx` — player tooltip variant
- Modify: `messages/en.json`, `messages/pt-BR.json`

### HP Tier Reference (IMMUTABLE)

| Tier     | Threshold | pt-BR    | en       |
|----------|-----------|----------|----------|
| LIGHT    | >70%      | Leve     | Light    |
| MODERATE | >40%      | Moderado | Moderate |
| HEAVY    | >10%      | Grave    | Heavy    |
| CRITICAL | ≤10%      | Crítico  | Critical |

### Anti-Patterns

- **DON'T** show exact HP to players — ONLY tier name
- **DON'T** change tier thresholds — 70/40/10% are IMMUTABLE
- **DON'T** show legend every time — once per player via localStorage

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — JN-08]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
