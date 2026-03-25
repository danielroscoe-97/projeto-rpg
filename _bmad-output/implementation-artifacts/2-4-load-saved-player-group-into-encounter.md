# Story 2.4: Load Saved Player Group into Encounter

Status: done

## Story

As a **DM**,
I want to load an entire saved campaign (player group) into a new encounter with one action,
so that session setup takes seconds instead of manually re-entering each player.

## Acceptance Criteria

1. **Given** the encounter builder at `/app/session/new`,
   **When** the DM views the page,
   **Then** a "Load Campaign" button is visible in the encounter builder UI.

2. **Given** the DM clicks "Load Campaign",
   **When** the campaign picker opens,
   **Then** a list of the DM's saved campaigns is displayed, each showing name and player count.

3. **Given** a selected campaign in the picker,
   **When** the DM confirms the selection,
   **Then** all player characters from that campaign are added to the encounter combatant list with their saved stats (name, max HP as current HP, AC, spell save DC) and `is_player: true`.

4. **Given** players are loaded from a campaign,
   **When** they appear in the combatant list,
   **Then** the DM can still manually add or remove individual combatants afterward.

5. **Given** a campaign with 0 player characters,
   **When** the DM tries to load it,
   **Then** a message explains there are no players in that campaign (no combatants added).

## Tasks / Subtasks

- [x] **Task 1: Create `components/session/CampaignLoader.tsx`** (AC: 2, 3, 5)
  - [x] `"use client"` component; renders a `<Dialog>` (shadcn/ui) triggered by a button
  - [x] On open: fetch the current user's campaigns with player count from Supabase
  - [x] Display campaign list with name and player count; each row has a "Load" button
  - [x] On "Load": fetch all `player_characters` for selected campaign, then call `onLoad(characters)` callback prop
  - [x] If campaign has 0 players: show "This campaign has no players yet." — disable Load button
  - [x] Close dialog after successful load

- [x] **Task 2: Modify `components/session/EncounterBuilder.tsx`** (AC: 1, 3, 4)
  - [x] Add "Load Campaign" button in the EncounterBuilder UI (near the top, next to other add actions)
  - [x] Import and render `<CampaignLoader>` with an `onLoad` callback
  - [x] `onLoad` callback receives `PlayerCharacter[]` and calls `addCombatant(...)` for each character
  - [x] Player combatants are added with `is_player: true`; all other fields mapped from player character data
  - [x] Do NOT clear existing combatants on load — append players to the existing list
  - [x] Use `getNumberedName` to avoid name collisions if the same campaign is loaded twice

- [x] **Task 3: Write tests** (AC: 1–5)
  - [x] File: `components/session/CampaignLoader.test.tsx`
  - [x] Test: dialog opens when "Load Campaign" button clicked
  - [x] Test: renders campaign list with names and player counts
  - [x] Test: Load button calls onLoad with correct player characters
  - [x] Test: campaign with 0 players shows empty message and disables Load
  - [x] Test: dialog closes after successful load
  - [x] Mock: Supabase browser client via Jest mock
  - [x] Note: do NOT break existing EncounterBuilder tests — run full test suite after changes

- [x] **Task 4: Update sprint-status.yaml**
  - [x] Change `2-4-load-saved-player-group-into-encounter` → `in-progress` when starting, `review` on completion

## Dev Notes

### Dependency on Epic 3 (Story 3.1)

`components/session/EncounterBuilder.tsx` was implemented by the parallel agent in Story 3.1 (currently in `review`). Before modifying it:

```bash
cat components/session/EncounterBuilder.tsx
```

Understand its current structure — it uses:
- `useCombatStore` for `addCombatant`, `removeCombatant`, `combatants`
- `getNumberedName` from `@/lib/stores/combat-store`
- shadcn/ui `Dialog` pattern may already be used for custom NPC form

### Combatant Shape for Player Characters

When loading players from a campaign into the encounter builder, map `PlayerCharacter` → `Combatant` shape expected by `addCombatant`:

```ts
import type { PlayerCharacter } from '@/lib/types/database'
import type { Combatant } from '@/lib/types/combat'

function playerCharacterToCombatant(pc: PlayerCharacter): Omit<Combatant, 'id'> {
  return {
    name: pc.name,
    current_hp: pc.max_hp,       // start at full health
    max_hp: pc.max_hp,
    temp_hp: 0,
    ac: pc.ac,
    spell_save_dc: pc.spell_save_dc,
    initiative: null,
    initiative_order: null,
    conditions: [],
    ruleset_version: null,
    is_defeated: false,
    is_player: true,             // CRITICAL: marks as player, not monster
    monster_id: null,
  }
}
```

Check `lib/types/combat.ts` for the exact `Combatant` type shape before implementing.

### CampaignLoader Component

```tsx
// components/session/CampaignLoader.tsx
"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { PlayerCharacter } from '@/lib/types/database'

interface CampaignWithCount {
  id: string
  name: string
  player_count: number
}

interface Props {
  onLoad: (characters: PlayerCharacter[]) => void
}

export function CampaignLoader({ onLoad }: Props) {
  const [open, setOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<CampaignWithCount[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchCampaigns = async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('campaigns')
      .select('id, name, player_characters(count)')
      .order('created_at', { ascending: false })

    setCampaigns(
      data?.map(c => ({
        id: c.id,
        name: c.name,
        player_count: (c.player_characters as { count: number }[])[0]?.count ?? 0,
      })) ?? []
    )
    setIsLoading(false)
  }

  const handleLoad = async (campaignId: string) => {
    const supabase = createClient()
    const { data: characters } = await supabase
      .from('player_characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true })

    if (characters && characters.length > 0) {
      onLoad(characters)
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) fetchCampaigns() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Load Campaign</Button>
      </DialogTrigger>
      <DialogContent className="bg-[#16213e] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Load Player Group</DialogTitle>
        </DialogHeader>
        {/* campaign list */}
      </DialogContent>
    </Dialog>
  )
}
```

