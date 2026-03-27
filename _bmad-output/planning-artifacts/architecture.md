---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-03-27'
lastRevision: '2026-03-27'
revisionNotes: 'V2 Addendum — Crítica do V1, novas decisões para PRD V2 (FR42-63, NFR29-38). Feature flags, Novu, Trigger.dev, Supabase Presence/Storage, monster grouping, freemium gating, homebrew.'
inputDocuments: ["_bmad-output/planning-artifacts/prd.md", "docs/prd-v2.md", "_bmad-output/planning-artifacts/product-brief-projeto-rpg-2026-03-23.md", "docs/tech-stack-libraries.md", "_bmad-output/planning-artifacts/ux-design-specification.md"]
workflowType: 'architecture'
project_name: 'projeto-rpg'
user_name: 'Dani_'
date: '2026-03-27'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (41 total across 7 groups):**
- Session & Encounter Management (FR1–FR6): Encounter creation, player group load,
  ruleset selection, session link generation, state persistence
- Combat Tracking (FR7–FR15, FR39, FR41): Initiative order, tiebreakers, HP
  (current/max/temp), AC, DC, conditions (dropdown + visibility), version switching
- Rules Oracle (FR16–FR21): Monster and spell search, inline stat block expansion,
  modal spell overlay, condition rules lookup — all in both 2014 and 2024 versions
- User & Account (FR22–FR27, FR40): Email auth, saved player groups (campaigns),
  account deletion, no-login player join, first-time DM onboarding flow
- Real-Time Collaboration (FR28–FR32, FR38): Player view live sync (initiative,
  HP, turn indicator, conditions), session state preserved on disconnect/reconnect
- Administration (FR33–FR35): Usage metrics dashboard, SRD content CRUD, user
  account management
- Legal & Compliance (FR36–FR37): CC-BY-4.0 attribution page, Privacy Policy page

**Non-Functional Requirements (28 total) — architectural drivers:**
- Performance: FCP ≤1.5s, TTI ≤3s, modal open ≤300ms, WebSocket ≤500ms latency
- Reliability: Optimistic UI on all combat actions; polling fallback if WebSocket
  degrades; session state never lost on browser refresh or network interruption
- Security: JWT + refresh tokens, rate-limited auth, player tokens scoped to session,
  server-side input sanitization, HTTPS only
- Scalability: Horizontal scale (no in-process state), ≥1,000 concurrent sessions,
  CDN for SRD static content
