---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-03-24'
inputDocuments: ["_bmad-output/planning-artifacts/prd.md", "_bmad-output/planning-artifacts/architecture.md", "_bmad-output/planning-artifacts/product-brief-projeto-rpg-2026-03-23.md"]
---

# projeto-rpg - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for projeto-rpg, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: DM can create a new encounter by searching and adding monsters from the SRD database
- FR2: DM can add player characters to an encounter by entering name, HP, AC, and spell save DC
- FR3: DM can load a saved player group into a new encounter without re-entering individual player data
- FR4: DM can select a ruleset version (2014 or 2024) per session before combat begins
- FR5: DM can save the current encounter state and resume it in a future session
- FR6: DM can generate a shareable session link from within an active encounter that players use to join the player view
- FR7: DM can enter initiative values for all combatants and have them automatically sorted in descending order
- FR8: DM can manually resolve initiative ties by reordering combatants using drag-and-drop (mouse and touch) or manual position assignment
- FR9: DM can advance the turn to the next combatant in initiative order
- FR10: DM can adjust current HP for any combatant (damage or healing) at any point during combat
- FR11: DM can mark a combatant as defeated and remove them from the active initiative order
- FR12: DM can add or remove combatants from an active encounter mid-combat
- FR13: DM can edit any combatant's stats (name, HP max, AC, DC) during combat
- FR14: DM can apply named conditions to any combatant via a dropdown selector (Blinded, Charmed, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious)
- FR15: DM can switch a monster's ruleset version (2014 ↔ 2024) for an individual combatant mid-combat without affecting other combatants or resetting encounter state
- FR16: DM and players can search the SRD monster database by name, CR, and creature type
- FR17: DM can expand a monster's full stat block inline within the combat tracker without navigating away
- FR18: DM and players can search the SRD spell list by name, class, level, and school
- FR19: DM and players can view a spell's full description in a modal overlay without leaving the current view
- FR20: All SRD content (monsters and spells) is available in both 2014 and 2024 versions, clearly labeled by version
- FR21: DM and players can look up condition rules (Stunned, Blinded, etc.) with full rules text accessible in-session
- FR22: Users can create an account with email and password
- FR23: Users can log in and log out of their account
- FR24: DM can save a named player group (campaign) with all player character stats for reuse across sessions
- FR25: DM can create, edit, and delete saved player groups
- FR26: Users can delete their account and all associated data permanently
- FR27: Players can join a session view using a shared link without creating an account
- FR28: Player view displays the current initiative order in real time, reflecting DM changes as they happen
- FR29: Player view displays each combatant's current HP, updating in real time when the DM makes changes
- FR30: Player view indicates whose turn it is currently, updating automatically when the DM advances the turn
- FR31: Player view provides access to the spell oracle (search + modal) without affecting the DM's view
- FR32: Session state (initiative order, HP, conditions) is preserved and restored automatically if a connection is interrupted and re-established
- FR33: Admin can view key usage metrics: new registrations, day-1 activation rate, week-2 retention rate, and players per DM
- FR34: Admin can edit SRD monster and spell data (correct errors, update content) and publish changes that propagate to all active sessions
- FR35: Admin can view and manage user accounts (for support purposes)
- FR36: The application displays the required CC-BY-4.0 attribution statement for SRD 5.1 and SRD 5.2 content on a visible, persistent page
- FR37: Users can access a Privacy Policy that describes data collection, retention, and their rights under LGPD/GDPR
- FR38: Session state persists server-side after the DM closes the browser; DM can reopen and resume the session until it is explicitly ended
- FR39: Active conditions on each combatant are visible at a glance in the combat tracker view; DM and players can see all conditions currently applied without additional navigation
- FR40: A new DM is guided through creating their first encounter and generating a session link on first login
- FR41: DM can set a temporary HP value for any combatant; temporary HP absorbs incoming damage before current HP is reduced, and is tracked separately from current and maximum HP

### NonFunctional Requirements

- NFR1: First Contentful Paint (FCP) ≤1.5s on desktop (standard broadband)
- NFR2: Time to Interactive (TTI) ≤3s on desktop — app must be usable before the first initiative roll
- NFR3: WebSocket sync latency ≤500ms — DM action visible on player view within half a second
- NFR4: Spell and monster modal open time ≤300ms — mid-combat lookup must feel instant
- NFR5: Session setup (encounter creation + player group load) completable in ≤3 minutes by a first-time DM
- NFR6: SRD content (monsters, spells) served from local cache after first load — oracle functions even if server connection is degraded
- NFR7: Session state (initiative, HP, conditions) is never lost due to a browser refresh, tab close, or network interruption — state is persisted server-side and restored on reconnect
- NFR8: Optimistic UI — all DM interactions (HP changes, turn advances, condition toggles) reflect immediately in the UI without waiting for server confirmation; server sync happens in background
- NFR9: WebSocket connection degradation fallback — if WebSocket fails, player view falls back to polling (≤2s interval) to maintain sync
- NFR10: Target uptime ≥99.5% (monthly) — session-night downtime is unacceptable; scheduled maintenance only during low-traffic windows (weekday daytime)
- NFR11: All data transmitted over HTTPS — no HTTP fallback
- NFR12: Passwords stored as bcrypt or Argon2 hashes — never plaintext
- NFR13: JWT access tokens expire after 1 hour; refresh tokens expire after 30 days of inactivity
- NFR14: Auth endpoints rate-limited to prevent brute-force attacks (max 10 attempts per 15 minutes per IP)
- NFR15: Player session tokens are scoped to a single session and expire when the session is ended by the DM
- NFR16: All user-generated inputs (player names, custom NPC data) are sanitized server-side before persistence
- NFR17: Architecture supports horizontal scaling — no single-server state dependencies; session state stored in database, not in-process
- NFR18: System handles ≥1,000 concurrent active sessions (DM + players) without performance degradation — validated before public launch
- NFR19: SRD content delivery via CDN — static content (monster/spell JSON) served at edge, not from origin server
- NFR20: WCAG 2.1 AA compliance on all user-facing routes
- NFR21: No UI element uses color as the sole indicator of state — all status indicators (current turn, conditions, HP threshold) use icons or text labels in addition to color
- NFR22: Dark mode is the default theme — background color #1a1a2e (dark gray, not pure black) to reduce halation for users with astigmatism
- NFR23: Minimum body text size 16px on all breakpoints
- NFR24: All interactive elements on mobile have minimum tap target size 44×44px (Apple HIG standard)
- NFR25: DM view is fully keyboard-navigable — turn advance, HP edit, condition apply, and stat block open accessible without mouse
- NFR26: SRD content versioning is lossless — adding 2024 content does not overwrite or modify existing 2014 content
- NFR27: User data (player profiles, saved groups) survives Supabase infrastructure updates without migration loss
- NFR28: Admin content edits propagate to all active sessions within 60 seconds of publish