### Integrating into EncounterBuilder

In `EncounterBuilder.tsx`, add the `CampaignLoader` near the top of the UI (e.g., after the ruleset selector or in the header area):

```tsx
import { CampaignLoader } from '@/components/session/CampaignLoader'

// In the component, add the onLoad handler:
const handleLoadCampaign = useCallback((characters: PlayerCharacter[]) => {
  characters.forEach(pc => {
    const numberedName = getNumberedName(pc.name, useCombatStore.getState().combatants)
    addCombatant({
      name: numberedName,
      current_hp: pc.max_hp,
      max_hp: pc.max_hp,
      temp_hp: 0,
      ac: pc.ac,
      spell_save_dc: pc.spell_save_dc,
      initiative: null,
      initiative_order: null,
      conditions: [],
      ruleset_version: null,
      is_defeated: false,
      is_player: true,
      monster_id: null,
    })
  })
}, [addCombatant])

// In JSX (e.g., next to "Add Custom NPC" button area):
<CampaignLoader onLoad={handleLoadCampaign} />
```

**Note on `getNumberedName`:** It's imported from `@/lib/stores/combat-store`. It prevents duplicate names (e.g., if "Aria" exists, the next "Aria" becomes "Aria 2"). Use the store's current combatants state for each iteration, or pass the accumulated list:

```ts
// Safe way to number multiple additions sequentially:
const currentCombatants = [...useCombatStore.getState().combatants]
characters.forEach(pc => {
  const numberedName = getNumberedName(pc.name, currentCombatants)
  const newCombatant = { name: numberedName, /* ... */ }
  addCombatant(newCombatant)
  currentCombatants.push({ ...newCombatant, id: Date.now().toString() }) // temp id for numbering
})
```

### Supabase Client

`CampaignLoader.tsx` is a Client Component — use `createClient` from `@/lib/supabase/client` only.

The `CampaignLoader` does NOT have access to the server-side user ID. The RLS policy on `campaigns` (`owner_id = auth.uid()`) will automatically restrict results to the current DM's campaigns when using the browser client — no need to pass `userId` explicitly.

### Type Imports

```ts
import type { PlayerCharacter } from '@/lib/types/database'
import type { Combatant } from '@/lib/types/combat'  // check this file exists
```

Verify the exact shape of `Combatant` by reading `lib/types/combat.ts`.

### shadcn/ui Components

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogTrigger` — from `@/components/ui/dialog`
- `Button` — from `@/components/ui/button`

If `Dialog` subcomponents are not all in `components/ui/dialog.tsx`, check which are available and import accordingly.

### Dark Theme

- Dialog background: `bg-[#16213e] border-white/10`
- Dialog title: `text-white`
- Campaign rows: `bg-[#1a1a2e]` hover `bg-white/5`
- Load button per row: `variant="ghost"` with `text-[#e94560]`
- Empty state: `text-white/40 text-sm`

### Anti-Patterns — NEVER DO

- Do NOT clear existing combatants when loading a campaign — append only
- Do NOT fetch campaigns server-side for this component — it lives inside the client-side EncounterBuilder
- Do NOT use Zustand outside of the `addCombatant` call — local state for dialog/campaigns
- Do NOT skip the `is_player: true` flag — it's used downstream to distinguish players from monsters
- Do NOT break existing EncounterBuilder tests — run `npm test` after changes

### Files to Create / Modify

- `components/session/CampaignLoader.tsx` — NEW: dialog component for loading campaigns
- `components/session/CampaignLoader.test.tsx` — NEW: unit tests
- `components/session/EncounterBuilder.tsx` — MODIFY: add "Load Campaign" button + `handleLoadCampaign` callback

### References

- Acceptance Criteria: `_bmad-output/planning-artifacts/epics.md` → Epic 2, Story 2.4
- EncounterBuilder (current implementation): `components/session/EncounterBuilder.tsx`
- Combat store: `lib/stores/combat-store.ts`
- Combat types: `lib/types/combat.ts`
- DB types: `lib/types/database.ts`
- Previous story (2.3): `_bmad-output/implementation-artifacts/2-3-add-and-edit-player-characters-in-a-campaign.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- shadcn/ui Dialog not installed; implemented custom modal overlay using plain React state + Tailwind CSS instead.

### Completion Notes List

- Created `components/session/CampaignLoader.tsx`: custom dialog (no shadcn Dialog available) with Supabase-powered campaign list, player count display, per-campaign Load button, empty-campaign guard, and close-on-success behavior.
- Modified `components/session/EncounterBuilder.tsx`: added `handleLoadCampaign` callback (appends players with `is_player: true`, uses `getNumberedName` for collision-safe sequential naming) and rendered `<CampaignLoader>` next to the custom NPC button.
- Created `components/session/CampaignLoader.test.tsx`: 6 tests covering all ACs — dialog open, campaign list render, onLoad callback with correct characters, empty-campaign message, Load button absence for empty campaigns, and dialog close after load. All 6 pass.
- Full regression suite: 125/125 tests pass.

### File List

- `components/session/CampaignLoader.tsx` — NEW
- `components/session/CampaignLoader.test.tsx` — NEW
- `components/session/EncounterBuilder.tsx` — MODIFIED
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED

## Change Log

- 2026-03-24: Story 2.4 implemented — CampaignLoader component created, EncounterBuilder updated, 6 new tests added (125 total passing).
