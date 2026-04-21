-- 00_srd_trigger.sql
-- Epic 04 (Player-as-DM Upsell), Story 04-A4 — Test 8 validation gate.
--
-- Pins down the D7 SRD-enforcement trigger behaviour on
-- campaign_template_encounters. Migration under test: 167_campaign_templates.sql.
--
-- Scenarios covered (from epic §Testing Contract, Test 8):
--   * NULL / missing monsters_payload accepted (pure-narrative encounter).
--   * Empty JSON array accepted (no monsters = narrative-only).
--   * Valid SRD slug accepted (e.g. "goblin").
--   * Fake/non-SRD slug rejected with SQLSTATE 23514 (e.g. "vgm-kenku").
--   * Malformed shape — top-level non-array — rejected with 22023.
--   * Malformed shape — element not an object — rejected with 22023.
--   * Malformed shape — object without "slug" key — rejected with 22023.
--   * quantity out of range — rejected with 22023 (-1 and 101).
--
-- All writes go through a superuser role to bypass RLS; the trigger is what
-- we exercise, not the SELECT/INSERT policies.

begin;
select plan(9);

select helpers.test_clear_auth();
set local role postgres;

-- Seed: one template to attach encounters to. We insert directly (no RLS as
-- superuser) so we're only exercising the encounters trigger on subsequent
-- operations.
insert into campaign_templates (id, name, description, is_public, sort_order)
values (
  '00000000-04a4-4000-0000-000000000008',
  'SRD trigger test template',
  'Fixture for Story 04-A4 Test 8',
  true,
  1
);

-- ---------------------------------------------------------------------------
-- TEST 1: NULL monsters_payload accepted (pure-narrative encounter).
-- ---------------------------------------------------------------------------
select lives_ok(
  $$insert into campaign_template_encounters
      (template_id, name, sort_order, monsters_payload, narrative_prompt)
    values (
      '00000000-04a4-4000-0000-000000000008',
      'Narrative encounter (NULL payload)',
      10,
      NULL,
      'Pure narrative, no monsters.'
    )$$,
  'NULL monsters_payload accepted (narrative-only encounter)'
);

-- ---------------------------------------------------------------------------
-- TEST 2: Empty JSON array accepted.
-- ---------------------------------------------------------------------------
select lives_ok(
  $$insert into campaign_template_encounters
      (template_id, name, sort_order, monsters_payload, narrative_prompt)
    values (
      '00000000-04a4-4000-0000-000000000008',
      'Empty payload array',
      20,
      '[]'::jsonb,
      'Empty array, no monsters.'
    )$$,
  'Empty JSON array payload accepted'
);

-- ---------------------------------------------------------------------------
-- TEST 3: Valid SRD slug (goblin) accepted.
-- ---------------------------------------------------------------------------
select lives_ok(
  $$insert into campaign_template_encounters
      (template_id, name, sort_order, monsters_payload)
    values (
      '00000000-04a4-4000-0000-000000000008',
      'Goblin ambush',
      30,
      '[{"slug": "goblin", "quantity": 3, "hp": 7, "ac": 15}]'::jsonb
    )$$,
  'Valid SRD slug (goblin) accepted'
);

-- ---------------------------------------------------------------------------
-- TEST 4: Fake/non-SRD slug rejected with SQLSTATE 23514.
-- Slug "vgm-kenku" references Volos Guide (non-SRD) and must be rejected
-- by the SRD-whitelist check.
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into campaign_template_encounters
      (template_id, name, sort_order, monsters_payload)
    values (
      '00000000-04a4-4000-0000-000000000008',
      'Non-SRD ambush',
      40,
      '[{"slug": "vgm-kenku", "quantity": 1}]'::jsonb
    )$$,
  '23514',
  NULL,
  'Non-SRD slug (vgm-kenku) rejected with SQLSTATE 23514'
);

-- ---------------------------------------------------------------------------
-- TEST 5: Top-level non-array rejected with 22023.
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into campaign_template_encounters
      (template_id, name, sort_order, monsters_payload)
    values (
      '00000000-04a4-4000-0000-000000000008',
      'Bad top-level shape',
      50,
      '{"slug": "goblin"}'::jsonb
    )$$,
  '22023',
  NULL,
  'Non-array top-level payload rejected with SQLSTATE 22023'
);

-- ---------------------------------------------------------------------------
-- TEST 6: Element not an object rejected with 22023.
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into campaign_template_encounters
      (template_id, name, sort_order, monsters_payload)
    values (
      '00000000-04a4-4000-0000-000000000008',
      'Non-object elements',
      60,
      '[1, 2, 3]'::jsonb
    )$$,
  '22023',
  NULL,
  'Non-object element [1,2,3] rejected with SQLSTATE 22023'
);

-- ---------------------------------------------------------------------------
-- TEST 7: Object without "slug" key rejected with 22023.
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into campaign_template_encounters
      (template_id, name, sort_order, monsters_payload)
    values (
      '00000000-04a4-4000-0000-000000000008',
      'Missing slug',
      70,
      '[{"no_slug": true, "quantity": 2}]'::jsonb
    )$$,
  '22023',
  NULL,
  'Element without "slug" key rejected with SQLSTATE 22023'
);

-- ---------------------------------------------------------------------------
-- TEST 8: quantity = -1 rejected with 22023.
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into campaign_template_encounters
      (template_id, name, sort_order, monsters_payload)
    values (
      '00000000-04a4-4000-0000-000000000008',
      'Negative quantity',
      80,
      '[{"slug": "goblin", "quantity": -1}]'::jsonb
    )$$,
  '22023',
  NULL,
  'quantity = -1 rejected with SQLSTATE 22023'
);

-- ---------------------------------------------------------------------------
-- TEST 9: quantity = 101 rejected with 22023.
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into campaign_template_encounters
      (template_id, name, sort_order, monsters_payload)
    values (
      '00000000-04a4-4000-0000-000000000008',
      'Quantity over 100',
      90,
      '[{"slug": "goblin", "quantity": 101}]'::jsonb
    )$$,
  '22023',
  NULL,
  'quantity = 101 rejected with SQLSTATE 22023'
);

select * from finish();
rollback;
