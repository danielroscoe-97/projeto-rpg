# Story 2.1: First-Time DM Onboarding Flow

Status: done

## Story

As a **new DM**,
I want to be guided through creating my first campaign and encounter on first login,
so that I can start my first session quickly without confusion.

## Acceptance Criteria

1. **Given** a newly registered DM who has never created a campaign,
   **When** they land on `/app/dashboard`,
   **Then** they are immediately redirected to `/app/onboarding`.

2. **Given** the `/app/onboarding` page,
   **When** the DM follows the guided flow,
   **Then** they are prompted to: (a) name their first campaign, (b) add at least one player character (name, HP, AC; spell save DC optional), and (c) name and create their first encounter.

3. **Given** completion of all onboarding steps,
   **When** the DM finishes the flow,
   **Then** a session link in the format `/join/[token]` is generated and displayed.

4. **Given** completion of onboarding,
   **When** the session link is shown,
   **Then** the DM is redirected to `/app/dashboard` with their new campaign visible.

5. **Given** a DM who has already created at least one campaign,
   **When** they load `/app/dashboard`,
   **Then** they are NOT redirected to onboarding — they see the dashboard directly.

## Tasks / Subtasks

- [x] **Task 1: Add onboarding redirect to `/app/dashboard`** (AC: 1, 5)
  - [x] In `app/app/dashboard/page.tsx` (Server Component), use Supabase server client to query `campaigns` count for the current user
  - [x] If count is 0 → `redirect('/app/onboarding')` using `next/navigation`
  - [x] If count > 0 → render dashboard normally (no redirect)
  - [x] **NOTE:** `app/app/dashboard/page.tsx` did not exist — created minimal placeholder with auth check + campaign redirect + TODO for Story 1.4. Also created `app/app/layout.tsx` minimal auth guard (enhanced by parallel agent with full nav).

- [x] **Task 2: Create `app/app/onboarding/page.tsx`** (AC: 1, 2, 3, 4)
  - [x] Server Component — verifies user is authenticated (use Supabase server client), redirect to `/login` if not
  - [x] If user already has campaigns (safety check), redirect to `/app/dashboard`
  - [x] Render `<OnboardingWizard />` client component, pass the authenticated user's `id`

- [x] **Task 3: Create `components/dashboard/OnboardingWizard.tsx`** (AC: 2, 3, 4)
  - [x] 3-step wizard using local `useState` (no Zustand — not a combat feature)
  - [x] **Step 1 — Campaign Name:** text input for campaign name, validation (non-empty, max 50 chars), "Next" button
  - [x] **Step 2 — Add Players:** form to add player characters (name, max_hp, ac, spell_save_dc optional). At least 1 player required. "Add another" button. "Next" button
  - [x] **Step 3 — Confirm & Create:** summary of campaign + players, "Create & Get Session Link" button
  - [x] On Step 3 submit: execute DB operations (see Dev Notes), display the generated `/join/[token]` link with copy-to-clipboard button, then show "Go to Dashboard" button → `router.push('/app/dashboard')`
  - [x] shadcn/ui components: `Button`, `Input`, `Label`, `Card` — all from `components/ui/`

- [x] **Task 4: Write tests for `OnboardingWizard`** (AC: 1–5)
  - [x] File: `components/dashboard/OnboardingWizard.test.tsx`
  - [x] Test: renders Step 1 by default
  - [x] Test: "Next" disabled when campaign name is empty
  - [x] Test: advances from Step 1 → 2 → 3 with valid input
  - [x] Test: "Next" on Step 2 disabled if no players added
  - [x] Test: calls `supabase.from('campaigns').insert(...)` on final submit
  - [x] Mock: Supabase browser client via Jest mock

- [x] **Task 5: Update sprint-status.yaml** (after implementation complete)
  - [x] Changed `2-1-first-time-dm-onboarding-flow` from `ready-for-dev` → `in-progress` when starting, then → `review` on completion

## Dev Notes

### Route Structure — CRITICAL

The URL `/app/dashboard` and `/app/onboarding` map to these **exact file paths** in the Next.js App Router:

```
app/
└── app/                          ← literal nested "app" folder (not a route group)
    ├── layout.tsx                ← Auth guard (created by Story 1.4 in parallel)
    ├── dashboard/
    │   └── page.tsx              ← /app/dashboard (created by Story 1.4)
    └── onboarding/
        └── page.tsx              ← /app/onboarding (THIS STORY creates this)
```

**⚠️ Parallel Agent Dependency:** Story 1.4 (DM Registration & Login) is being implemented in parallel and owns `app/app/layout.tsx` and `app/app/dashboard/page.tsx`.

