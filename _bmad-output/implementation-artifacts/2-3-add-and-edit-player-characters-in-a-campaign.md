# Story 2.3: Add & Edit Player Characters in a Campaign

Status: ready-for-dev

## Story

As a **DM**,
I want to add player characters to a campaign with name, HP, AC, and spell save DC, and edit them later,
so that I never have to re-enter player data between sessions.

## Acceptance Criteria

1. **Given** an existing campaign at `/app/campaigns/[id]`,
   **When** the DM clicks "Add Player",
   **Then** an inline form appears where they can enter: character name (required), max HP (required), AC (required), spell save DC (optional),
   **And** the player character is saved to the campaign and appears in the list.

2. **Given** an existing player character in the campaign,
   **When** the DM clicks "Edit" on the character,
   **Then** an inline edit form pre-filled with the character's data appears,
   **And** the DM can modify any field (name, max HP, AC, spell save DC),
   **And** changes are persisted immediately on save.

3. **Given** an existing player character,
   **When** the DM clicks "Remove" on the character,
   **Then** a confirmation is required before deletion,
   **And** the character is removed from the campaign after confirmation.

4. **Given** a campaign with player characters,
   **When** the DM views the campaign at `/app/campaigns/[id]`,
   **Then** all characters are listed with their stats (name, max HP, AC, spell save DC or "—").

5. **Given** the campaign detail page,
   **When** the DM views it,
   **Then** the campaign name is shown as the page heading,
   **And** a "Back to Dashboard" link navigates to `/app/dashboard`.

## Tasks / Subtasks

- [ ] **Task 1: Create `app/app/campaigns/[id]/page.tsx`** (AC: 4, 5)
  - [ ] Server Component — verify auth (`createClient` from server), redirect to `/auth/login` if no user
  - [ ] Fetch campaign by `id` where `owner_id = user.id`; if not found or not owned by user → `redirect('/app/dashboard')`
  - [ ] Fetch all player characters for this campaign ordered by `created_at ASC`
  - [ ] Render campaign name as heading, "Back to Dashboard" link, and `<PlayerCharacterManager>` client component
  - [ ] Pass `initialCharacters`, `campaignId`, and `campaignName` as props

- [ ] **Task 2: Create `components/dashboard/PlayerCharacterManager.tsx`** (AC: 1, 2, 3, 4)
  - [ ] `"use client"` component receiving `initialCharacters: PlayerCharacter[]`, `campaignId: string`, `campaignName: string`
  - [ ] Renders list of player characters; each row shows: name, max HP, current HP, AC, spell save DC (or "—"), Edit button, Remove button
  - [ ] "Add Player" button → shows inline form with fields: name (text), max_hp (number), ac (number), spell_save_dc (number, optional)
  - [ ] Validation: name non-empty, max_hp ≥ 1, ac ≥ 1; spell_save_dc ≥ 1 if provided
  - [ ] On save: insert new character with `current_hp = max_hp` on creation
  - [ ] Edit mode: inline form per row with pre-filled values; Save persists, Cancel discards
  - [ ] Note: editing `max_hp` should also update `current_hp` if `current_hp === max_hp` (character at full health)
  - [ ] Remove: confirmation dialog before delete
  - [ ] Show loading state during async operations; show error inline

- [ ] **Task 3: Write tests for `PlayerCharacterManager`** (AC: 1–4)
  - [ ] File: `components/dashboard/PlayerCharacterManager.test.tsx`
  - [ ] Test: renders list of characters with stats
  - [ ] Test: "Add Player" button shows inline form
  - [ ] Test: Save disabled when required fields are empty
  - [ ] Test: valid form calls `supabase.from('player_characters').insert(...)`
  - [ ] Test: new character appears in list after successful save
  - [ ] Test: Edit button shows form pre-filled with character data
  - [ ] Test: update calls `supabase.from('player_characters').update(...)`
  - [ ] Test: Remove button shows confirmation
  - [ ] Test: confirm remove calls `supabase.from('player_characters').delete(...)`
  - [ ] Mock: Supabase browser client via Jest mock

- [ ] **Task 4: Update sprint-status.yaml**
  - [ ] Change `2-3-add-and-edit-player-characters-in-a-campaign` → `in-progress` when starting, `review` on completion

## Dev Notes

### Route Structure

```
app/
└── app/
    ├── layout.tsx                        ← DO NOT MODIFY (auth guard + nav)
    ├── dashboard/
    │   └── page.tsx                      ← DO NOT MODIFY (Story 2.2 owns this)
    └── campaigns/
        └── [id]/
            └── page.tsx                  ← NEW (this story)
```

### Server Component: Campaign Detail Page

