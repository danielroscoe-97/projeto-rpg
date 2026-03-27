# Story 3.5: DM Link Temporary Player to Character

Status: ready-for-dev

## Story

As a **DM**,
I want to link a temporary player (who joined via QR code) to a campaign character,
so that the player's stats are loaded from the campaign and the link persists for future sessions.

## Acceptance Criteria

1. DM sees dropdown "Vincular a personagem:" next to temp player name in combat view. Lists `player_characters` from campaign not yet linked in session.
2. On selection: combatant stats (name, HP, AC, spell_save_dc) loaded from `player_character`. Name changes to character name. `combatants.player_character_id` saved.
3. Already-linked characters shown as disabled in dropdown with tooltip "Já vinculado a {name}".
4. Previously-filled stats replaced by character data. Toast: "Stats carregados de {character name}".
5. "Desvincular" button: reverts to manual stats, character becomes available again in dropdown.
6. If no characters available: dropdown shows "Nenhum personagem disponível" (disabled) + link to campaign management.
7. Broadcast `session:player_linked` to update player view.

## Tasks / Subtasks

- [ ] Task 1: Add player_character_id to combatants (AC: #2)
  - [ ] Verify if migration 012 includes `player_character_id UUID REFERENCES player_characters(id)`
  - [ ] If not, add via additional migration
  - [ ] Update `Combatant` interface in `lib/types/combat.ts`

- [ ] Task 2: PlayerLinkDropdown component (AC: #1, #3, #6)
  - [ ] Create `components/combat/PlayerLinkDropdown.tsx`
  - [ ] Query: `player_characters` for campaign, exclude already-linked
  - [ ] Disabled items with tooltip for already-linked
  - [ ] "Nenhum personagem disponível" state

- [ ] Task 3: Link action (AC: #2, #4)
  - [ ] On select: load character stats into combatant
  - [ ] Update store: name, hp, ac, spell_save_dc, player_character_id
  - [ ] Persist: `supabase.from('combatants').update(...)`
  - [ ] Toast: `t('combat.character_linked', { name: character.name })`
  - [ ] Broadcast `session:player_linked`

- [ ] Task 4: Unlink action (AC: #5)
  - [ ] "Desvincular" button: revert to manual stats (stored before link)
  - [ ] Set `player_character_id = null`
  - [ ] Character becomes available in dropdown again

- [ ] Task 5: Broadcast and player view update (AC: #7)
  - [ ] Broadcast `session:player_linked` with updated combatant data
  - [ ] Player view updates to reflect new stats

## Dev Notes

### Files to Create/Modify
- New: `components/combat/PlayerLinkDropdown.tsx`
- Modify: DM combat view — render dropdown next to temp players
- Modify: `lib/types/combat.ts` — add `player_character_id: string | null`
- Modify: `lib/types/realtime.ts` — add `session:player_linked` event type

### Anti-Patterns
- **DON'T** auto-link without DM action — always require explicit selection
- **DON'T** allow linking to already-linked characters
- **DON'T** lose manual stats on link — store them for potential unlink

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md — Story 3.5]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, FR56]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — UX-DR29 PlayerLinkDropdown]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