**Before starting implementation, check:**
```bash
ls app/app/
```
- If `app/app/layout.tsx` **exists**: it already has the auth guard. Do NOT duplicate it.
- If `app/app/layout.tsx` **does NOT exist**: create it as a minimal auth guard Server Component (see below), add a `// TODO Story 1.4: enhance this layout` comment.
- If `app/app/dashboard/page.tsx` **exists**: add the campaign count redirect to the EXISTING file (surgical edit).
- If `app/app/dashboard/page.tsx` **does NOT exist**: create a minimal placeholder that only does auth + campaign count check, add `// TODO Story 1.4: add full dashboard content`.

### Minimal Auth Guard Layout (create only if app/app/layout.tsx doesn't exist)

```tsx
// app/app/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <>{children}</>
}
```

### Dashboard Redirect Logic (add to app/app/dashboard/page.tsx)

```tsx
// Add near top of the Server Component, after auth check:
const { count } = await supabase
  .from('campaigns')
  .select('id', { count: 'exact', head: true })
  .eq('owner_id', user.id)

if (count === 0) {
  redirect('/app/onboarding')
}
```

### Onboarding Page (Server Component)

```tsx
// app/app/onboarding/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/dashboard/OnboardingWizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Safety: if user already has campaigns, skip onboarding
  const { count } = await supabase
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
  if (count && count > 0) redirect('/app/dashboard')

  return (
    <main className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      <OnboardingWizard userId={user.id} />
    </main>
  )
}
```

### DB Operations on Final Submit (Step 3)

All operations use the **browser Supabase client** (`createClient` from `@/lib/supabase/client`). Execute in order:

```ts
// 1. Create Campaign
const { data: campaign, error: campaignErr } = await supabase
  .from('campaigns')
  .insert({ owner_id: userId, name: campaignName })
  .select('id')
  .single()

// 2. Insert PlayerCharacters (one per added player)
const characters = players.map(p => ({
  campaign_id: campaign.id,
  name: p.name,
  max_hp: p.max_hp,
  current_hp: p.max_hp,   // current_hp = max_hp on creation
  ac: p.ac,
  spell_save_dc: p.spell_save_dc ?? null,
}))
await supabase.from('player_characters').insert(characters)

// 3. Create Session
const { data: session, error: sessionErr } = await supabase
  .from('sessions')
  .insert({
    campaign_id: campaign.id,
    owner_id: userId,
    name: `${campaignName} - Session 1`,
    ruleset_version: '2014',  // default; DM can change before combat (Story 3.2)
    is_active: true,
  })
  .select('id')
  .single()

// 4. Create Encounter
const { data: encounter } = await supabase
  .from('encounters')
  .insert({
    session_id: session.id,
    name: 'First Encounter',
    is_active: true,
  })
  .select('id')
  .single()

// 5. Generate Session Token
const token = crypto.randomUUID()
await supabase
  .from('session_tokens')
  .insert({
    session_id: session.id,
    token,
    is_active: true,
  })

// 6. Display: `/join/${token}`
```

### Type Imports

```ts
import type {
  Campaign,
  PlayerCharacter,
  Session,
  SessionToken,
} from '@/lib/types/database'
```

### Supabase Client Imports

- **Server Components (page.tsx):** `import { createClient } from '@/lib/supabase/server'`
- **Client Components (OnboardingWizard.tsx):** `import { createClient } from '@/lib/supabase/client'`

### Wizard State Shape (local React state — NOT Zustand)

```ts
type WizardStep = 1 | 2 | 3 | 'done'

interface PlayerInput {
  name: string
  max_hp: number
  ac: number
  spell_save_dc: number | null
}

interface WizardState {
  step: WizardStep
  campaignName: string
  players: PlayerInput[]
  sessionLink: string | null
  isSubmitting: boolean
  error: string | null
}
```

### Dark Theme & UI

- Background: `bg-[#1a1a2e]` on the page wrapper
- Surface/card: `bg-[#16213e]` on the wizard card
- Accent: `text-[#e94560]` for active step indicator
- All buttons use shadcn/ui `<Button>` from `@/components/ui/button`
- All inputs use shadcn/ui `<Input>` from `@/components/ui/input`
- All labels use shadcn/ui `<Label>` from `@/components/ui/label`
- Wrap the wizard in shadcn/ui `<Card>` from `@/components/ui/card`
- Max width: `max-w-lg w-full`

### Naming Conventions

- Component file: `OnboardingWizard.tsx` (PascalCase)
- Component export: `export function OnboardingWizard(...)` (named export, not default)
- Test file: `OnboardingWizard.test.tsx` (co-located)
- No CSS modules — Tailwind only
- Variables follow camelCase: `campaignName`, `playerList`, `sessionLink`

