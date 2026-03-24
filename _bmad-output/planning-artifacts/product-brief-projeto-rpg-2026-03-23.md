---
stepsCompleted: [1, 2, 3, 4, 5, 6]
status: complete
inputDocuments: ["brainstorming.md"]
date: 2026-03-23
author: Dani_
---

# Product Brief: projeto-rpg

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

projeto-rpg is a mobile-first D&D 5e companion built for groups who play in person or hybrid — delivering a unified combat experience and an accessible rules oracle that makes players say "this just made my life so much easier."

The product targets the largest underserved gap in the D&D tools market: in-person and hybrid play, where groups are forced to juggle 3–5 disconnected tools at the table. By unifying monster stat blocks, player sheets, initiative tracking, and a functional 5e rules oracle into a single interface, projeto-rpg removes the friction that breaks immersion and slows combat.

---

## Core Vision

### Problem Statement

Players and DMs at physical tables have no unified tool for managing combat. Running a session means switching between a combat tracker, separate monster references, individual character sheets, and a rules lookup — none of which talk to each other. There is also no accessible, functional D&D 5e wiki/oracle designed for in-session use: quick, reliable, and built for the table rather than desktop research.

### Problem Impact

Combat slows to a crawl when the DM must cross-reference monster stat blocks, track initiative manually, manage player HP separately, and look up spell or condition rules across multiple tabs or books. The cognitive load falls on the DM, breaks immersion for everyone, and is the #1 friction point in in-person/hybrid play.

### Why Existing Solutions Fall Short

- **D&D Beyond**: character-centric, DM tools neglected for years, not designed for the physical table, rebuilding from scratch for 2026
- **Roll20 / Foundry**: online-first VTTs, poor mobile/tablet UX, steep learning curve, overkill for in-person groups
- **Standalone trackers** (Improved Initiative, Shieldmaiden): combat only, no integrated character sheets or rules reference
- **Rules references** (5e.tools, DnD5e.info): static lookup sites, not built for in-session use, no combat integration

None combine combat tracking + unified sheets + rules oracle in a single, tablet-friendly experience for groups at a physical table.

### Proposed Solution

A unified in-session companion that combines:
1. **Combat tracker** — initiative, HP, conditions, monster stat blocks and player sheets side by side in one view
2. **D&D 5e oracle** — fast, searchable rules reference (spells, conditions, monsters, actions) accessible mid-combat without leaving the session
3. **Tablet-first UX** — designed for the physical table, touch-optimized, minimal setup, zero friction

### Key Differentiators

- **Unified combat view**: monsters and player sheets in one screen — no tab switching
- **In-session oracle**: rules reference that lives inside the combat experience
- **In-person/hybrid first**: tablet-optimized UX when every competitor is online-first
- **"It just worked"**: speed-to-play as the north star metric — open app, start session

---

## Target Users

### Primary Users

#### Persona 1: "O Mestre" — Rafael (Primary Acquisition + Core User)

**Profile:** Rafael, 27, plays weekly or bi-weekly at a physical table with 4–5
friends. Tech-comfortable. Runs sessions from home or a friend's place with a
laptop open on the table.

**Device Split:**
- **Laptop:** combat tracker — initiative order, monster stat blocks, HP tracking,
  conditions. The DM's command center.
- **Mobile (his or shared):** quick spell and rules lookups by players during their
  turns.

**Goals:**
- Run the full combat from the laptop without switching tabs
- Let players self-serve spell and rules lookups on mobile so they stop interrupting
- Keep the initiative flow tight — no dead air between turns

**Current Workarounds:**
- Laptop: multiple tabs (D&D Beyond, 5e.tools, a spreadsheet tracker)
- Players ask him for rules mid-combat, breaking his concentration
- Paper notes or sticky notes for conditions and initiative

**Pain Points:**
- No single tool combines monster data + player stats in one combat view
- Rules lookups pull him out of the tracker entirely
- Players are passive — no visibility into the combat state without asking

**Success Moment:** Runs a full combat on one screen. Players check their own
spells on mobile. No one asks "what's my condition?" or "is it my turn?"
Post-session: "I didn't lose the flow once."

---

#### Persona 2: "O Player" — Camila (Secondary User, Primary Retention Mechanism)

**Profile:** Camila, 24, player in Rafael's group. Uses her phone during sessions.
Doesn't want a complex tool — just enough to stay engaged and self-sufficient.

**Device:** Mobile only. Passive tracker viewer + spell/rules oracle.

**Goals:**
- See current initiative order without asking Rafael
- Look up her spells and conditions on her own
- Stay engaged without interrupting the DM

**Success Moment:** Knows it's her turn before Rafael calls it. Checks her
concentration spell rules mid-combat without a word.

**Why Camila matters for the product:** Rafael adopts the tool — but if Camila
and the group engage with it, Rafael never leaves. Player adoption is the
retention lock. One DM brings 4–5 players; the group dynamic is the moat.

---

### Secondary Users

**The Casual Player:** Uses only the rules oracle (spells, conditions, monsters).
No account, no setup. Must work in under 10 seconds.

---

### User Journey

#### Rafael's Session Night

**Discovery:** Reddit (r/DMAcademy), friend recommendation, or organic search
for "D&D combat tracker tablet." Sees "unified combat + rules oracle, in-person
first" — immediately clicks.

**Onboarding:** Creates encounter by searching monster names, adds player names
+ AC + HP. Under 3 minutes. No tutorial.

**Core Usage:**
1. Opens laptop 5 min before session — loads or sets up encounter
2. Rolls initiative — order sorted automatically
3. Runs combat: tracks HP, applies conditions, taps monster for full stat block,
   sees player data in the same view
4. Players use mobile to check spells and rules — no interruptions

**Aha Moment:** First session end-to-end with zero tab switches.

