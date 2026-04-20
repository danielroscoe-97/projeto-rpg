-- 156_update_default_character_atomic.sql
-- Wave 2 dashboard code review — M11 (MAJOR) — The /app/dashboard/settings/
-- default-character server action (lib/user/update-default-character.ts) was
-- doing a two-round-trip ownership check:
--
--   1. SELECT id FROM player_characters WHERE id = $1 AND user_id = auth.uid()
--   2. UPDATE users SET default_character_id = $1 WHERE id = auth.uid()
--
-- Between (1) and (2), a concurrent DELETE of the character (e.g. user
-- archives from another tab, or a cascade from an admin ops flow) would
-- leave step 2 persisting a dangling id. The column is `REFERENCES
-- player_characters(id) ON DELETE SET NULL` (migration 144), which saves us
-- from a foreign-key violation, but a race window still exists where the
-- check passes, the row disappears, and we write a freshly-dead id.
--
-- Fix: single atomic RPC with an EXISTS guard. Either the character belongs
-- to the caller at the moment of UPDATE or we write nothing.
--
-- Return shape:
--   { ok: boolean, reason: text | null }
--   reason ∈ { 'not_owner' }  (future: 'unauthenticated' can be caller-side)
--
-- Security:
--   * SECURITY DEFINER so the RPC owns the row check even if the caller
--     doesn't have a broad SELECT grant on player_characters (they do today
--     via RLS, but this future-proofs).
--   * SET search_path hardens against search_path hijack per
--     migration 151 pattern.
--   * REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated.

create or replace function update_default_character_if_owner(
  p_character_id uuid
) returns json
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user_id uuid;
  v_updated_rows int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  -- Single statement: UPDATE only if the character belongs to the caller.
  -- No window between check and write.
  update public.users
     set default_character_id = p_character_id
   where id = v_user_id
     and exists (
       select 1 from public.player_characters
        where id = p_character_id
          and user_id = v_user_id
     );

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows = 0 then
    return json_build_object('ok', false, 'reason', 'not_owner');
  end if;

  return json_build_object('ok', true, 'reason', null);
end;
$$;

revoke execute on function update_default_character_if_owner(uuid) from public;
grant execute on function update_default_character_if_owner(uuid) to authenticated;

-- Backout:
--   drop function if exists update_default_character_if_owner(uuid);

-- Smoke test (run post-apply in staging):
--
--   -- As user A, own character C → ok=true:
--   set role authenticated;
--   set request.jwt.claim.sub to '<user-a-uuid>';
--   select update_default_character_if_owner('<char-a-uuid>');
--   -- Expect: {"ok": true, "reason": null}
--
--   -- As user A, foreign character X → ok=false, not_owner:
--   select update_default_character_if_owner('<char-belonging-to-user-b>');
--   -- Expect: {"ok": false, "reason": "not_owner"}
--
--   reset role;
