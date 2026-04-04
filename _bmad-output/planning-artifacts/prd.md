---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: greenfield
inputDocuments: ["_bmad-output/planning-artifacts/product-brief-projeto-rpg-2026-03-23.md", "brainstorming.md"]
workflowType: 'prd'
---

# Product Requirements Document - projeto-rpg

> **⚠️ V1 SNAPSHOT** — Este PRD reflete o escopo original do MVP (V1). Para o estado atual do projeto (V2+), consulte:
> - `docs/prd-v2.md` — PRD V2 com features expandidas
> - `_bmad-output/planning-artifacts/epics.md` — Épicos V2 (41 stories)
> - `_bmad-output/project-context.md` — Contexto técnico atualizado

**Author:** Dani_
**Date:** 2026-03-24

## Executive Summary

projeto-rpg is a greenfield web application delivering a unified in-session combat
companion for D&D 5e groups who play in person or hybrid. The product targets
Game Masters running weekly or bi-weekly sessions at a physical table, where
the GM operates from a laptop and players reference spells and rules on mobile.
The core problem: no existing tool combines initiative tracking, monster stat blocks,
player stats, and a rules oracle in a single interface — forcing DMs to juggle 3–5
disconnected tabs during every combat. projeto-rpg eliminates that context-switching
entirely, enabling DMs to run a full session without leaving the app.

Primary users are DMs (acquisition and activation) and their player groups
(retention and viral growth). One DM adoption brings 4–6 players onto the platform,
creating a group-lock-in dynamic. Success is measured by week-2 DM retention (>40%
target) and viral coefficient (≥3 players per DM within 30 days).

The product supports D&D 5e 2014 (SRD 5.1) and 2024 (SRD 5.2), both released
irrevocably under CC-BY-4.0, providing a complete free content foundation.
V1 scope is deliberately narrow: combat tracker, monster stat blocks, spell oracle,
saved player profiles, and dual-version ruleset support. Maps, full character
sheets, AI features, and other systems are explicitly deferred to V2+.

### What Makes This Special

Every incumbent was designed for online-first play. D&D Beyond optimizes for
character management; Roll20 and Foundry are VTTs built around digital maps.
None treat in-person play as a primary use case, and none unify the combat tracker
with an in-session rules oracle.

projeto-rpg's core insight: the DM at a physical table needs a command center, not
a VTT. The winning formula is not "another Roll20" — it is the DM's brain:
combat state + rules reference + player data, all in one screen, optimized for
touch and mouse at a real table. The timing is structurally favorable: D&D Beyond
is mid-rebuild (2026 target), Fantasy Grounds went free in Nov 2025 reordering the
market, and SRD 5.2 just dropped under CC-BY-4.0. The window to establish a
category-defining in-person tool is open.

## Project Classification

- **Project Type:** Web Application (SPA/PWA, responsive, real-time sync)
- **Domain:** General / Consumer Entertainment SaaS
- **Complexity:** Medium — no regulatory requirements; technical complexity driven
  by real-time WebSocket sync (DM ↔ players), versioned data model (2014 + 2024
  rulesets), and split UX breakpoints (laptop DM view / mobile player view)
- **Project Context:** Greenfield

## Success Criteria

### User Success

**Primary (DM — Rafael):**
- Completes a full combat session (2–4h) without switching to another tab or tool
- Returns to use the app the following session (week-2 retention signal)
- Shares the app link with at least one player unprompted within 30 days
- At day 30: reports using fewer parallel tools than before adoption

**Secondary (Player — Camila):**
- Joins session via DM-shared link with zero account setup required
- Locates a spell description or condition rule in under 10 seconds
- Knows current initiative order without asking the DM

**Emotional success signal:** "Nossa, isso aqui facilitou minha vida" —
first session where the app removes friction rather than creating it.

---

### Business Success

**3 months:**
- Cohort of active DMs running real weekly/bi-weekly sessions as primary tool
- Week-2 DM retention ≥40%
- Average ≥3 players joining per active DM within 30 days of DM adoption

**6 months:**
- Measurable organic growth through DM-to-player viral loop (no paid acquisition)
- Positive word-of-mouth signals in r/DMAcademy, Discord D&D communities

