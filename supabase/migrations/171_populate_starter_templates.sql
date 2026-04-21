-- 171_populate_starter_templates.sql
-- Epic 04 (Player-as-DM Upsell), Story 04-C — starter kit content.
--
-- Migration 168 seeded 3 placeholder templates with monsters_payload = NULL
-- (pure narrative). This migration fills in the monsters_payload for every
-- combat encounter so the clone RPC (170) pre-populates creatures_snapshot
-- with real SRD monsters per F-BONUS / D12.
--
-- Slug whitelist: every slug referenced below must exist in the
-- srd_monster_slugs table seeded by migration 167 (419 rows, SRD 5.1).
-- Choices favour entries explicitly sanity-checked in the story prompt:
--   goblin, wolf, bandit, commoner, cultist, skeleton, zombie, acolyte,
--   thug, guard, specter, ghoul.
--
-- Validation is enforced at write time by trg_validate_template_monsters_srd
-- (see 167:322). If any slug here is misspelled or missing from the
-- whitelist, this migration will fail with SQLSTATE 23514 and roll back —
-- no partial state reaches production.
--
-- Idempotency: UPDATE statements are re-runnable. Rows already populated by
-- a prior run receive the same payload; no duplicate encounters are created
-- (those were seeded by 168 with deterministic UUIDs).

-- ─────────────────────────────────────────────────────────────────────────
-- Taverna em Chamas (lvl 1)
-- 3 encounters. Only #2 is combat-bearing; #1 and #3 are skill + social
-- scenes. We leave their monsters_payload NULL.
-- ─────────────────────────────────────────────────────────────────────────

-- Encounter 2 — Saqueadores no Pátio: 3 bandits + 1 thug (boss).
UPDATE campaign_template_encounters
  SET monsters_payload = '[
    {"slug": "bandit", "quantity": 3},
    {"slug": "thug",   "quantity": 1}
  ]'::jsonb
  WHERE id = '04040402-0001-0000-0000-000000000002';

-- ─────────────────────────────────────────────────────────────────────────
-- A Cripta Perdida (lvl 3)
-- 3 encounters. #1 is a puzzle (narrative-only). #2 and #3 are combat.
-- ─────────────────────────────────────────────────────────────────────────

-- Encounter 2 — Corredor dos Guardiões: skeletons + zombies group.
UPDATE campaign_template_encounters
  SET monsters_payload = '[
    {"slug": "skeleton", "quantity": 4},
    {"slug": "zombie",   "quantity": 2}
  ]'::jsonb
  WHERE id = '04040402-0002-0000-0000-000000000002';

-- Encounter 3 — O Sarcófago: boss fight. Specter + ghoul support.
UPDATE campaign_template_encounters
  SET monsters_payload = '[
    {"slug": "specter", "quantity": 1},
    {"slug": "ghoul",   "quantity": 2}
  ]'::jsonb
  WHERE id = '04040402-0002-0000-0000-000000000003';

-- ─────────────────────────────────────────────────────────────────────────
-- Intro 5e — Primeiras Aventuras (lvl 1-3)
-- 4 encounters, one per pillar. #1 and #4 are combat; #2 and #3 are
-- exploration / interaction (no monsters_payload).
-- ─────────────────────────────────────────────────────────────────────────

-- Encounter 1 — Pilar 1: didactic combat. 2 goblins, CR 1/4 each.
UPDATE campaign_template_encounters
  SET monsters_payload = '[
    {"slug": "goblin", "quantity": 2}
  ]'::jsonb
  WHERE id = '04040402-0003-0000-0000-000000000001';

-- Encounter 4 — Pilar 4: synthesis fight, slightly tougher. Goblins +
-- wolves to showcase different stat blocks and tactics.
UPDATE campaign_template_encounters
  SET monsters_payload = '[
    {"slug": "goblin", "quantity": 3},
    {"slug": "wolf",   "quantity": 2}
  ]'::jsonb
  WHERE id = '04040402-0003-0000-0000-000000000004';

-- Backout:
--   UPDATE campaign_template_encounters SET monsters_payload = NULL
--     WHERE id IN (
--       '04040402-0001-0000-0000-000000000002',
--       '04040402-0002-0000-0000-000000000002',
--       '04040402-0002-0000-0000-000000000003',
--       '04040402-0003-0000-0000-000000000001',
--       '04040402-0003-0000-0000-000000000004'
--     );
