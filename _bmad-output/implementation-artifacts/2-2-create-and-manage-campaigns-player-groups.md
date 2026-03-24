# Story 2.2: Create & Manage Campaigns (Player Groups)

Status: done

## Story

As a **DM**,
I want to create, rename, and delete named campaigns (player groups),
so that I can organize my different play groups and reuse them across sessions.

## Acceptance Criteria

1. **Given** the DM dashboard at `/app/dashboard`,
   **When** the DM clicks "New Campaign",
   **Then** an inline form or modal appears where they can enter a campaign name and save it,
   **And** the new campaign appears in the campaign list on the dashboard.

2. **Given** an existing campaign in the list,
   **When** the DM clicks "Edit" (or "Rename") on a campaign,
   **Then** they can update the campaign name,
   **And** the updated name is persisted and immediately reflected in the list.

3. **Given** an existing campaign,
   **When** the DM clicks "Delete" on a campaign,
   **Then** a confirmation prompt is shown,
   **And** upon confirmation, the campaign and all associated player characters are permanently deleted.

4. **Given** a DM with multiple campaigns,
   **When** they view the dashboard,
   **Then** all their campaigns are listed with the player character count per campaign.

5. **Given** a DM with zero campaigns,
   **When** they land on `/app/dashboard`,
   **Then** they are redirected to `/app/onboarding` (existing behavior from Story 2.1 — preserve this redirect).

## Tasks / Subtasks

- [x] **Task 1: Enhance `app/app/dashboard/page.tsx`** (AC: 4, 5)
  - [x] Add the onboarding redirect: query `campaigns` count; if `count === 0` → `redirect('/app/onboarding')`
  - [x] Fetch campaigns for the current user with player character count using a join or count subquery
  - [x] Pass initial campaigns data down to `<CampaignManager>` client component as a prop
  - [x] The page remains a Server Component — no client-side fetch on initial load

- [x] **Task 2: Create `components/dashboard/CampaignManager.tsx`** (AC: 1, 2, 3, 4)
  - [x] `"use client"` component that receives `initialCampaigns: CampaignWithCount[]` prop
  - [x] Renders a list of campaigns; each item shows: name, player count, Edit button, Delete button
  - [x] "New Campaign" button → shows an inline `<Input>` + "Save" button within the list
  - [x] Edit mode: clicking "Edit" on a row switches that row to inline edit (Input pre-filled with name)
  - [x] Delete: clicking "Delete" shows inline confirmation (no Dialog installed — used inline "Are you sure?" pattern per story note)
  - [x] On confirm delete: call `supabase.from('campaigns').delete().eq('id', id)` — cascade deletes player_characters via DB FK
  - [x] After create/update/delete: optimistic state update (no re-fetch needed)
  - [x] Show loading state during async operations (disable buttons)
  - [x] Show error message on failure (inline, not Toast)

- [x] **Task 3: Write tests for `CampaignManager`** (AC: 1–4)
  - [x] File: `components/dashboard/CampaignManager.test.tsx`
  - [x] Test: renders campaign list with names and player counts
  - [x] Test: "New Campaign" button shows input form
  - [x] Test: save new campaign calls `supabase.from('campaigns').insert(...)`
  - [x] Test: empty name keeps Save button disabled
  - [x] Test: Edit button switches row to edit mode with pre-filled input
  - [x] Test: update calls `supabase.from('campaigns').update(...)`
  - [x] Test: Delete button shows confirmation dialog
  - [x] Test: confirm delete calls `supabase.from('campaigns').delete(...)`
  - [x] Test: cancel delete does not call delete
  - [x] Mock: Supabase browser client via Jest mock

- [x] **Task 4: Update sprint-status.yaml**
  - [x] Change `2-2-create-and-manage-campaigns-player-groups` → `in-progress` when starting, `review` on completion

## Dev Notes

### Route Structure