```tsx
// app/app/campaigns/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlayerCharacterManager } from '@/components/dashboard/PlayerCharacterManager'

export default async function CampaignPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verify ownership
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .single()

  if (!campaign) redirect('/app/dashboard')

  const { data: characters } = await supabase
    .from('player_characters')
    .select('*')
    .eq('campaign_id', params.id)
    .order('created_at', { ascending: true })

  return (
    <div>
      <div className="mb-6">
        <Link href="/app/dashboard" className="text-white/50 text-sm hover:text-white">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-white mt-2">{campaign.name}</h1>
        <p className="text-white/50 text-sm mt-1">Manage player characters for this campaign.</p>
      </div>
      <PlayerCharacterManager
        initialCharacters={characters ?? []}
        campaignId={campaign.id}
        campaignName={campaign.name}
      />
    </div>
  )
}
```

### DB Operations

**Insert New Character:**
```ts
const { data, error } = await supabase
  .from('player_characters')
  .insert({
    campaign_id: campaignId,
    name: form.name.trim(),
    max_hp: Number(form.max_hp),
    current_hp: Number(form.max_hp),   // current_hp = max_hp on creation
    ac: Number(form.ac),
    spell_save_dc: form.spell_save_dc ? Number(form.spell_save_dc) : null,
  })
  .select('*')
  .single()
```

**Update Character:**
```ts
const updatePayload: PlayerCharacterUpdate = {
  name: form.name.trim(),
  max_hp: Number(form.max_hp),
  ac: Number(form.ac),
  spell_save_dc: form.spell_save_dc ? Number(form.spell_save_dc) : null,
}
// If character is at full health, keep current_hp in sync with max_hp
if (character.current_hp === character.max_hp) {
  updatePayload.current_hp = Number(form.max_hp)
}
const { error } = await supabase
  .from('player_characters')
  .update(updatePayload)
  .eq('id', characterId)
```

**Delete Character:**
```ts
const { error } = await supabase
  .from('player_characters')
  .delete()
  .eq('id', characterId)
```

### Type Imports

```ts
import type { PlayerCharacter } from '@/lib/types/database'
// PlayerCharacter is defined in lib/types/database.ts as:
// Database['public']['Tables']['player_characters']['Row']
// Fields: id, campaign_id, name, max_hp, current_hp, ac, spell_save_dc, created_at, updated_at

// For update operations:
type PlayerCharacterUpdate = Database['public']['Tables']['player_characters']['Update']
```

### Player Character Form State

```ts
interface PlayerCharacterForm {
  name: string
  max_hp: string    // string for input, convert to number on save
  ac: string
  spell_save_dc: string  // empty string = null
}

const EMPTY_FORM: PlayerCharacterForm = { name: '', max_hp: '', ac: '', spell_save_dc: '' }
```

### Validation Rules

| Field | Rule |
|-------|------|
| name | Required, non-empty after trim |
| max_hp | Required, integer ≥ 1 |
| ac | Required, integer ≥ 1 |
| spell_save_dc | Optional; if provided, integer ≥ 1 |

### shadcn/ui Components

- `Button` — `@/components/ui/button`
- `Input` — `@/components/ui/input`
- `Label` — `@/components/ui/label`
- `Dialog` or `AlertDialog` — for remove confirmation

### Dark Theme

- Page surface: `bg-[#16213e]` for character list rows
- Accent: `text-[#e94560]` / `bg-[#e94560]` for primary actions (Add Player, Save)
- Stats display: `text-white` (name), `text-white/70` (stat values)
- Column headers: `text-white/50 text-xs uppercase tracking-wider`

### Dashboard Link Back

The `app/app/campaigns/[id]/page.tsx` is protected by `app/app/layout.tsx` which already provides the nav bar. The "Back to Dashboard" link is supplementary breadcrumb navigation.

### Anti-Patterns — NEVER DO

- Do NOT skip the ownership check on the campaign — any logged-in user could try `/app/campaigns/[other-user-id]`
- Do NOT use Zustand for player character state — local `useState` in `PlayerCharacterManager` is correct
- Do NOT call `supabase.auth.getUser()` in client components — only the Server Component does this
- Do NOT reset `current_hp` to `max_hp` on every edit — only if the character was at full health
- Do NOT use inline styles — Tailwind only

### Files to Create

- `app/app/campaigns/[id]/page.tsx` — NEW: Server Component, campaign detail page
- `components/dashboard/PlayerCharacterManager.tsx` — NEW: client component with full CRUD
- `components/dashboard/PlayerCharacterManager.test.tsx` — NEW: unit tests

### References

- Acceptance Criteria: `_bmad-output/planning-artifacts/epics.md` → Epic 2, Story 2.3
- DB types: `lib/types/database.ts`
- Auth pattern: `lib/supabase/server.ts` / `lib/supabase/client.ts`
- Previous story (2.2): `_bmad-output/implementation-artifacts/2-2-create-and-manage-campaigns-player-groups.md`
- Onboarding wizard (pattern reference): `components/dashboard/OnboardingWizard.tsx`

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

_to be filled by dev agent_

### Completion Notes List

_to be filled by dev agent_

### File List

_to be filled by dev agent_