**12 months:**
- Tool displacement confirmed via day-30 survey: majority of DMs report using
  ≤1 parallel tool vs. 3–5 at baseline
- Established brand in "in-person D&D tools" category

---

### Technical Success

- Session setup (encounter creation + player profile load) completed in ≤3 minutes
- Real-time sync latency (DM action → player view update) ≤500ms on standard
  broadband connection
- Mobile spell/rule lookup response ≤2 seconds (oracle query to result displayed)
- Zero data loss on player profile save/load between sessions
- Supports simultaneous laptop (DM) + up to 6 mobile (player) connections
  per session without degradation
- Dual ruleset (2014 + 2024) content parity: 100% SRD 5.1 and SRD 5.2 coverage
  at launch

---

### Measurable Outcomes

| Metric | Target | Warning Threshold |
|--------|--------|-------------------|
| Week-2 DM retention | ≥40% | <25% |
| Players per DM (30d) | ≥3 | <1 |
| Session setup time | ≤3 min | >5 min |
| Day-1 activation (session run) | ≥50% of signups | <25% |
| Tool displacement (day-30 survey) | ≥60% report fewer parallel tools | <30% |

---

## Product Scope

### MVP — Minimum Viable Product

**Must ship for V1:**
1. Combat tracker — initiative order (with DM-controlled tiebreaker), HP
   (current/max/temp), AC, spell save DC for all combatants (monsters + players)
2. Monster stat blocks — full SRD database, searchable, expandable in-context
3. Spell oracle — complete SRD spell list, modal overlay (no navigation away),
   searchable by name/class/level/school
4. Authentication + saved player profiles — login once, load group every session
5. Dual ruleset — D&D 5e 2014 (SRD 5.1) and 2024 (SRD 5.2), version as
   first-class data field
6. Split views — DM view (laptop, full combat command center) + Player view
   (mobile, initiative board + oracle access)

**MVP is complete when:** A DM can run a full session — from encounter setup
through combat resolution — without opening another browser tab.

### Growth & Vision (Post-MVP)

Post-MVP features are organized into two phases; see the Project Scoping &
Phased Development section below for full detail.

**Phase 2 (product-market fit):** Full character sheets, campaign management,
condition automation, encounter builder, ambient music, session scheduling.

**Phase 3 (platform):** AI session intelligence, homebrew tools,
multi-system support, creator marketplace, public API.

## User Journeys

The four journeys below cover the full interaction space: the primary DM happy
path, a resilience edge case, the player mobile experience, and admin operations.

### Journey 1: Rafael — Happy Path (Session Night)

**Opening Scene:**
It's Friday at 7pm. Rafael's group arrives. He opens his laptop, navigates to
projeto-rpg, and logs in. His saved campaign loads automatically — player profiles
for all 5 characters already there: names, HP, AC, spell save DCs. He clicks
"New Encounter," types "Goblin" and "Hobgoblin," selects the 2024 stat blocks,
adds two custom NPCs with quick HP/AC inputs. Setup: 2 minutes 40 seconds.

**Rising Action:**
Combat begins. Rafael asks the table to roll initiative. He enters each result —
ties go to him: he drags Thorin above the Goblin Boss manually. The order locks.
He clicks "Start Combat." Turn 1: the Goblin Boss acts. Rafael taps the name —
full stat block expands inline. Multiattack, Scimitar, Shortbow. He resolves the
attack, clicks the player's HP down by 11. Camila checks her phone — sees her
HP update in the shared view and knows she's next.

**Climax:**
Turn 4. The wizard casts Hypnotic Pattern. Camila's player asks "does it affect
constructs?" Rafael taps the spell name in the oracle — modal opens, full
description appears without leaving combat. He reads the answer in 8 seconds,
rules, closes the modal. Combat continues without breaking.

**Resolution:**
Two hours later, the encounter ends. Rafael closes the laptop. He didn't open
D&D Beyond once. No spreadsheet. No 5e.tools tab. The session ran clean.

**Capabilities revealed:** encounter setup, initiative management, tiebreaker
resolution, HP tracking, monster stat block lookup, spell oracle modal overlay,
real-time player view sync.

---

### Journey 2: Rafael — Edge Case (Sync Lost Mid-Session)

