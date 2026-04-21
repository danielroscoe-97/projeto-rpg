-- 167_campaign_templates.sql
-- Epic 04 (Player-as-DM Upsell), Story 04-A, Área 4 (Starter Kit primitives).
--
-- Creates:
--   * srd_monster_slugs             — SRD 5.1 slug whitelist, seeded from
--                                     data/srd/srd-monster-whitelist.json (419 slugs)
--   * campaign_templates            — admin-curated templates gallery
--   * campaign_template_encounters  — per-template encounters with
--                                     monsters_payload + narrative_prompt
--   * RLS public-read + no-delete policies (F22)
--   * trigger validate_template_monsters_srd (D7)
--
-- Seed data (3-5 templates) lives in the NEXT migration (163). The RPC
-- `clone_campaign_from_template` lands in Story 04-C — not here.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- D7 — SRD enforcement strategy (revised after Story 04-A code review)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- INITIAL (wrong) ATTEMPT: query `monsters` table with `WHERE id = slug AND
-- source_type = 'srd'`. Review surfaced two blockers:
--   1. `monsters.id` is UUID (migration 003), not the slug form the product
--      uses elsewhere (combatants.monster_id was re-typed to TEXT in 014,
--      not monsters.id). A slug like 'goblin' can never match a UUID column.
--   2. `monsters` is not populated at runtime — SRD content is served from
--      static JSON under public/srd/* (see CLAUDE.md "SRD Content
--      Compliance" section, Dual-Mode architecture). A trigger that reads
--      `monsters` would either accept everything (table empty) or reject
--      everything (table exists with UUID ids), both wrong.
--
-- REVISED STRATEGY: maintain a dedicated `srd_monster_slugs` table inside
-- Postgres, populated from `data/srd/srd-monster-whitelist.json` (the same
-- whitelist consumed by scripts/filter-srd-public.ts). The trigger queries
-- this table. Keeping both sources in sync is a script responsibility
-- (future: a CI check or a sync migration), documented alongside this file.
--
-- Postgres CHECK constraints cannot reference another table, which ruled
-- out a direct foreign-key-style approach. A trigger is the only way to
-- enforce a cross-table whitelist on write.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SRD whitelist table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS srd_monster_slugs (
  slug        TEXT PRIMARY KEY,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE srd_monster_slugs IS
  'Epic 04 D7: canonical SRD 5.1 monster slug whitelist. Seeded from '
  'data/srd/srd-monster-whitelist.json. Consulted by '
  'trg_validate_template_monsters_srd on writes to '
  'campaign_template_encounters. Keep in sync with the JSON file when '
  'upstream whitelist changes.';

ALTER TABLE srd_monster_slugs ENABLE ROW LEVEL SECURITY;

-- Read-only for everyone authenticated (useful for client-side validation
-- previews if ever needed). Writes are service_role only.
DROP POLICY IF EXISTS srd_monster_slugs_public_read ON srd_monster_slugs;
CREATE POLICY srd_monster_slugs_public_read
  ON srd_monster_slugs
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS srd_monster_slugs_no_delete ON srd_monster_slugs;
CREATE POLICY srd_monster_slugs_no_delete
  ON srd_monster_slugs
  FOR DELETE
  TO authenticated
  USING (false);

-- Seed: 419 slugs from data/srd/srd-monster-whitelist.json.
-- Idempotent via ON CONFLICT. Any future drift between JSON and DB should
-- be detected by a separate sync check (out of scope for Story 04-A).
INSERT INTO srd_monster_slugs (slug) VALUES
  ('aarakocra'), ('aboleth'), ('abominable-yeti'), ('acolyte'), ('adult-black-dragon'), ('adult-blue-dracolich'), ('adult-blue-dragon'), ('adult-brass-dragon'),
  ('adult-bronze-dragon'), ('adult-copper-dragon'), ('adult-gold-dragon'), ('adult-green-dragon'), ('adult-red-dragon'), ('adult-silver-dragon'), ('adult-white-dragon'), ('air-elemental'),
  ('allosaurus'), ('ancient-black-dragon'), ('ancient-blue-dragon'), ('ancient-brass-dragon'), ('ancient-bronze-dragon'), ('ancient-copper-dragon'), ('ancient-gold-dragon'), ('ancient-green-dragon'),
  ('ancient-red-dragon'), ('ancient-silver-dragon'), ('ancient-white-dragon'), ('androsphinx'), ('animated-armor'), ('ankheg'), ('ankylosaurus'), ('ape'),
  ('arcanaloth'), ('archmage'), ('assassin'), ('awakened-shrub'), ('awakened-tree'), ('axe-beak'), ('azer'), ('baboon'),
  ('badger'), ('balor'), ('bandit'), ('bandit-captain'), ('banshee'), ('barbed-devil'), ('barlgura'), ('basilisk'),
  ('bat'), ('bearded-devil'), ('behir'), ('berserker'), ('black-bear'), ('black-dragon-wyrmling'), ('black-pudding'), ('blink-dog'),
  ('blood-hawk'), ('blue-dragon-wyrmling'), ('boar'), ('bone-devil'), ('bone-naga-guardian'), ('bone-naga-spirit'), ('brass-dragon-wyrmling'), ('bronze-dragon-wyrmling'),
  ('brown-bear'), ('bugbear'), ('bugbear-chief'), ('bulette'), ('bullywug'), ('cambion'), ('camel'), ('cat'),
  ('cave-bear'), ('centaur'), ('chain-devil'), ('chasme'), ('chimera'), ('chuul'), ('clay-golem'), ('cloaker'),
  ('cloud-giant'), ('cockatrice'), ('commoner'), ('constrictor-snake'), ('copper-dragon-wyrmling'), ('couatl'), ('crab'), ('crawling-claw'),
  ('crocodile'), ('cult-fanatic'), ('cultist'), ('cyclops'), ('dao'), ('darkmantle'), ('death-dog'), ('death-knight'),
  ('deep-gnome-svirfneblin'), ('deer'), ('demilich'), ('deva'), ('dire-wolf'), ('djinni'), ('doppelganger'), ('draft-horse'),
  ('dragon-turtle'), ('dretch'), ('drider'), ('drow'), ('drow-elite-warrior'), ('drow-mage'), ('druid'), ('dryad'),
  ('duergar'), ('duodrone'), ('dust-mephit'), ('eagle'), ('earth-elemental'), ('efreeti'), ('elephant'), ('elk'),
  ('empyrean'), ('erinyes'), ('ettercap'), ('ettin'), ('faerie-dragon-blue'), ('faerie-dragon-green'), ('faerie-dragon-indigo'), ('faerie-dragon-orange'),
  ('faerie-dragon-red'), ('faerie-dragon-violet'), ('faerie-dragon-yellow'), ('fire-elemental'), ('fire-giant'), ('fire-snake'), ('flameskull'), ('flesh-golem'),
  ('flumph'), ('flying-snake'), ('flying-sword'), ('fomorian'), ('frog'), ('frost-giant'), ('galeb-duhr'), ('gargoyle'),
  ('gas-spore'), ('gelatinous-cube'), ('ghast'), ('ghost'), ('ghoul'), ('giant-ape'), ('giant-badger'), ('giant-bat'),
  ('giant-boar'), ('giant-centipede'), ('giant-constrictor-snake'), ('giant-crab'), ('giant-crocodile'), ('giant-eagle'), ('giant-elk'), ('giant-fire-beetle'),
  ('giant-frog'), ('giant-goat'), ('giant-hyena'), ('giant-lizard'), ('giant-octopus'), ('giant-owl'), ('giant-poisonous-snake'), ('giant-rat'),
  ('giant-scorpion'), ('giant-sea-horse'), ('giant-shark'), ('giant-spider'), ('giant-toad'), ('giant-vulture'), ('giant-wasp'), ('giant-weasel'),
  ('giant-wolf-spider'), ('gibbering-mouther'), ('glabrezu'), ('gladiator'), ('gnoll'), ('gnoll-fang-of-yeenoghu'), ('gnoll-pack-lord'), ('goat'),
  ('goblin'), ('goblin-boss'), ('gold-dragon-wyrmling'), ('gorgon'), ('goristro'), ('gray-ooze'), ('green-dragon-wyrmling'), ('green-hag'),
  ('grick'), ('grick-alpha'), ('griffon'), ('grimlock'), ('guard'), ('guardian-naga'), ('gynosphinx'), ('half-ogre-ogrillon'),
  ('half-red-dragon-veteran'), ('harpy'), ('hawk'), ('hell-hound'), ('helmed-horror'), ('hezrou'), ('hill-giant'), ('hippogriff'),
  ('hobgoblin'), ('hobgoblin-captain'), ('hobgoblin-warlord'), ('homunculus'), ('horned-devil'), ('hunter-shark'), ('hydra'), ('hyena'),
  ('ice-devil'), ('ice-mephit'), ('imp'), ('incubus'), ('invisible-stalker'), ('iron-golem'), ('jackal'), ('jackalwere'),
  ('kenku'), ('killer-whale'), ('knight'), ('kobold'), ('kraken'), ('kuo-toa-monitor'), ('lamia'), ('lemure'),
  ('lich'), ('lion'), ('lizard'), ('lizard-king'), ('lizard-queen'), ('lizardfolk'), ('lizardfolk-shaman'), ('mage'),
  ('magma-mephit'), ('magmin'), ('mammoth'), ('manes'), ('manticore'), ('marid'), ('marilith'), ('mastiff'),
  ('medusa'), ('merfolk'), ('merrow'), ('mezzoloth'), ('mimic'), ('minotaur'), ('minotaur-skeleton'), ('monodrone'),
  ('mud-mephit'), ('mule'), ('mummy'), ('mummy-lord'), ('myconid-adult'), ('myconid-sovereign'), ('myconid-sprout'), ('nalfeshnee'),
  ('needle-blight'), ('night-hag'), ('nightmare'), ('noble'), ('nothic'), ('nycaloth'), ('ochre-jelly'), ('octopus'),
  ('ogre'), ('ogre-zombie'), ('oni'), ('orc'), ('orc-eye-of-gruumsh'), ('orc-war-chief'), ('orog'), ('otyugh'),
  ('owl'), ('owlbear'), ('panther'), ('pegasus'), ('pentadrone'), ('peryton'), ('phase-spider'), ('pit-fiend'),
  ('pixie'), ('planetar'), ('plesiosaurus'), ('poisonous-snake'), ('polar-bear'), ('poltergeist'), ('pony'), ('priest'),
  ('pseudodragon'), ('pteranodon'), ('purple-worm'), ('quadrone'), ('quaggoth-thonot'), ('quasit'), ('quipper'), ('rakshasa'),
  ('rat'), ('raven'), ('red-dragon-wyrmling'), ('reef-shark'), ('remorhaz'), ('revenant'), ('rhinoceros'), ('riding-horse'),
  ('roc'), ('roper'), ('rug-of-smothering'), ('rust-monster'), ('saber-toothed-tiger'), ('sahuagin'), ('sahuagin-baron'), ('sahuagin-priestess'),
  ('salamander'), ('satyr'), ('scarecrow'), ('scorpion'), ('scout'), ('sea-hag'), ('sea-horse'), ('shadow'),
  ('shadow-demon'), ('shambling-mound'), ('shield-guardian'), ('shrieker'), ('silver-dragon-wyrmling'), ('skeleton'), ('slaad-tadpole'), ('smoke-mephit'),
  ('solar'), ('specter'), ('spider'), ('spined-devil'), ('spirit-naga'), ('sprite'), ('spy'), ('steam-mephit'),
  ('stirge'), ('stone-giant'), ('stone-golem'), ('storm-giant'), ('succubus'), ('swarm-of-bats'), ('swarm-of-beetles'), ('swarm-of-centipedes'),
  ('swarm-of-insects'), ('swarm-of-poisonous-snakes'), ('swarm-of-quippers'), ('swarm-of-rats'), ('swarm-of-ravens'), ('swarm-of-spiders'), ('swarm-of-wasps'), ('tarrasque'),
  ('thug'), ('tiger'), ('treant'), ('tribal-warrior'), ('triceratops'), ('tridrone'), ('troglodyte'), ('troll'),
  ('twig-blight'), ('tyrannosaurus-rex'), ('ultroloth'), ('unicorn'), ('vampire'), ('vampire-spawn'), ('vampire-spellcaster'), ('vampire-warrior'),
  ('veteran'), ('vine-blight'), ('violet-fungus'), ('vrock'), ('vulture'), ('warhorse'), ('warhorse-skeleton'), ('water-elemental'),
  ('water-weird'), ('weasel'), ('werebear'), ('wereboar'), ('wererat'), ('weretiger'), ('werewolf'), ('white-dragon-wyrmling'),
  ('wight'), ('will-o-wisp'), ('winged-kobold'), ('winter-wolf'), ('wolf'), ('worg'), ('wraith'), ('wyvern'),
  ('xorn'), ('yeti'), ('yochlol'), ('young-black-dragon'), ('young-blue-dragon'), ('young-brass-dragon'), ('young-bronze-dragon'), ('young-copper-dragon'),
  ('young-gold-dragon'), ('young-green-dragon'), ('young-red-dragon'), ('young-red-shadow-dragon'), ('young-remorhaz'), ('young-silver-dragon'), ('young-white-dragon'), ('yuan-ti-malison-type-1'),
  ('yuan-ti-malison-type-2'), ('yuan-ti-malison-type-3'), ('zombie')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Templates tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  description         TEXT,
  game_system         TEXT NOT NULL DEFAULT '5e',
  target_party_level  INTEGER NOT NULL DEFAULT 1,
  estimated_sessions  INTEGER,
  preview_image_url   TEXT,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public           BOOLEAN NOT NULL DEFAULT true,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial index without redundant is_public leading column (review — was
-- ON (is_public, sort_order), is_public is already a fixed predicate in
-- the WHERE clause).
CREATE INDEX IF NOT EXISTS idx_campaign_templates_public_order
  ON campaign_templates(sort_order)
  WHERE is_public = true;

CREATE TABLE IF NOT EXISTS campaign_template_encounters (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id         UUID NOT NULL REFERENCES campaign_templates(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  -- shape: [{"slug": "goblin", "quantity": 3, "hp": 7, "ac": 15}, ...]
  -- validated on write by trg_validate_template_monsters_srd — see trigger
  -- function for rejected shapes.
  monsters_payload    JSONB,
  narrative_prompt    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_template_encounters_template
  ON campaign_template_encounters(template_id, sort_order);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE campaign_templates              ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_template_encounters    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_templates_public_read ON campaign_templates;
CREATE POLICY campaign_templates_public_read
  ON campaign_templates
  FOR SELECT
  USING (is_public = true);

DROP POLICY IF EXISTS campaign_template_encounters_public_read ON campaign_template_encounters;
CREATE POLICY campaign_template_encounters_public_read
  ON campaign_template_encounters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_templates t
       WHERE t.id = template_id AND t.is_public = true
    )
  );

-- F22 — explicit deny for DELETE on both tables (authenticated role).
DROP POLICY IF EXISTS campaign_templates_no_delete ON campaign_templates;
CREATE POLICY campaign_templates_no_delete
  ON campaign_templates
  FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS campaign_template_encounters_no_delete ON campaign_template_encounters;
CREATE POLICY campaign_template_encounters_no_delete
  ON campaign_template_encounters
  FOR DELETE
  TO authenticated
  USING (false);

-- Intentionally no INSERT/UPDATE policies for authenticated. Seed + admin
-- writes go via service_role which bypasses RLS.

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SRD-enforcement trigger (D7, revised)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- SECURITY DEFINER so a client that can INSERT into the table still gets
-- SELECT privileges into srd_monster_slugs when the trigger runs (review
-- flagged RLS-poisoning risk if the trigger body ran as caller and the
-- caller lacked privileges on the lookup table).
--
-- Validation layers:
--   * NULL / empty payload → accepted (pure-narrative encounter).
--   * Non-array top level → reject 22023.
--   * Each element must be a JSON object (reject 22023 if not).
--   * Each element must have a non-empty slug AND that slug must exist in
--     srd_monster_slugs. Collect ALL missing slugs, reject 23514 with list.
--   * quantity (when present) must be a positive integer; hp / ac must be
--     non-negative integers when present. Defence-in-depth against payloads
--     that survive the slug check but carry garbage numerics.

CREATE OR REPLACE FUNCTION validate_template_monsters_srd()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_element       JSONB;
  v_slug          TEXT;
  v_quantity      INTEGER;
  v_hp            INTEGER;
  v_ac            INTEGER;
  v_missing_slugs TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NEW.monsters_payload IS NULL THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(NEW.monsters_payload) <> 'array' THEN
    RAISE EXCEPTION 'monsters_payload must be a JSON array, got %', jsonb_typeof(NEW.monsters_payload)
      USING ERRCODE = '22023';
  END IF;

  FOR v_element IN SELECT jsonb_array_elements(NEW.monsters_payload) LOOP
    IF jsonb_typeof(v_element) <> 'object' THEN
      RAISE EXCEPTION 'monsters_payload elements must be JSON objects, got %', jsonb_typeof(v_element)
        USING ERRCODE = '22023';
    END IF;

    v_slug := v_element->>'slug';
    IF v_slug IS NULL OR v_slug = '' THEN
      RAISE EXCEPTION 'monsters_payload element missing non-empty "slug"'
        USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM srd_monster_slugs WHERE slug = v_slug) THEN
      v_missing_slugs := array_append(v_missing_slugs, v_slug);
    END IF;

    -- Quantity is optional but must be a positive integer when present.
    IF v_element ? 'quantity' THEN
      BEGIN
        v_quantity := (v_element->>'quantity')::INTEGER;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'monsters_payload.quantity must be an integer, got %', v_element->'quantity'
          USING ERRCODE = '22023';
      END;
      IF v_quantity < 1 OR v_quantity > 100 THEN
        RAISE EXCEPTION 'monsters_payload.quantity out of range (got %); allowed [1,100]', v_quantity
          USING ERRCODE = '22023';
      END IF;
    END IF;

    -- hp / ac optional but must be non-negative integers when present.
    IF v_element ? 'hp' THEN
      BEGIN v_hp := (v_element->>'hp')::INTEGER; EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'monsters_payload.hp must be an integer' USING ERRCODE = '22023';
      END;
      IF v_hp < 0 THEN
        RAISE EXCEPTION 'monsters_payload.hp must be non-negative' USING ERRCODE = '22023';
      END IF;
    END IF;
    IF v_element ? 'ac' THEN
      BEGIN v_ac := (v_element->>'ac')::INTEGER; EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'monsters_payload.ac must be an integer' USING ERRCODE = '22023';
      END;
      IF v_ac < 0 THEN
        RAISE EXCEPTION 'monsters_payload.ac must be non-negative' USING ERRCODE = '22023';
      END IF;
    END IF;
  END LOOP;

  IF array_length(v_missing_slugs, 1) > 0 THEN
    RAISE EXCEPTION 'Template monsters must be SRD-whitelisted. Non-SRD or missing: %', v_missing_slugs
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

-- SECURITY DEFINER functions need restricted EXECUTE — the trigger runs on
-- the table, so the trigger invocation itself is what matters, but lock
-- down direct invocation anyway.
REVOKE EXECUTE ON FUNCTION validate_template_monsters_srd() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_validate_template_monsters_srd ON campaign_template_encounters;
CREATE TRIGGER trg_validate_template_monsters_srd
  BEFORE INSERT OR UPDATE ON campaign_template_encounters
  FOR EACH ROW
  EXECUTE FUNCTION validate_template_monsters_srd();

COMMENT ON FUNCTION validate_template_monsters_srd() IS
  'Epic 04 D7: blocks inserts/updates of campaign_template_encounters.monsters_payload '
  'when any slug is not present in srd_monster_slugs OR when the payload shape is '
  'invalid. SECURITY DEFINER so the lookup proceeds even under restrictive caller RLS. '
  'Raises 22023 for shape violations, 23514 for whitelist misses with the list of '
  'missing slugs.';

-- Backout:
--   DROP TRIGGER IF EXISTS trg_validate_template_monsters_srd ON campaign_template_encounters;
--   DROP FUNCTION IF EXISTS validate_template_monsters_srd();
--   DROP TABLE IF EXISTS campaign_template_encounters;
--   DROP TABLE IF EXISTS campaign_templates;
--   DROP TABLE IF EXISTS srd_monster_slugs;

-- Follow-up tickets (out of scope for Story 04-A):
--   * Source-drift audit: a monster slug flipped from SRD to non-SRD upstream
--     does not retroactively invalidate templates that reference it. A cron
--     sweep + RAISE NOTICE to admins would catch this; owner Winston.
--   * Sync check in CI: assert srd_monster_slugs matches
--     data/srd/srd-monster-whitelist.json (avoid drift between file and DB).
