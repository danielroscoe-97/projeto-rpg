-- 04_clone_rpc_contracts.sql
-- Epic 04 (Player-as-DM Upsell), Story 04-A4 — RPC contract tests.
--
-- Covers the three adversarial-review items from 04-C that the Jest suite
-- could not prove (Jest mocks the RPC — it cannot verify the RPC's own
-- behaviour). These run against the real function body shipped in
-- migration 170 (and patched in 172 for H6 ordering).
--
-- Test 13 (F1 escalation):
--   User X calling clone_campaign_from_template(template, user_Y) must
--   raise SQLSTATE 42501. The RPC's first guard is auth.uid() <>
--   p_new_dm_user_id, so impersonating user X while passing Y's UUID
--   triggers it.
--
-- Test 14 (F9 accumulated failures):
--   A template whose encounters carry slugs NOT in srd_monster_slugs
--   must return { ok: false, missing_monsters: [...] } with ONE entry
--   per offending encounter — not short-circuit on the first.
--   Caveat: migration 167's INSERT trigger (validate_template_monsters_srd)
--   prevents inserting non-SRD slugs via authenticated paths. We use
--   `set local role postgres` to bypass RLS and INSERT directly — the
--   trigger then fires, so we also need ALTER TRIGGER ... DISABLE for
--   the duration of the fixture setup. This matches real-world drift
--   (whitelist shrinks over time, existing rows become invalid) that
--   F9 was written to defend against.
--
-- Test 15 (F-BONUS / D12 — creatures_snapshot copy):
--   After clone, each encounters.creatures_snapshot must equal the
--   template's monsters_payload. Prior draft of 170 didn't copy; 170
--   fixed it; this pins the contract.

begin;
select plan(7);

select helpers.test_clear_auth();
set local role postgres;

select helpers.test_setup_user('f4-user-x@example.com');
select helpers.test_setup_user('f4-user-y@example.com');
select helpers.test_clear_auth();
set local role postgres;

create temp table t_ids (
  user_x_uid  uuid,
  user_y_uid  uuid,
  tpl_ok_id   uuid default gen_random_uuid(),
  tpl_bad_id  uuid default gen_random_uuid(),
  enc_1_id    uuid default gen_random_uuid(),
  enc_2_id    uuid default gen_random_uuid(),
  bad_enc_1   uuid default gen_random_uuid(),
  bad_enc_2   uuid default gen_random_uuid()
);
insert into t_ids (user_x_uid, user_y_uid) values (
  (select id from auth.users where email = 'f4-user-x@example.com'),
  (select id from auth.users where email = 'f4-user-y@example.com')
);

-- ── Template A (good): two encounters, all slugs SRD-whitelisted ────────
insert into campaign_templates (id, name, description, game_system, target_party_level, is_public)
values (
  (select tpl_ok_id from t_ids),
  'Clone Test — OK',
  'SRD-valid template for F-BONUS test',
  '5e', 1, true
);

insert into campaign_template_encounters (id, template_id, name, sort_order, monsters_payload)
values
  ((select enc_1_id from t_ids), (select tpl_ok_id from t_ids), 'Goblin ambush', 10,
   '[{"slug":"goblin","quantity":3}]'::jsonb),
  ((select enc_2_id from t_ids), (select tpl_ok_id from t_ids), 'Wolves', 20,
   '[{"slug":"wolf","quantity":2}]'::jsonb);

-- ── Template B (for F9): two encounters, both with non-SRD slugs ────────
-- We bypass the trigger via a superuser-level DISABLE/INSERT/ENABLE cycle
-- so the fixture can hold the invariant-violating rows the real-world
-- drift scenario would produce.
insert into campaign_templates (id, name, description, game_system, target_party_level, is_public)
values (
  (select tpl_bad_id from t_ids),
  'Clone Test — F9 drift',
  'Template with slugs the whitelist does not know',
  '5e', 1, true
);

alter table campaign_template_encounters disable trigger trg_validate_template_monsters_srd;

