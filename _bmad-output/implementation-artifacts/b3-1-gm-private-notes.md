# Story B.3.1: GM Private Notes com Broadcast Guard

Status: ready-for-dev

## Story

As a **DM**,
I want private notes per combatant and per session that are NEVER sent to players,
so that I can track secret information.

## Acceptance Criteria

1. `GMNotesSheet.tsx` opens as a side sheet with notes per combatant
2. Notes saved to `session_notes` table (migration exists)
3. Notes NEVER included in any broadcast event to players
4. Explicit broadcast guard: `sanitizeEvent()` strips `dm_notes` field
5. Notes auto-save on blur (debounced 500ms)
6. Markdown support in notes (bold, italic, lists)
7. i18n for UI labels

## Tasks / Subtasks

- [ ] Task 1: Complete GMNotesSheet.tsx (AC: #1, #6)
- [ ] Task 2: Supabase persistence (AC: #2)
- [ ] Task 3: Broadcast guard (AC: #3, #4) — CRITICAL
  - [ ] Verify sanitizeEvent strips dm_notes
  - [ ] Add test specifically for this
- [ ] Task 4: Auto-save (AC: #5)
- [ ] Task 5: i18n (AC: #7)
- [ ] Task 6: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `components/session/GMNotesSheet.tsx` — complete
- Modify: `lib/realtime/broadcast.ts` — guard dm_notes
- Modify: `lib/supabase/session.ts` — notes CRUD
- Modify: `messages/en.json`, `messages/pt-BR.json`

### Anti-Patterns

- **DON'T** ever broadcast dm_notes to players — this is a SECURITY requirement
- **DON'T** use rich text editor — Markdown is enough
- **DON'T** save on every keystroke — debounce 500ms

### References

- [Source: _bmad-output/implementation-artifacts/v2-4-1-gm-private-notes.md]
- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — FQ-16]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
