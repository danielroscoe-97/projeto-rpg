---
story_key: 3-10-save-and-resume-encounter
epic: 3
story_id: 3.10
status: done
created: 2026-03-24
updated: 2026-03-24
---

# Story 3.10: Save and Resume Encounter

## Story

As a **DM**,
I want to save the current encounter state and resume it in a future session,
So that multi-session combats don't lose progress.

## Implementation

- Encounter state (initiative, HP, conditions, turn, round) auto-persists on every action (existing optimistic+persist pattern)
- Dashboard shows active encounters via `SavedEncounters` component with links to resume
- "End" button in combat view calls `persistEndEncounter` (sets is_active=false) and redirects to dashboard
- Session page hydrates full state from DB on load (existing SSR hydration flow)
- Encounters query uses `sessions!inner` join filtered by owner_id for security
