# Story 1.2: Display Name for Monsters (Anti-Metagaming)

Status: ready-for-dev

## Story

As a **DM**,
I want to set a custom display name for any monster visible to players instead of the real SRD name,
so that players cannot metagame by recognizing monster names and looking up their stats externally.

## Acceptance Criteria

1. Migration `012_combatants_v2.sql` adds `display_name TEXT NULL` column to `combatants`. Migration `015_sanitize_display_name.sql` creates trigger that strips HTML/XSS on INSERT/UPDATE.
2. DM sees "Real Name (Display Name)" in combat list. If `display_name` is null, only real name shown.
3. Players receive `display_name` as `name` in broadcast payload. Never receive real SRD name when `display_name` is set.
4. `display_name` editable in StatsEditor (max 50 chars). Also optional in EncounterSetup when adding monster.
5. `sanitizePayload` in `broadcast.ts` substitutes `name` with `display_name` for non-player combatants when set.
6. XSS sanitization trigger on DB side strips HTML tags and encodes special entities (NFR33).
7. Backward compatible: existing encounters with `display_name = null` work identically to V1.

## Tasks / Subtasks

- [ ] Task 1: Create migration 012_combatants_v2.sql (AC: #1)
  - [ ] Add `display_name TEXT NULL DEFAULT NULL` to `combatants`
  - [ ] Also add `monster_group_id UUID NULL` and `group_order INTEGER NULL` (shared migration for Epic 2)
  - [ ] Create composite index on `(encounter_id, monster_group_id)`

- [ ] Task 2: Create migration 015_sanitize_display_name.sql (AC: #6)
  - [ ] Create trigger function `sanitize_display_name()`:
    ```sql
    CREATE OR REPLACE FUNCTION sanitize_display_name()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.display_name IS NOT NULL THEN
        NEW.display_name := regexp_replace(NEW.display_name, '<[^>]*>', '', 'g');
        NEW.display_name := left(trim(NEW.display_name), 50);
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_sanitize_display_name
    BEFORE INSERT OR UPDATE ON combatants
    FOR EACH ROW EXECUTE FUNCTION sanitize_display_name();
    ```

- [ ] Task 3: Update types (AC: #2, #7)
  - [ ] In `lib/types/combat.ts`: add `display_name: string | null` to `Combatant` interface
  - [ ] In `lib/types/realtime.ts`: include `display_name` in relevant event types

- [ ] Task 4: Update broadcast sanitization (AC: #3, #5)
  - [ ] In `lib/realtime/broadcast.ts` → `sanitizePayload`:
    ```typescript
    // For non-player combatants with display_name set:
    if (!combatant.is_player && combatant.display_name) {
      sanitized.name = combatant.display_name;
    }
    // Always remove display_name from player-facing payload
    delete sanitized.display_name;
    ```

- [ ] Task 5: DM view — dual name rendering (AC: #2)
  - [ ] In `CombatantRow.tsx`: DM sees "Beholder (Criatura Misteriosa)" when display_name set
  - [ ] Display name in secondary text / badge style
  - [ ] If `display_name` is null: show only real name (no change from V1)

- [ ] Task 6: Display name editing (AC: #4)
  - [ ] In `StatsEditor.tsx`: add "Nome visível para jogadores" field (max 50 chars)
  - [ ] In `EncounterSetup.tsx`: add optional display_name field when adding monster
  - [ ] Placeholder: "Ex: Criatura Misteriosa (vazio = nome real)"
  - [ ] Only show for non-player combatants (`is_player === false`)
  - [ ] Broadcast `combat:stats_update` includes `display_name`

## Dev Notes

### Files to Modify/Create

- New: `supabase/migrations/012_combatants_v2.sql`, `supabase/migrations/015_sanitize_display_name.sql`
- Modify: `lib/types/combat.ts`, `lib/types/realtime.ts`, `lib/realtime/broadcast.ts`
- Modify: `components/combat/CombatantRow.tsx`, `components/combat/StatsEditor.tsx`, `components/combat/EncounterSetup.tsx`

### i18n Keys

- `combat.display_name_label`: "Nome visível para jogadores"
- `combat.display_name_placeholder`: "Ex: Criatura Misteriosa (vazio = nome real)"

### Anti-Patterns

- **DON'T** send real SRD name to players when display_name is set — this defeats anti-metagaming
- **DON'T** show display_name field for player combatants (`is_player === true`)
- **DON'T** skip the DB trigger — client-side sanitization alone is not sufficient for XSS
- **DON'T** break existing encounters — null display_name must work identically to V1

### References

- [Source: _bmad-output/implementation-artifacts/v2-epics-0-1-2-stories.md — Story 1.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — V2.2 Schema, migrations 012, 015]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, FR43, NFR33]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