insert into campaign_template_encounters (id, template_id, name, sort_order, monsters_payload)
values
  ((select bad_enc_1 from t_ids), (select tpl_bad_id from t_ids), 'VGM kenku raid', 10,
   '[{"slug":"vgm-kenku","quantity":2}]'::jsonb),
  ((select bad_enc_2 from t_ids), (select tpl_bad_id from t_ids), 'Boggle', 20,
   '[{"slug":"mpmm-boggle","quantity":1},{"slug":"ftd-grung","quantity":3}]'::jsonb);

alter table campaign_template_encounters enable trigger trg_validate_template_monsters_srd;

-- ---------------------------------------------------------------------------
-- TEST 13 (F1): impersonating user X, passing user Y's UUID → 42501
-- ---------------------------------------------------------------------------
select helpers.test_setup_user('f4-user-x@example.com');

select throws_ok(
  format(
    'select clone_campaign_from_template(%L::uuid, %L::uuid)',
    (select tpl_ok_id from t_ids),
    (select user_y_uid from t_ids)
  ),
  '42501',
  NULL,
  'Test 13 / F1: caller X cannot clone on behalf of user Y (RAISE 42501)'
);

-- ---------------------------------------------------------------------------
-- TEST 14 (F9): template with two offending encounters returns a single
-- envelope listing BOTH, not the first failure.
-- ---------------------------------------------------------------------------
-- X clones the BAD template for themselves (F1 allows — auth.uid() = X).
-- Expect { ok: false, missing_monsters: [...2 entries...] }.
create temp table t_f9_result as
  select clone_campaign_from_template(
    (select tpl_bad_id from t_ids),
    (select user_x_uid from t_ids)
  ) as envelope;

select is(
  (select (envelope::jsonb)->>'ok' from t_f9_result),
  'false',
  'Test 14 / F9: non-SRD slugs → envelope.ok = false'
);

select is(
  (select jsonb_array_length((envelope::jsonb)->'missing_monsters') from t_f9_result),
  2,
  'Test 14 / F9: missing_monsters array contains ONE entry per offending encounter (2), not short-circuited at 1'
);

-- Spot-check the offending slugs are surfaced verbatim in at least one entry.
select ok(
  (select bool_or(
    (el->'missing_slugs') ? 'vgm-kenku'
  ) from t_f9_result, jsonb_array_elements((envelope::jsonb)->'missing_monsters') as el),
  'Test 14 / F9: "vgm-kenku" appears in the accumulated missing_slugs list'
);

-- ---------------------------------------------------------------------------
-- TEST 15 (F-BONUS): clone the GOOD template and assert every resulting
-- encounter.creatures_snapshot matches the template's monsters_payload.
-- ---------------------------------------------------------------------------
create temp table t_ok_result as
  select clone_campaign_from_template(
    (select tpl_ok_id from t_ids),
    (select user_x_uid from t_ids)
  ) as envelope;

select is(
  (select (envelope::jsonb)->>'ok' from t_ok_result),
  'true',
  'Test 15 (setup): good-template clone returns ok=true'
);

-- Count of encounters in the cloned session matches the template.
select is(
  (
    select count(*)::int
    from encounters e
    where e.session_id = ((select envelope::jsonb->>'session_id' from t_ok_result))::uuid
  ),
  2,
  'Test 15: cloned session has as many encounters as the template'
);

-- Every cloned encounter's creatures_snapshot equals the corresponding
-- template encounter's monsters_payload. We compare as jsonb sets rather
-- than per-row (ordering isn't needed here — presence is).
select ok(
  (
    select (
      select array_agg(creatures_snapshot order by creatures_snapshot::text)
      from encounters
      where session_id = ((select envelope::jsonb->>'session_id' from t_ok_result))::uuid
    ) = (
      select array_agg(monsters_payload order by monsters_payload::text)
      from campaign_template_encounters
      where template_id = (select tpl_ok_id from t_ids)
    )
  ),
  'Test 15 / F-BONUS: creatures_snapshot equals template monsters_payload for every cloned encounter'
);

select * from finish();
rollback;
