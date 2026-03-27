# Story 4.1: GM Private Notes

Status: ready-for-dev

## Story

As a **DM**,
I want to write and save private notes during a session,
so that I can keep track of important information without players seeing it.

## Acceptance Criteria

1. Migration 008 creates `session_notes` table: `id`, `session_id`, `user_id`, `content` (TEXT), `updated_at`. RLS: only session owner can read/write.
2. "Notas da Sessao" collapsible panel in DM session view. Icon: notebook. Toggle open/close.
3. Textarea with auto-save (debounce 1000ms via `upsert`). "Salvo" indicator appears briefly after save. No manual save button.
4. Notes NEVER included in broadcasts on `session:{id}` channel. NEVER visible in player view.
5. Notes persist: reload session -> notes loaded from DB. Markdown supported with Preview toggle.
6. Panel open/close state persisted in localStorage.

## Tasks / Subtasks

- [ ] Task 1: Create migration 008_session_notes.sql (AC: #1)
  - [ ] Table: `session_notes(id UUID PK, session_id UUID FK, user_id UUID FK, content TEXT DEFAULT '', updated_at TIMESTAMPTZ DEFAULT now())`
  - [ ] RLS: `auth.uid() = user_id AND auth.uid() = (SELECT owner_id FROM sessions WHERE id = session_id)`

- [ ] Task 2: Create GMNotesSheet component (AC: #2, #6)
  - [ ] `components/session/GMNotesSheet.tsx`
  - [ ] Collapsible panel with notebook icon
  - [ ] Title: i18n `session.notes.title`
  - [ ] Open/close state in localStorage

- [ ] Task 3: Auto-save textarea (AC: #3)
  - [ ] Textarea with placeholder: i18n `session.notes.placeholder`
  - [ ] Debounce 1000ms: `supabase.from('session_notes').upsert({ session_id, user_id, content })`
  - [ ] "Salvo" indicator (i18n: `session.notes.saved`) -- fade after 2s

- [ ] Task 4: Markdown support (AC: #5)
  - [ ] Toggle: Edit / Preview modes
  - [ ] Preview: render Markdown (use `react-markdown` if available, or simple renderer)
  - [ ] Default mode: Edit

- [ ] Task 5: Security -- never broadcast (AC: #4)
  - [ ] Verify notes data is NOT included in any broadcast or player-facing API
  - [ ] RLS enforces server-side

## Dev Notes

### Files to Create/Modify
- New: `supabase/migrations/008_session_notes.sql`
- New: `components/session/GMNotesSheet.tsx`
- Modify: DM session view -- add notes panel trigger

### i18n Keys
- `session.notes.title`, `session.notes.placeholder`, `session.notes.saved`, `session.notes.preview`

### Anti-Patterns
- **DON'T** broadcast notes data -- EVER
- **DON'T** add manual save button -- auto-save only
- **DON'T** use rich text editor -- Markdown textarea is sufficient

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md -- Story 4.1]
- [Source: _bmad-output/planning-artifacts/architecture.md -- V2.2 Schema session_notes]
- [Source: _bmad-output/planning-artifacts/epics.md -- Epic 4, FR52]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
