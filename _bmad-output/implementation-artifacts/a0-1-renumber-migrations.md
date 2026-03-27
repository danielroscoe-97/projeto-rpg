# Story A.0.1: Renumerar Migrations Sequencialmente

Status: ready-for-dev

## Story

As a **developer**,
I want migrations numbered sequentially without conflicts,
so that Supabase applies them in the correct order across all environments.

## Context

Currently there are duplicate migration numbers:
- 017_subscriptions.sql AND 017_users_role.sql
- 018_feature_flags.sql AND 018_session_notes.sql
- 019_combatants_v2.sql AND 019_session_files.sql AND 019_mesa_model.sql
- 020_campaign_invites.sql AND 020_sanitize_display_name.sql

## Acceptance Criteria

1. All migration files in `supabase/migrations/` have unique sequential numeric prefixes (017-028)
2. Migration content is unchanged — only file prefixes are renamed
3. Dependency order is preserved (e.g., tables referenced by foreign keys are created before referencing tables)
4. `supabase db reset` succeeds locally with all migrations applied in order
5. A comment at the top of each renamed file documents the original filename

## Tasks / Subtasks

- [ ] Task 1: Audit current migrations and map dependencies (AC: #3)
  - [ ] Read all migration files and identify foreign key references
  - [ ] Build dependency graph
- [ ] Task 2: Define new sequential numbering (AC: #1)
  - [ ] Assign new numbers respecting dependency order
- [ ] Task 3: Rename migration files (AC: #1, #2)
  - [ ] Rename each file with new prefix
  - [ ] Add original filename comment to each file
- [ ] Task 4: Verify with supabase db reset (AC: #4)
  - [ ] Run `supabase db reset` and confirm no errors

## Dev Notes

### Files to Modify/Create

- Modify: `supabase/migrations/017_subscriptions.sql` — rename to correct sequence
- Modify: `supabase/migrations/017_users_role.sql` — rename
- Modify: `supabase/migrations/018_feature_flags.sql` — rename
- Modify: `supabase/migrations/018_session_notes.sql` — rename
- Modify: `supabase/migrations/019_combatants_v2.sql` — rename
- Modify: `supabase/migrations/019_session_files.sql` — rename
- Modify: `supabase/migrations/019_mesa_model.sql` — rename
- Modify: `supabase/migrations/020_campaign_invites.sql` — rename
- Modify: `supabase/migrations/020_sanitize_display_name.sql` — rename

### Anti-Patterns

- **DON'T** change migration SQL content — only rename files
- **DON'T** merge migrations — each stays as its own file
- **DON'T** skip dependency analysis — wrong order breaks foreign keys

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — DT-01]
- [Source: _bmad-output/planning-artifacts/architecture.md — Data Layer]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
