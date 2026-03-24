# Story 2.4: Load Saved Player Group into Encounter

Status: ready-for-dev

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

- [ ] **Task 1: Create `components/session/CampaignLoader.tsx`** (AC: 2, 3, 5)
  - [ ] `"use client"` component; renders a `<Dialog>` (shadcn/ui) triggered by a button
  - [ ] On open: fetch the current user's campaigns with player count from Supabase
  - [ ] Display campaign list with name and player count; each row has a "Load" button
  - [ ] On "Load": fetch all `player_characters` for selected campaign, then call `onLoad(characters)` callback prop
  - [ ] If campaign has 0 players: show "This campaign has no players yet." — disable Load button
  - [ ] Close dialog after successful load

- [ ] **Task 2: Modify `components/session/EncounterBuilder.tsx`** (AC: 1, 3, 4)
  - [ ] Add "Load Campaign" button in the EncounterBuilder UI (near the top, next to other add actions)
  - [ ] Import and render `<CampaignLoader>` with an `onLoad` callback
  - [ ] `onLoad` callback receives `PlayerCharacter[]` and calls `addCombatant(...)` for each character
  - [ ] Player combatants are added with `is_player: true`; all other fields mapped from player character data
  - [ ] Do NOT clear existing combatants on load — append players to the existing list
  - [ ] Use `getNumberedName` to avoid name collisions if the same campaign is loaded twice

- [ ] **Task 3: Write tests** (AC: 1–5)
  - [ ] File: `components/session/CampaignLoader.test.tsx`
  - [ ] Test: dialog opens when "Load Campaign" button clicked
  - [ ] Test: renders campaign list with names and player counts
  - [ ] Test: Load button calls onLoad with correct player characters
  - [ ] Test: campaign with 0 players shows empty message and disables Load
  - [ ] Test: dialog closes after successful load
  - [ ] Mock: Supabase browser client via Jest mock
  - [ ] Note: do NOT break existing EncounterBuilder tests — run full test suite after changes

- [ ] **Task 4: Update sprint-status.yaml**
  - [ ] Change `2-4-load-saved-player-group-into-encounter` → `in-progress` when starting, `review` on completion

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

_to be filled by dev agent_

### Debug Log References

_to be filled by dev agent_

### Completion Notes List

_to be filled by dev agent_

### File List

_to be filled by dev agent_
