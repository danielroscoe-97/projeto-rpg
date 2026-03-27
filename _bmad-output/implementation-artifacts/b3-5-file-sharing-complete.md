# Story B.3.5: File Sharing Completo com Validação

Status: ready-for-dev

## Story

As a **DM**,
I want to share images and PDFs with players during a session,
so that I can show maps, handouts, and reference material.

## Acceptance Criteria

1. DM can upload files via `FileShareButton.tsx` (images: jpg, png, webp; documents: pdf)
2. Files stored in Supabase Storage bucket `session-files`
3. Max file size: 10MB
4. MIME type validation (server-side, not just extension)
5. Shared files appear in player view as cards (`SharedFileCard.tsx`)
6. DM can remove shared files
7. Files cleaned up when session ends (Trigger.dev job)
8. i18n

## Tasks / Subtasks

- [ ] Task 1: Complete FileShareButton.tsx (AC: #1, #3)
- [ ] Task 2: Server-side MIME validation (AC: #4)
  - [ ] API route validates actual MIME, not just extension
- [ ] Task 3: Supabase Storage integration (AC: #2)
- [ ] Task 4: SharedFileCard.tsx for player view (AC: #5)
- [ ] Task 5: Remove files (AC: #6)
- [ ] Task 6: Cleanup job (AC: #7)
- [ ] Task 7: i18n (AC: #8)
- [ ] Task 8: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `components/session/FileShareButton.tsx` — complete
- Modify: `components/session/SharedFileCard.tsx` — complete
- Modify: `app/api/session/[id]/files/` — complete API with MIME validation
- Modify: `messages/en.json`, `messages/pt-BR.json`

### Anti-Patterns

- **DON'T** trust client-side MIME detection alone
- **DON'T** allow executable files (.exe, .sh, .bat)
- **DON'T** serve files without Supabase Storage signed URLs

### References

- [Source: _bmad-output/implementation-artifacts/v2-4-2-file-sharing-in-session.md]
- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — FQ-17]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