**Long-term:** App is open every session. He shares the link with the group.
Camila joins. The group becomes a locked-in unit.

#### Camila's Session Night

**Discovery:** Rafael shares the link — zero friction entry.
**Core Usage:** Mobile. Sees initiative board live, checks her spells, reads
conditions applied to her character.
**Aha Moment:** Knows it's her turn before it's called.

---

### Scope Note

**projeto-rpg is in-person first.** Online/VTT play is explicitly out of scope
for V1. The product is designed for groups at a physical table, optimized for
laptop (DM) + mobile (players) as the primary device split.

---

## Success Metrics

### User Success Metrics

Success for Rafael looks like three behavioral shifts:

1. **Weekly activation** — opens the app every session (weekly or bi-weekly cadence)
2. **Tool displacement** — stops opening D&D Beyond, 5e.tools, or a spreadsheet
   tracker in parallel during combat
3. **Organic referral** — shares the app with another DM unprompted

These are the three signals that the product is creating real value, in order of
depth: activation → retention → advocacy.

---

### Business Objectives

**3-month goal:** Establish a core base of active DM users running real sessions
with the app as their primary combat tool.

**6-month goal:** Grow the user base through DM-to-group viral spread — each DM
who adopts brings 4–5 players, compounding total registered users.

**12-month goal:** Measurable word-of-mouth growth among DM communities
(Reddit, Discord) with no paid acquisition required in V1.

---

### Key Performance Indicators

#### Activation
- % of registered DMs who run at least one full combat session within 7 days
  of sign-up
- **Target:** >50% within first week

#### Retention (North Star Metric)
- % of DMs who return to run a session the following week or within 14 days
- **Target:** >40% week-2 retention
- **Warning signal:** <25% — product is not solving the problem well enough
  to displace existing habits

#### Engagement depth
- Average session length inside the app (proxy for "ran a full combat")
- % of sessions where both DM view (laptop) and player view (mobile) are active
  simultaneously — confirms the group dynamic is working

#### Viral coefficient
- Average number of players who join per active DM
- **Target:** ≥3 players per DM within first month of DM's use

#### Tool displacement (qualitative → quantitative)
- Survey at day 30: "Are you still using other tools alongside this app during
  combat?" — goal is to see this decline over cohorts

---

### Warning Signals

| Signal | What it means |
|--------|--------------|
| DM opens app but doesn't complete a full session | Onboarding friction or UX problem |
| DM returns for session 1 but not session 2 | Core value not delivered in first real use |
| Zero players join from a DM's group | Player view not compelling enough to share |
| High mobile bounce rate | Rules oracle too slow or hard to navigate |

---

## MVP Scope

### Core Features (V1 — Non-Negotiable)

The MVP is a single, excellent combat companion for D&D 5e (2014 + 2024).
Everything below must work flawlessly before anything else is built.

#### 1. Combat Tracker
- Initiative order with automatic sorting
- **Tiebreaker system:** when two combatants tie, DM manually decides order
  (drag-to-reorder or explicit "goes first" prompt — no auto-roll)
- Per-combatant tracking: name, HP (current/max), AC, spell save DC
- Applies to both monsters and player characters in the same unified view
- Configurable — DM can add, remove, reorder, and edit any combatant mid-combat

#### 2. Authentication + Saved Profiles
- Login system (email or social auth)
- **Saved player profiles** — DM enters player name, HP, AC, DC once per
  campaign and loads them at the start of every session
- No re-entry of player data between sessions; zero-friction session start

#### 3. Monster Stat Blocks
- Full SRD stat blocks accessible directly from the combat tracker
- Fast lookup — tap monster name to expand full stat block without leaving combat
- Supports both **D&D 5e 2014** (SRD 5.1) and **D&D 5e 2024** (SRD 5.2)
- Searchable monster database (name, CR, type)

#### 4. Spell List + Descriptions
- Complete SRD spell list for D&D 5e 2014 and 2024
- Full spell descriptions accessible as **modal overlays** — opens in-context
  without navigating away from the session view
- Searchable by name, class, level, school
- Accessible from both DM view (laptop) and player view (mobile)

#### 5. Dual Rules Version Support
- D&D 5e **2014** (SRD 5.1, CC-BY-4.0) and **2024** (SRD 5.2, CC-BY-4.0)
  supported from day one
- Rules version is a **first-class field** in the data model — not a filter
  bolted on later; monsters and spells are versioned at the data layer
- DM selects ruleset per session; content clearly labeled by version

---

### Out of Scope for MVP

| Feature | Rationale |
|---------|-----------|
| Battle maps / VTT | Online-first feature; MVP is in-person only |
| Full character builder | V1 tracks name/HP/AC/DC only; full sheets are V2 |
| Music / ambient sound | Nice-to-have; doesn't affect core combat flow |
| AI features | High value, high complexity; V2+ differentiator |
| Session scheduling | Outside combat session scope |
| Campaign notes / wiki | V2 campaign management layer |
| Other RPG systems | V1 is 100% D&D 5e 2014 + 2024 only |
| Homebrew content creation | V2 after core is validated |
| Marketplace / content store | V2+ business model feature |

---

### MVP Success Criteria

- DM runs a full session without opening another tab or tool
- Week-2 retention >40% among first cohort
- ≥3 players join per active DM within 30 days
- Day-30 survey shows tool displacement from at least one previous tool

Go/no-go for V2: retention >40% + viral coefficient ≥3 players per DM.

---

### Future Vision (V2+)

**V2 — The Full Session Companion:**
Full character sheets, campaign management (notes, NPCs, loot),
music/ambient integration, session scheduling.

**V3 — The Platform:**
AI features (recaps, NPC gen, encounter suggestions), homebrew tools,
multi-system support, creator marketplace.
