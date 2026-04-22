# supabase/migrations — corrective-chain index

Migrations apply in filename order. Fix-forward is the project default: when a
shipped migration has a defect, a **new** migration (not an edit of the old
file) supersedes it. This file indexes the corrective chains so reviewers
don't have to bisect git history to understand "why is this function declared
three times?".

When you add a new corrective chain, **append** an entry here. When you ship a
brand-new feature without touching a prior function, skip this file.

---

## Epic 04 — Player-as-DM Upsell (Sprint 1)

Sprint 1 shipped the DM-upsell foundation: matview + wrapper view for session
counts, campaign templates with SRD-enforced monsters, past-companions graph,
and the clone RPC. Three functions were rewritten post-ship after adversarial
review surfaced defects; the chains below are the full story.

### `clone_campaign_from_template()` — 4 migrations

| # | Migration | Role |
|---|---|---|
| 1 | [170_clone_campaign_from_template.sql](170_clone_campaign_from_template.sql) | Original RPC: SECURITY DEFINER, `auth.uid()` check (F1), accumulated missing_monsters envelope (F9), explicit `sessions.is_active = false` (F5), `GRANT EXECUTE TO authenticated`. |
| 2 | [172_sprint1_corrective.sql](172_sprint1_corrective.sql) | Attempted H6 fix — wrapped encounter INSERTs in a PL/pgSQL cursor loop, **incorrectly** claiming `now()` ordering would be preserved. Also M5 precursor for get_past_companions tiebreaker. |
| 3 | [174_sprint1_rereview_fixes.sql](174_sprint1_rereview_fixes.sql) | **Real H6 fix** — 172 was a no-op because `now() = transaction_timestamp()` is constant inside a transaction; ordering depended on random UUID tiebreak. Added `encounters.sort_order INT` column; RPC now populates it from template sort_order. Also adds the missing `GRANT EXECUTE TO service_role` on `audit_template_srd_drift` (173 REVOKEd without granting). |
| — | (176 touches `get_past_companions`, not clone — see next chain.) | |

**Read order for reviewers:** 170 → 172 (intent) → 174 (correct fix) → skip 176.

### `get_past_companions()` — 3 migrations

| # | Migration | Role |
|---|---|---|
| 1 | [169_past_companions.sql](169_past_companions.sql) | Original SECURITY DEFINER function. CTE chain: my_sessions → shared_encounters → last_per_companion. |
| 2 | [173_sprint1_followups.sql](173_sprint1_followups.sql) | H3 privacy fix: LEFT JOIN to `users` table allowed companions with deleted `users` rows to leak as NULL display_name; changed to INNER JOIN + `share_past_companions` filter (D8). Also ships `audit_template_srd_drift()` standalone. |
| 3 | [176_past_companions_pagination_tiebreaker.sql](176_past_companions_pagination_tiebreaker.sql) | Appends `companion_user_id ASC` as final tiebreaker in the ORDER BY — two companions sharing both `sessions_together` and NULL `display_name` otherwise paginated non-deterministically (page 1 offset 0 could show row A at position 25; page 2 offset 20 could show A again AND skip B). |

**Read order for reviewers:** 169 → 173 → 176. Current definition = 176 in full.

### `v_player_sessions_played` + matview refresh — single migration

| # | Migration | Role |
|---|---|---|
| 1 | [165_v_player_sessions_played.sql](165_v_player_sessions_played.sql) | Matview + wrapper view + pg_cron schedule. **No corrective.** Note: the pg_cron `DO` block is exception-guarded (M3), so if `pg_cron` schema isn't on search_path the migration RAISEs NOTICE and continues — operator must manually `cron.schedule(...)`. In prod as of 2026-04-21 the schedule is active (`refresh_v_player_sessions_played` every 15 min). |

### Sprint 1 supporting migrations (no corrective chain, but tied to Epic 04)

| Migration | Role |
|---|---|
| [166_user_onboarding_dm.sql](166_user_onboarding_dm.sql) | Adds `dm_tour_completed`, `dm_tour_step`, `first_campaign_created_at` + `users.share_past_companions`. |
| [167_campaign_templates.sql](167_campaign_templates.sql) | `campaign_templates` + `campaign_template_encounters` tables, SRD-slug whitelist table, D7 trigger `validate_template_monsters_srd`. |
| [168_seed_starter_templates.sql](168_seed_starter_templates.sql) | 3 seed templates (placeholder). |
| [171_populate_starter_templates.sql](171_populate_starter_templates.sql) | Populates seed monsters_payload for each template encounter (SRD-only slugs). |
| [175_player_characters_fk_set_null.sql](175_player_characters_fk_set_null.sql) | FK `player_characters.campaign_id` CASCADE → SET NULL. Prevents character wipe on campaign delete. |
| [177_join_code_charset_contract_comment.sql](177_join_code_charset_contract_comment.sql) | `COMMENT ON FUNCTION create_campaign_with_settings` — locks join_code charset contract after `4bb2297f` centralized `JOIN_CODE_RE` in app code. |

### Sprint 2 (in progress)

| Migration | Role |
|---|---|
| [178_encounter_end_writes_last_session_at.sql](178_encounter_end_writes_last_session_at.sql) | F19-WIRE (shipped 2026-04-21 in commit `2175f381`) — trigger `encounters.ended_at AFTER UPDATE` → `users.last_session_at` for each `player_character.user_id` bound to the encounter via `combatants`. Makes the F19 hot-path fallback in `lib/upsell/get-sessions-played.ts` live (it was dormant in prod through Sprint 1 because `last_session_at` was only written by `player-identity.ts:544`). Prereq for analytics funnel in Story 04-I. Trigger is SECURITY DEFINER + `search_path` hardened; monotonic guard (`last_session_at < NEW.ended_at`) prevents backward rewinds. 6 pgTap asserts in `supabase/tests/upsell/05_encounter_end_last_session_at.sql`. |

---

## How to add a new corrective entry

When you fix-forward a Sprint 1+ function:

1. Write the new migration as usual (don't edit the old file).
2. Append a row to the appropriate chain table above (or create a new "Epic XX — Sprint Y" section).
3. Keep the "Read order for reviewers" note so humans can reconstruct intent
   → defect → fix without re-reading the whole epic doc.