**Opening Scene:**
Same setup. 45 minutes into a boss fight. Rafael's router drops for 20 seconds.
Players see their view freeze. The DM view shows a "reconnecting" indicator.

**Rising Action:**
Connection restores. The app re-syncs automatically — initiative state, HP values,
conditions all preserved. Players' views update. Rafael never touched the encounter
data manually.

**Alternative edge: wrong stat block loaded.**
Rafael realizes mid-combat he loaded the 2014 Troll instead of the 2024 version.
He clicks the monster name, sees a version toggle inline, switches to 2024. Stat
block updates in place. Initiative order and HP tracking unaffected.

**Resolution:**
Interruption costs 30 seconds. No data lost. No re-entry required. Session
continues. Rafael notes to check the version selector before the next session.

**Capabilities revealed:** offline/reconnect resilience, optimistic UI state
preservation, in-combat stat block version switching, version indicator visibility.

---

### Journey 3: Camila — Happy Path (Player View, Mobile)

**Opening Scene:**
Camila sits at the table, phone in hand. Rafael shares the session link. She opens
it — no login required for players. The initiative board appears: 6 combatants
listed in order, current turn highlighted. Her character (Lyra) shows HP 38/38.

**Rising Action:**
It's the Goblin Boss's turn. She watches the board — his turn indicator glows.
Rafael resolves it. HP ticks down on another character. She sees it live.
Her turn approaches. She opens her spell list — searches "Fireball" — modal
opens with full description, damage dice, save type, area. She reads and closes.
No words to the DM.

**Climax:**
She casts Fireball. Three goblins are affected. She asks "can I see if they
made the save?" Rafael updates their HP in the tracker. She sees the results
appear on her screen before he announces them.

**Resolution:**
Post-session, Camila tells a friend about "the app Rafael uses — you can actually
follow the combat on your phone." She sends the link. Viral loop activated.

**Capabilities revealed:** player view (no-login join), live initiative board
(read-only), live HP sync, spell oracle (mobile modal), character HP display.

---

### Journey 4: Dani_ — Admin / Creator Operations

**Opening Scene:**
Monday morning. Dani_ opens the admin panel. Checks last week's cohort: 12 new
DMs registered, 7 ran at least one session (58% day-1 activation). Week-2
retention for the March cohort: 43% — above the 40% target.

**Rising Action:**
One user reported a bug: the 2024 Troll stat block shows the wrong legendary
actions. Dani_ navigates to Content Management → Monsters → 2024 → Troll.
Finds the error, corrects the data field, publishes. Change propagates to all
active sessions within 60 seconds.

**Climax:**
A Reddit post in r/DMAcademy links to projeto-rpg: "Finally a combat tracker
that doesn't suck." 200 new signups in 48 hours. Dani_ checks server load —
within expected thresholds. No manual intervention needed.

**Resolution:**
Weekly metrics reviewed. Viral coefficient: 3.4 players per DM. Tool displacement
survey at day 30: 67% report using fewer parallel tools. Both above target.
Decision: proceed to V2 scoping.

**Capabilities revealed:** admin dashboard (retention, activation, viral metrics),
content management (monster/spell data editing), real-time content propagation,
infrastructure monitoring integration.

---

### Journey Requirements Summary

| Journey | Capabilities Required |
|---------|----------------------|
| Rafael — Happy Path | Encounter builder, initiative tracker, tiebreaker, HP management, monster lookup, spell oracle modal, real-time sync, saved profiles |
| Rafael — Edge Case | Reconnect resilience, state persistence, in-combat version switching, version visibility |
| Camila — Player View | No-login join, read-only initiative board, live HP sync, spell oracle (mobile), character status display |
| Admin — Operations | Metrics dashboard, content management (CRUD on SRD data), content propagation, usage analytics |

## Domain-Specific Requirements

The following requirements are mandatory at launch due to content licensing
obligations and applicable privacy law.

### Content Licensing (CC-BY-4.0)

All D&D 5e content in the product (monsters, spells, rules) is sourced from
SRD 5.1 and SRD 5.2, both published under Creative Commons Attribution 4.0
International (CC-BY-4.0).