- Accessibility: WCAG 2.1 AA, dark mode default (#1a1a2e), keyboard-navigable DM view
- Data Integrity: Lossless SRD versioning (2014 ≠ 2024, coexist), content edits
  propagate to active sessions within 60 seconds

**Scale & Complexity:**
- Primary domain: Full-stack web application with real-time multiplayer layer
- Complexity level: Medium
- Estimated core data entities: 9–10 (User, Campaign, PlayerCharacter, Session,
  Encounter, Combatant, Monster, Spell, ConditionType — Session distinct from
  Encounter to hold access tokens, lifecycle state, and player connections)
- SRD content volume: ~725 versioned entities (static, CDN-served)
- Target concurrent load: ≥1,000 active sessions (DM + up to 6 players each)

### Technical Constraints & Dependencies

- **Stack is pre-decided** (from PRD): Next.js (React), Supabase (PostgreSQL +
  Realtime + Auth), Vercel hosting
- **SRD content license**: CC-BY-4.0 — content must be self-hosted (cannot rely
  on third-party API at runtime); attribution required on every page
- **SRD search is client-side only**: All SRD content (monsters + spells) is
  pre-loaded as a static JSON bundle and indexed client-side (e.g. Fuse.js or
  similar). No server round-trip per keystroke — required to meet ≤300ms oracle
  response (NFR4) and to support offline oracle use (NFR6)
- **Architecture must not prescribe UI implementation patterns**: Whether the
  spell overlay is a modal, slide-over panel, or inline expansion is a UX design
  decision. Architecture exposes fast lookup endpoints and data contracts only
- **UX Design Specification available**: See `_bmad-output/planning-artifacts/ux-design-specification.md` for the complete visual system, Action Color Semantics, typography, spacing, and atmospheric design rules
- **Solo developer target**: Architecture must minimize operational complexity —
  managed services only, no custom infrastructure
- **SRD data source**: open5e API or 5e-database JSON (MIT license) for seeding;
  all SRD content ingested at build time, not fetched at runtime from third-party

### Cross-Cutting Concerns Identified

1. **Real-time state + optimistic sync** — WebSocket layer, server-side session
   persistence, client-side optimistic updates, and reconnect/polling fallback are
   a single integrated concern. Every combat action (HP change, turn advance,
   condition toggle) follows the same pattern: apply immediately in client state,
   sync to server in background, reconcile on reconnect. Affects data model, API
   contracts, and client state management architecture
2. **Three-role authorization** — DM (owns session, full CRUD), Player (read-only
   via session token, no account), Admin (global content management) must be
   enforced at every data access point via Supabase Row Level Security (RLS)
3. **Versioned SRD content** — every content entity (Monster, Spell) carries a
   `ruleset_version` field; queries, UI labels, and API responses must always
   surface version; 2024 never overwrites 2014
4. **Offline resilience** — SRD content (all monsters + spells) cached locally on
   first load so the oracle functions when connection drops; combat state syncs on
   reconnect via server-side persistence

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application — Next.js 16 (App Router) + Supabase backend,
deployed to Vercel. Stack pre-decided in PRD based on solo-developer operability
and real-time session requirements.

### Starter Options Considered

- `with-supabase` (official Supabase template): App Router, cookie-based auth,
  TypeScript, Tailwind CSS, shadcn/ui — officially maintained, Vercel-deployable
- Nextbase (community): More batteries-included but third-party, higher drift risk
- Plain `create-next-app`: Requires manual Supabase wiring, no auth scaffolding

### Selected Starter: with-supabase (Official Supabase + Next.js Template)

**Rationale:** Only officially maintained Supabase + Next.js starter. Cookie-based
auth is required for SSR compatibility. Includes shadcn/ui — accessible,
dark-mode-ready component system aligned with WCAG 2.1 AA target and #1a1a2e
dark theme requirement.

**Initialization Command:**

```bash
npx create-next-app@latest projeto-rpg --template with-supabase
```

**Requires:** Node.js 20+ (Supabase JS v2.79+ drops Node 18 support)

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript (strict mode) — full type safety across frontend + Supabase types
- Next.js 16 App Router — file-based routing, server components, layouts
- Node.js 20+ runtime

**Styling Solution:**
- Tailwind CSS — utility-first, dark mode via `class` strategy
- shadcn/ui — accessible, unstyled-first component primitives (Button, Dialog,
  DropdownMenu, etc.) — aligns with WCAG 2.1 AA and keyboard navigation (NFR25)

**Build Tooling:**
- Turbopack (stable in Next.js 16) — fast local dev HMR
- Vercel deployment pipeline — zero-config CI/CD from GitHub push

**Testing Framework:**
- Not included in starter — Jest + React Testing Library to be added manually

**Code Organization:**
- `app/` — App Router pages and layouts (SSR marketing + CSR app routes)
- `components/` — shared React components
- `lib/` — Supabase client initialization, utility functions
- `utils/supabase/` — server/client/middleware Supabase helpers (cookie auth)

**Development Experience:**
- `supabase/` — local Supabase config for `supabase start` local dev
- Environment variables: `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase CLI for local DB + migrations

**Key packages to add post-init:**
- `@supabase/supabase-js@^2.99` — Supabase client (real-time subscriptions)
- `fuse.js` — client-side SRD full-text search (no server round-trip per keystroke)
- `@dnd-kit/core` + `@dnd-kit/sortable` — drag-and-drop initiative reordering (FR8)
- `zustand` — client-side combat state management (optimistic UI pattern)
- `idb` — IndexedDB wrapper for offline SRD cache (NFR6)

**Note:** Project initialization using this command should be the first
implementation story in the development backlog.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data schema: 10 tables with ruleset_version as first-class field
- Auth model: Supabase Auth (DM) + Supabase Anonymous Auth (Player) + admin flag
- Real-time pattern: Dual-write (channel broadcast + DB persist)
- API approach: Direct Supabase client + Next.js API routes for admin only
- Route structure: SSR marketing + CSR app + no-auth player view

**Important Decisions (Shape Architecture):**
- SRD content pipeline: seed from JSON → export to static bundles → CDN + IndexedDB
- Optimistic UI via Zustand with rollback on sync failure
- Fuse.js client-side search index on pre-loaded SRD data
- Component organization by feature domain

**Deferred Decisions (Post-MVP):**
- Staging environment, custom WebSocket server, multi-region deployment,
  advanced monitoring, payment/subscription infrastructure

### Data Architecture

- **Schema:** 10 tables — User, Campaign, PlayerCharacter, Session, Encounter,
  Combatant, Monster, Spell, ConditionType, SessionToken
- **Ruleset versioning:** `ruleset_version ENUM('2014','2024')` on Monster and
  Spell tables. Both versions coexist; queries always filter by version. 2024
  content never overwrites 2014 rows (NFR26)
- **Combatant model:** `current_hp`, `max_hp`, `temp_hp` (INTEGER DEFAULT 0),
  `ac`, `spell_save_dc`, `initiative`, `conditions` (TEXT[] array),
  `ruleset_version`, `is_defeated` (BOOLEAN)
- **SRD content seeding:** Import from 5e-database JSON via Supabase migration
  seed file. One-time import becomes versioned SQL data. No runtime third-party
  API dependency
- **SRD static bundle:** Build-time script exports all monsters + spells to
  `/public/srd/*.json` — served by Vercel CDN (NFR19), cached in IndexedDB on
  first client load (NFR6)
- **Migrations:** Supabase CLI (`supabase migration new`), version-controlled,
  local-first development

### Authentication & Security

- **DM auth:** Supabase Auth with email + password, cookie-based sessions
  (provided by starter template)
- **Player auth:** Supabase Anonymous Auth — player visits `/join/[token]`,
  gets an anonymous `auth.uid()` linked to the session via `session_tokens`
  table. Token is path-based (not query param) to survive WhatsApp/iMessage
  link sharing. Anonymous users can upgrade to registered accounts in V2
  (zero data loss conversion path)
- **Admin role:** `is_admin BOOLEAN DEFAULT false` on User table. Supabase RLS
  policy checks this flag. Simple for V1 solo-admin; upgrade to roles table
  in V2 if needed
- **RLS policy model:** 3 policy types per protected table:
  - DM: `auth.uid() = session.owner_id`
  - Player: `auth.uid()` exists in `session_tokens` for the target session
  - Admin: `auth.uid()` references a User where `is_admin = true`
  - Authorization enforced at DB layer via Supabase RLS — no per-endpoint
    auth middleware required
- **Rate limiting:** Supabase Auth built-in rate limiting on auth endpoints +
  Vercel Edge middleware for custom limits on API routes (NFR14)
- **Input sanitization:** Server-side via Supabase RPC or Next.js API route
  validation before any write (NFR16)

### API & Communication Patterns

- **API approach:** Direct Supabase client calls from browser for all DM and
  player read/write operations. Next.js API routes only for admin operations
  requiring the service-role key (content management, user administration)
- **Real-time pattern — dual-write:**
  1. DM action → update Zustand store (optimistic, instant UI)
  2. DM action → `channel.send()` on Supabase Realtime channel `session:{id}`
     (instant broadcast to all connected players)
  3. DM action → `supabase.from('combatants').update(...)` (async DB persistence)
  - Players receive updates via channel subscription, not DB change events
  - DB write provides durability; channel provides speed
  - On reconnect: client fetches latest state from DB to reconcile
- **Channel design:** One Supabase Realtime channel per session: `session:{id}`.
  DM is the sole broadcaster. Players subscribe (read-only). Clean session
  isolation — no cross-session data leakage
- **Polling fallback:** If Realtime channel drops for >3 seconds, player view
  falls back to polling `/api/session/[id]/state` every 2 seconds (NFR9)
- **Error handling:** Global Zustand error slice + shadcn/ui Toast notifications
  for sync failures. On failed DB write: retry once, then show error toast.
  On failed channel broadcast: no retry (DB write is the durable fallback)

### Frontend Architecture

- **Route structure:**
  - `/(marketing)/` — SSR landing, features, pricing (SEO-optimized)
  - `/app/dashboard` — DM dashboard (campaign list, encounter management)
  - `/app/session/[id]` — DM combat view (protected, auth required)
  - `/join/[token]` — Player view (anonymous auth, session-scoped)
  - `/admin` — Admin panel (protected, is_admin required)
- **DM session view:** Single-page combat interface — DM never navigates away
  from the session view during combat. All combat data (initiative order,
  combatant stats, stat blocks, spell oracle) accessible without page
  transitions. Specific layout (panels, tabs, etc.) deferred to UX design
- **Player view:** Minimal, purpose-built: initiative board + spell search.
  No DM controls rendered. Separate layout component, not a stripped-down
  DM view
- **State management:** Zustand store for active combat state (initiative order,
  combatants, HP, conditions, current turn). React state for local UI
  (modal open/closed, search input). No global state for non-combat data
- **Component structure:** Feature-grouped directories:
  - `components/combat/` — initiative tracker, combatant cards, HP controls
  - `components/oracle/` — spell search, monster lookup, condition reference
  - `components/ui/` — shadcn/ui primitives (Button, Dialog, DropdownMenu, Toast)
  - `components/admin/` — content management, metrics display
  - `components/marketing/` — landing page sections
- **SRD search index:** Fuse.js index built from pre-loaded JSON on app init,
  stored in module scope (singleton). Instant search, no re-indexing per query.
  Supports both monster and spell search with configurable keys

### Infrastructure & Deployment

- **Environments:** 2 only for V1 — local (`supabase start` + `next dev` on
  localhost:3000) + production (Supabase cloud project + Vercel). Skip staging
  for solo developer workflow
- **CI/CD:** GitHub push → Vercel auto-deploy. Preview deployments on PRs,
  production deploy on `main` merge. Supabase migrations run manually via CLI
  before deploy (automated migration pipeline is V2)
- **Monitoring:** Vercel Analytics (free tier, Web Vitals) + Supabase Dashboard
  (query performance, auth events, Realtime connections) + Sentry free tier
  (error tracking, session replay for debugging)
- **Logging:** Vercel serverless function logs + Supabase Postgres logs. No
  custom logging infrastructure for V1
- **SRD CDN delivery:** Vercel serves `/public/srd/*.json` at edge automatically.
  Cache-Control headers set to long TTL (immutable content, versioned by filename).
  Covers NFR19 with zero extra configuration

### Decision Impact Analysis

**Implementation Sequence:**
1. Project init (starter template) → Supabase project setup → schema migration
2. Auth flow (DM login + player anonymous join) → RLS policies
3. SRD data seeding → static bundle generation → CDN verification
4. Combat tracker core (Zustand store + CRUD) → Realtime dual-write
5. Oracle (Fuse.js search + modal overlays) → IndexedDB offline cache
6. DM dashboard + session management → Player view
7. Admin panel → metrics display

**Cross-Component Dependencies:**
- Realtime dual-write depends on: Zustand store shape + channel design + schema
- Player anonymous auth depends on: session_tokens table + RLS policies
- Offline oracle depends on: SRD static bundle + IndexedDB cache + Fuse.js index
- Optimistic UI depends on: Zustand store + error handling slice + rollback logic

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database (PostgreSQL / Supabase):**
- Tables: `snake_case`, plural — `users`, `campaigns`, `player_characters`,
  `combatants`, `session_tokens`
- Columns: `snake_case` — `current_hp`, `max_hp`, `temp_hp`, `spell_save_dc`,
  `is_defeated`, `ruleset_version`
- Foreign keys: `{referenced_table_singular}_id` — `session_id`, `campaign_id`,
  `encounter_id`
- Indexes: `idx_{table}_{columns}` — `idx_combatants_encounter_id`
- Enums: `snake_case` values — `'2014'`, `'2024'` for ruleset_version

**TypeScript / React:**
- Components: PascalCase — `InitiativeTracker`, `CombatantCard`, `SpellModal`
- Component files: PascalCase matching export — `InitiativeTracker.tsx`
- Functions / variables: camelCase — `updateHP()`, `sessionId`, `combatantList`
- Hooks: `use` prefix — `useCombatStore`, `useSrdSearch`, `useRealtimeChannel`
- Types / interfaces: PascalCase — `Combatant`, `SpellData`, `SessionState`
- Constants: SCREAMING_SNAKE — `MAX_PLAYERS_PER_SESSION`, `DEFAULT_DARK_BG`

**Files & directories:**
- Directories: kebab-case — `components/combat/`, `components/oracle/`
- Non-component files: kebab-case — `combat-store.ts`, `srd-search.ts`,
  `use-realtime.ts`
- Test files: co-located, `.test.ts` suffix — `combat-store.test.ts`

### Data Flow Convention

- PostgreSQL returns `snake_case` → Supabase client passes through as-is
- **Rule: keep `snake_case` in Zustand stores and data layer.** No transformation
  at the boundary — consistency over convention for solo-dev velocity
- React components receive `snake_case` props from store selectors:
  `combatant.current_hp`
- Only UI display strings are transformed (if needed) at render time

### Format Patterns

**API responses (Supabase pattern):**
- All Supabase calls return `{ data, error }` — follow this for custom API routes
- Success: `{ data: T }`
- Error: `{ error: { message: string, code: string } }`

**Realtime event payloads:**
- Event naming: `domain:action` in snake_case — `combat:hp_update`,
  `combat:turn_advance`, `combat:condition_change`, `combat:combatant_add`,
  `combat:combatant_remove`, `combat:initiative_reorder`,
  `combat:version_switch`, `session:state_sync`
- Payload structure: flat object with `snake_case` keys matching DB columns

**Dates:** ISO 8601 strings everywhere — `2026-03-24T19:00:00Z`. PostgreSQL
`timestamptz`, TypeScript `string` (parse only when needed for display).

**Null handling:** Use `null` (not `undefined`) for absent database values.
TypeScript types explicitly include `| null` for nullable fields.

### Zustand Store Pattern

- One store per domain: `combat-store.ts`, `session-store.ts`, `srd-store.ts`
- State interface + Actions interface per store
- Actions follow verb + noun pattern: `updateHP`, `advanceTurn`, `applyCondition`
- **All combat mutations follow the optimistic update pattern:**
  1. Update Zustand store immediately (optimistic)
  2. `channel.send()` for instant player broadcast
  3. `supabase.update()` for async DB persistence
  4. On error: rollback store state + show Toast

### Process Patterns

**Error handling:**
- All async operations wrapped in try/catch
- Zustand `error: string | null` per store slice
- User-facing errors via shadcn/ui Toast — short message, no stack traces
- Console.error for debug info (Sentry captures automatically)
- Never swallow errors silently

**Loading states:**
- `is_loading: boolean` per store slice (not global)
- Skeleton components for initial data load (shadcn/ui Skeleton)
- No loading spinner for optimistic mutations (they appear instant)
- Loading indicator only for: initial page load, SRD cache init, reconnecting

**Validation:**
- Zod schemas for all API route inputs (admin operations)
- TypeScript types generated from Supabase schema (`supabase gen types`)
- Client-side validation only for immediate UX feedback (form fields)
- Server-side validation (RLS + Zod) is the source of truth

### Enforcement Guidelines

**All AI agents MUST:**
1. Run `supabase gen types` after any schema change and use generated types
2. Follow the optimistic update pattern (store → broadcast → persist) for all
   combat mutations
3. Use `snake_case` for all data layer code (stores, types, API payloads)
4. Co-locate test files next to source files with `.test.ts` suffix
5. Never create a new API route for operations that can be done via direct
   Supabase client + RLS

**Anti-Patterns (NEVER do these):**
- `any` type — always use generated Supabase types or explicit interfaces
- Direct DOM manipulation — always go through React state
- `fetch()` to Supabase — always use the `@supabase/supabase-js` client
- Inline styles — always use Tailwind utility classes
- Custom auth checks in API routes — rely on Supabase RLS

## Project Structure & Boundaries

### Complete Project Directory Structure

```
projeto-rpg/
├── README.md
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.local                          # NEXT_PUBLIC_SUPABASE_URL, ANON_KEY
├── .env.example
├── .gitignore
├── sentry.client.config.ts
├── sentry.server.config.ts
│
├── supabase/
│   ├── config.toml                     # Local Supabase config
│   ├── seed.sql                        # SRD content seeding (monsters + spells)
│   └── migrations/
│       ├── 001_initial_schema.sql      # Users, campaigns, player_characters
│       ├── 002_session_tables.sql      # Sessions, encounters, combatants
│       ├── 003_srd_content.sql         # Monsters, spells, condition_types
│       ├── 004_session_tokens.sql      # Player anonymous join tokens
│       └── 005_rls_policies.sql        # All RLS policies (DM, Player, Admin)
│
├── scripts/
│   └── generate-srd-bundles.ts         # Build-time: export SRD → /public/srd/*.json
│
├── public/
│   ├── srd/
│   │   ├── monsters-2014.json          # Static SRD bundle (CDN-served)
│   │   ├── monsters-2024.json
│   │   ├── spells-2014.json
│   │   ├── spells-2024.json
│   │   └── conditions.json
│   └── favicon.ico
│
├── app/
│   ├── globals.css                     # Tailwind base + dark theme vars
│   ├── layout.tsx                      # Root layout (dark mode class, fonts)
│   │
│   ├── (marketing)/                    # SSR route group — SEO-optimized
│   │   ├── layout.tsx                  # Marketing layout (nav, footer)
│   │   ├── page.tsx                    # Landing page (/)
│   │   ├── features/page.tsx           # /features
│   │   ├── pricing/page.tsx            # /pricing
│   │   ├── legal/
│   │   │   ├── attribution/page.tsx    # CC-BY-4.0 attribution (FR36)
│   │   │   └── privacy/page.tsx        # Privacy policy (FR37)
│   │   └── not-found.tsx
│   │
│   ├── (auth)/                         # Auth route group
│   │   ├── login/page.tsx              # DM login (FR22, FR23)
│   │   ├── signup/page.tsx             # DM registration (FR22)
│   │   └── callback/route.ts           # Supabase auth callback
│   │
│   ├── app/                            # Protected DM routes
│   │   ├── layout.tsx                  # DM layout (auth guard, nav)
│   │   ├── dashboard/
│   │   │   └── page.tsx                # Campaign list + encounter mgmt (FR3, FR24, FR25)
│   │   ├── onboarding/
│   │   │   └── page.tsx                # First-time DM flow (FR40)
│   │   └── session/
│   │       └── [id]/
│   │           └── page.tsx            # DM combat view (FR7–FR15, FR39, FR41)
│   │
│   ├── join/
│   │   └── [token]/
│   │       └── page.tsx                # Player view — anonymous auth (FR27–FR31)
│   │
│   ├── admin/                          # Admin routes
│   │   ├── layout.tsx                  # Admin layout (is_admin guard)
│   │   ├── page.tsx                    # Metrics dashboard (FR33)
│   │   ├── content/
│   │   │   ├── monsters/page.tsx       # Monster CRUD (FR34)
│   │   │   └── spells/page.tsx         # Spell CRUD (FR34)
│   │   └── users/page.tsx              # User management (FR35)
│   │
│   └── api/
│       ├── session/
│       │   └── [id]/
│       │       └── state/route.ts      # Polling fallback endpoint (NFR9)
│       └── admin/
│           ├── content/route.ts        # Admin content CRUD (service-role key)
│           └── users/route.ts          # Admin user management (service-role key)
│
├── components/
│   ├── combat/
│   │   ├── InitiativeTracker.tsx       # Initiative list + turn mgmt (FR7–FR9)
│   │   ├── CombatantCard.tsx           # Single combatant: HP, AC, DC, conditions
│   │   ├── HPControls.tsx              # Damage/heal/temp HP controls (FR10, FR41)
│   │   ├── ConditionSelector.tsx       # Condition dropdown (FR14)
│   │   ├── ConditionBadges.tsx         # Visible condition indicators (FR39)
│   │   ├── TiebreakerDragList.tsx      # Drag-and-drop initiative reorder (FR8)
│   │   ├── AddCombatant.tsx            # Add monster/player mid-combat (FR12)
│   │   └── VersionToggle.tsx           # Ruleset version switch per combatant (FR15)
│   │
│   ├── oracle/
│   │   ├── SpellSearch.tsx             # Spell search input + results (FR18)
│   │   ├── SpellDetail.tsx             # Full spell description overlay (FR19)
│   │   ├── MonsterSearch.tsx           # Monster search input + results (FR16)
│   │   ├── MonsterStatBlock.tsx        # Inline stat block expansion (FR17)
│   │   ├── ConditionLookup.tsx         # Condition rules reference (FR21)
│   │   └── SrdVersionLabel.tsx         # 2014/2024 version badge (FR20)
│   │
│   ├── session/
│   │   ├── EncounterBuilder.tsx        # Create encounter, add monsters (FR1, FR2)
│   │   ├── SessionControls.tsx         # Start combat, generate link (FR6)
│   │   ├── SessionReconnect.tsx        # Reconnect indicator + state restore (FR32)
│   │   └── RulesetSelector.tsx         # Session-level version pick (FR4)
│   │
│   ├── dashboard/
│   │   ├── CampaignList.tsx            # Saved player groups (FR24, FR25)
│   │   ├── PlayerGroupEditor.tsx       # Add/edit player characters (FR2, FR25)
│   │   └── EncounterHistory.tsx        # Resume saved encounters (FR5)
│   │
│   ├── player/
│   │   ├── PlayerInitiativeBoard.tsx   # Read-only initiative view (FR28, FR30)
│   │   ├── PlayerHPDisplay.tsx         # Live HP for all combatants (FR29)
│   │   └── PlayerSpellAccess.tsx       # Spell oracle for players (FR31)
│   │
│   ├── admin/
│   │   ├── MetricsDashboard.tsx        # Usage metrics display (FR33)
│   │   ├── ContentEditor.tsx           # Monster/spell CRUD (FR34)
│   │   └── UserManager.tsx             # User account management (FR35)
│   │
│   ├── auth/
│   │   ├── LoginForm.tsx               # Email + password form (FR22)
│   │   ├── SignupForm.tsx              # Registration form (FR22)
│   │   └── AccountSettings.tsx         # Account deletion (FR26)
│   │
│   ├── marketing/
│   │   ├── Hero.tsx
│   │   ├── FeatureGrid.tsx
│   │   └── Footer.tsx                  # Includes CC-BY-4.0 attribution link
│   │
│   └── ui/                             # shadcn/ui primitives (auto-generated)
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── skeleton.tsx
│       ├── toast.tsx
│       └── ...
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser Supabase client
│   │   ├── server.ts                   # Server-side Supabase client (cookies)
│   │   ├── middleware.ts               # Auth middleware for protected routes
│   │   └── admin.ts                    # Service-role client (admin API routes only)
│   │
│   ├── stores/
│   │   ├── combat-store.ts             # Zustand: combatants, initiative, HP, conditions
│   │   ├── session-store.ts            # Zustand: session metadata, encounter state
│   │   └── srd-store.ts               # Zustand: loaded SRD data, search index
│   │
│   ├── realtime/
│   │   ├── use-realtime-channel.ts     # Hook: subscribe to session:{id} channel
│   │   ├── broadcast.ts               # DM broadcast helpers (combat:hp_update, etc.)
│   │   └── reconnect.ts               # Reconnect logic + DB state reconciliation
│   │
│   ├── srd/
│   │   ├── srd-loader.ts              # Fetch /public/srd/*.json + cache in IndexedDB
│   │   ├── srd-search.ts              # Fuse.js index builder + search functions
│   │   └── srd-cache.ts               # IndexedDB read/write via idb
│   │
│   ├── types/
│   │   ├── database.ts                 # Generated: supabase gen types
│   │   ├── combat.ts                   # Combat-specific types
│   │   ├── srd.ts                      # Monster, Spell, Condition types
│   │   └── realtime.ts                 # Channel event payload types
│   │
│   └── utils/
│       ├── hp.ts                       # HP math: apply damage with temp HP logic
│       ├── initiative.ts               # Sort, reorder, tiebreaker helpers
│       └── format.ts                   # Display formatters (CR, spell level, etc.)
│
└── middleware.ts                        # Next.js middleware: auth redirect, rate limiting
```

### Architectural Boundaries

**API Boundaries:**
- Browser → Supabase (direct): All DM/player data operations via `@supabase/supabase-js`.
  RLS enforces access at DB layer
- Browser → Next.js API routes: Only admin operations (`/api/admin/*`) requiring
  service-role key, and polling fallback (`/api/session/[id]/state`)
- No other API layer — Supabase is the API

**Component Boundaries:**
- `components/combat/` reads from `combat-store` — never calls Supabase directly
- `components/oracle/` reads from `srd-store` — searches Fuse.js index, never
  hits the server
- `components/player/` subscribes to Realtime channel — never writes to Supabase
- `components/admin/` calls `/api/admin/*` routes — never uses browser Supabase
  client for writes

**Data Boundaries:**
- Session state (mutable): Supabase `sessions`, `encounters`, `combatants` tables.
  Zustand is client cache. Realtime channel is broadcast layer
- SRD content (static): Supabase `monsters`, `spells`, `condition_types` (source
  of truth for admin edits). Clients receive `/public/srd/*.json` static bundles.
  Cached in IndexedDB after first load
- User data (mutable, private): Supabase `users`, `campaigns`, `player_characters`.
  Protected by RLS. No client-side caching

### FR Category → Directory Mapping

| FR Category | Primary Directory | Key Files |
|-------------|------------------|-----------|
| Session & Encounter (FR1–FR6) | `components/session/`, `app/app/session/` | EncounterBuilder, SessionControls, RulesetSelector |
| Combat Tracking (FR7–FR15, FR39, FR41) | `components/combat/`, `lib/stores/combat-store.ts` | InitiativeTracker, CombatantCard, HPControls, ConditionSelector |
| Rules Oracle (FR16–FR21) | `components/oracle/`, `lib/srd/` | SpellSearch, MonsterStatBlock, ConditionLookup, srd-search.ts |
| User & Account (FR22–FR27, FR40) | `components/auth/`, `app/(auth)/`, `app/app/onboarding/` | LoginForm, SignupForm, AccountSettings |
| Real-Time (FR28–FR32, FR38) | `components/player/`, `lib/realtime/` | PlayerInitiativeBoard, use-realtime-channel.ts, broadcast.ts |
| Administration (FR33–FR35) | `components/admin/`, `app/admin/`, `app/api/admin/` | MetricsDashboard, ContentEditor, UserManager |
| Legal (FR36–FR37) | `app/(marketing)/legal/` | attribution/page.tsx, privacy/page.tsx |

### Data Flow

**Combat mutation (DM action):**
1. Zustand store update (instant, optimistic) → CombatantCard re-renders
2. Realtime broadcast via `channel.send()` (~50ms) → Player views re-render
3. Supabase DB persist (async, ~200ms) → On error: rollback Zustand + Toast

**Oracle search (player or DM):**
1. `srd-store` → Fuse.js search on pre-loaded JSON → results in <5ms
2. No server call. Works offline if IndexedDB cached

**Admin content edit propagation (NFR28):**
1. Admin updates monster/spell via `/api/admin/content` → Supabase DB write
2. API route broadcasts on global Realtime channel `content:update` with
   `{ entity_type, entity_id, ruleset_version }`
3. Active sessions subscribed to `content:update` receive event → refetch
   specific entity from Supabase (bypassing IndexedDB cache)
4. Static bundles (`/public/srd/*.json`) regenerate on next Vercel deploy

Additional files for this flow:
- `lib/realtime/content-updates.ts` — subscribe to `content:update` channel
- Broadcast call added to `/api/admin/content/route.ts` after DB write

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible and version-verified. Next.js 16 + Supabase
JS v2.99 + Vercel + TypeScript strict + shadcn/ui + Zustand + Fuse.js + @dnd-kit
+ idb — no conflicts. Supabase Anonymous Auth works with Realtime subscriptions
and RLS policies.

**Pattern Consistency:**
snake_case in data layer matches PostgreSQL convention. Zustand optimistic update
pattern integrates cleanly with Supabase Realtime dual-write. Event naming
(domain:action) is coherent across all channel events.

**Structure Alignment:**
App Router route groups match the three views (marketing SSR, DM CSR, player
anonymous). Feature-grouped components align with FR categories. lib/ subdirectories
match architectural boundaries (stores, realtime, srd, types, utils).

### Requirements Coverage ✅

**Functional Requirements: 41/41 covered**

Every FR has a specific component, store, and data path. FR categories map to
dedicated component directories. Cross-cutting FRs (real-time sync, version
switching) are handled by shared lib/ modules.

**Non-Functional Requirements: 28/28 addressed**

- Performance (NFR1–NFR6): Vercel CDN, Fuse.js client-side search, IndexedDB cache
- Reliability (NFR7–NFR10): Optimistic UI, polling fallback, server-side persistence
- Security (NFR11–NFR16): Supabase Auth, RLS, Zod validation, HTTPS
- Scalability (NFR17–NFR19): No in-process state, CDN for static content
- Accessibility (NFR20–NFR25): shadcn/ui, Tailwind dark mode, keyboard nav
- Data Integrity (NFR26–NFR28): Lossless versioning, content propagation channel

### Implementation Readiness ✅

**Decision Completeness:** All critical decisions documented with technology
versions and rationale. Optimistic update pattern fully specified with 4-step
flow. Three-role auth model defined with RLS policy types.

**Structure Completeness:** Complete directory tree with every file mapped to
specific FRs. Component boundaries, data boundaries, and API boundaries
explicitly documented.

**Pattern Completeness:** Naming conventions cover DB, TypeScript, files, and
events. Process patterns cover error handling, loading states, and validation.
Anti-patterns documented to prevent common implementation mistakes.

### Gap Analysis

| Priority | Gap | Status |
|----------|-----|--------|
| Important | NFR28 content propagation | Resolved — `content:update` Realtime channel added |
| Important | Full DB schema DDL | Deferred to migration files — architecture defines entities + key fields |
| Nice-to-have | E2E testing strategy | Defer to post-MVP; unit tests + manual testing for V1 |
| Nice-to-have | Monitoring alerting rules | Configure post-launch based on real error patterns |

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (medium, 10 tables, 1000 sessions)
- [x] Technical constraints identified (solo dev, managed services)
- [x] Cross-cutting concerns mapped (real-time, auth, versioning, offline)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined (dual-write, anonymous auth, client-side search)
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established (DB, TypeScript, files, events)
- [x] Structure patterns defined (feature-grouped, co-located tests)
- [x] Communication patterns specified (Realtime events, Zustand stores)
- [x] Process patterns documented (error handling, loading, validation)

**✅ Project Structure**
- [x] Complete directory structure defined with every file
- [x] Component boundaries established (combat, oracle, player, admin)
- [x] Integration points mapped (Supabase direct, API routes, Realtime channels)
- [x] Requirements to structure mapping complete (41 FRs → specific files)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Zero custom infrastructure — Supabase + Vercel handle auth, DB, real-time,
  hosting, and CDN. Solo developer can focus entirely on product code
- Dual-write pattern (store → broadcast → persist) is the single pattern for
  all combat mutations. Consistency is enforced by design, not by discipline
- SRD oracle is fully client-side (Fuse.js + IndexedDB). No server dependency
  for the highest-frequency user action (spell/monster lookup)
- Anonymous auth for players enables zero-friction join AND future V2 account
  upgrade path

**Areas for Future Enhancement:**
- Full DB schema documentation (V1 defers to migration files)
- E2E testing infrastructure (post-MVP)
- Staging environment (post-MVP, when team grows)
- Automated Supabase migration pipeline (V1 uses manual CLI deploys)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- When in doubt, choose the simpler approach — boring technology wins

**First Implementation Priority:**
```bash
npx create-next-app@latest projeto-rpg --template with-supabase
```
Then: Supabase project setup → schema migration → RLS policies → SRD data seeding

---

## V2 Architecture Addendum

> **Contexto:** Este addendum cobre todas as decisões arquiteturais novas necessárias para o PRD V2 (FR42–FR63, FR51b, NFR29–NFR38). Referências: `docs/prd-v2.md`, `docs/tech-stack-libraries.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`.

---

### V2.1 Crítica da Architecture V1 — O Que Funciona e O Que Não Escala

**O que funciona bem (manter):**
- Dual-write pattern (Zustand → Broadcast → DB persist) — sólido, escalável
- Supabase RLS como enforcement layer — seguro, zero middleware custom
- SRD client-side search (Fuse.js + IndexedDB) — rápido, offline-capable
- Feature-grouped components — organização clara
- Anonymous auth para players — zero-friction join

**O que precisa de correção (tech debt identificado no PRD V2):**

| # | Problema V1 | Impacto | Fix V2 |
|---|-------------|---------|--------|
| TD3 | Rate limit in-memory (Oracle AI) — não funciona em serverless | Rate limit bypass em prod | Migrar para Upstash Redis ou Supabase rate_limits table |
| TD1 | Empty catch blocks | Falhas silenciosas | Error boundary + Sentry capture em todo catch |
| TD2 | useEffect dependency arrays quebradas | Stale closures, bugs | ESLint strict, zero suppressions |
| TD4 | 15+ eslint-disable comments | Type safety comprometida | Remover todos, tipar corretamente |
| TD9 | Mutable global state (broadcast channel) | Frágil para scaling | Encapsular em hooks com cleanup |

**O que não existe e é necessário para V2:**

| Gap | Necessário para | Decisão V2 |
|-----|----------------|------------|
| Notification system | FR48-49 (turn notifs), FR54 (email invite) | Novu (`@novu/react` + `@novu/node`) |
| Background jobs | Trial expiry, session cleanup, email scheduling | Trigger.dev (`@trigger.dev/sdk`) |
| File storage | FR53 (file sharing) | Supabase Storage |
| Presence tracking | FR51b (auto-join), online indicators | Supabase Realtime Presence |
| Feature flag system | FR57-61 (freemium gating) | Supabase `feature_flags` table + RLS |
| Subscription/payment | FR59-60 (trial, Pro, Mesa) | Stripe Checkout + Supabase `subscriptions` table |
| Monster grouping data model | FR44-46 | New `monster_group_id` + `group_initiative` |
| Homebrew content | FR63 | User-scoped tables `homebrew_monsters`, `homebrew_spells`, `homebrew_items` |
| GM notes | FR52 | `session_notes` table, never broadcast |

---

### V2.2 Schema Expansion

**Novas tabelas (adicionais às 10 existentes):**

```sql
-- Subscription & billing
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'mesa')),
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'canceled', 'past_due')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feature flags (server-side, NFR29)
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  plan_required TEXT CHECK (plan_required IN ('free', 'pro', 'mesa')),
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- GM session notes (FR52, never broadcast)
CREATE TABLE session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Session files (FR53)
CREATE TABLE session_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf')),
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes <= 10485760),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Campaign invites (FR54-55)
CREATE TABLE campaign_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES users(id),
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);

-- Homebrew content (FR63)
CREATE TABLE homebrew_monsters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  ruleset_version TEXT DEFAULT '2024',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE homebrew_spells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  ruleset_version TEXT DEFAULT '2024',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE homebrew_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Alterações em tabelas existentes:**

```sql
-- users: adicionar role e subscription reference
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'player'
  CHECK (role IN ('player', 'dm', 'both'));
ALTER TABLE users ADD COLUMN subscription_id UUID REFERENCES subscriptions(id);

-- combatants: adicionar display_name e group support
ALTER TABLE combatants ADD COLUMN display_name TEXT;
ALTER TABLE combatants ADD COLUMN monster_group_id UUID;
ALTER TABLE combatants ADD COLUMN group_order INTEGER;

-- sessions: adicionar DM subscription validation
ALTER TABLE sessions ADD COLUMN dm_plan TEXT DEFAULT 'free';
```

**Total de tabelas V2:** 18 (10 originais + 8 novas)

---

### V2.3 Feature Flag System (NFR29)

**Decisão:** Feature flags via tabela Supabase (não terceiro).

**Rationale:** Simples, sem dependência externa, controlável via admin panel. Para o scale atual (<1000 usuários), uma tabela com cache client-side é suficiente.

**Padrão de uso:**

```typescript
// lib/feature-flags.ts
import { createClient } from '@/lib/supabase/client';

// Cache em memória, refresh a cada 5 min
let flagCache: Record<string, { enabled: boolean; plan_required: string }> = {};
let lastFetch = 0;

export async function getFeatureFlags() {
  if (Date.now() - lastFetch < 300_000 && Object.keys(flagCache).length > 0) {
    return flagCache;
  }
  const supabase = createClient();
  const { data } = await supabase.from('feature_flags').select('key, enabled, plan_required');
  flagCache = Object.fromEntries((data ?? []).map(f => [f.key, f]));
  lastFetch = Date.now();
  return flagCache;
}

export function canAccess(flagKey: string, userPlan: string): boolean {
  const flag = flagCache[flagKey];
  if (!flag || !flag.enabled) return false;
  if (!flag.plan_required || flag.plan_required === 'free') return true;
  if (flag.plan_required === 'pro') return userPlan === 'pro' || userPlan === 'mesa';
  if (flag.plan_required === 'mesa') return userPlan === 'mesa';
  return false;
}
```

**React hook:**
```typescript
// lib/hooks/use-feature-gate.ts
export function useFeatureGate(flagKey: string): { allowed: boolean; loading: boolean } {
  const userPlan = useSubscriptionStore(s => s.plan);
  const [flags, setFlags] = useState(flagCache);
  // ... returns { allowed: canAccess(flagKey, userPlan), loading }
}
```

**Admin UI:** Feature flags editáveis no admin panel existente. Toggle enabled/disabled + select plan_required.

---

### V2.4 Subscription & Payment (FR59–FR60)

**Decisão:** Stripe Checkout + Supabase webhooks.

**Rationale:** Stripe é o padrão para SaaS. Checkout hosted elimina PCI compliance do nosso lado. Webhooks sincronizam estado com Supabase.

**Arquitetura:**

```
[User] → [Stripe Checkout] → [Stripe]
                                  ↓ webhook
                          [/api/webhooks/stripe]
                                  ↓
                          [Supabase: subscriptions table]
                                  ↓
                          [RLS: plan check em real-time]
```

**Novas rotas:**
- `/api/checkout/route.ts` — cria Stripe Checkout session
- `/api/webhooks/stripe/route.ts` — processa `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- `/app/app/settings/billing/page.tsx` — painel de assinatura

**Modelo "Mesa" (FR60):**
- DM com plano `mesa` → `dm_plan = 'mesa'` na session
- RLS policy: jogadores na session de um DM mesa herdam plano pro
- Validação real-time: `sessions.dm_plan` verificado via RLS em cada query de feature gated

**Trial (FR59):**
- `subscriptions.status = 'trialing'`, `trial_ends_at` = now + 14 days
- Trigger.dev cron verifica trials expirando → envia email via Novu 2 dias antes
- Após expiração: status muda para `canceled`, features Pro bloqueadas

---

### V2.5 Notification System — Novu (FR48–49, FR54)

**Decisão:** Novu para todas as notificações (in-app, email).

**Canais configurados:**

| Workflow Novu | Canal | Trigger | Payload |
|--------------|-------|---------|---------|
| `turn-upcoming` | in-app | 1 turno antes do player | `{ playerName, sessionCode }` |
| `turn-now` | in-app | Turno do player | `{ playerName, sessionCode }` |
| `player-joined` | in-app | Player entra na session | `{ playerName }` |
| `late-join-request` | in-app | Player pede para entrar mid-combat | `{ playerName, initiative }` |
| `campaign-invite` | email | DM convida jogador | `{ campaignName, inviteLink, dmName }` |
| `trial-expiring` | email | 2 dias antes do trial acabar | `{ daysLeft, upgradeLink }` |

**Integração no layout:**

```typescript
// app/app/layout.tsx (DM layout)
<NovuProvider applicationIdentifier={NOVU_APP_ID} subscriberId={userId}>
  <Inbox />  {/* Renders notification bell in header */}
