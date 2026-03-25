---
title: 'Campaign selector on new session + Player management UI overhaul'
type: 'feature'
created: '2026-03-25'
status: 'in-progress'
baseline_commit: 'b97b420'
context: []
---

# Campaign selector on new session + Player management UI overhaul

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** When starting a new combat session, the DM has no way to associate it with an existing campaign — `campaign_id` is always null. Additionally, the PlayerCharacterManager screen (`/app/campaigns/[id]`) has a poor UX: flat grid layout, cramped columns, not mobile-friendly, and uses hardcoded colors instead of theme tokens.

**Approach:** (A) Add a campaign picker step to `/app/session/new` that lists the DM's campaigns (+ "Quick Combat" option). Pass `campaign_id` through to `createEncounterWithCombatants`. If the DM picks a campaign, also auto-load its player characters into the combatant list. (B) Redesign PlayerCharacterManager as a card-based responsive layout using existing shadcn/ui components and theme tokens.

## Boundaries & Constraints

**Always:** Use existing i18n pattern (add keys to en.json + pt-BR.json). Use theme tokens (`bg-card`, `text-foreground`, etc.), not hardcoded hex colors. Preserve all existing CRUD functionality in PlayerCharacterManager. Follow **Action Color Semantics** from UX Design Specification: green (`bg-emerald-600`) for Add/Create buttons, red (`bg-red-900/20 text-red-400`) for Delete/Remove buttons, neutral (`bg-white/[0.06]`) for secondary actions. Never use red for constructive actions or gold for anything other than the single primary CTA per screen.

**Ask First:** Any new DB migrations or schema changes.

**Never:** Do not change `createEncounterWithCombatants` signature beyond adding optional `campaign_id`. Do not touch active combat flow. Do not add new npm dependencies.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| DM has campaigns | Opens /app/session/new | Sees campaign picker with campaigns + "Quick Combat" | N/A |
| DM has no campaigns | Opens /app/session/new | Sees only "Quick Combat" option, proceeds directly | N/A |
| DM picks campaign | Selects campaign from picker | campaign_id stored on session, players auto-loaded into combatants | N/A |
| DM picks Quick Combat | Clicks Quick Combat | campaign_id = null, normal flow (no players loaded) | N/A |
| Fetch campaigns fails | Network error | Show error message, allow retry | Toast/inline error |

</frozen-after-approval>

## Code Map

- `app/app/session/new/page.tsx` -- Entry point, will host CampaignPicker state before rendering CombatSessionClient
- `components/session/CombatSessionClient.tsx` -- Receives campaignId prop, passes to createEncounterWithCombatants
- `components/combat/EncounterSetup.tsx` -- Receives campaignId, auto-loads players when campaign selected
- `lib/supabase/encounter.ts` -- `createEncounterWithCombatants` accepts optional campaign_id
- `components/dashboard/PlayerCharacterManager.tsx` -- Full UI rewrite (card layout, theme tokens, responsive)
- `app/app/campaigns/[id]/page.tsx` -- Campaign page wrapper (minor styling alignment)
- `messages/en.json` + `messages/pt-BR.json` -- New i18n keys

## Tasks & Acceptance

**Execution:**
- [ ] `lib/supabase/encounter.ts` -- Add optional `campaignId` param to `createEncounterWithCombatants`, pass to session insert
- [ ] `app/app/session/new/page.tsx` -- Add campaign picker UI: fetch campaigns, show list + "Quick Combat", store selection in state, pass campaignId + initial players to CombatSessionClient
- [ ] `components/session/CombatSessionClient.tsx` -- Accept `campaignId` prop, pass to `createEncounterWithCombatants`
- [ ] `components/combat/EncounterSetup.tsx` -- Accept `campaignId` prop; if provided, auto-load campaign players on mount (reuse CampaignLoader logic)
- [ ] `components/dashboard/PlayerCharacterManager.tsx` -- Redesign: card-based layout, responsive grid, theme tokens, better empty state, visual stat badges. Button colors per Action Color Semantics: "Add Character" = green (`bg-emerald-600`), "Delete" = red subtle (`bg-red-900/20 text-red-400`), "Save/Edit" = neutral (`bg-white/[0.06]`)
- [ ] `messages/en.json` + `messages/pt-BR.json` -- Add keys for campaign picker (select_campaign, quick_combat, select_campaign_description, etc.)

**Acceptance Criteria:**
- Given DM has 2+ campaigns, when opening /app/session/new, then sees a campaign picker before encounter setup
- Given DM selects a campaign, when encounter setup loads, then campaign's player characters are pre-loaded as combatants and session is created with campaign_id
- Given DM clicks "Quick Combat", when encounter setup loads, then no players are pre-loaded and campaign_id is null
- Given DM visits /app/campaigns/[id], then sees a clean card-based UI with responsive layout for managing player characters

## Verification

**Commands:**
- `npm run build` -- expected: no TypeScript errors
- `npm run lint` -- expected: no lint errors

**Manual checks:**
- Open /app/session/new with campaigns -> campaign picker appears
- Select a campaign -> players loaded into encounter setup
- Open /app/campaigns/[id] -> redesigned card UI renders correctly on desktop and mobile