**Mandatory requirements:**
- Attribution statement must appear in the app (footer, About page, or dedicated
  Legal page): *"This product uses the System Reference Document 5.1 and 5.2,
  available under the Creative Commons Attribution 4.0 International License."*
- Must not use trademarked terms: "Dungeons & Dragons," "D&D," WotC logos,
  or Product Identity monsters/settings (Beholders, Mind Flayers, Forgotten
  Realms, etc.)
- May use "compatible with 5th edition" or "5E compatible" — cannot claim
  official WotC affiliation
- Content labeled by ruleset version (2014 / 2024) to maintain clarity for users

**Out of scope:** No licensed WotC content beyond SRD. No official artwork.
No named characters (Strahd, Drizzt, etc.). All content must be derivable from
SRD 5.1 or 5.2 only.

---

### Data Privacy (GDPR / LGPD)

The product collects: email/login credentials, player profile data (names, HP,
AC, DC), and session usage data. Brazilian users fall under LGPD; EU users under
GDPR. Both require similar baseline compliance.

**Mandatory requirements:**
- Privacy Policy page required at launch — plainly describes what data is
  collected, why, and how long it's retained
- Users can delete their account and all associated data (right to erasure)
- Passwords hashed using bcrypt or Argon2 — never stored in plaintext
- Session tokens expire after inactivity (configurable, default 30 days)
- No sale or sharing of user data with third parties
- Player view (no-login join) collects no personal data — session-scoped only

**Nice to have (V2):**
- Explicit consent flow for analytics/telemetry
- Data export (LGPD/GDPR portability right)

---

### Security Baseline

- HTTPS enforced on all endpoints (no HTTP fallback)
- Auth tokens via JWT with short expiry + refresh token pattern
- Rate limiting on auth endpoints (prevent brute force)
- Input sanitization on all user-generated content (player names, custom NPC data)
- WebSocket connections authenticated — players join via session token, not
  open endpoints

## Innovation & Novel Patterns

The three patterns below represent unoccupied market space — no incumbent
implements all three simultaneously.

### Detected Innovation Areas

**1. Unified Combat + Oracle Interface (Novel Interaction Pattern)**
No existing tool combines a live combat tracker with an inline rules oracle in a
single session view. The innovation is not in the individual features — trackers
exist, spell lookups exist — but in the *interaction paradigm*: zero-navigation
access to rules reference from within an active combat state. The modal overlay
pattern (spell/monster lookup without leaving the tracker) is the core UX
innovation.

**2. In-Person / Hybrid-First Design**
The entire market was built for online play and retrofitted for physical tables.
projeto-rpg inverts this: physical table is the primary design constraint, not
an afterthought. The DM laptop + player mobile split-view architecture is a novel
approach to tabletop session management — one persistent session, two distinct
views, optimized for different devices and roles simultaneously.

