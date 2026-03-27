# Story B.1.2: Completar Display Name Anti-Metagaming

Status: ready-for-dev

## Story

As a **DM**,
I want to assign display names to monsters,
so that players see "Mysterious Creature" instead of "Beholder" and can't metagame.

## Context

Partial implementation: `display_name` field exists in combat types, migration `019_combatants_v2.sql` adds the column, `sanitizeCombatant()` in broadcast.ts partially handles it. Needs: complete sanitization, UI for editing display names, tests.

## Acceptance Criteria

1. DM sees both real name and display name: "Beholder (Mysterious Creature)"
2. Players see ONLY display_name, never the real monster name
3. DM can edit display_name inline in the combatant row
4. Default display_name auto-generated from monster type (e.g., "Creature #1", "Creature #2")
5. Display name sanitized: strip HTML/JS, max 40 characters
6. Broadcast events always use display_name for player-facing data
7. Database stores both name and display_name
8. i18n for default names and UI labels

## Tasks / Subtasks

- [ ] Task 1: Complete sanitization in broadcast.ts (AC: #2, #6)
  - [ ] Verify sanitizeCombatant strips real name for player events
  - [ ] Ensure ALL event types sanitize consistently
- [ ] Task 2: Add inline edit UI for display_name (AC: #3)
  - [ ] In CombatantRow, DM can click to edit display name
- [ ] Task 3: Auto-generate default display names (AC: #4)
  - [ ] When adding monster, auto-assign "Criatura #N" / "Creature #N"
  - [ ] Increment counter per monster type
- [ ] Task 4: Input sanitization (AC: #5)
  - [ ] Strip HTML, limit to 40 chars
  - [ ] Use existing sanitization from migration 020_sanitize_display_name.sql
- [ ] Task 5: DM view format (AC: #1)
  - [ ] Show "RealName (DisplayName)" in DM view
- [ ] Task 6: Tests (AC: all)

## Dev Notes

### Files to Modify/Create

- Modify: `lib/realtime/broadcast.ts` — complete sanitization
- Modify: `components/combat/CombatantRow.tsx` — inline display_name edit, DM dual view
- Modify: `lib/stores/combat-store.ts` — auto-generate display names
- Modify: `messages/en.json`, `messages/pt-BR.json`

### Dependencies

Track A, especially A.0.6

### Anti-Patterns

- **DON'T** ever send real monster name to player channel
- **DON'T** allow empty display_name — always fallback to generic
- **DON'T** use monster CR or stats in display_name generation

### References

- [Source: _bmad-output/implementation-artifacts/v2-1-2-display-name-for-monsters.md — original spec]
- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — FQ-07, JN-03]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