### Additional Requirements

- **Starter Template**: `npx create-next-app@latest projeto-rpg --template with-supabase` — must be Epic 1, Story 1
- **Post-init packages**: @supabase/supabase-js@^2.99, fuse.js, @dnd-kit/core + @dnd-kit/sortable, zustand, idb — install immediately after project init
- **Node.js 20+** required (Supabase JS v2.79+ drops Node 18 support)
- **Database schema**: 10 tables (User, Campaign, PlayerCharacter, Session, Encounter, Combatant, Monster, Spell, ConditionType, SessionToken) with 5 migrations + RLS policies
- **SRD data pipeline**: Seed from 5e-database JSON via SQL migration → build-time script exports to /public/srd/*.json → Vercel CDN serves at edge → client caches in IndexedDB via idb
- **Three-role auth model**: DM (Supabase Auth email/password, cookie-based), Player (Supabase Anonymous Auth via /join/[token], path-based token), Admin (is_admin boolean flag + RLS)
- **RLS policy model**: 3 policy types per protected table — DM (owner), Player (session token), Admin (is_admin flag)
- **Dual-write realtime pattern**: All combat mutations follow: Zustand store update (optimistic) → channel.send() (instant broadcast) → supabase.update() (async persist) → on error: rollback + Toast
- **Realtime channel design**: One channel per session `session:{id}`, DM broadcasts, players subscribe read-only
- **Content propagation channel**: Global `content:update` Realtime channel for admin content edits (NFR28)
- **Polling fallback**: If Realtime drops >3s, player view polls /api/session/[id]/state every 2s (NFR9)
- **Client-side SRD search**: Fuse.js index on pre-loaded JSON, singleton module scope, no re-indexing per query
- **Testing framework**: Jest + React Testing Library (not in starter, add manually)
- **Monitoring**: Sentry free tier (error tracking) + Vercel Analytics (Web Vitals) + Supabase Dashboard
- **Validation**: Zod schemas for all admin API route inputs; TypeScript types generated from Supabase schema via `supabase gen types`
- **Environments**: Local (supabase start + next dev) + Production (Supabase cloud + Vercel) — no staging for V1
- **CI/CD**: GitHub push → Vercel auto-deploy; Supabase migrations run manually via CLI before deploy
- **Data convention**: snake_case throughout data layer (DB → Supabase client → Zustand stores → component props)
- **Event naming**: `domain:action` in snake_case — combat:hp_update, combat:turn_advance, etc.
- **Error handling**: Global Zustand error slice + shadcn/ui Toast; retry once on failed DB write, no retry on failed broadcast

### UX Design Requirements

Source: `ux-design-specification.md` (complete, 14 steps)

- UX-DR1: DM view uses CombatantRow (Collapsible) with three-tier information hierarchy: zero-tap (name, HP bar, conditions), one-tap (stat block, AC, DC), search-only (oracle)
- UX-DR2: Oracle search uses Command palette (Cmd+K / Ctrl+K) with Fuse.js instant results — accessible from anywhere in DM combat view
- UX-DR3: SpellModal (Dialog) opens as overlay with dimmed backdrop; combat view remains visible behind
- UX-DR4: HP displayed as horizontal progress bar with green→yellow→red gradient + text values; temp HP uses #9f7aea overlay
- UX-DR5: Condition badges as colored pills with text labels (never color-only); 13 conditions with defined palette
- UX-DR6: Color system: theme tokens in `globals.css` — background `#13131e`, surface `bg-card`, accent gold `#D4A853`, HP states (green/amber/red), condition palette. **Action Color Semantics**: gold=primary CTA (1/screen), green=constructive, red=destructive, purple=magical, neutral=chrome. See UX Design Specification for full rules. ~~Old `#e94560` pink-red accent is deprecated.~~
- UX-DR7: Typography: Plus Jakarta Sans (primary) + Cinzel (display headings) + JetBrains Mono (numbers), 7-step scale from 12px to 30px, 16px minimum body (NFR23)
- UX-DR8: DM view keyboard shortcuts: Cmd+K (oracle), Space (next turn), ↑/↓ (navigate rows), Enter (expand), H (HP adjust), C (conditions), Escape (close)
- UX-DR9: Player view is purpose-built mobile layout: own character card prominent at top, initiative board below, floating oracle button
- UX-DR10: Monster HP is DM-only — players see combatant names and initiative position but NOT monster HP
- UX-DR11: No confirmation dialogs during combat — actions are instant and reversible. Confirmations only for destructive non-combat actions (delete campaign, end session)
- UX-DR12: Loading states: no spinners for combat actions (optimistic UI); skeleton loader for initial session join (<1s); oracle search instant
- UX-DR13: Error handling: Toast for sync failures (non-blocking, auto-retry once); SyncIndicator in header (green/amber/red); oracle works offline from cache
- UX-DR14: Animations: 150–200ms transitions for HP bar, turn indicator, modal open/close. Respect `prefers-reduced-motion`
- UX-DR15: ARIA implementation: list/listitem for initiative, aria-current for active turn, progressbar for HP, combobox for oracle, dialog for modals

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 3 | Encounter creation with monster search |
| FR2 | Epic 2 | Add player characters to encounter |
| FR3 | Epic 2 | Load saved player group |
| FR4 | Epic 3 | Select ruleset version per session |
| FR5 | Epic 3 | Save/resume encounter state |
| FR6 | Epic 5 | Generate shareable session link |
| FR7 | Epic 3 | Initiative entry + auto-sort |
| FR8 | Epic 3 | Tiebreaker drag-and-drop |
| FR9 | Epic 3 | Advance turn |
| FR10 | Epic 3 | Adjust HP (damage/heal) |
| FR11 | Epic 3 | Mark defeated, remove from initiative |
| FR12 | Epic 3 | Add/remove combatants mid-combat |
| FR13 | Epic 3 | Edit combatant stats mid-combat |
| FR14 | Epic 3 | Apply conditions via dropdown |
| FR15 | Epic 3 | Switch monster ruleset version mid-combat |
| FR16 | Epic 4 | Monster search (name, CR, type) |
| FR17 | Epic 4 | Inline monster stat block expansion |
| FR18 | Epic 4 | Spell search (name, class, level, school) |
| FR19 | Epic 4 | Spell description modal overlay |
| FR20 | Epic 4 | Dual-version SRD content labeling |
| FR21 | Epic 4 | Condition rules lookup |
| FR22 | Epic 1 | Account creation (email + password) |
| FR23 | Epic 1 | Login / logout |
| FR24 | Epic 2 | Save named player group (campaign) |
| FR25 | Epic 2 | CRUD saved player groups |
| FR26 | Epic 2 | Account deletion + data erasure |
| FR27 | Epic 5 | Player join via shared link (no account) |
| FR28 | Epic 5 | Real-time initiative display (player view) |
| FR29 | Epic 5 | Real-time HP display (player view) |
| FR30 | Epic 5 | Real-time turn indicator (player view) |
| FR31 | Epic 5 | Player spell oracle access |
| FR32 | Epic 5 | Session state reconnect/restore |
| FR33 | Epic 6 | Admin usage metrics dashboard |
| FR34 | Epic 6 | Admin SRD content editing + propagation |
| FR35 | Epic 6 | Admin user management |
| FR36 | Epic 1 | CC-BY-4.0 attribution page |
| FR37 | Epic 1 | Privacy policy page |
| FR38 | Epic 5 | Server-side session persistence after browser close |
| FR39 | Epic 3 | Condition badges visible at a glance |
| FR40 | Epic 2 | First-time DM onboarding flow |
| FR41 | Epic 3 | Temporary HP tracking |

## Epic List

### Epic 1: Project Foundation & DM Authentication
A DM can register, log in, and access a protected dashboard. The project is initialized with all infrastructure (database, auth, SRD data pipeline) ready for feature development.
**FRs covered:** FR22, FR23, FR36, FR37

### Epic 2: Campaign & Player Group Management
A DM can create named campaigns, add player characters with stats, and manage saved groups — so session setup takes seconds, not minutes.
**FRs covered:** FR2, FR3, FR24, FR25, FR26, FR40

### Epic 3: Combat Tracker Core
A DM can create an encounter, run a full combat (initiative, HP, conditions, temp HP, tiebreakers), and save/resume encounters — the core product loop.
**FRs covered:** FR1, FR4, FR5, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR39, FR41

### Epic 4: Rules Oracle (Spells, Monsters, Conditions)
DM and players can search and view monster stat blocks, spell descriptions, and condition rules inline/modal — without leaving the combat view.
**FRs covered:** FR16, FR17, FR18, FR19, FR20, FR21

### Epic 5: Real-Time Player View & Session Sharing
DM generates a session link; players join on mobile with zero login, see live initiative/HP/turns, and access the spell oracle — the viral loop activator.
**FRs covered:** FR6, FR27, FR28, FR29, FR30, FR31, FR32, FR38

### Epic 6: Admin Panel & Content Management
Admin can view usage metrics, edit SRD content (fix errors), and manage users — operational control for launch and beyond.
**FRs covered:** FR33, FR34, FR35

### Epic 7: Performance, Accessibility & Production Hardening
The app meets all performance targets, accessibility standards, and reliability guarantees — ready for real session nights.
**FRs covered:** None (NFR-driven)
**NFRs addressed:** NFR1–NFR28 (cross-cutting optimization, audit, and validation work)

## Epic 1: Project Foundation & DM Authentication

A DM can register, log in, and access a protected dashboard. The project is initialized with all infrastructure (database, auth, SRD data pipeline) ready for feature development.

### Story 1.1: Initialize Project with Starter Template

As a **developer**,
I want the project scaffolded with the official Supabase + Next.js starter template and all required dependencies installed,
So that all subsequent development has a consistent, working foundation.

**Acceptance Criteria:**

**Given** a clean working directory
**When** `npx create-next-app@latest projeto-rpg --template with-supabase` is executed
**Then** the project initializes with Next.js 16 App Router, TypeScript strict, Tailwind CSS, and shadcn/ui
**And** the following packages are installed: @supabase/supabase-js@^2.99, fuse.js, @dnd-kit/core, @dnd-kit/sortable, zustand, idb
**And** Jest + React Testing Library are configured
**And** Sentry client and server configs are scaffolded
**And** the project builds successfully with `npm run build`
**And** Node.js 20+ is documented as the minimum runtime requirement

### Story 1.2: Database Schema & RLS Policies

As a **developer**,
I want all database tables, enums, and Row Level Security policies created via Supabase migrations,
So that the data layer is ready for feature development with proper access control.

**Acceptance Criteria:**

**Given** a running Supabase local instance
**When** all migrations (001–005) are applied
**Then** 10 tables exist: users, campaigns, player_characters, sessions, encounters, combatants, monsters, spells, condition_types, session_tokens
**And** `ruleset_version` ENUM('2014','2024') exists on monsters and spells tables
**And** combatants table includes: current_hp, max_hp, temp_hp, ac, spell_save_dc, initiative, conditions (TEXT[]), is_defeated
**And** RLS policies enforce: DM access via `auth.uid() = owner_id`, Player access via session_tokens, Admin access via `is_admin = true`
**And** `supabase gen types` produces TypeScript types without errors
**And** foreign key relationships are correct (campaign → player_characters, session → encounter → combatants, etc.)

### Story 1.3: SRD Content Seeding & Static Bundle Generation

As a **developer**,
I want SRD 5.1 and 5.2 monster and spell data seeded into the database and exported as static JSON bundles,
So that the rules oracle has complete, versioned content available via CDN and IndexedDB.

**Acceptance Criteria:**

**Given** the database schema from Story 1.2 is applied
**When** `seed.sql` is executed
**Then** all SRD 5.1 (2014) monsters and spells are inserted with `ruleset_version = '2014'`
**And** all SRD 5.2 (2024) monsters and spells are inserted with `ruleset_version = '2024'`
**And** all 13 standard conditions are seeded into condition_types
**And** the `scripts/generate-srd-bundles.ts` script produces: monsters-2014.json, monsters-2024.json, spells-2014.json, spells-2024.json, conditions.json in `/public/srd/`
**And** each JSON file is valid and contains the expected entity count
**And** 2014 and 2024 content coexist without overwriting (NFR26)

### Story 1.4: DM Registration & Login

As a **DM**,
I want to create an account with email and password, log in, and log out,
So that my campaigns and encounters are saved to my account.

**Acceptance Criteria:**

**Given** the auth pages at `/signup` and `/login`
**When** a new user submits a valid email and password
**Then** an account is created via Supabase Auth and the user is redirected to `/app/dashboard`
**And** passwords are hashed (never stored in plaintext) (NFR12)

**Given** a registered user
**When** they log in with correct credentials
**Then** they are authenticated and redirected to `/app/dashboard`

**Given** a logged-in user
**When** they click logout
**Then** the session is destroyed and they are redirected to the landing page

**Given** an unauthenticated user
**When** they attempt to access `/app/*` routes
**Then** they are redirected to `/login`

**Given** auth endpoints
**When** more than 10 login attempts are made from the same IP in 15 minutes
**Then** subsequent attempts are rate-limited (NFR14)

### Story 1.5: Legal Pages (Attribution & Privacy Policy)

As a **user**,
I want to view the CC-BY-4.0 attribution and Privacy Policy pages,
So that I understand the content licensing and my data rights.

**Acceptance Criteria:**

**Given** the marketing layout
**When** a user navigates to `/legal/attribution`
**Then** the CC-BY-4.0 attribution statement is displayed: "This product uses the System Reference Document 5.1 and 5.2, available under the Creative Commons Attribution 4.0 International License." (FR36)

**Given** the marketing layout
**When** a user navigates to `/legal/privacy`
**Then** a Privacy Policy is displayed describing data collection, retention, and user rights under LGPD/GDPR (FR37)
**And** both pages are accessible without authentication
**And** both pages are server-side rendered for SEO

## Epic 2: Campaign & Player Group Management

A DM can create named campaigns, add player characters with stats, and manage saved groups — so session setup takes seconds, not minutes.

### Story 2.1: First-Time DM Onboarding Flow

As a **new DM**,
I want to be guided through creating my first campaign and encounter on first login,
So that I can start my first session quickly without confusion.

**Acceptance Criteria:**

**Given** a newly registered DM who has never created a campaign
**When** they are redirected to `/app/dashboard` after login
**Then** they are redirected to `/app/onboarding` instead

**Given** the onboarding page
**When** the DM follows the guided flow
**Then** they are prompted to name their first campaign, add at least one player character (name, HP, AC, spell save DC), and create their first encounter
**And** a session link is generated at the end of the flow
**And** the DM is redirected to the dashboard with their new campaign visible

**Given** a DM who has already completed onboarding
**When** they log in again
**Then** they go directly to `/app/dashboard` (onboarding is not shown again)

### Story 2.2: Create & Manage Campaigns (Player Groups)

As a **DM**,
I want to create, rename, and delete named campaigns (player groups),
So that I can organize my different play groups and reuse them across sessions.

**Acceptance Criteria:**

**Given** the DM dashboard at `/app/dashboard`
**When** the DM clicks "New Campaign"
**Then** they can enter a campaign name and save it
**And** the new campaign appears in their campaign list

**Given** an existing campaign
**When** the DM selects "Edit" on the campaign
**Then** they can rename the campaign
**And** the updated name is persisted

**Given** an existing campaign
**When** the DM selects "Delete" on the campaign
**Then** a confirmation prompt is shown
**And** upon confirmation, the campaign and all associated player characters are permanently deleted

**Given** a DM with multiple campaigns
**When** they view the dashboard
**Then** all their campaigns are listed with player count per campaign

### Story 2.3: Add & Edit Player Characters in a Campaign

As a **DM**,
I want to add player characters to a campaign with name, HP, AC, and spell save DC, and edit them later,
So that I never have to re-enter player data between sessions.

**Acceptance Criteria:**

**Given** an existing campaign
**When** the DM clicks "Add Player"
**Then** they can enter: character name, max HP, AC, and spell save DC
**And** the player character is saved to the campaign

**Given** an existing player character
**When** the DM clicks "Edit" on the character
**Then** they can modify any field (name, HP, AC, DC)
**And** changes are persisted immediately

**Given** an existing player character
**When** the DM clicks "Remove" on the character
**Then** the character is removed from the campaign after confirmation

**Given** a campaign with player characters
**When** the DM views the campaign
**Then** all characters are listed with their stats (name, HP, AC, DC)

### Story 2.4: Load Saved Player Group into Encounter

As a **DM**,
I want to load an entire saved campaign (player group) into a new encounter with one action,
So that session setup takes seconds instead of manually re-entering each player.

**Acceptance Criteria:**

**Given** the encounter creation flow (from Epic 3)
**When** the DM selects "Load Campaign"
**Then** a list of their saved campaigns is displayed

**Given** a selected campaign
**When** the DM confirms the selection
**Then** all player characters from that campaign are added to the encounter with their saved stats (name, HP as current/max, AC, DC)
**And** the DM can still manually add or remove individual characters after loading

### Story 2.5: Account Deletion & Data Erasure

As a **user**,
I want to permanently delete my account and all associated data,
So that my right to data erasure under LGPD/GDPR is respected.

**Acceptance Criteria:**

**Given** a logged-in user on the account settings page
**When** they select "Delete Account"
**Then** a confirmation prompt warns that all data (campaigns, player characters, encounters, sessions) will be permanently deleted

**Given** the user confirms deletion
**When** the deletion is processed
**Then** the user's account, all campaigns, player characters, sessions, encounters, and combatant data are permanently removed from the database
**And** the user is logged out and redirected to the landing page
**And** the user cannot log in with the same credentials afterward

## Epic 3: Combat Tracker Core

A DM can create an encounter, run a full combat (initiative, HP, conditions, temp HP, tiebreakers), and save/resume encounters — the core product loop.

### Story 3.1: Create Encounter & Add Monsters

As a **DM**,
I want to create a new encounter by searching and adding monsters from the SRD database,
So that I can set up combat before the session starts.

**Acceptance Criteria:**

**Given** the DM is on the dashboard or session page
**When** they click "New Encounter"
**Then** the encounter builder opens

**Given** the encounter builder
**When** the DM types a monster name in the search field
**Then** matching SRD monsters are displayed (filtered by the session's selected ruleset version)
**And** each result shows name, CR, and creature type

**Given** search results
**When** the DM selects a monster
**Then** a combatant is added to the encounter with the monster's stats (HP, AC, etc.)
**And** the DM can add multiple instances of the same monster (auto-numbered: "Goblin 1", "Goblin 2")

**Given** the encounter builder
**When** the DM manually adds a custom NPC/combatant
**Then** they can enter name, HP, AC, and spell save DC manually (FR2)

### Story 3.2: Ruleset Version Selection per Session

As a **DM**,
I want to select a ruleset version (2014 or 2024) per session before combat begins,
So that all monster and spell lookups default to the correct version for my group.

**Acceptance Criteria:**

**Given** the encounter builder or session setup
**When** the DM selects a ruleset version (2014 or 2024)
**Then** the selection is persisted on the session record
**And** all subsequent monster/spell searches default to the selected version

**Given** a session with a selected ruleset version
**When** the DM searches for monsters
**Then** results are filtered to the selected version by default
**And** the version is clearly labeled on each result (FR20)

### Story 3.3: Initiative Entry, Sorting & Tiebreaker Resolution

As a **DM**,
I want to enter initiative values for all combatants, have them auto-sorted, and manually resolve ties,
So that combat turn order is established quickly and accurately.

**Acceptance Criteria:**

**Given** an encounter with combatants added
**When** the DM enters initiative values for each combatant
**Then** combatants are automatically sorted in descending initiative order

**Given** two or more combatants with the same initiative value
**When** the sort completes
**Then** tied combatants are visually indicated
**And** the DM can drag-and-drop (mouse and touch) to reorder them manually (FR8)
**And** the reordered positions persist for the duration of the encounter

**Given** the initiative list
**When** the DM clicks "Start Combat"
**Then** the first combatant in initiative order is marked as the active turn

### Story 3.4: Turn Advancement & Combat Flow

As a **DM**,
I want to advance turns through the initiative order,
So that combat flows smoothly without manual tracking.

**Acceptance Criteria:**

**Given** an active combat with a current turn
**When** the DM clicks "Next Turn"
**Then** the active turn indicator moves to the next combatant in initiative order
**And** defeated combatants are skipped automatically

**Given** the last combatant in initiative order
**When** the DM advances the turn
**Then** the round counter increments and the turn returns to the first combatant

**Given** the DM view
**When** a turn is active
**Then** the current combatant is visually highlighted
**And** the round number is displayed

### Story 3.5: HP Management (Damage, Healing & Temporary HP)

As a **DM**,
I want to adjust HP for any combatant (damage, healing, and temporary HP),
So that I can track health status accurately throughout combat.

**Acceptance Criteria:**

**Given** any combatant in the initiative tracker
**When** the DM applies damage
**Then** current HP is reduced by the damage amount (minimum 0)

**Given** any combatant in the initiative tracker
**When** the DM applies healing
**Then** current HP is increased (cannot exceed max HP)

**Given** any combatant
**When** the DM sets temporary HP
**Then** temp HP is tracked separately from current/max HP (FR41)
**And** temp HP is visually distinct in the UI

**Given** a combatant with temporary HP
**When** damage is applied
**Then** temp HP absorbs damage first; remaining damage reduces current HP
**And** temp HP cannot be healed — only replaced with a higher value

**Given** HP changes
**When** the DM submits the change
**Then** the UI updates immediately (optimistic, NFR8)

### Story 3.6: Conditions — Apply, Display & Remove

As a **DM**,
I want to apply, view, and remove conditions on any combatant,
So that status effects are tracked visually and never forgotten.

**Acceptance Criteria:**

**Given** any combatant in the tracker
**When** the DM clicks the condition control
**Then** a dropdown displays all 13 standard conditions: Blinded, Charmed, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious (FR14)

**Given** a selected condition
**When** the DM applies it
**Then** the condition is added to the combatant
**And** a condition badge is immediately visible on the combatant card (FR39)

**Given** a combatant with active conditions
**When** viewing the combat tracker
**Then** all active conditions are visible at a glance without additional navigation (FR39)

**Given** a combatant with a condition
**When** the DM removes the condition
**Then** the condition badge disappears immediately

### Story 3.7: Defeat, Remove & Add Combatants Mid-Combat

As a **DM**,
I want to mark combatants as defeated, remove them from initiative, and add new combatants mid-combat,
So that I can handle dynamic combat scenarios (reinforcements, fleeing enemies).

**Acceptance Criteria:**

**Given** any combatant in the tracker
**When** the DM marks them as defeated
**Then** the combatant is visually marked as defeated (e.g., grayed out)
**And** they are skipped during turn advancement (FR11)

**Given** an active encounter
**When** the DM adds a new combatant mid-combat
**Then** they can search for a monster or enter custom stats
**And** the new combatant is inserted into the initiative order at the correct position based on their initiative value (FR12)

**Given** an active encounter
**When** the DM removes a combatant
**Then** the combatant is removed from the initiative order entirely
**And** if the removed combatant was the active turn, the turn advances to the next combatant

### Story 3.8: Edit Combatant Stats Mid-Combat

As a **DM**,
I want to edit any combatant's stats (name, max HP, AC, spell save DC) during combat,
So that I can correct mistakes or apply mid-session adjustments.

**Acceptance Criteria:**

**Given** any combatant in the tracker
**When** the DM selects "Edit"
**Then** they can modify: name, max HP, AC, and spell save DC (FR13)
**And** changes are saved immediately

**Given** a combatant whose max HP is edited
**When** max HP is reduced below current HP
**Then** current HP is capped at the new max HP

### Story 3.9: In-Combat Ruleset Version Switching

As a **DM**,
I want to switch a monster's ruleset version (2014 ↔ 2024) mid-combat per combatant,
So that I can correct version mistakes without restarting the encounter.

**Acceptance Criteria:**

**Given** a monster combatant in the tracker
**When** the DM clicks the version toggle
**Then** the combatant's linked stat block switches between 2014 and 2024 versions (FR15)
**And** the version label updates immediately

**Given** a version switch on one combatant
**When** the switch is applied
**Then** no other combatants are affected
**And** initiative order, HP, and conditions are preserved

### Story 3.10: Save & Resume Encounter

As a **DM**,
I want to save the current encounter state and resume it in a future session,
So that multi-session combats don't lose progress.

**Acceptance Criteria:**

**Given** an active encounter
**When** the DM navigates away or closes the browser
**Then** the encounter state (initiative order, HP, conditions, turn, round) is persisted server-side (FR38)

**Given** the DM dashboard
**When** the DM selects a previously saved encounter
**Then** the encounter resumes with full state restored: initiative order, all combatant HP/conditions, current turn, round number (FR5)

**Given** a saved encounter
**When** the DM explicitly ends the encounter
**Then** it is marked as completed and moved to encounter history

## Epic 4: Rules Oracle (Spells, Monsters, Conditions)

DM and players can search and view monster stat blocks, spell descriptions, and condition rules inline/modal — without leaving the combat view.

### Story 4.1: SRD Client-Side Search Index & IndexedDB Cache

As a **DM or player**,
I want SRD content loaded and cached locally with a fast search index,
So that spell and monster lookups are instant and work even if the connection degrades.

**Acceptance Criteria:**

**Given** a user loads the app for the first time
**When** the SRD loader initializes
**Then** monster and spell JSON bundles are fetched from `/public/srd/*.json`
**And** the data is stored in IndexedDB via idb for offline access (NFR6)
**And** a Fuse.js search index is built in module scope (singleton)

**Given** the SRD data is already cached in IndexedDB
**When** the user loads the app again
**Then** the index is built from the cached data (no network request)

**Given** the search index is initialized
**When** a search query is executed
**Then** results are returned in <5ms (no server round-trip)

### Story 4.2: Monster Search & Inline Stat Block Expansion

As a **DM**,
I want to search the SRD monster database and expand full stat blocks inline within the combat tracker,
So that I can reference monster abilities without leaving the combat view.

**Acceptance Criteria:**

**Given** the combat tracker or oracle view
**When** the DM types in the monster search field
**Then** results are filtered by name, CR, and creature type in real time (FR16)
**And** results show monster name, CR, type, and ruleset version badge (FR20)

**Given** a monster in the combat tracker's initiative list
**When** the DM clicks/taps the monster name
**Then** the full stat block expands inline: abilities, AC, HP, speed, actions, traits, legendary actions (FR17)
**And** the stat block opens in ≤300ms (NFR4)
**And** the stat block does not navigate away from the combat view

**Given** an expanded stat block
**When** the DM clicks/taps the monster name again
**Then** the stat block collapses

### Story 4.3: Spell Search & Description Modal Overlay

As a **DM or player**,
I want to search the SRD spell list and view full descriptions in a modal overlay,
So that I can look up spell rules mid-combat without losing my place.

**Acceptance Criteria:**

**Given** the oracle or combat view
**When** the user types in the spell search field
**Then** results are filtered by name, class, level, and school in real time (FR18)
**And** results show spell name, level, school, and ruleset version badge (FR20)

**Given** a spell search result
**When** the user clicks/taps a spell name
**Then** a modal overlay opens with the full spell description: casting time, range, components, duration, description text (FR19)
**And** the modal opens in ≤300ms (NFR4)
**And** the combat view remains visible behind the modal

**Given** an open spell modal
**When** the user closes it (X button, Escape key, or click outside)
**Then** the modal closes and the user returns to exactly where they were

### Story 4.4: Condition Rules Lookup

As a **DM or player**,
I want to look up the full rules text for any condition (Stunned, Blinded, etc.),
So that I can quickly resolve condition effects during combat.

**Acceptance Criteria:**

**Given** the oracle view or a condition badge on a combatant
**When** the user clicks/taps a condition name or badge
**Then** the full condition rules text is displayed (FR21)

**Given** the condition lookup
**When** viewing condition rules
**Then** the rules text matches the SRD definition for the session's selected ruleset version
**And** the version is clearly labeled

### Story 4.5: Dual-Version Content Labeling

As a **DM or player**,
I want all SRD content clearly labeled with its ruleset version (2014 or 2024),
So that I always know which version of a rule I'm reading.

**Acceptance Criteria:**

**Given** any monster stat block, spell description, or condition lookup
**When** the content is displayed
**Then** a version badge ("2014" or "2024") is prominently visible (FR20)

**Given** the search results for monsters or spells
**When** both versions of the same entity exist
**Then** both are listed with distinct version labels
**And** the session's default version is shown first

## Epic 5: Real-Time Player View & Session Sharing

DM generates a session link; players join on mobile with zero login, see live initiative/HP/turns, and access the spell oracle — the viral loop activator.

### Story 5.1: Session Link Generation & Player Anonymous Auth

As a **DM**,
I want to generate a shareable session link that players can use to join without an account,
So that my group can connect in seconds with zero friction.

**Acceptance Criteria:**

**Given** an active encounter
**When** the DM clicks "Share Session" / "Generate Link"
**Then** a unique session token is created in the `session_tokens` table
**And** a shareable URL is generated in the format `/join/[token]` (path-based, not query param)
**And** the DM can copy the link to clipboard (FR6)

**Given** a player opening the `/join/[token]` link
**When** the token is valid and the session is active
**Then** the player is authenticated via Supabase Anonymous Auth (FR27)
**And** the anonymous `auth.uid()` is linked to the session via `session_tokens`
**And** no account creation or login is required

**Given** an invalid or expired token
**When** a player opens the link
**Then** an error message is displayed: "Session not found or has ended"

**Given** a session that the DM has explicitly ended
**When** a player tries to join via the old token
**Then** access is denied and the token is expired (NFR15)

### Story 5.2: Player View — Live Initiative Board & Turn Indicator

As a **player**,
I want to see the current initiative order and whose turn it is in real time,
So that I can follow combat and prepare for my turn without asking the DM.

**Acceptance Criteria:**

**Given** a player connected to a session via `/join/[token]`
**When** the session view loads
**Then** the initiative order is displayed with all combatant names and positions (FR28)
**And** the current turn is visually highlighted (FR30)

**Given** the DM advances the turn
**When** the Realtime channel broadcasts the update
**Then** the player view updates the turn indicator within ≤500ms (NFR3)

**Given** the DM reorders initiative (tiebreaker)
**When** the change is broadcast
**Then** the player view reflects the new order in real time

### Story 5.3: Player View — Live HP Display

As a **player**,
I want to see each combatant's current HP updating in real time,
So that I can track the battle status without interrupting the DM.

**Acceptance Criteria:**

**Given** the player view
**When** the DM changes any combatant's HP (damage, heal, temp HP)
**Then** the HP display updates on the player view within ≤500ms (FR29, NFR3)

**Given** the player view
**When** a combatant is marked as defeated
**Then** the combatant is visually marked as defeated on the player view

**Given** the player view
**When** conditions are applied or removed by the DM
**Then** condition badges update on the player view in real time

### Story 5.4: Player Spell Oracle Access

As a **player**,
I want to search spells and view descriptions from the player view,
So that I can look up my abilities without interrupting the DM or leaving the session.

**Acceptance Criteria:**

**Given** the player view on mobile
**When** the player opens the spell oracle
**Then** the spell search and modal overlay work identically to the DM view (FR31)
**And** the player's spell search does not affect the DM's view

**Given** a player searching spells
**When** they open a spell modal
**Then** the initiative board remains visible/accessible in the background
**And** the modal respects 44×44px touch targets on mobile (NFR24)

### Story 5.5: Realtime Dual-Write & Channel Subscription

As a **developer**,
I want all combat mutations to follow the dual-write pattern (Zustand → broadcast → persist),
So that player views update instantly while data remains durable.

**Acceptance Criteria:**

**Given** any DM combat action (HP change, turn advance, condition toggle, combatant add/remove)
**When** the action is executed
**Then** the Zustand store updates immediately (optimistic)
**And** `channel.send()` broadcasts on `session:{id}` channel within ~50ms
**And** `supabase.update()` persists to DB asynchronously

**Given** a player connected to the session
**When** a broadcast event is received
**Then** the player's local state updates from the channel payload (not DB re-fetch)

**Given** a failed DB persist
**When** the async write returns an error
**Then** the Zustand store rolls back to the previous state
**And** a Toast notification is shown to the DM
**And** the channel broadcast is not retried (DB is the durable fallback)

### Story 5.6: Connection Resilience & State Reconnect

As a **DM or player**,
I want the session to survive connection interruptions and restore state automatically,
So that a dropped WiFi signal doesn't destroy the combat.

**Acceptance Criteria:**

**Given** an active session with DM and players connected
**When** the DM's connection drops and restores
**Then** a "Reconnecting..." indicator is shown during the outage
**And** on reconnect, the latest state is fetched from the DB and reconciled with local state (FR32)
**And** no data is lost

**Given** a player's connection drops for >3 seconds
**When** the Realtime channel does not reconnect
**Then** the player view falls back to polling `/api/session/[id]/state` every 2 seconds (NFR9)
**And** a "Reconnecting..." indicator is shown

**Given** the polling fallback is active
**When** the Realtime channel reconnects
**Then** polling stops and the player resumes receiving channel broadcasts

**Given** the DM closes the browser
**When** they reopen the session URL later
**Then** the full session state is restored from the server (FR38)

## Epic 6: Admin Panel & Content Management

Admin can view usage metrics, edit SRD content (fix errors), and manage users — operational control for launch and beyond.

### Story 6.1: Admin Authentication & Layout Guard

As an **admin**,
I want the admin panel protected by an is_admin check,
So that only authorized users can access operational tools.

**Acceptance Criteria:**

**Given** a logged-in user where `is_admin = true`
**When** they navigate to `/admin`
**Then** the admin panel loads with the admin layout

**Given** a logged-in user where `is_admin = false`
**When** they attempt to access `/admin/*` routes
**Then** they are redirected to `/app/dashboard` with no admin UI visible

**Given** an unauthenticated user
**When** they attempt to access `/admin/*`
**Then** they are redirected to `/login`

### Story 6.2: Usage Metrics Dashboard

As an **admin**,
I want to view key usage metrics (registrations, activation, retention, players per DM),
So that I can monitor product health and make data-driven decisions.

**Acceptance Criteria:**

**Given** the admin dashboard at `/admin`
**When** the page loads
**Then** the following metrics are displayed: new registrations (total + last 7/30 days), day-1 activation rate (% of DMs who ran at least one session within 24h of signup), week-2 retention rate (% of DMs who returned within 14 days), average players per DM (FR33)

**Given** the metrics dashboard
**When** data is available
**Then** metrics are queried from Supabase via admin API routes (service-role key)
**And** the dashboard refreshes on page load (no real-time streaming needed for V1)

### Story 6.3: SRD Content Editing & Live Propagation

As an **admin**,
I want to edit SRD monster and spell data and have changes propagate to active sessions,
So that content errors are fixed without requiring users to refresh or restart.

**Acceptance Criteria:**

**Given** the admin content page at `/admin/content/monsters` or `/admin/content/spells`
**When** the admin searches for a monster or spell
**Then** the matching entity is displayed with all editable fields

**Given** an entity being edited
**When** the admin saves changes
**Then** the data is updated in Supabase via `/api/admin/content` (service-role key) (FR34)
**And** a broadcast is sent on the global `content:update` Realtime channel with `{ entity_type, entity_id, ruleset_version }`
**And** active sessions subscribed to `content:update` refetch the specific entity (bypassing IndexedDB cache)

**Given** a content edit is published
**When** 60 seconds have elapsed
**Then** all active sessions reflect the updated content (NFR28)

### Story 6.4: User Account Management

As an **admin**,
I want to view and manage user accounts for support purposes,
So that I can assist users and handle account issues.

**Acceptance Criteria:**

**Given** the admin users page at `/admin/users`
**When** the page loads
**Then** a list of user accounts is displayed with: email, registration date, last login, campaign count (FR35)

**Given** the user list
**When** the admin searches by email
**Then** matching users are filtered

**Given** a user account
**When** the admin needs to take a support action
**Then** they can view the user's campaigns and session history
**And** all admin actions are performed via `/api/admin/users` (service-role key)

## Epic 7: Performance, Accessibility & Production Hardening

The app meets all performance targets, accessibility standards, and reliability guarantees — ready for real session nights.

### Story 7.1: Performance Optimization & Web Vitals

As a **user**,
I want the app to load fast and feel responsive,
So that session setup and combat don't stall waiting for the UI.

**Acceptance Criteria:**

**Given** the DM dashboard on desktop (standard broadband)
**When** measured with Lighthouse or Vercel Analytics
**Then** First Contentful Paint (FCP) ≤1.5s (NFR1)
**And** Time to Interactive (TTI) ≤3s (NFR2)

**Given** the SRD oracle (spell/monster modal)
**When** a user triggers a lookup
**Then** the modal opens in ≤300ms (NFR4)

**Given** static SRD content
**When** served via Vercel
**Then** files in `/public/srd/` are served with long-TTL Cache-Control headers (CDN edge, NFR19)

**Given** the production build
**When** analyzed for bundle size
**Then** code splitting is applied for route-based chunks (marketing, app, join, admin)

### Story 7.2: Accessibility Audit & WCAG 2.1 AA Compliance

As a **user with accessibility needs**,
I want the app to meet WCAG 2.1 AA standards,
So that the product is usable regardless of visual, motor, or cognitive differences.

**Acceptance Criteria:**

**Given** all user-facing routes
**When** audited for WCAG 2.1 AA compliance
**Then** no critical or major violations are found (NFR20)

**Given** any status indicator (current turn, conditions, HP threshold)
**When** displayed in the UI
**Then** color is never the sole indicator — icons or text labels are used alongside color (NFR21)

**Given** the default theme
**When** the app loads
**Then** dark mode is active with background color #1a1a2e (NFR22)
**And** minimum body text size is 16px on all breakpoints (NFR23)

**Given** the mobile player view
**When** interactive elements are rendered
**Then** all tap targets are minimum 44×44px (NFR24)

**Given** the DM view on desktop
**When** the DM uses keyboard only
**Then** turn advance, HP edit, condition apply, stat block open, and spell search are all accessible without mouse (NFR25)

### Story 7.3: Load Testing & Scalability Validation

As an **operator**,
I want the system validated for ≥1,000 concurrent sessions,
So that session-night traffic doesn't cause degradation.

**Acceptance Criteria:**

**Given** a load test scenario
**When** 1,000 concurrent sessions are simulated (DM + up to 6 players each)
**Then** WebSocket sync latency remains ≤500ms (NFR3)
**And** no single-server state dependencies exist (NFR17)
**And** response times do not degrade beyond acceptable thresholds (NFR18)

**Given** the Supabase project
**When** connection limits are reviewed
**Then** the Realtime connection pool supports the target load
**And** DB connection pooling is configured appropriately

### Story 7.4: Error Tracking & Monitoring Setup

As an **operator**,
I want error tracking and monitoring in place,
So that production issues are detected and diagnosed quickly.

**Acceptance Criteria:**

**Given** the production deployment
**When** a JavaScript error occurs in the browser
**Then** it is captured by Sentry with session context (user role, session ID)

**Given** the production deployment
**When** a server-side error occurs
**Then** it is captured by Sentry with request context

**Given** Vercel Analytics
**When** enabled
**Then** Web Vitals (FCP, LCP, CLS, FID) are tracked for all routes

**Given** the monitoring stack
**When** the app is in production
**Then** Sentry + Vercel Analytics + Supabase Dashboard provide coverage for errors, performance, and database health

### Story 7.5: Security Hardening & Input Validation

As an **operator**,
I want all security baselines enforced,
So that the app is safe for production use.

**Acceptance Criteria:**

**Given** all data transmission
**When** any request is made
**Then** HTTPS is enforced with no HTTP fallback (NFR11)

**Given** JWT tokens
**When** issued by Supabase Auth
**Then** access tokens expire after 1 hour; refresh tokens after 30 days of inactivity (NFR13)

**Given** any user-generated input (player names, custom NPC data)
**When** submitted
**Then** the input is sanitized server-side before persistence (NFR16)

**Given** admin API routes
**When** input is received
**Then** Zod schemas validate all payloads before processing

**Given** the target uptime
**When** measured monthly
**Then** uptime is ≥99.5% (NFR10)

## Epic 8: Combat Tracker UX Refactor — "Kastark Simplicity"

Merge the multi-step combat setup (EncounterBuilder → InitiativeTracker → Active Combat) into a single-page, list-first experience with inline editing, universal drag reorder, and dual notes — matching the fluid simplicity of the Kastark encounter tracker while preserving all power features and real-time infrastructure.

**Reference:** [Kastark Encounter Tracker](https://kastark.co.uk/rpgs/encounter-tracker/)

**Key Design Decisions:**
- Single-page experience — setup and combat on the same screen, no navigation
- Spreadsheet-style pre-combat rows (Init | Name | HP | AC | Notes) with bottom add-row
- No auto-sort during entry — insertion/drag order until "Start Combat"
- Universal drag reorder (any row, anytime) replaces tie-specific TiebreakerDragList
- Seamless in-place transition from setup to active combat
- Compact card layout in active combat with click-to-edit and overflow menu
- Dual notes: DM-only notes (🔒 private) + player-visible notes (📝 broadcast)

### Story 8.1: Schema & Store — Dual Notes Fields + Universal Reorder

As a **DM**,
I want combatants to have separate DM-only and player-visible notes fields,
So that I can track private tactical info alongside public info that players can see.

**Acceptance Criteria:**

**Given** the combatants table
**When** the migration is applied
**Then** two new columns exist: `dm_notes TEXT DEFAULT ''` and `player_notes TEXT DEFAULT ''`

**Given** the combat store
**When** `updateDmNotes(id, notes)` or `updatePlayerNotes(id, notes)` is called
**Then** the respective notes field is updated in the store and persisted to DB

**Given** a `player_notes` change
**When** broadcast
**Then** the player board receives the update; `dm_notes` is NEVER broadcast

### Story 8.2: CombatantSetupRow — Inline Editable Spreadsheet Row

As a **DM**,
I want each combatant in the pre-combat list to be an inline editable row (Init, Name, HP, AC, Notes),
So that I can rapidly build an encounter by tabbing through fields like a spreadsheet.

**Acceptance Criteria:**

**Given** a combatant in pre-combat mode
**When** displayed
**Then** it renders as: `[DragHandle] [Init] [Name] [HP] [AC] [Notes] [✕]` with all fields editable inline

**Given** the DM tabbing through fields
**When** Tab is pressed
**Then** focus moves left-to-right through Init → Name → HP → AC → Notes

### Story 8.3: EncounterSetup — Unified Pre-Combat View

As a **DM**,
I want a single-page view with combatant list, bottom add-row, SRD search, and campaign loader,
So that encounter setup is as fast and fluid as the Kastark tracker.

**Acceptance Criteria:**

**Given** the encounter page
**When** loaded
**Then** a single view shows: combatant list, always-visible bottom add-row, SRD search, campaign loader, and "Start Combat" button

**Given** the bottom add-row
**When** the DM fills fields and presses Enter
**Then** a new combatant is added to the list and fields are cleared

**Given** SRD search
**When** a monster is selected
**Then** the add-row is auto-filled with the monster's stats

**Given** the list
**When** combatants are added
**Then** they appear in insertion order (NOT sorted by initiative)

### Story 8.4: Universal Drag Reorder with @dnd-kit

As a **DM**,
I want to drag any combatant row to reorder it freely in both setup and active combat,
So that I have full control over initiative order without being limited to tie-resolution.

**Acceptance Criteria:**

**Given** any combatant row in either mode
**When** the DM drags it by the handle
**Then** the row moves to the new position and order is updated

**Given** a reorder during active combat
**When** completed
**Then** `initiative_order` is reassigned, persisted, and broadcast

**Given** the `TiebreakerDragList` component
**When** this story is complete
**Then** it is deleted and replaced by universal drag

### Story 8.5: Seamless Combat Transition — Start Combat In-Place

As a **DM**,
I want "Start Combat" to sort by initiative, persist to Supabase, and transform the list into active combat mode on the same page,
So that the transition is instant with no navigation.

**Acceptance Criteria:**

**Given** the pre-combat view with all initiatives set
**When** "Start Combat" is clicked
**Then** combatants are sorted by initiative descending, encounter is persisted to DB, and the view transforms to active combat in-place

**Given** a persist failure
**When** it occurs
**Then** the view stays in pre-combat mode with an error message

**Given** the URL
**When** combat starts successfully
**Then** it updates to `/app/session/[id]` via `router.replace()` for reload resilience

### Story 8.6: CombatantRow Refactor — Compact Card + Inline Edit + Dual Notes

As a **DM**,
I want each active combat combatant as a compact card with click-to-edit, visible dual notes, and an overflow action menu,
So that I can manage combat at a glance.

**Acceptance Criteria:**

**Given** an active combatant
**When** displayed
**Then** it renders as a compact card with HP bar, action buttons, and a second line with 📝 player notes, 🔒 DM notes, and condition badges

**Given** any field (Name, HP, AC)
**When** clicked
**Then** it transforms to an inline input for editing

**Given** the `[···]` overflow menu
**When** opened
**Then** it shows: Temp HP, Conditions, Defeat, Edit DC, Remove, Version Switch

**Given** the player board
**When** rendering combatants
**Then** it shows `player_notes` but NEVER `dm_notes`

### Story 8.7: Routing, Navigation & Cleanup

As a **DM**,
I want all entry points to lead to the unified combat experience with no dead routes,
So that navigation is clean and consistent.

**Acceptance Criteria:**

**Given** the dashboard
**When** "New Combat Session" is clicked
**Then** the unified encounter page loads in pre-combat mode

**Given** the old components (EncounterBuilder, InitiativeTracker, TiebreakerDragList)
**When** this story completes
**Then** they are deleted with zero dead imports

**Given** `next build`
**When** run
**Then** it succeeds with zero TypeScript errors

### Story 8.8: QA Regression & E2E Validation

As the **QA team**,
I want comprehensive regression testing of the refactored combat tracker,
So that all existing features work correctly in the new unified flow.

**Acceptance Criteria:**

**Given** the refactored flow
**When** all test suites run
**Then** all existing combat features pass: HP, conditions, defeat, add/remove, turns, rounds, realtime sync

**Given** the new features
**When** tested
**Then** inline editing, drag reorder, dual notes, and seamless transition all work correctly

**Given** DM notes
**When** tested against the player board
**Then** they are confirmed as NEVER visible to players