**3. Versioned Ruleset as First-Class Data**
No current tool natively treats D&D 2014 and 2024 as co-equal versioned rulesets
within a single data model. Most tools either support one version or treat the
other as a content update/overwrite (D&D Beyond's controversial 2024 rollout).
Modeling ruleset version as a first-class field — switchable per session, per
monster, per spell — is a novel data architecture decision with no direct precedent
in the consumer RPG tool market.

---

### Market Context

- D&D Beyond's 2024 ruleset rollout overwrote purchased 2014 content, causing
  user backlash and ~40,000 subscription cancellations — confirming strong user
  demand for parallel version support
- No VTT or companion tool has a documented "in-person first" design philosophy
- Shieldmaiden (the closest combat tracker competitor) has no rules oracle
  integration and no player-facing shared view
- The intersection of "combat tracker + oracle + split-view + versioned content"
  is unoccupied market space

---

### Validation Approach

**Modal oracle:** Measure time-to-lookup in usability tests. Target: user finds
and reads a spell description in ≤10 seconds without leaving combat view.
Validate against current baseline (tab-switching to 5e.tools: ~25–40 seconds).

**Split-view session:** Validate that players join and actively use the player
view (not just the DM). Proxy metric: % of sessions with ≥1 active player
connection within first 10 minutes.

**Version switching:** Track in-combat version toggle events. If users switch
versions mid-session, it confirms real-world version co-existence need.

## Web Application Specific Requirements

The technical platform choices below optimize for the primary product constraints:
real-time session sync, split-device UX, and solo/small-team operability.

### Project-Type Overview

projeto-rpg is a Single Page Application (SPA) with a server-rendered marketing
layer. The combat session requires persistent in-memory state (initiative order,
HP values, conditions) that cannot tolerate full page reloads — SPA is the only
viable architecture. The marketing/landing page uses server-side rendering (SSR)
for SEO and fast initial load.

**Recommended stack rationale:**
- **Frontend:** Next.js (React) — handles both SSR for the marketing page and
  CSR for the app in one framework; strong ecosystem, widely supported
- **Real-time:** WebSockets via Socket.IO or Supabase Realtime — required for
  live DM-to-player sync (HP changes, initiative updates, turn advancement)
- **Database:** Supabase (PostgreSQL + real-time subscriptions) — managed,
  handles auth + real-time + storage in one service; reduces infrastructure
  complexity for solo/small team development
- **Hosting:** Vercel (frontend) + Supabase (backend) — zero-ops deployment,
  scales automatically

---

### Browser Matrix

| Browser | Minimum Version | Support Level |
|---------|----------------|---------------|
| Chrome | Last 2 versions | Full |
| Firefox | Last 2 versions | Full |
| Safari | Last 2 versions | Full (critical for iOS mobile) |
| Edge (Chromium) | Last 2 versions | Full |
| IE / Legacy Edge | Any | Not supported |
| Chrome Android | Last 2 versions | Full (player mobile view) |
| Safari iOS | Last 2 versions | Full (player mobile view) |

**Rationale:** Target audience is tech-comfortable DMs and young players.
No legacy browser requirement. Safari iOS is critical — it's the default
browser for iPhone users who are a significant share of the player (mobile) base.

---

### Responsive Design

Two primary breakpoints, each with a distinct purpose:

| Breakpoint | Width | Primary Use | View |
|-----------|-------|-------------|------|
| Mobile | < 768px | Player view — initiative board + spell oracle | Read-only session companion |
| Desktop | ≥ 1024px | DM view — full combat command center | Full tracker + stat blocks |
| Tablet | 768–1023px | Supported but secondary — either view works | Responsive fallback |

**Design constraint:** The DM never uses mobile for the tracker. The player
never needs desktop features. Design each breakpoint as its own UX, not a
scaled version of the other.

**Touch targets:** Minimum 44×44px for all interactive elements on mobile
(Apple HIG standard). Critical for players tapping spell names during combat.

---

### Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| First Contentful Paint (FCP) | < 1.5s | DM opens app 5 min before session |
| Time to Interactive (TTI) | < 3s | Must be usable before first roll |
| WebSocket connection | < 500ms latency | Live sync must feel instant |
| Spell/monster lookup (modal open) | < 300ms | Mid-combat, zero patience for lag |
| Session state persistence | Zero loss on reconnect | Data loss mid-session is unacceptable |

---

### SEO Strategy

**App routes** (`/session`, `/tracker`, `/dashboard`): No SEO needed.
Protected behind auth. Not indexed.

**Marketing routes** (`/`, `/features`, `/pricing`): Full SSR with meta tags,
Open Graph, structured data. Target keywords: "D&D combat tracker," "D&D 5e
initiative tracker," "tabletop RPG companion app." Next.js handles SSR for
these routes natively.

---

### Accessibility Level

**Target:** WCAG 2.1 AA

**Critical requirements for this product:**
- **Never use color as sole status indicator** — initiative turn, HP status,
  conditions must use icons or text labels alongside color (1 in 12 male users
  is colorblind; RPG demographic skews male)
- **Dark mode as default** — sessions run in dimly lit rooms; dark gray
  background (#1a1a2e or similar), not pure black (reduces halation for
  users with astigmatism)
- **Minimum 16px body text** on all breakpoints
- **Keyboard navigable** — DM using laptop must be able to advance turns,
  update HP, and access stat blocks without leaving keyboard
- **Screen reader support** for static content (spell descriptions, monster
  stat blocks) — at minimum, semantic HTML and ARIA labels on interactive elements

---

### Implementation Considerations

- **Offline resilience:** Cache SRD content (monsters, spells) in IndexedDB or
  service worker on first load. If connection drops mid-session, the oracle
  remains functional. Combat state syncs when reconnected.
- **Optimistic UI:** Apply HP changes and turn advances immediately in the UI;
  sync to server in background. Never make the DM wait for a network round-trip
  to update visible state.
- **Session token for players:** Players join via a shareable link containing
  a session token (not a login). Token is scoped to one session, expires when
  session ends. No account required.
- **Progressive enhancement:** Core combat tracker must function even if
  WebSocket connection is degraded (fallback to polling every 2s if needed).

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP — the product must deliver a complete, polished
in-session experience for one specific use case (DM running combat at a physical
table) before expanding to any other. No feature is added until the core loop
works flawlessly: setup → combat → session end → return next week.

**Resource Requirements:** 1 full-stack developer (solo viable). Stack chosen
(Next.js + Supabase + Vercel) minimizes infrastructure ops to near-zero.
No DevOps required for V1.

---

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Rafael — Happy Path (session night, full combat)
- Camila — Player View (mobile, read-only companion)

**Must-Have Capabilities:**

| # | Feature | Why it's MVP |
|---|---------|-------------|
| 1 | Combat tracker — initiative, HP (current/max/temp), AC, DC | Core value; without this, product doesn't exist |
| 2 | DM-controlled initiative tiebreaker (drag/manual) | Explicit user requirement; missing = friction every session |
| 3 | Monster stat blocks — full SRD, inline expandable | Without this, DM still switches tabs |
| 4 | Spell oracle — modal overlay, no navigation away | Without this, players still interrupt the DM |
| 5 | Auth + saved player profiles | Without this, 20+ manual inputs before every session |
| 6 | Dual ruleset (2014 + 2024) as first-class data | Non-negotiable per user; groups actively split between versions |
| 7 | Split views — DM (desktop) + Player (mobile, no-login) | Without player view, no viral loop; no retention lock |

**Not in MVP (explicit deferral):**
Battle maps, full character sheets, music integration, scheduling, AI features,
homebrew tools, other RPG systems, marketplace.

---

### Post-MVP Features

**Phase 2 — Full Session Companion (post product-market fit signal):**
- Full character sheets (SRD classes, resources, equipment, level-up)
- Condition automation (apply/expire by turn, concentration tracking)
- Encounter builder with CR difficulty calculator
- Campaign management (session notes, NPC tracker, loot)
- Ambient music / soundscape integration
- Session scheduling

**Phase 3 — Platform Expansion:**
- AI session intelligence (recaps, NPC dialogue, encounter suggestions)
- Homebrew content creation + community sharing
- Multi-system support (Pathfinder 2e, etc.)
- Creator marketplace
- Public API for third-party integrations

---

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| WebSocket real-time sync complexity | Medium | High | Use Supabase Realtime (managed) before custom WebSocket; reduces implementation risk |
| Dual ruleset data model complexity | Medium | Medium | Ship 2014 first; version field in schema from day one; 2024 is a data migration, not a code change |
| SRD content gaps / data quality | Low | Medium | Use open5e API or 5e-database JSON (MIT license) as data source; validate against SRD PDFs |
| Mobile Safari WebSocket behavior | Low | Medium | Test on Safari iOS in sprint 1; known edge cases documented |
| Modal overlay feels disruptive mid-combat | Low | Medium | Test overlay vs. sidebar panel in prototype; measure flow interruption before shipping |

**Market Risks:**

| Risk | Mitigation |
|------|-----------|
| DMs don't switch from existing habits | Recruit 5 DMs from r/DMAcademy for beta; validate tool displacement before public launch |
| Players don't join the session view | Measure player connection rate in first 30 days; if <1 player/DM, simplify join flow |
| Physical table use case assumption wrong | Validate with 5 DM interviews before V1 build; recruit from r/DMAcademy |
| Market timing wrong | D&D Beyond rebuild timeline (2026) creates 12-month window; ship within that window |

**Resource Risks:**

| Risk | Mitigation |
|------|-----------|
| Solo developer bandwidth | Scope is intentionally narrow; Next.js + Supabase eliminates backend work |
| SRD content maintenance (rules updates) | Content stored as versioned JSON; updates are data changes, not deployments |
| Scope creep pre-launch | This PRD defines the line; any feature not in MVP table is Phase 2 by default |

## Functional Requirements

### Session & Encounter Management

- FR1: DM can create a new encounter by searching and adding monsters from the SRD database
- FR2: DM can add player characters to an encounter by entering name, HP, AC, and spell save DC
- FR3: DM can load a saved player group into a new encounter without re-entering individual player data
- FR4: DM can select a ruleset version (2014 or 2024) per session before combat begins
- FR5: DM can save the current encounter state and resume it in a future session
- FR6: DM can generate a shareable session link from within an active encounter that players use to join the player view

---

### Combat Tracking

- FR7: DM can enter initiative values for all combatants and have them automatically sorted in descending order
- FR8: DM can manually resolve initiative ties by reordering combatants using drag-and-drop (mouse and touch) or manual position assignment
- FR9: DM can advance the turn to the next combatant in initiative order
- FR10: DM can adjust current HP for any combatant (damage or healing) at any point during combat
- FR11: DM can mark a combatant as defeated and remove them from the active initiative order
- FR12: DM can add or remove combatants from an active encounter mid-combat
- FR13: DM can edit any combatant's stats (name, HP max, AC, DC) during combat
- FR14: DM can apply named conditions to any combatant via a dropdown selector (Blinded, Charmed, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious)
- FR39: Active conditions on each combatant are visible at a glance in the combat tracker view; DM and players can see all conditions currently applied without additional navigation
- FR15: DM can switch a monster's ruleset version (2014 ↔ 2024) for an individual combatant mid-combat without affecting other combatants or resetting encounter state
- FR41: DM can set a temporary HP value for any combatant; temporary HP absorbs incoming damage before current HP is reduced, and is tracked separately from current and maximum HP

---

### Content Reference (Rules Oracle)

- FR16: DM and players can search the SRD monster database by name, CR, and creature type
- FR17: DM can expand a monster's full stat block inline within the combat tracker without navigating away
- FR18: DM and players can search the SRD spell list by name, class, level, and school
- FR19: DM and players can view a spell's full description in a modal overlay without leaving the current view
- FR20: All SRD content (monsters and spells) is available in both 2014 and 2024 versions, clearly labeled by version
- FR21: DM and players can look up condition rules (Stunned, Blinded, etc.) with full rules text accessible in-session

---

### User & Account Management

- FR22: Users can create an account with email and password
- FR23: Users can log in and log out of their account
- FR24: DM can save a named player group (campaign) with all player character stats for reuse across sessions
- FR25: DM can create, edit, and delete saved player groups
- FR26: Users can delete their account and all associated data permanently
- FR27: Players can join a session view using a shared link without creating an account
- FR40: A new DM is guided through creating their first encounter and generating a session link on first login

---

### Guided Onboarding (Try Mode)

- FR64: First-time visitors to `/try` receive an automatic guided tour that walks them through the full combat setup flow — from monster search to combat start
- FR65: The tour uses a spotlight overlay (SVG mask) that highlights the active UI element while dimming the rest of the interface, providing clear visual focus
- FR66: Tour steps are categorized as "info" (manual advance via Next button) or "interactive" (auto-advance when user completes the required action), creating a learn-by-doing experience
- FR67: The tour includes smart skip logic — if a user has already completed a step's condition before the tour reaches it (e.g., already added a monster), the step is automatically skipped
- FR68: Tour progress persists in localStorage — completed tours do not re-trigger on subsequent visits; users can reset the tour from settings
- FR69: The tour concludes with a conversion CTA encouraging account creation, linking the onboarding experience to the signup funnel
- FR70: All tour content is fully localized (pt-BR + en) via the existing i18n system (next-intl)
- FR71: Tour supports responsive positioning — tooltips auto-reposition based on available viewport space, with mobile-first top/bottom placement
- FR72: Tour tooltips are accessible — role="dialog", aria-live="polite" for step transitions, ESC key to skip, keyboard-navigable buttons with 44px minimum touch targets

---

### Real-Time Collaboration

- FR28: Player view displays the current initiative order in real time, reflecting DM changes as they happen
- FR29: Player view displays each combatant's current HP, updating in real time when the DM makes changes
- FR30: Player view indicates whose turn it is currently, updating automatically when the DM advances the turn
- FR31: Player view provides access to the spell oracle (search + modal) without affecting the DM's view
- FR32: Session state (initiative order, HP, conditions) is preserved and restored automatically if a connection is interrupted and re-established
- FR38: Session state persists server-side after the DM closes the browser; DM can reopen and resume the session until it is explicitly ended

---

### Administration & Content Management

- FR33: Admin can view key usage metrics: new registrations, day-1 activation rate, week-2 retention rate, and players per DM
- FR34: Admin can edit SRD monster and spell data (correct errors, update content) and publish changes that propagate to all active sessions
- FR35: Admin can view and manage user accounts (for support purposes)

---

### Legal & Compliance

- FR36: The application displays the required CC-BY-4.0 attribution statement for SRD 5.1 and SRD 5.2 content on a visible, persistent page
- FR37: Users can access a Privacy Policy that describes data collection, retention, and their rights under LGPD/GDPR

## Non-Functional Requirements

### Performance

- NFR1: First Contentful Paint (FCP) ≤1.5s on desktop (standard broadband)
- NFR2: Time to Interactive (TTI) ≤3s on desktop — app must be usable before the first initiative roll
- NFR3: WebSocket sync latency ≤500ms — DM action visible on player view within half a second
- NFR4: Spell and monster modal open time ≤300ms — mid-combat lookup must feel instant
- NFR5: Session setup (encounter creation + player group load) completable in ≤3 minutes by a first-time DM
- NFR6: SRD content (monsters, spells) served from local cache after first load — oracle functions even if server connection is degraded

---

### Reliability

- NFR7: Session state (initiative, HP, conditions) is never lost due to a browser refresh, tab close, or network interruption — state is persisted server-side and restored on reconnect
- NFR8: Optimistic UI — all DM interactions (HP changes, turn advances, condition toggles) reflect immediately in the UI without waiting for server confirmation; server sync happens in background
- NFR9: WebSocket connection degradation fallback — if WebSocket fails, player view falls back to polling (≤2s interval) to maintain sync
- NFR10: Target uptime ≥99.5% (monthly) — session-night downtime is unacceptable; scheduled maintenance only during low-traffic windows (weekday daytime)

---

### Security

- NFR11: All data transmitted over HTTPS — no HTTP fallback
- NFR12: Passwords stored as bcrypt or Argon2 hashes — never plaintext
- NFR13: JWT access tokens expire after 1 hour; refresh tokens expire after 30 days of inactivity
- NFR14: Auth endpoints rate-limited to prevent brute-force attacks (max 10 attempts per 15 minutes per IP)
- NFR15: Player session tokens are scoped to a single session and expire when the session is ended by the DM
- NFR16: All user-generated inputs (player names, custom NPC data) are sanitized server-side before persistence

---

### Scalability

- NFR17: Architecture supports horizontal scaling — no single-server state dependencies; session state stored in database, not in-process
- NFR18: System handles ≥1,000 concurrent active sessions (DM + players) without performance degradation — validated before public launch
- NFR19: SRD content delivery via CDN — static content (monster/spell JSON) served at edge, not from origin server

---

### Accessibility

- NFR20: WCAG 2.1 AA compliance on all user-facing routes
- NFR21: No UI element uses color as the sole indicator of state — all status indicators (current turn, conditions, HP threshold) use icons or text labels in addition to color
- NFR22: Dark mode is the default theme — background color #1a1a2e (dark gray, not pure black) to reduce halation for users with astigmatism
- NFR23: Minimum body text size 16px on all breakpoints
- NFR24: All interactive elements on mobile have minimum tap target size 44×44px (Apple HIG standard)
- NFR25: DM view is fully keyboard-navigable — turn advance, HP edit, condition apply, and stat block open accessible without mouse

---

### Data & Content Integrity

- NFR26: SRD content versioning is lossless — adding 2024 content does not overwrite or modify existing 2014 content
- NFR27: User data (player profiles, saved groups) survives Supabase infrastructure updates without migration loss
- NFR28: Admin content edits propagate to all active sessions within 60 seconds of publish