```
app/
└── app/
    ├── layout.tsx              ← Auth guard + nav (DO NOT MODIFY — owned by Story 1.4/parallel agent)
    ├── dashboard/
    │   └── page.tsx            ← MODIFY: add onboarding redirect + campaign fetch + render CampaignManager
    └── campaigns/
        └── [id]/
            └── page.tsx        ← NOT this story (Story 2.3 creates this)
```

### Critical: Check for Onboarding Redirect

The current `app/app/dashboard/page.tsx` (overwritten by parallel agent) is missing the onboarding redirect from Story 2.1. **You MUST add it back:**

```tsx
// After auth check, add:
const { count } = await supabase
  .from('campaigns')
  .select('id', { count: 'exact', head: true })
  .eq('owner_id', user.id)

if (count === 0) redirect('/app/onboarding')
```

### Fetching Campaigns With Player Count

Use a Supabase join to get campaigns with player character count in one query:

```tsx
const { data: campaigns } = await supabase
  .from('campaigns')
  .select('id, name, created_at, player_characters(count)')
  .eq('owner_id', user.id)
  .order('created_at', { ascending: false })
```

This returns each campaign with a nested `player_characters` array containing `[{ count: N }]`. Map it:

```ts
type CampaignWithCount = {
  id: string
  name: string
  created_at: string
  player_count: number
}
// Transform:
const campaignsWithCount = campaigns?.map(c => ({
  ...c,
  player_count: (c.player_characters as { count: number }[])[0]?.count ?? 0,
})) ?? []
```

### Create Campaign

```ts
const { data, error } = await supabase
  .from('campaigns')
  .insert({ owner_id: userId, name: newName.trim() })
  .select('id, name, created_at')
  .single()
```

Campaign name validation: non-empty, max 50 characters.

### Update Campaign

```ts
const { error } = await supabase
  .from('campaigns')
  .update({ name: newName.trim() })
  .eq('id', campaignId)
```

RLS ensures DMs can only update their own campaigns (`owner_id = auth.uid()`).

### Delete Campaign

```ts
const { error } = await supabase
  .from('campaigns')
  .delete()
  .eq('id', campaignId)
```

The `player_characters` table has `ON DELETE CASCADE` on `campaign_id` — deleting a campaign automatically deletes all its player characters. No need to manually delete children.

### UI Pattern for CampaignManager

```tsx
// Component skeleton:
"use client"

interface CampaignWithCount {
  id: string
  name: string
  created_at: string
  player_count: number
}

interface Props {
  initialCampaigns: CampaignWithCount[]
  userId: string
}

export function CampaignManager({ initialCampaigns, userId }: Props) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // ...
}
```

### Dashboard Page Server Component

```tsx
// app/app/dashboard/page.tsx
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CampaignManager } from '@/components/dashboard/CampaignManager'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Onboarding redirect (Story 2.1 behavior — must be preserved)
  const { count } = await supabase
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
  if (count === 0) redirect('/app/onboarding')

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, created_at, player_characters(count)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const campaignsWithCount = campaigns?.map(c => ({
    id: c.id,
    name: c.name,
    created_at: c.created_at,
    player_count: (c.player_characters as { count: number }[])[0]?.count ?? 0,
  })) ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-white/50 mt-1 text-sm">Manage your campaigns and player groups.</p>
        </div>
      </div>
      <CampaignManager initialCampaigns={campaignsWithCount} userId={user.id} />
    </div>
  )
}
```

### Type Imports

```ts
import type { Campaign, PlayerCharacter } from '@/lib/types/database'
```

### Supabase Client

- **`app/app/dashboard/page.tsx`** (Server Component): `import { createClient } from '@/lib/supabase/server'`
- **`components/dashboard/CampaignManager.tsx`** (Client Component): `import { createClient } from '@/lib/supabase/client'`

### shadcn/ui Components to Use

- `Button` — from `@/components/ui/button`
- `Input` — from `@/components/ui/input`
- `Dialog` / `AlertDialog` — for delete confirmation (from `@/components/ui/dialog` or `@/components/ui/alert-dialog`)
- `Card` — optionally for campaign items (from `@/components/ui/card`)

