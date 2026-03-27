# Story B.2.3: Player View Mobile-First Redesign

Status: ready-for-dev

## Story

As a **player**,
I want the combat view optimized for my phone,
so that I can glance at it quickly during a physical table session.

## Acceptance Criteria

1. Initiative list items have minimum 48px touch targets
2. Current turn combatant is prominently highlighted (larger card, accent border)
3. HP bars are 24px minimum height (visible from arm's length)
4. Conditions shown as icon badges, not text list
5. Swipe gestures: swipe left on combatant for quick info
6. Bottom-anchored action area for "my character" quick actions
7. Font sizes follow mobile-first scale: 16px body, 20px combatant names, 24px current turn name
8. Tested on viewport 375px (iPhone SE) through 428px (iPhone Pro Max)
9. Dark theme optimized for OLED screens (true black backgrounds where appropriate)

## Tasks / Subtasks

- [ ] Task 1: Touch target optimization (AC: #1)
  - [ ] Increase all interactive elements to 48px minimum
- [ ] Task 2: Current turn prominence (AC: #2)
  - [ ] Larger card, pulsing border, accent color
- [ ] Task 3: HP bar resize (AC: #3)
  - [ ] Responsive: 24px mobile, 16px desktop
  - [ ] LIGHT/MODERATE/HEAVY/CRITICAL colors unchanged
- [ ] Task 4: Condition icons (AC: #4)
  - [ ] Replace text with icon badges
  - [ ] Tooltip on tap for full name
- [ ] Task 5: Bottom action area (AC: #6)
  - [ ] Sticky bottom bar with player's character quick info
- [ ] Task 6: Typography scale (AC: #7)
- [ ] Task 7: Responsive testing (AC: #8)
- [ ] Task 8: OLED dark theme (AC: #9)
  - [ ] Use #000000 for main background on mobile

## Dev Notes

### Files to Modify/Create

- Modify: `components/player/PlayerInitiativeBoard.tsx` — mobile-first layout
- Modify: `components/player/PlayerLobby.tsx` — mobile layout
- Modify: `components/combat/CombatantRow.tsx` — mobile variant with larger targets
- New: `components/player/PlayerBottomBar.tsx` — sticky bottom quick actions

### Context

Players at physical tables use their phones 90% of the time. Current player view is responsive but not mobile-first. Needs thumb-zone optimization, larger touch targets, and quick-glance information hierarchy.

### Anti-Patterns

- **DON'T** hide information on mobile — reorganize, don't remove
- **DON'T** change HP tier colors or thresholds (LIGHT >70% / MODERATE >40% / HEAVY >10% / CRITICAL ≤10% — IMMUTABLE)
- **DON'T** use hover states as primary interaction — use tap

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — JN-10]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Design System]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