</NovuProvider>
```

**Trigger server-side:**

```typescript
// lib/notifications/turn-notify.ts
import { Novu } from '@novu/node';
const novu = new Novu(process.env.NOVU_SECRET_KEY!);

export async function notifyTurnUpcoming(playerId: string, playerName: string) {
  await novu.trigger('turn-upcoming', {
    to: { subscriberId: playerId },
    payload: { playerName },
  });
}
```

---

### V2.6 Background Jobs — Trigger.dev

**Decisão:** Trigger.dev para jobs assíncronos e cron.

**Jobs configurados:**

| Task ID | Tipo | Schedule | Ação |
|---------|------|----------|------|
| `cleanup-guest-sessions` | Cron | `*/30 * * * *` | Deleta sessions guest com >60min |
| `check-trial-expiry` | Cron | `0 9 * * *` | Identifica trials expirando em 2 dias → Novu email |
| `process-session-analytics` | Event | Post-session | Calcula métricas (duração, magias, frequência) |
| `send-campaign-invite` | Event | DM action | Envia email de convite via Novu |

**Diretório:** `trigger/` na raiz do projeto (convenção Trigger.dev).

---

### V2.7 File Storage — Supabase Storage (FR53)

**Decisão:** Supabase Storage bucket `session-files`.

**Políticas:**
- Upload: apenas DM da session (`auth.uid() = sessions.owner_id`)
- Download: qualquer participante da session (DM + players com token)
- Delete: apenas DM
- Limite: 10MB por arquivo (NFR32), validação de tipo server-side

**Verificação de conteúdo malicioso (NFR32):**
- Supabase Storage não tem scan nativo
- Implementar validação básica: magic bytes check no upload handler (`/api/session/[id]/files/route.ts`)
- Tipos permitidos: `image/png`, `image/jpeg`, `image/webp`, `application/pdf`
- Rejeitar qualquer outro MIME type

---

### V2.8 Presence & Auto-Join — Supabase Realtime Presence (FR51b)

**Decisão:** Supabase Realtime Presence para tracking de jogadores online.

**Padrão:**

```typescript
// lib/realtime/presence.ts
export function useSessionPresence(sessionId: string, playerInfo: PlayerPresence) {
  const channel = supabase.channel(`session:${sessionId}`);

  useEffect(() => {
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setOnlinePlayers(Object.values(state).flat());
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(playerInfo);
      }
    });

    return () => { channel.untrack(); channel.unsubscribe(); };
  }, [sessionId]);
}
```

**Nota:** Reutiliza o canal `session:{id}` existente (V1). Presence é adicionado ao mesmo canal — não cria canal separado. Isso mantém uma única conexão WebSocket por player.

---

### V2.9 Monster Grouping — Data Model (FR44–46)

**Decisão:** Group via `monster_group_id` nullable na tabela `combatants`.

**Lógica:**
- `combatants` com mesmo `monster_group_id` pertencem ao grupo
- O combatant com `group_order = 0` é o "header" do grupo (carrega o display_name do grupo)
- Initiative é compartilhada: todos no grupo têm mesmo `initiative` value
- HP é individual: cada combatant mantém seu próprio `current_hp`, `max_hp`
- Expand/collapse é client-side (Zustand toggle por `monster_group_id`)

**Não cria tabela separada** — evita join desnecessário. O agrupamento é um atributo dos combatants existentes.

---

### V2.10 Display Name & Sanitization (FR43, NFR33)

**Decisão:** `display_name` como coluna nullable em `combatants`.

**Sanitização (NFR33):**
- Server-side via Supabase RPC ou DB trigger:
```sql
CREATE OR REPLACE FUNCTION sanitize_display_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.display_name := regexp_replace(
    NEW.display_name,
    '<[^>]*>|javascript:|on\w+=',
    '',
    'gi'
  );
  NEW.display_name := left(NEW.display_name, 40);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sanitize_display_name
  BEFORE INSERT OR UPDATE ON combatants
  FOR EACH ROW
  WHEN (NEW.display_name IS NOT NULL)
  EXECUTE FUNCTION sanitize_display_name();
