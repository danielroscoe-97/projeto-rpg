# Story 4.2: File Sharing in Session

Status: ready-for-dev

## Story

As a **DM**,
I want to upload and share images and PDFs with players during a session,
so that I can share maps, handouts, and reference material in real-time.

## Acceptance Criteria

1. Migration 009 creates `session_files` table: `id`, `session_id`, `uploaded_by`, `file_name`, `file_path`, `file_type` (CHECK: 'image','pdf'), `file_size_bytes` (CHECK: <=10485760). RLS: DM uploads/deletes, participants view.
2. "Compartilhar Arquivo" button in DM toolbar. File picker: `image/png`, `image/jpeg`, `image/webp`, `application/pdf`. Max 10MB.
3. Upload to Supabase Storage: `session-files/{session_id}/{uuid}_{filename}`. Progress bar during upload.
4. Server-side magic bytes validation: PNG (`89504E47`), JPEG (`FFD8FF`), WebP (`52494646...57454250`), PDF (`25504446`).
5. On success: broadcast `session:file_shared { fileId, fileName, fileType }`. Players see card with name, type icon, "Visualizar" button.
6. "Visualizar": opens signed URL (1h expiry). DM can "Remover": deletes from Storage + DB, broadcasts `session:file_removed`.
7. Files persist after session ends (accessible via dashboard history).

## Tasks / Subtasks

- [ ] Task 1: Migration 009 (AC: #1)
  - [ ] Create `supabase/migrations/009_session_files.sql`
  - [ ] Table with constraints as specified
  - [ ] RLS: INSERT/DELETE for session owner, SELECT for session participants

- [ ] Task 2: Supabase Storage bucket (AC: #3)
  - [ ] Create/configure bucket `session-files` with appropriate policies
  - [ ] Upload path: `session-files/{session_id}/{uuid}_{filename}`

- [ ] Task 3: Upload API route (AC: #2, #3, #4)
  - [ ] Create `/api/session/[id]/files/route.ts`
  - [ ] Validate file type (magic bytes), size (<=10MB)
  - [ ] Upload to Storage, insert into `session_files`
  - [ ] Return file metadata

- [ ] Task 4: DM upload UI (AC: #2, #3)
  - [ ] Upload button in DM toolbar
  - [ ] File picker with accept filter
  - [ ] Progress bar during upload
  - [ ] Broadcast `session:file_shared` on success

- [ ] Task 5: Player view -- file cards (AC: #5)
  - [ ] `components/session/SharedFileCard.tsx`
  - [ ] Card: file name, type icon, "Visualizar" button
  - [ ] "Visualizar": generate signed URL via Supabase Storage

- [ ] Task 6: Remove file (AC: #6)
  - [ ] DM "Remover" button on file card
  - [ ] Delete from Storage + DB
  - [ ] Broadcast `session:file_removed`

## Dev Notes

### Magic Bytes Validation
```typescript
const MAGIC_BYTES: Record<string, number[]> = {
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  // WebP: first 4 bytes RIFF, bytes 8-11 WEBP
};
```

### Files to Create/Modify
- New: `supabase/migrations/009_session_files.sql`
- New: `app/api/session/[id]/files/route.ts`
- New: `components/session/SharedFileCard.tsx`
- Modify: DM session view -- add upload button

### i18n Keys
- `session.files.upload`, `session.files.view`, `session.files.remove`
- `session.files.error_type`, `session.files.error_size`

### Anti-Patterns
- **DON'T** trust client-side file type validation alone -- always validate magic bytes server-side
- **DON'T** auto-delete files on session end -- persist for dashboard history
- **DON'T** use public URLs -- always signed URLs with expiry

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md -- Story 4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md -- V2.2 Schema session_files]
- [Source: _bmad-output/planning-artifacts/epics.md -- Epic 4, FR53, NFR32]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