Check which are already installed: `ls components/ui/`. If AlertDialog is not installed, use a simple confirmation Dialog.

### Dark Theme

- Background: `bg-[#1a1a2e]` (page — already on layout)
- Surface/card: `bg-[#16213e]` (campaign list items)
- Accent: `bg-[#e94560]` for primary action buttons (New Campaign, Save)
- Destructive: standard red for Delete button (`variant="destructive"` on shadcn/ui Button)
- Text: `text-white` (primary), `text-white/50` (secondary/count)

### Navigation to Campaign Detail

Each campaign item should have a link to `/app/campaigns/[id]` for managing player characters (Story 2.3). Add a "Manage Players" or "View" link per campaign row:

```tsx
import Link from 'next/link'
// In campaign row:
<Link href={`/app/campaigns/${campaign.id}`} className="text-[#e94560] text-sm hover:underline">
  Manage Players ({campaign.player_count})
</Link>
```

### Anti-Patterns — NEVER DO

- Do NOT use `fetch()` to call Supabase — always use `@supabase/supabase-js` client
- Do NOT use Zustand for campaign state — local `useState` in `CampaignManager` is correct
- Do NOT call `supabase.auth.getUser()` in client components — only server components
- Do NOT use inline styles — Tailwind only
- Do NOT skip the onboarding redirect — it is required for Story 2.1 to function correctly
- Do NOT manually delete `player_characters` before deleting campaign — the DB cascade handles it

### Files to Create / Modify

- `app/app/dashboard/page.tsx` — MODIFY: add onboarding redirect + campaign query + `<CampaignManager>`
- `components/dashboard/CampaignManager.tsx` — NEW: client component with full CRUD
- `components/dashboard/CampaignManager.test.tsx` — NEW: unit tests

### References

- Acceptance Criteria: `_bmad-output/planning-artifacts/epics.md` → Epic 2, Story 2.2
- DB types: `lib/types/database.ts`
- Auth pattern: `lib/supabase/server.ts` / `lib/supabase/client.ts`
- Dark theme tokens: `_bmad-output/planning-artifacts/ux-design-specification.md`
- Previous story (2.1): `_bmad-output/implementation-artifacts/2-1-first-time-dm-onboarding-flow.md`
- Current dashboard: `app/app/dashboard/page.tsx`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- EncounterBuilder test failures (5 tests) are pre-existing from parallel agent's Story 3.x work — not introduced by this story. Confirmed via `git stash` verification.
- `dialog`/`alert-dialog` shadcn/ui components not installed (no `@radix-ui/react-dialog`). Used inline "Are you sure?" confirmation pattern as specified in story Dev Notes fallback.

### Completion Notes List

- `app/app/dashboard/page.tsx`: replaced placeholder with full campaign dashboard — auth check, onboarding redirect (count === 0 → `/app/onboarding`), campaign fetch with player_count join, renders `<CampaignManager>`
- `components/dashboard/CampaignManager.tsx`: `"use client"` component with full CRUD — create (inline form), edit (inline edit per row), delete (inline confirmation), optimistic state updates, loading/error states, "Manage Players" link to `/app/campaigns/[id]`
- `components/dashboard/CampaignManager.test.tsx`: 14 unit tests covering all CRUD operations, empty state, loading, cancel flows, error handling — all pass
- 14/14 new tests pass; 0 regressions introduced (pre-existing EncounterBuilder failures excluded)

### File List

- `app/app/dashboard/page.tsx` (modified — full campaign dashboard with onboarding redirect + CampaignManager)
- `components/dashboard/CampaignManager.tsx` (new — client component with campaign CRUD)
- `components/dashboard/CampaignManager.test.tsx` (new — 14 unit tests)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated — 2-2 status → review)
- `_bmad-output/implementation-artifacts/2-2-create-and-manage-campaigns-player-groups.md` (updated — status → review, tasks → [x])