```

**Client-side:** Adicionalmente, React escapa output via JSX default (`{displayName}` — já sanitizado pelo React DOM).

---

### V2.11 Homebrew Content (FR63)

**Decisão:** Tabelas separadas (`homebrew_monsters`, `homebrew_spells`, `homebrew_items`) com `data JSONB`.

**Rationale:**
- Separar de SRD content evita contaminação do dataset canônico
- JSONB permite schema flexível para homebrew sem migrations
- RLS: `user_id = auth.uid()` — cada DM vê apenas seu próprio homebrew
- Oracle search: Fuse.js index reconstrói incluindo homebrew do user logado

**Padrão de merge no search:**
```typescript
// lib/srd/srd-search.ts
export function buildSearchIndex(srdMonsters: Monster[], homebrewMonsters: HomebrewMonster[]) {
  const merged = [
    ...srdMonsters.map(m => ({ ...m, source: 'srd' as const })),
    ...homebrewMonsters.map(m => ({ ...m.data, id: m.id, source: 'homebrew' as const })),
  ];
  return new Fuse(merged, { keys: ['name', 'type', 'cr'], threshold: 0.3 });
}
```

---

### V2.12 Rate Limit Fix (TD3)

**Decisão:** Migrar rate limit do Oracle AI de in-memory para Supabase.

**Opção escolhida:** Tabela `rate_limits` com cleanup via Trigger.dev cron.

```sql
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now()
);

