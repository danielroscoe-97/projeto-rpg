-- Persist condition_durations, death_saves, legendary_actions_total/used to DB.
-- Previously these were client-side only, causing loss on page refresh.

ALTER TABLE combatants
  ADD COLUMN IF NOT EXISTS condition_durations JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS death_saves JSONB NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS legendary_actions_total INTEGER NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS legendary_actions_used INTEGER NOT NULL DEFAULT 0;

-- Index for legendary actions queries (DM uses per-round reset)
CREATE INDEX IF NOT EXISTS combatants_legendary_idx
  ON combatants (encounter_id)
  WHERE legendary_actions_total IS NOT NULL;