### Error Handling

- Wrap DB operations in try/catch
- On error: set `error` in local state, display below the submit button
- Use short human-readable messages: "Failed to create campaign. Please try again."
- Do NOT use Zustand error slice (this is a setup flow, not a combat feature)
- Do NOT show shadcn/ui Toast here (Toast is for combat sync failures)

### Anti-Patterns — NEVER DO

- Do NOT use `fetch()` to call Supabase — always use `@supabase/supabase-js` client
- Do NOT use `any` type — use types from `lib/types/database.ts`
- Do NOT put auth check logic in the client component — keep it in the Server Component
- Do NOT use inline styles — Tailwind only
- Do NOT manage wizard state in Zustand — local `useState` is correct here
- Do NOT call `supabase.auth.getUser()` in client components for initial protection — only server components
- Do NOT create a new Supabase API route for these operations — direct client calls + RLS is correct

### Session Link Note

The `/join/[token]` URL is displayed but the destination **player view page does NOT exist yet** (built in Epic 5, Story 5.1). This is intentional. Display the URL and let the DM copy it. It will become functional after Epic 5 is implemented. Add a small note in the UI: *"Share this link with players — they'll be able to join once the player view is ready."* (can be removed in Epic 5).

### Project Structure Notes

- `app/app/onboarding/page.tsx` — new file (this story)
- `app/app/dashboard/page.tsx` — surgical edit (add campaign count redirect, or create minimal placeholder)
- `app/app/layout.tsx` — create only if it doesn't exist (Story 1.4 owns this)
- `components/dashboard/OnboardingWizard.tsx` — new file (this story)
- `components/dashboard/OnboardingWizard.test.tsx` — new file (this story)
- `lib/types/database.ts` — DO NOT MODIFY (owned by Story 1.2)

### References

- Acceptance Criteria: [epics.md — Story 2.1](_bmad-output/planning-artifacts/epics.md#story-21-first-time-dm-onboarding-flow)
- Route structure: [architecture.md — Project Directory Structure](_bmad-output/planning-artifacts/architecture.md#complete-project-directory-structure)
- DB types: [lib/types/database.ts](lib/types/database.ts)
- Auth pattern: [architecture.md — Authentication & Security](_bmad-output/planning-artifacts/architecture.md#authentication--security)
- Naming conventions: [architecture.md — Naming Patterns](_bmad-output/planning-artifacts/architecture.md#naming-patterns)
- Dark theme tokens: [ux-design-specification.md — Color System](_bmad-output/planning-artifacts/ux-design-specification.md)
- Supabase server client: [lib/supabase/server.ts](lib/supabase/server.ts)
- Supabase browser client: [lib/supabase/client.ts](lib/supabase/client.ts)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- TypeScript errors in `lib/srd/srd-search.ts` and `components/session/EncounterBuilder.tsx` are pre-existing from parallel agent (Stories 1.3 and 3.1), not introduced by this story.
- Parallel agent enhanced `app/app/layout.tsx` with full nav (with LogoutButton) — kept as-is.
- `app/app/dashboard/page.tsx` created as minimal placeholder with TODO for Story 1.4.

### Completion Notes List

- Created `app/app/` route group with minimal auth guard layout (Story 1.4 TODO for nav enhancement already applied by parallel agent)
- `app/app/dashboard/page.tsx`: auth check + campaign count → redirects new DMs to /app/onboarding (AC 1, 5 satisfied)
- `app/app/onboarding/page.tsx`: Server Component with auth + safety redirect for returning DMs (AC 1, 4 satisfied)
- `components/dashboard/OnboardingWizard.tsx`: Full 3-step wizard — Campaign name → Players → Confirm+Submit. Executes 5 sequential Supabase inserts (campaign, player_characters, session, encounter, session_token). Displays /join/[token] link on success with copy button (AC 2, 3 satisfied)
- All DB ops use browser Supabase client; no Zustand; error state local to component
- 15 unit tests covering: step rendering, validation, navigation, DB calls, error states, dashboard redirect
- 33/33 tests pass (15 new + 18 pre-existing); zero regressions

### File List

- `app/app/layout.tsx` (new — minimal auth guard, enhanced by parallel agent with full nav)
- `app/app/dashboard/page.tsx` (new — auth + campaign count redirect)
- `app/app/onboarding/page.tsx` (new — Server Component, renders OnboardingWizard)
- `components/dashboard/OnboardingWizard.tsx` (replaced stub — full wizard implementation)
- `components/dashboard/OnboardingWizard.test.tsx` (new — 15 unit tests)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated — story status → review)