-- Função para check + increment
CREATE OR REPLACE FUNCTION check_rate_limit(p_key TEXT, p_max INTEGER, p_window_seconds INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO rate_limits (key, count, window_start)
  VALUES (p_key, 1, now())
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN rate_limits.window_start + (p_window_seconds || ' seconds')::interval < now()
      THEN 1
      ELSE rate_limits.count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start + (p_window_seconds || ' seconds')::interval < now()
      THEN now()
      ELSE rate_limits.window_start
    END
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$ LANGUAGE plpgsql;
```

**Uso no API route:**
```typescript
const { data: allowed } = await supabase.rpc('check_rate_limit', {
  p_key: `oracle_ai:${userId}`,
  p_max: 20,
  p_window_seconds: 3600,
});
if (!allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
```

---

### V2.13 Project Structure Expansion

**Novos diretórios e arquivos:**

```
projeto-rpg/
├── trigger/                              # Trigger.dev tasks
│   ├── cleanup-guest-sessions.ts
│   ├── check-trial-expiry.ts
│   ├── process-session-analytics.ts
│   └── send-campaign-invite.ts
│
├── app/
│   ├── (auth)/
│   │   └── signup/page.tsx               # + Role selection (FR50)
│   │
│   ├── app/
│   │   ├── settings/
│   │   │   └── billing/page.tsx          # Subscription management
│   │   └── session/
│   │       └── [id]/
│   │           └── page.tsx              # + GM Notes, File Share, Mid-combat add
│   │
│   └── api/
│       ├── checkout/route.ts             # Stripe Checkout session
│       ├── webhooks/
│       │   └── stripe/route.ts           # Stripe webhook handler
│       └── session/
│           └── [id]/
│               └── files/route.ts        # File upload/download (Supabase Storage)
│
├── components/
│   ├── combat/
│   │   ├── MonsterGroupRow.tsx           # FR44-46: grouped monsters
│   │   ├── MidCombatAddSheet.tsx         # FR42: add mid-combat
│   │   ├── DisplayNameInput.tsx          # FR43: editable display name
│   │   └── GMNotesSheet.tsx              # FR52: private notes panel
│   │
│   ├── player/
│   │   ├── TurnNotificationOverlay.tsx   # FR49: "É sua vez!" overlay
│   │   ├── TurnUpcomingBanner.tsx        # FR48: "Você é o próximo" banner
│   │   ├── LateJoinForm.tsx              # FR47: late-join form
│   │   ├── SharedFileCard.tsx            # FR53: file display for players
│   │   └── OnlineIndicator.tsx           # FR51b: presence dot
│   │
│   ├── freemium/
│   │   ├── FeatureLockBadge.tsx          # FR57: lock icon + tooltip
│   │   ├── UpsellCard.tsx               # FR58: inline upsell
│   │   ├── TrialActivation.tsx          # FR59: trial start flow
│   │   └── PlanBadge.tsx                # FR60: PRO badge on DM
│   │
│   ├── campaign/
│   │   ├── InvitePlayerDialog.tsx        # FR54: email invite
│   │   ├── PlayerLinkDropdown.tsx        # FR56: link PC to anon player
│   │   └── CRCalculatorCard.tsx          # FR62: CR calculator
│   │
│   ├── homebrew/
│   │   ├── HomebrewCreator.tsx           # FR63: create custom content
│   │   └── HomebrewBadge.tsx            # Purple "Homebrew" pill
│   │
│   └── auth/
│       └── RoleSelectionCards.tsx         # FR50: player/dm/both selection
│
├── lib/
│   ├── stores/
│   │   ├── subscription-store.ts         # Zustand: user plan, feature access
│   │   └── presence-store.ts             # Zustand: online players
│   │
│   ├── realtime/
│   │   └── presence.ts                   # Supabase Presence hooks
│   │
│   ├── notifications/
│   │   ├── turn-notify.ts               # Turn notification triggers
│   │   └── invite-notify.ts             # Campaign invite emails
│   │
│   ├── feature-flags.ts                  # Feature flag system
│   ├── stripe.ts                         # Stripe client helpers
│   │
│   ├── hooks/
│   │   ├── use-feature-gate.ts          # React hook for gating
│   │   └── use-session-presence.ts      # React hook for presence
│   │
│   └── types/
│       ├── subscription.ts               # Plan, subscription types
│       ├── homebrew.ts                   # Homebrew content types
│       └── notifications.ts             # Novu payload types
│
└── supabase/
    └── migrations/
        ├── 006_subscriptions.sql         # subscriptions table
        ├── 007_feature_flags.sql         # feature_flags table + seed
        ├── 008_session_notes.sql         # session_notes table
        ├── 009_session_files.sql         # session_files table
        ├── 010_campaign_invites.sql      # campaign_invites table
        ├── 011_homebrew_tables.sql       # homebrew_monsters/spells/items
        ├── 012_combatant_v2_columns.sql  # display_name, monster_group_id, group_order
        ├── 013_user_v2_columns.sql       # role, subscription_id
        ├── 014_rate_limits.sql           # rate_limits table + function
        ├── 015_sanitize_trigger.sql      # display_name sanitization trigger
        └── 016_rls_v2_policies.sql       # RLS para novas tabelas
```

---

### V2.14 RLS Policies V2

**Novas policies (adicionais às V1):**

```sql
-- Subscriptions: user vê apenas a própria
CREATE POLICY "Users view own subscription"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Session notes: apenas DM da session
CREATE POLICY "DM manages own session notes"
  ON session_notes FOR ALL USING (
    auth.uid() = user_id
    AND session_id IN (SELECT id FROM sessions WHERE owner_id = auth.uid())
  );

-- Session files: DM upload, todos na session download
CREATE POLICY "DM uploads session files"
  ON session_files FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND session_id IN (SELECT id FROM sessions WHERE owner_id = auth.uid())
  );
CREATE POLICY "Session participants view files"
  ON session_files FOR SELECT USING (
    session_id IN (
      SELECT session_id FROM session_tokens WHERE user_id = auth.uid()
      UNION SELECT id FROM sessions WHERE owner_id = auth.uid()
    )
  );

-- Homebrew: user CRUD próprio
CREATE POLICY "Users manage own homebrew"
  ON homebrew_monsters FOR ALL USING (auth.uid() = user_id);
-- (repeat for homebrew_spells, homebrew_items)

-- Campaign invites: DM cria, convidado aceita
CREATE POLICY "DM creates invites"
  ON campaign_invites FOR INSERT WITH CHECK (auth.uid() = invited_by);
CREATE POLICY "Anyone views own invite by token"
  ON campaign_invites FOR SELECT USING (true); -- token validation em app layer

-- Feature flags: read-only para todos
CREATE POLICY "Anyone reads feature flags"
  ON feature_flags FOR SELECT USING (true);
CREATE POLICY "Admin manages feature flags"
  ON feature_flags FOR ALL USING (
    auth.uid() IN (SELECT id FROM users WHERE is_admin = true)
  );

-- "Mesa" model: players em session de DM pro herdam acesso
CREATE POLICY "Mesa model pro access"
  ON feature_flags FOR SELECT USING (true); -- flags são públicas, gating é client+RLS
```

---

### V2.15 Realtime Events V2

**Novos eventos no canal `session:{id}`:**

| Evento | Direção | Payload | Trigger |
|--------|---------|---------|---------|
| `combat:monster_group_add` | DM → Players | `{ group_id, monsters[], initiative }` | DM adiciona grupo |
| `combat:display_name_change` | DM → Players | `{ combatant_id, display_name }` | DM muda display name |
| `session:player_join_request` | Player → DM | `{ player_name, hp, ac, initiative }` | Late-join request |
| `session:player_join_approved` | DM → Player | `{ combatant_id, position }` | DM aceita late-join |
| `session:player_join_rejected` | DM → Player | `{ reason? }` | DM recusa late-join |
| `session:file_shared` | DM → Players | `{ file_id, file_name, file_type, url }` | DM compartilha arquivo |
| `session:file_removed` | DM → Players | `{ file_id }` | DM remove arquivo |

**Presence events (automáticos via Supabase):**
- `presence.sync` — estado completo dos players online
- `presence.join` — player entrou
- `presence.leave` — player saiu

---

### V2.16 New Realtime Event Naming Convention

**Atualização da convenção V1:** Novos domínios adicionados.

| Domínio | Eventos |
|---------|---------|
| `combat:*` | hp_update, turn_advance, condition_change, combatant_add, combatant_remove, initiative_reorder, version_switch, **monster_group_add, display_name_change** |
| `session:*` | state_sync, **player_join_request, player_join_approved, player_join_rejected, file_shared, file_removed** |
| `content:*` | update (admin SRD edit — existente V1) |

---

### V2.17 Implementation Sequence V2

**Epics em ordem de dependência arquitetural:**

```
Epic 0: Tech Debt Cleanup
  └─→ Prerequisito para tudo — fix rate limit, catch blocks, useEffect deps

Epic 1: Combat Core (FR42-43, FR47)
  └─→ Depende de: schema V2 (display_name, mid-combat add)

Epic 2: Monster Grouping (FR44-46)
  └─→ Depende de: schema V2 (monster_group_id, group_order)

Epic 3: Player Experience (FR48-49, FR50, FR51b, FR56)
  └─→ Depende de: Novu setup, Supabase Presence, schema V2 (user role)

Epic 5: Freemium Gating (FR57-61)
  └─→ Depende de: feature_flags table, subscriptions table, Stripe setup
  └─→ Pode rodar em paralelo com Epic 4

Epic 4: Session & Campaign (FR52-55, FR62-63)
  └─→ Depende de: Supabase Storage, Novu email, homebrew tables
  └─→ Pode rodar em paralelo com Epic 5
```

**Migrations devem rodar ANTES dos Epics:** 006–016 em sequência.

---

### V2.18 Architecture Validation V2

**Requirements Coverage V2:**

| FR Range | Architectural Coverage |
|----------|----------------------|
| FR42-46 | Schema (display_name, monster_group_id) + Realtime events + Components |
| FR47 | Realtime events (join_request/approved/rejected) + Novu (in-app) |
| FR48-49 | Novu (turn-upcoming, turn-now) + Realtime broadcast |
| FR50 | Schema (users.role) + Auth flow |
| FR51, FR51b | Supabase Presence + Realtime channel reuse |
| FR52 | session_notes table + RLS (DM only) |
| FR53 | Supabase Storage + session_files table + RLS |
| FR54-55 | campaign_invites table + Novu email + Trigger.dev |
| FR56 | Client-side linking via existing session_tokens |
| FR57-61 | feature_flags table + subscription_store + useFeatureGate hook |
| FR62 | Client-side computation (no backend needed) |
| FR63 | homebrew_* tables + Fuse.js merge + RLS |

**NFR Coverage V2:**

| NFR | Solution |
|-----|----------|
| NFR29 | feature_flags table, ≤500ms resolve via cache, admin toggle |
| NFR30 | campaign_invites + DB constraint + app-level count check |
| NFR31 | Reuse existing Realtime channel, Novu in-app |
| NFR32 | Supabase Storage + file_size_bytes CHECK + MIME validation |
| NFR33 | DB trigger sanitize_display_name() + React DOM escaping |
| NFR34 | subscriptions table + RLS + graceful degradation logic |
| NFR35-38 | Infra (Vercel + responsive breakpoints) — não requer mudança arquitetural |

**Overall Status V2: READY FOR IMPLEMENTATION**
