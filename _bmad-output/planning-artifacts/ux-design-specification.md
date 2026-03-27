---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
status: complete
lastRevision: 2026-03-27
revisionNotes: "V2 Addendum: UX specs para todas as features do PRD V2 — mid-combat add, display names, monster grouping, late-join, turn notifications (Novu), auto-join (Presence), GM notes, file sharing, freemium gating, CR calculator, homebrew, role selection. Integração com Magic UI + Framer Motion para player view."
inputDocuments: ["_bmad-output/planning-artifacts/prd.md", "docs/prd-v2.md", "_bmad-output/planning-artifacts/product-brief-projeto-rpg-2026-03-23.md", "_bmad-output/planning-artifacts/architecture.md", "_bmad-output/planning-artifacts/epics.md", "docs/tech-stack-libraries.md", "referencia visual/ro-modern/css/theme.css", "referencia visual/ro-modern/preview.html", "referencia visual/ro-modern/header.php"]
---

# UX Design Specification projeto-rpg

**Author:** Dani_
**Date:** 2026-03-24

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision

projeto-rpg is an in-person/hybrid-first D&D 5e combat companion that unifies initiative tracking, HP management, monster stat blocks, spell lookups, and condition rules into a single session interface. The DM operates from a laptop command center; players follow along on mobile via a shareable session link (no login required). The product supports D&D 5e 2014 (SRD 5.1) and 2024 (SRD 5.2) as co-equal versioned rulesets. The core UX promise: a DM runs a full combat session without opening another tab.

### Target Users

**Primary — Rafael (DM, Acquisition Driver):** Tech-comfortable, runs weekly sessions at a physical table from a laptop. Currently juggles 3–5 disconnected tools (D&D Beyond, 5e.tools, spreadsheets, paper notes). Needs a single-screen command center that combines combat state + rules reference + player data. Success: runs a full session without tab-switching.

**Secondary — Camila (Player, Retention Mechanism):** Mobile-only, joins via DM-shared link. Needs to see initiative order, check spells, and know her turn — without interrupting the DM. One DM adoption brings 4–6 players. Player engagement is the retention lock and viral growth engine.

**Admin — Dani_ (Operations):** Content corrections (SRD data), usage metrics (retention, activation, viral coefficient), user account management. Needs a lightweight admin panel, not a full CMS.

### Key Design Challenges

1. **Dual-surface UX with distinct mental models** — DM view (desktop, dense, keyboard-navigable command center) and player view (mobile, lean, touch-optimized read-only companion) are two fundamentally different interfaces for two different user postures. Rafael is in *control mode* (managing, deciding, clicking fast); Camila is in *awareness mode* (watching, checking, staying ready). They must be designed as independent experiences sharing a single real-time session state, not responsive variants of one layout.

2. **Zero-interruption combat flow** — every reference action (spell lookup, stat block, condition rules) must be accessible via overlay or inline expansion without navigating away from the active combat tracker. The oracle should feel like a fluid dip-in/out — enabled by ≤300ms client-side search — not a separate "open and close" experience. One wrong navigation breaks the session flow.

3. **Information density without cognitive overload** — a combat encounter with 8+ combatants must be scannable at a glance. The solution is a strict three-tier information hierarchy:
   - **Zero-tap (always visible):** Whose turn it is, HP (current/max), round counter, monster condition badges
   - **One-tap (expand on click):** Full stat block, AC, spell save DC, detailed condition descriptions
   - **Search-only (oracle):** Spell descriptions, rules text, monster database browsing

### Design Opportunities

1. **Define the "DM command center" category** — no existing tool treats the DM's laptop screen as a unified combat cockpit. This is a chance to establish a new UX paradigm for physical-table play: mission control, not a VTT.

2. **Player join experience as viral engine** — zero-login, instant-view player onboarding turns every session into a growth event. If the player view is delightful within 10 seconds of opening the link, word-of-mouth follows naturally.

3. **Dark mode as ambient design** — the default dark theme (#1a1a2e) isn't just accessibility — it's atmosphere. Sessions run in dimly lit rooms; the visual language can reinforce the fantasy/tabletop mood, creating emotional resonance that competitors' sterile interfaces lack.

### Key Design Decisions (Established)

- **Monster HP is DM-only.** Players do not see monster HP in the player view. This preserves table tension and matches real-world DM behavior. No toggle in V1; can be revisited in V2 if demanded.
- **Player zero-tap layer:** Initiative order, turn indicator, own character HP, round counter. No monster data beyond names and initiative position.

## Core User Experience

### Defining Experience

The defining experience of projeto-rpg is the **combat turn loop**: the DM advances to the next combatant, scans their status at a glance (HP, conditions), resolves the action (referencing stat blocks or spells via one-tap/oracle as needed), updates HP, and moves on. This loop repeats dozens of times per session and must feel instant, fluid, and uninterruptible. For players, the defining experience is **passive awareness** — knowing whose turn it is, seeing their own HP, and checking spells without asking the DM.

### Platform Strategy

- **Web application (SPA/PWA)** — no native app install required
- **DM view: Desktop/laptop** — mouse + keyboard primary, touch secondary. Dense information layout, keyboard-navigable (NFR25)
- **Player view: Mobile** — touch-only, read-only companion. Minimum 44×44px tap targets (NFR24)
- **Offline resilience:** SRD content cached locally (IndexedDB) after first load. Oracle functions even if connection drops. Combat state syncs on reconnect
- **Dark mode default** (#1a1a2e) — optimized for dimly lit session environments

### Effortless Interactions

1. **Session setup** — DM loads a saved player group and adds monsters by search. Target: ≤3 minutes for a first-time DM, under 1 minute for returning DMs
2. **Player join** — open a shared link, see combat immediately. Zero login, zero setup, zero explanation needed
3. **Spell/rule lookup** — search by name, modal appears with full description, dismiss and return to combat. Fluid dip-in/out enabled by ≤300ms client-side search
4. **HP adjustment** — tap combatant, enter damage or healing, see result instantly (optimistic UI). The most frequent combat action must require the fewest interactions
5. **Turn advancement** — one action to move to the next combatant. The tracker highlights the active turn automatically

### Critical Success Moments

1. **"I didn't open another tab"** — Rafael finishes a full combat session using only projeto-rpg. This is the moment the product proves its value. If this doesn't happen in session one, retention fails
2. **"I already know it's my turn"** — Camila sees the turn indicator update on her phone before Rafael announces it. The real-time sync creates a sense of connection to the combat
3. **First encounter setup under 3 minutes** — a new DM creates an encounter, adds players, and starts combat without a tutorial. If setup feels like work, activation drops
4. **First spell lookup in combat** — DM or player searches a spell, reads the answer in the modal, closes it, and combat continues without a beat. The oracle proves itself in one interaction

### Experience Principles

1. **Zero-navigation combat** — every action the DM takes during combat happens within the tracker view. Lookups overlay; they never navigate away
2. **Scannable at rest, complete on demand** — the default state shows only what's needed at a glance (turn, HP, round, conditions). Full detail is one tap away, never forced
3. **Two views, one session** — DM and player experiences are designed independently but share a single real-time state. The DM controls; the player observes
4. **Speed is the feature** — setup speed, lookup speed, interaction speed, sync speed. Every millisecond of friction erodes the session flow. Performance is UX
5. **The table is the context** — design for dimly lit rooms, side conversations, physical dice, and phones on the table. The app serves the table; the table doesn't serve the app

## Desired Emotional Response

### Primary Emotional Goals

**Rafael (DM) — "I'm in control."**
The dominant feeling is mastery without effort. Rafael should feel like the app is an extension of his DM brain — not a tool he's operating, but a surface that responds to his intent. The combat flows because the app flows. The emotional arc: setup feels quick → combat feels tight → session end feels clean. The summary emotion: *confident command*.

**Camila (Player) — "I'm part of this."**
Camila should feel included in the combat without needing to ask for information. The initiative board on her phone makes her an active participant, not a passive observer waiting for her name to be called. The summary emotion: *engaged awareness*.

**Both — "Nossa, isso aqui facilitou minha vida."**
The shared emotional signal is relief. The moment the table realizes they're not juggling tools anymore — that's the feeling that drives retention and word-of-mouth. It's warm, casual, Brazilian "entre amigos" energy: this thing just works, and it feels like it was made for us.

### Emotional Journey Mapping

| Stage | Rafael (DM) | Camila (Player) |
|-------|-------------|-----------------|
| Discovery | Curiosity → "Finally, someone gets it" | N/A (arrives via DM link) |
| First setup | Slight effort → "That was fast" | Opens link → "Oh, I can see everything" |
| First combat | Focus → flow → "I didn't leave the app once" | Watching → "I know it's my turn" |
| Something breaks | Brief concern → "It recovered on its own" (calm confidence) | Momentary freeze → screen updates → moves on |
| Session end | Satisfaction → "I'm using this next week" | "Tell your DM about this app" |
| Return visit | Familiarity → "My group is already loaded" | Opens link again → instant recognition |

### Micro-Emotions

**Confidence over confusion** — Every interaction must feel predictable. The DM should never wonder "did that save?" or "where did that go?" Optimistic UI and clear feedback reinforce confidence at every step.

**Calm over anxiety** — When connection drops or a mistake is made (wrong stat block, wrong HP), the recovery should feel unremarkable. No error modals, no panic states. The app recovers quietly. The DM barely notices.

**Accomplishment over frustration** — Setting up a first encounter should feel like a small win, not a chore. Progressive disclosure means the DM only sees what they need, when they need it.

**Belonging over isolation** — The player view creates a shared experience. Camila seeing the initiative update in real time is a micro-moment of connection — she's *in* the combat, not outside it looking in.

### Design Implications

- **Confident command** → Optimistic UI everywhere. Actions take effect instantly. No loading spinners during combat. Server sync is invisible.
- **Calm recovery** → Reconnect is automatic and silent. A subtle "reconnecting..." indicator, not a blocking modal. State is never lost.
- **Warm and casual tone** → UI copy should be direct, friendly, and low-ceremony. No corporate language. Error messages should feel like a friend explaining, not a system warning.
- **Engaged awareness (player)** → The player view should feel alive — subtle animations on turn changes, smooth HP transitions. Not static; gently dynamic.
- **Atmospheric but not theatrical** → Dark theme (`#13131e`) with gold accent (`#d4a853`) and layered background depth (noise texture + radial gradients). The app should feel like it belongs at the table — not a spreadsheet, not a video game. Functional atmosphere. Fantasy-register headings (Cinzel) and gold glow on interactive elements reinforce the D&D aesthetic without crossing into theme-park territory.

### Emotional Design Principles

1. **Invisible technology** — The best session is one where no one talks about the app. It should fade into the background of the table experience, felt but not noticed.
2. **Quiet confidence** — The app never asks "are you sure?" during combat. Actions are reversible, not guarded. Trust the DM.
3. **Warm minimalism** — Clean and lean, but not cold. The dark theme, warm accents, and friendly copy create a space that feels human, not clinical.
4. **Shared presence** — Real-time sync isn't just a feature — it's an emotional connector. The player view makes the table feel more connected, not more digital.

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**4. Liberty RO / ro-modern (Ragnarok Online fan server theme)**
- Does well: Dark premium theme that balances information density with atmospheric depth. Proves that a functional app UI can carry fantasy aesthetic weight without sacrificing usability. Key techniques: near-invisible borders (`rgba(255,255,255,0.08)`), layered background (noise + radial gradients), `Cinzel` for display headings, warm gold (`#D4A853`) as the single dominant accent, `box-shadow` glows as interactive feedback, pixel sprite rendering with `image-rendering: pixelated`.
- UX lesson: The "warm fantasy dark" register is achievable with CSS alone — no images required. The background depth comes from two fixed pseudo-elements; the fantasy feel comes from one display font and one gold accent. Everything else is functional. This proves the aesthetic is maintainable by a solo developer without a design system team.
- Limitation to surpass: It's a marketing/server-info site, not an interactive app. The patterns are adapted here for a real-time, data-dense session tool. Navigation, hover states, and modal patterns are the transferable layer; the server-info content structure is not.
- **Directly transferable to projeto-rpg:** Background noise + depth gradient, `Cinzel` for modal/stat block headings, gold accent system, `box-shadow` glow hover pattern, pixel sprite `image-rendering`, ornamental section dividers, ghost render atmospheric backgrounds.

**1. Improved Initiative (combat tracker)**
- Does well: Stripped-down, fast initiative tracker. Zero learning curve — add names, roll initiative, go. The simplicity is the feature.
- UX lesson: The combat tracker row should feel this lightweight. No feature should add visual weight to the default state. If Improved Initiative is "too simple," projeto-rpg is "just enough."
- Limitation to surpass: No integrated rules reference. No player view. No saved state. projeto-rpg adds these without adding complexity to the core loop.

**2. 5e.tools (rules reference / oracle)**
- Does well: Comprehensive, fast, keyboard-friendly search. Power users love it. The search-first navigation model (type to find anything) is the gold standard for SRD lookup speed.
- UX lesson: The oracle search should feel like 5e.tools' search bar — instant results as you type, filterable, keyboard-navigable. The difference: it lives *inside* the combat view as an overlay, not in a separate tab.
- Limitation to surpass: It's a reference site, not a session tool. No combat integration. No mobile optimization. No real-time sharing.

**3. Linear (project management — unrelated domain)**
- Does well: Dark theme done right — functional, atmospheric, not gimmicky. Information-dense without feeling cluttered. Keyboard shortcuts for power users. Optimistic UI everywhere (actions feel instant).
- UX lesson: The DM view should channel Linear's information density philosophy: clean rows, subtle separators, progressive disclosure on click, and keyboard shortcuts for the most frequent actions (advance turn, adjust HP). The dark theme (#1a1a2e) can take direct cues from Linear's visual language.
- Transferable pattern: Linear's command palette (Cmd+K) is a strong model for the oracle search — a universal search overlay triggered by a keystroke, accessible from anywhere.

### Transferable UX Patterns

**Navigation Patterns:**
- **Command palette / universal search overlay** (from Linear, Spotlight, VS Code) — a single keyboard shortcut opens the oracle search from anywhere in the DM view. Search spells, monsters, conditions, rules — all from one input. This replaces traditional navigation menus during combat.
- **Tab-less single-view architecture** (from Improved Initiative) — the combat tracker is THE view. Everything else layers on top (modals, slide-overs, inline expansions). The DM never "goes to" another page during combat.

**Interaction Patterns:**
- **Inline expansion rows** (from email clients, Notion tables) — tap a combatant row to expand it. Full stat block, editable fields, condition management all appear inline. Tap again or tap another row to collapse. No modal for the tracker itself.
- **Modal overlay for reference content** (from 5e.tools, dictionary apps) — spell descriptions and condition rules appear as modals with a dimmed backdrop. One tap or Escape to dismiss. The combat state is visible behind the dim — never fully hidden.
- **Optimistic UI with silent sync** (from Linear, Figma) — every DM action (HP change, turn advance, condition apply) takes effect visually before server confirmation. No spinners, no "saving..." text. If sync fails, a gentle toast; never a blocking error.

**Visual Patterns:**
- **Dark theme with warm accents** (from Linear, Spotify, ro-modern) — `#13131e` background with layered depth (noise + radial gradient), muted text for secondary info, gold (`#d4a853`) as the dominant accent for active turn and primary actions, orange-red (`#e8593c`) exclusively for danger/critical states. Avoids cold blue-heavy palettes. Avoids neon pink-red as a primary accent (cyberpunk register, wrong genre).
- **HP as horizontal progress bar** (from game UIs, health bars) — a thin colored bar beneath or beside the HP numbers. Green → yellow → red gradient communicates health status at a glance without reading numbers. Combined with text labels for accessibility (NFR21).
- **Condition badges as compact pills** (from GitHub labels, Jira tags) — conditions displayed as small colored pills with short text (e.g., "Stunned", "Poisoned") directly on the combatant row. Scannable, stackable, color-coded but always with text.

### Anti-Patterns to Avoid

1. **Feature-stuffed combat rows** — D&D Beyond's encounter tracker shows too much per combatant (full stat blocks visible by default). This creates visual noise that makes scanning impossible with 8+ combatants. projeto-rpg must resist this: the collapsed row is lean (turn, name, HP, conditions). Detail is one tap away, never forced.

2. **Full-page navigation for lookups** — any tool that navigates away from the combat view to show a spell or monster forces the DM to lose context. The oracle must always be an overlay, never a route change.

3. **Confirmation dialogs during combat** — "Are you sure you want to deal 15 damage?" breaks flow. Combat actions should be instant and undoable, not guarded. Trust the DM.

4. **Mobile-as-shrunken-desktop** — responsive scaling that crams the desktop DM view into a phone screen. The player view must be designed for mobile from scratch — not adapted from the desktop layout.

5. **Login walls for players** — any friction between "DM shares link" and "player sees combat" kills the viral loop. No signup, no login, no cookie consent modal before the initiative board.

### Design Inspiration Strategy

**Adopt:**
- Command palette search overlay for the oracle (Linear/VS Code model)
- Optimistic UI on all combat actions (Linear/Figma model)
- Dark theme with warm accents and health bar visualization (game UI conventions)
- Condition badges as compact pills (GitHub/Jira label pattern)
- Background noise texture + radial depth gradient (ro-modern technique) — applied to `body` via CSS pseudo-elements, no images
- `Cinzel` display font for modal titles, stat block section headers, round counter (ro-modern/fantasy convention)
- Gold (`#d4a853`) as the dominant accent — active turn, primary CTA, hover glow (ro-modern palette, adapted from `#D4A853`)
- `box-shadow` glow as the hover feedback system — `rgba(212,168,83,0.2–0.4)` scale (ro-modern pattern)
- `image-rendering: pixelated` for all pixel-art sprite assets (ro-modern `.sprite-icon` technique)
- Ornamental section dividers (line + central icon + line) inside stat block modals (ro-modern `.ro-divider` pattern)
- Ghost render atmospheric backgrounds for empty/onboarding states (ro-modern `.mvp-ghost` technique)

**Adapt:**
- 5e.tools' search-first navigation — adapt as an overlay inside the combat view, not a standalone page
- Improved Initiative's lightweight tracker rows — add one-tap expansion for stat blocks while preserving the default leanness
- Linear's keyboard shortcut system — adapt for DM-specific actions (advance turn, open oracle, adjust HP)
- ro-modern's `.navbar-server-time` pattern (monospace clock in header) — adapt as round counter + sync indicator in the DM view header bar

**Avoid:**
- D&D Beyond's information-dense default state
- Full-page navigation during combat
- Confirmation dialogs on combat actions
- Responsive shrinking instead of purpose-built mobile view
- Any login requirement before the player view
- ro-modern's decorative animations (poring-hop, magic-rotate, fog-drift) in the combat tracker — atmospheric motion is fine in onboarding/marketing surfaces but strictly forbidden in the active combat view where they compete with functional state changes

## Design System Foundation

### Design System Choice

**Themeable system: Tailwind CSS + shadcn/ui** (pre-decided in architecture)

shadcn/ui is an unstyled-first, accessible component library built on Radix UI primitives, styled with Tailwind CSS. It provides the building blocks (Dialog, DropdownMenu, Button, Toast, Command, etc.) while giving full control over visual design. Components are copied into the project — not imported from a package — so they're fully customizable with zero dependency lock-in.

### Rationale for Selection

- **Already in the starter template** — the `with-supabase` Next.js template includes shadcn/ui and Tailwind CSS out of the box. No additional setup required.
- **Accessibility built in** — shadcn/ui is built on Radix UI, which handles ARIA attributes, keyboard navigation, and focus management automatically. This directly supports WCAG 2.1 AA (NFR20) and keyboard-navigable DM view (NFR25).
- **Dark mode native** — Tailwind's `class` strategy for dark mode and shadcn/ui's theming system support the #1a1a2e dark default with minimal configuration.
- **Solo developer speed** — pre-built accessible primitives (Dialog for spell oracle, Command for search palette, DropdownMenu for conditions, Toast for errors) accelerate V1 development without sacrificing quality.
- **Full visual control** — unlike Material UI or Ant Design, shadcn/ui imposes no visual opinion. The "warm minimalism" aesthetic, fantasy-tinged accents, and combat-optimized layouts can be built without fighting the framework.

### Implementation Approach

**Key shadcn/ui components mapped to produto features:**

| Component | Feature Use | Notes |
|-----------|------------|-------|
| `Command` | Oracle search palette (Cmd+K) | Fuzzy search over Fuse.js results |
| `Dialog` | Spell description modal overlay | Dimmed backdrop, Escape to dismiss. Modal title in Cinzel. |
| `Sheet` | Mobile slide-over panels | Player view spell details |
| `DropdownMenu` | Condition selector, version switcher | Keyboard-navigable |
| `Toast` | Silent error/sync feedback | Non-blocking, auto-dismiss |
| `Button` | Turn advance, HP adjust, actions | 44×44px minimum on mobile. Gold glow on hover. |
| `Badge` | Condition pills on combatant rows | Color-coded + text labels |
| `Tooltip` | AC, DC, secondary info on hover | Desktop DM view only |
| `Collapsible` | Inline stat block expansion | Combatant row expand/collapse. Stat section headers in Cinzel. |

**Tailwind design tokens to define:**

- **Colors:** Background (`#13131e`), surface layers (`#1a1a28`, `#222234`), gold accent (`#d4a853`), danger accent (`#e8593c`), cool accent (`#5b8def`), HP gradient (green → yellow → red), condition badge palette, muted text, glow values (`rgba(212,168,83,0.35)`)
- **Typography:** Cinzel for display headings, Inter for body (16px minimum), JetBrains Mono for numbers
- **Spacing:** Compact for DM desktop rows (information density), generous for mobile tap targets (44×44px)
- **Borders/Shadows:** Near-invisible borders (`rgba(255,255,255,0.08)`), gold glow on hover, soft elevation for modals
- **Background layers:** Noise texture (fractal SVG, opacity 0.025) + radial depth gradient (blue top-left, gold bottom-right)

### Customization Strategy

1. **Theme layer first** — define all custom colors, spacing, typography, and glow values as Tailwind theme extensions in `tailwind.config.ts`. No hard-coded values in components. Includes `fontFamily.cinzel`, `colors.accent`, `colors.accent-danger`, `colors.gold-glow`, and `boxShadow.gold-glow`.
2. **Component variants** — create combat-specific variants of shadcn/ui components (e.g., `CombatantRow` built on `Collapsible`, `OracleSearch` built on `Command`).
3. **Two breakpoint systems** — DM view components use dense spacing/smaller text; player view components use generous spacing/larger tap targets. Not responsive scaling — separate component configurations.
4. **Animation tokens** — define subtle transition durations for HP bar changes, turn indicator shifts, and modal open/close. Keep animations fast (150–200ms) and purposeful — no decorative motion. Atmospheric animations (noise, depth gradients) are static CSS — no JavaScript or keyframes required.
5. **CSS layer architecture** — three layers in `globals.css`: (1) background atmosphere (`body::before`, `body::after` — noise + gradient), (2) design tokens (CSS custom properties), (3) component styles. This order ensures atmosphere layers are always below content z-index.

## Defining Core Experience

### Defining Experience

**"Run your whole combat from one screen."**

The defining interaction of projeto-rpg is the **combat turn loop within the tracker view**. The DM sees the initiative list, identifies the active combatant (highlighted), taps to expand their stat block, resolves the action (adjust HP, check a spell via oracle, apply a condition), collapses, and advances to the next turn. This loop repeats 30–60+ times per session. If it feels effortless, the product wins. If it feels clunky even once, the DM opens another tab — and the promise breaks.

For players, the defining experience is simpler: **"I can see the combat on my phone."** Open a link, see the initiative board, know whose turn it is, check a spell. That's it. That simplicity is the viral trigger.

### User Mental Model

**Rafael (DM) — "Digital DM screen"**
Rafael's mental model is the physical DM screen — the cardboard divider behind which he manages the game. projeto-rpg replaces that screen with a digital one. He expects to see everything he needs at a glance (initiative order, HP, conditions) and reach deeper info (stat blocks, spells) with one action. He does NOT think of this as "an app with features" — he thinks of it as "my combat dashboard." The UX must match that mental model: one surface, everything accessible, nothing hidden behind menus.

**Camila (Player) — "Scoreboard"**
Camila's mental model is a live scoreboard — like checking a sports score on her phone. She glances, gets the state (whose turn, what's my HP, what round), and puts the phone down. Occasionally she searches a spell. She does NOT think of this as "a D&D app" — she thinks of it as "the thing Rafael put on the table." The player view must match that: glanceable, passive, and instantly useful.

**Current workarounds they bring:**
- DM: Multiple browser tabs (D&D Beyond, 5e.tools, spreadsheet, paper). The mental model is "juggle" — projeto-rpg replaces juggling with a single surface.
- Player: Ask the DM. The mental model is "interrupt" — projeto-rpg replaces interrupting with self-service.

### Success Criteria

| Criteria | Measure | Why it matters |
|----------|---------|----------------|
| Turn loop feels instant | HP adjust + turn advance in <2 seconds of user action | The loop repeats 30–60+ times; any friction compounds |
| Stat block access is one tap | Tap combatant name → full stat block visible | Two taps = too many. DM must not hunt for information |
| Oracle doesn't break flow | Search → read → dismiss in <10 seconds total | If it takes longer, the DM reverts to another tab |
| Player view is glanceable | Camila understands combat state in <3 seconds of looking | If she has to scroll or parse, she stops checking |
| Session setup is forgettable | Returning DM loads saved group + adds monsters in <1 minute | Setup should feel like "opening the app," not "configuring the app" |
| Errors are invisible | Connection drop + recovery noticed by 0 players | If a player says "it froze," the emotional contract breaks |

### Novel UX Patterns

**Combination of established patterns, applied to an unoccupied context:**

projeto-rpg does not invent new interaction paradigms. Every pattern is proven:
- Inline row expansion (email clients, Notion)
- Command palette search (Linear, VS Code)
- Modal overlays (dictionary apps, 5e.tools)
- Optimistic UI (Figma, Linear)
- Real-time sync (Google Docs, Figma)
- Health bars (every game UI ever)

**The innovation is the combination and the context.** No product has assembled these patterns into a unified combat cockpit designed for a DM at a physical table. The novelty is not in the interaction — it's in the product architecture. Users will not need to learn anything new; they will recognize every pattern instantly.

**Teaching cost: near zero.** The DM opens the app, sees a list of combatants, taps one, sees its stats. No tutorial. No onboarding wizard. The UI teaches itself because every pattern is already familiar.

### Experience Mechanics

**The Combat Turn Loop (DM):**

**1. Initiation — "Whose turn is it?"**
- The active combatant row is visually highlighted (accent color background + turn indicator icon)
- Round counter visible in a persistent header ("Round 3")
- The DM's eyes land on the highlighted row without searching

**2. Interaction — "What do they do?"**
- **Tap combatant name** → row expands inline: full stat block (abilities, attacks, actions), AC, spell save DC, condition management
- **Need a spell?** → Cmd+K (or tap search icon) opens the oracle command palette. Type spell name, see results instantly (Fuse.js, <300ms), select → modal overlay with full description. Escape/tap outside → dismiss, back to tracker
- **Adjust HP** → click HP value on the row, type damage/healing, Enter. Optimistic UI: HP bar and number update instantly. If temp HP exists, it absorbs first automatically
- **Apply condition** → dropdown on the expanded row. Select "Stunned" → badge appears on the collapsed row immediately
- **Switch ruleset** → version toggle on expanded row (2014 ↔ 2024). Stat block swaps in place. No other state affected

**3. Feedback — "Did it work?"**
- HP bar animates smoothly (green → yellow → red transition)
- Condition badge appears on the row with a subtle fade-in
- Toast only on error (sync failure) — success is silent
- Player views update in real time (<500ms) — the DM sees the same state the players see

**4. Completion — "Next turn"**
- DM clicks "Next Turn" button (or keyboard shortcut)
- Highlight moves to next combatant. Previous row auto-collapses if expanded
- If round completes, round counter increments
- If combatant is defeated (0 HP), visual dimming + option to remove from initiative

**The Player Glance Loop (Camila):**

**1. Initiation** — Opens phone, sees initiative board
**2. Interaction** — Scans for highlighted turn, checks own HP, optionally searches a spell
**3. Feedback** — Turn indicator moves, HP updates animate, spell modal opens/closes
**4. Completion** — Puts phone down. Picks it up again next turn.

## Visual Design Foundation

> **IMPORTANT — Deprecation notice for old stories:** Many implementation artifacts (stories 1.x–7.x) reference `#e94560` (old pink-red accent) and `bg-[#16213e]` (hardcoded surface color). These are **superseded** by this specification. The actual codebase already uses gold (`#D4A853`) and theme tokens (`bg-card`, `bg-background`). When implementing or reviewing any story, **always follow the color rules in this document**, not the hardcoded hex values in older stories. Use Tailwind theme tokens (`bg-card`, `text-foreground`, `bg-background`) — never hardcoded hex colors.

### Color System

**Base palette (dark mode default — not a toggle, the default):**

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#13131e` | App background — deeper dark, aligns with ro-modern baseline; reduces halation more than the earlier `#1a1a2e` |
| `surface` | `#1a1a28` | Card/panel surfaces, combatant rows |
| `surface-alt` | `#16213e` | Alternate section surfaces (campaign detail panels) |
| `surface-elevated` | `#222234` | Modals, overlays, expanded stat blocks |
| `border` | `rgba(255,255,255,0.08)` | Subtle row separators — near-invisible, creates depth without weight |
| `border-hover` | `rgba(255,255,255,0.15)` | Border on hover states, focus rings |
| `accent` | `#d4a853` | **Gold** — active turn highlight, primary CTA, Cinzel heading accents. Shifted from pink-red (`#e94560`) to warm gold: more legible on dark surfaces, thematically aligned with D&D treasure/power aesthetic, consistent with fantasy UI convention (see ro-modern rationale below) |
| `accent-danger` | `#e8593c` | Critical states (0 HP warning, error indicators, "defeated" dimming). Replaces the former `accent` pink-red, now reserved for danger/destruction contexts only |
| `accent-cool` | `#5b8def` | Version badge 2024, link text, secondary interactive states |
| `text-primary` | `#e8e6e0` | Main text — slightly warm white (not pure `#ffffff`), reduces eye strain in dark rooms. Headings, combatant names, HP values |
| `text-secondary` | `#9896a0` | Secondary text — labels, metadata, AC/DC values |
| `text-muted` | `#5c5a65` | Placeholder text, disabled states, tertiary metadata |
| `hp-high` | `#48bb78` | HP bar: ≥50% |
| `hp-mid` | `#ed8936` | HP bar: 25–49% |
| `hp-low` | `#e53e3e` | HP bar: <25% |
| `hp-temp` | `#9f7aea` | Temporary HP overlay on bar |
| `success` | `#2dd4bf` | Positive feedback toasts, "online" status indicator (teal — avoids conflict with hp-high green) |
| `error` | `#e8593c` | Error toasts, defeated combatant dimming (same as accent-danger) |
| `gold-glow` | `rgba(212,168,83,0.35)` | box-shadow glow value for accent hover states |

**Accent color rationale — gold over pink-red:**
The original `#e94560` accent came from a cyberpunk/anime register. For a D&D combat companion, warm gold (`#d4a853`) is more contextually resonant: it evokes candlelight, treasure, magic circles, and the brass/gold aesthetic of physical D&D books and dice. It also provides better contrast against the blue-shifted dark background (`#13131e`) than the pink-red. `#e8593c` is retained for danger states (near-death, errors) where the warm-orange-red communicates urgency without the neon pink association.

**Contrast compliance:** All text/background combinations meet WCAG 2.1 AA (≥4.5:1 for body, ≥3:1 for large text). Color never used as sole indicator (NFR21).

**Condition badge palette (color + text label always paired):**
Blinded (gray), Charmed (pink), Frightened (purple), Grappled (orange), Incapacitated (`#e8593c` red), Invisible (blue-gray), Paralyzed (dark red), Petrified (stone gray), Poisoned (green), Prone (brown), Restrained (teal), Stunned (`#d4a853` yellow-gold), Unconscious (black with white text).

### Action Color Semantics (Button Rules)

**Principle: Form follows function. Every color must carry semantic meaning. Never use color for decoration.**

Inspired by [Kastark Encounter Tracker](https://kastark.co.uk/rpgs/encounter-tracker/) (single green accent for the only constructive action) and [5e.tools Bestiary](https://5e.tools/bestiary.html) (blue=include, red=exclude filter semantics).

**Color budget — strict semantic mapping:**

| Color | Semantic | Tailwind | When to use |
|-------|----------|----------|-------------|
| **Gold** (`#D4A853`) | Primary CTA — the single most important action per screen | `bg-gold` | Start Combat, Next Turn. Max ONE gold button per viewport. |
| **Emerald/Green** | Constructive/additive | `bg-emerald-600` (solid) or `bg-emerald-900/30 text-emerald-400` (subtle) | Add combatant, Heal mode, Revive. Any action that creates or restores. |
| **Red** | Destructive/dangerous | `bg-red-600` (solid) or `bg-red-900/20 text-red-400` (subtle) | Remove, Damage mode, End encounter, Defeat. Any action that destroys or ends. |
| **Purple** | Special/magical | `bg-purple-600` (solid) | Temp HP mode. Reserved for supernatural/temporary states. |
| **Neutral** | Secondary/chrome | `bg-white/[0.06] hover:bg-white/[0.10]` | Panel toggles (HP, Conditions, Edit), version switch, pin. Actions that open panels, not direct state changes. |

**Solid vs Subtle variants:**
- **Solid** (`bg-emerald-600`, `bg-red-600`): For primary actions within a context — the Apply button in HP Adjuster, the Add button in setup row.
- **Subtle** (`bg-emerald-900/30 text-emerald-400`): For secondary actions in toolbars — Add mid-combat, End encounter, Defeat toggle.

**Contextual Apply button (HP Adjuster):**
The Apply button in the HP Adjuster panel must match the active mode:
- Damage mode → `bg-red-600` (red = destructive)
- Heal mode → `bg-emerald-600` (green = constructive)
- Temp HP mode → `bg-purple-600` (purple = magical)

This provides instant visual confirmation that the user is about to apply the correct type of HP change.

**Defeat/Revive toggle:**
- Defeat (active combatant → defeated) → red subtle (`bg-red-900/20 text-red-400`)
- Revive (defeated → active) → green subtle (`bg-emerald-900/30 text-emerald-400`)

**Opacity scale (standardized):**
Only three levels allowed for `white/` opacity backgrounds:
- `white/[0.04]` — subtle dividers, row borders, barely-there separators
- `white/[0.06]` — neutral button/element backgrounds
- `white/[0.10]` — hover states, active/selected list items

**Anti-patterns (NEVER do this):**
- ❌ Red button for "Add" anything — red = destroy, not create
- ❌ Gold button for "Add combatant" — gold is reserved for the single most important CTA
- ❌ Same neutral gray for both destructive and constructive actions — user must see intent at a glance
- ❌ Using `white/[0.07]`, `white/[0.08]`, or other off-scale opacities — stick to the 3-level scale

### Typography System

**Font stack:**
- **Display/Fantasy:** `Cinzel` (Google Fonts, serif) — classical Roman letterforms with a high-fantasy register. Used exclusively for decorative headings: modal titles (spell name, monster name), stat block section labels (ACTIONS, REACTIONS, LEGENDARY ACTIONS), round counter display, and page-level headings. Weight 600–700. Letter-spacing: 0.02–0.06em. Never used for body text or interactive controls — legibility at small sizes is poor.
- **Primary:** `Inter` (or system-ui fallback) — clean, readable at small sizes, excellent for dense information layouts. All UI text, labels, combatant names, spell descriptions.
- **Monospace:** `JetBrains Mono` (or `ui-monospace` fallback) — HP numbers, initiative values, stat block numbers, AC, DC, CR. Makes numeric scanning faster. Also used for the server-time clock pattern if ever displayed.

**Font loading strategy:** `Cinzel` loaded via Google Fonts with `display=swap`. Subset to `wght@400;600;700`. Inter loaded as system-ui fallback first — no external load required in most environments. JetBrains Mono loaded via Google Fonts, subset to weights 400 and 700.

**Type scale:**

| Token | Size | Weight | Font | Usage |
|-------|------|--------|------|-------|
| `text-xs` | 12px | 400 | Inter | Condition badges, metadata |
| `text-sm` | 14px | 400 | Inter | Secondary stats (AC, DC), labels |
| `text-base` | 16px | 400 | Inter | Body text, spell descriptions, stat block text (minimum per NFR23) |
| `text-lg` | 18px | 500 | Inter | Combatant names, section headings |
| `text-xl` | 20px | 600 | Inter / JetBrains Mono | HP values (DM view) |
| `text-2xl` | 24px | 700 | JetBrains Mono | HP values (player view), round counter number |
| `text-3xl` | 30px | 700 | **Cinzel** | Modal titles (spell name, monster name), page headings |
| `text-4xl` | 36px | 700 | **Cinzel** | Stat block section headers (ACTIONS), round counter label |

**Cinzel usage rules:**
- ✅ Modal title: `<h2 class="font-cinzel text-3xl">Fireball</h2>`
- ✅ Stat block section headers: `ACTIONS`, `REACTIONS`, `LEGENDARY ACTIONS`
- ✅ Round counter display: `Round 3`
- ✅ Page-level hero headings (dashboard, empty state headline)
- ❌ Never for combatant names in the tracker (too slow to scan)
- ❌ Never for body text, descriptions, or labels
- ❌ Never below 18px (illegible)

**Letter-spacing by font:** Cinzel → `0.04–0.06em`. Inter → default (`0`). JetBrains Mono → `0` (numbers only).

**Line heights:** 1.4 for body text (Inter), 1.2 for Cinzel headings, 1.0 for numbers/badges (JetBrains Mono).

### Spacing & Layout Foundation

**Base unit: 4px.** All spacing is multiples of 4.

**DM view (desktop) — information-dense:**
- Combatant row height: 48px collapsed, auto-height expanded
- Row padding: 8px 12px
- Gap between rows: 2px (separator line)
- Sidebar/panel width (stat block): 320px
- Content max-width: 1200px

**Player view (mobile) — touch-generous:**
- Combatant row height: 64px minimum
- Row padding: 16px
- All tap targets: 44×44px minimum (NFR24)
- Font sizes: +2px vs DM view equivalents
- Own character card: prominent, top of view

**Grid:** No strict column grid for the tracker itself — combatant rows are full-width. Modals and panels use an 8-column grid at 1024px+.

### Atmospheric & Textural Design

These are layered background treatments that create ambient depth without adding interactive noise. All are non-interactive (`pointer-events: none`) and respect `prefers-reduced-motion` (static fallback).

#### Background Texture Layer

A subtle fractal noise texture applied to the `body` via `::before` pseudo-element using an inline SVG data URI:

```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.025;
  pointer-events: none;
  z-index: 0;
}
```

This adds organic texture to the flat background color — visible as a very faint grain that prevents the dark surface from feeling like a void. Opacity 0.025 is the threshold where it reads as atmosphere without appearing as image noise. No external asset required.

#### Depth Gradient Layer

A radial gradient overlay on `body::after` that creates directional lighting — subtle cool-blue from the top-left and warm gold from the bottom-right:

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 15% 0%, rgba(91,141,239,0.10) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 85% 100%, rgba(212,168,83,0.08) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}
```

The two gradients represent the dual accent axes of the product — cool/magical (blue) and warm/power (gold) — manifested as ambient environmental light. All `nav`, `main`, `section`, and modal elements sit on `z-index: 1` above these layers.

**Implementation note:** Both pseudo-elements are `position: fixed` (not `absolute`) so they remain stable during scroll. All content containers must have `position: relative; z-index: 1` to render above them.

#### Hover Glow System

Interactive surface elements use a `box-shadow` glow on hover to create a "magical aura" effect consistent with the fantasy register. This replaces simple border-color transitions:

```css
/* Primary interactive card hover */
.interactive-card:hover {
  border-color: rgba(212,168,83,0.4);
  box-shadow: 0 0 15px rgba(212,168,83,0.2), 0 4px 32px rgba(0,0,0,0.4);
  transform: translateY(-1px);
}

/* Primary button hover */
.btn-primary:hover {
  box-shadow: 0 0 15px rgba(212,168,83,0.4);
  filter: brightness(1.12);
  transform: translateY(-1px);
}

/* Danger/active state glow */
.combatant-row--active {
  box-shadow: inset 0 0 0 1px rgba(212,168,83,0.3),
              0 0 20px rgba(212,168,83,0.08);
}
```

**Glow intensity scale:**
- `0.08–0.10 opacity` — ambient/active state (always-on, non-intrusive)
- `0.20 opacity` — hover state (noticeable but not harsh)
- `0.35–0.40 opacity` — focus/press state (clear feedback)

**Gold glow is the default.** Danger states (defeated combatants, error indicators) use `rgba(232,89,60,0.3)` red glow instead.

#### Pixel Sprite Rendering

Any pixel-art assets (monster token icons, item icons, condition icons if pixel-art style is adopted) must use:

```css
.sprite-icon {
  image-rendering: pixelated;
  image-rendering: crisp-edges; /* Firefox fallback */
  filter: drop-shadow(0 0 6px rgba(212,168,83,0.35));
}
```

Without `image-rendering: pixelated`, browser scaling blurs pixel art into an unreadable smear. The `drop-shadow` filter adds a faint gold halo that makes sprites legible against the dark background.

**Size classes:**
- `sprite-sm`: 32×32px — condition icons, inline badges
- `sprite-md`: 48×48px — combatant row avatar/token
- `sprite-lg`: 64×64px — monster modal header icon

#### Ornamental Section Dividers

Within stat block modals and expanded combatant rows, use a three-part ornamental divider to separate stat sections (Attributes | Actions | Reactions | Legendary Actions):

```css
.stat-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;
}
.stat-divider::before,
.stat-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212,168,83,0.4), transparent);
}
/* Central motif: a d20 SVG icon or ✦ character */
.stat-divider-icon {
  color: rgba(212,168,83,0.6);
  font-size: 0.75rem;
  flex-shrink: 0;
}
```

This pattern comes from ro-modern's `.ro-divider` (which uses a Poring sprite as the central motif). For projeto-rpg, the central motif is a `✦` unicode character or a minimal d20 SVG. Used only inside modals and expanded stat blocks — not in the combat tracker rows themselves (too decorative for fast-scan context).

#### Atmospheric Ghost Renders

Large, low-opacity monster or character silhouettes can be absolutely positioned behind section content to add spatial depth without visual noise. Technique adapted from ro-modern's `.mvp-ghost` pattern:

```css
.section-ghost {
  position: absolute;
  pointer-events: none;
  opacity: 0.035;
  filter: grayscale(100%);
  z-index: 0;
  max-width: 300px;
  height: auto;
}
```

**Usage contexts:**
- **Encounter builder empty state** — faint silhouette of a dragon or dungeon monster in the background of the empty encounter panel
- **Dashboard hero area** — subtle D&D character render behind the "Create your first encounter" CTA
- **Stat block modal** — very faint monster render behind the stat block content area (opacity 0.02, only for large-format modals)

**Implementation constraint:** Ghost renders must NOT appear in the active combat tracker view. The tracker is a zero-distraction context; any decorative background element competes with HP bars and condition badges for attention. Restricted to marketing/onboarding surfaces and modal backgrounds only.

### Accessibility Considerations

- **WCAG 2.1 AA** on all routes (NFR20)
- **No color-only indicators** — HP status uses bar + text + icon; turn indicator uses highlight + arrow icon + text; conditions use color pill + text label (NFR21)
- **Keyboard navigation (DM view):** Tab through combatant rows, Enter to expand, arrow keys for HP adjustment, Cmd+K for oracle, Space to advance turn (NFR25)
- **Screen reader:** Semantic HTML throughout. ARIA labels on all interactive elements. HP bar uses `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. Condition badges use `aria-label="Condition: Stunned"`.
- **Reduced motion:** `prefers-reduced-motion` media query — disable HP bar animation and turn transition animations. Fade-only for modals.
- **Focus management:** Modal open traps focus inside. Escape dismisses and returns focus to trigger element.

## User Journey Flows

### Journey 1: DM — Session Night (Happy Path)

```
[Login / Dashboard] → [Load saved campaign] → [New Encounter]
    → [Search & add monsters] → [Add/load player group]
    → [Set ruleset version] → [Roll initiative → enter values]
    → [Start Combat] →
        LOOP: [View active combatant row (highlighted)]
              → [Expand for stat block if needed]
              → [Adjust HP | Apply condition | Check spell via oracle]
              → [Next Turn]
    → [Combat ends] → [Save / new encounter]
```

**Key UX moments:**
- Dashboard → Encounter: one click to start fresh or resume
- Monster search: type to filter, select to add (no page navigation)
- Initiative entry: click each row, type value, auto-sorts
- Oracle: Cmd+K from anywhere in combat view

### Journey 2: Player — Join & Follow

```
[Receive link from DM] → [Open link on mobile]
    → [Initiative board visible immediately — no login]
    → [See own character HP, current turn highlighted]
    → [Optional: tap oracle icon → search spell → read → dismiss]
    → [Watch HP and turn update in real time]
```

**Key UX moments:**
- Link open → initiative board: <3 seconds, zero friction
- Own character identified: visually distinct row (own character badge)
- Spell search: bottom sheet on mobile, full-screen modal on tap

### Journey 3: DM — Reconnect (Edge Case)

```
[Connection drops mid-combat]
    → [Subtle "reconnecting..." indicator in header bar]
    → [Oracle still functional (cached SRD)]
    → [Connection restored → auto-sync]
    → [All state preserved — initiative, HP, conditions, round]
    → ["reconnecting..." disappears silently]
```

**Key UX moments:** No blocking modal. No data loss. No user action required.

### Journey 4: First-Time DM — Onboarding

```
[Register] → [Dashboard — empty state with guided prompt]
    → [Guided prompt: "Create your first encounter"]
    → [Add monsters: search bar prominent, suggestions shown]
    → [Add players: simple form (name, HP, AC, DC)]
    → [Generate session link — copy to clipboard with one click]
    → [Start combat — initiative entry guided]
```

**Key UX moments:** No tutorial wizard. Empty states guide with one clear action. First session link generated within 3 minutes (NFR5, FR40).

## Component Strategy

### Custom Combat Components

These are combat-specific components built on shadcn/ui primitives:

**`CombatantRow`** (built on `Collapsible`)
- Collapsed: turn indicator | name | HP bar + value | condition badges | version badge
- Expanded: + full stat block | AC | spell save DC | condition selector | version toggle | HP adjust input
- Variants: `monster` (shows CR, type) | `player` (shows class if available) | `defeated` (dimmed, strike-through)

**`OracleSearch`** (built on `Command`)
- Triggered by Cmd+K or search icon tap
- Searches monsters + spells + conditions simultaneously
- Result groups: Spells | Monsters | Conditions
- Select → opens `SpellModal` or `MonsterModal`

**`SpellModal`** (built on `Dialog`)
- Full spell description, components, duration, concentration badge
- Version badge (2014 / 2024) prominent
- Escape or tap outside to dismiss — returns focus to tracker

**`MonsterModal`** (built on `Dialog`)
- Full SRD stat block in standard layout
- Version toggle inline (2014 ↔ 2024)
- "Add to encounter" CTA if opened from oracle (not from tracker row)

**`HPAdjuster`**
- Click HP value → inline input appears
- Accepts positive (heal) or negative (damage) integer
- Enter/blur → applies; temp HP absorbed first automatically
- Keyboard: Up/Down arrows for ±1 increments

**`ConditionSelector`** (built on `DropdownMenu`)
- 13 SRD conditions as checkbox list
- Apply/remove toggles; multiple conditions allowed
- Closes on outside click; selected conditions shown as badges

**`InitiativeList`**
- Full-width list of `CombatantRow` components in initiative order
- Drag-and-drop reorder for tiebreaker resolution (@dnd-kit)
- Sticky header: round counter + "Next Turn" button + oracle trigger

**`PlayerView`** (mobile-only)
- `InitiativeBoard`: read-only list of combatants, own character highlighted
- `OwnCharacterCard`: prominent HP display, own conditions
- `PlayerOracleButton`: floating action button → opens oracle search

### Shared Utility Components

- `VersionBadge`: "2014" / "2024" pill, color-coded (amber/blue)
- `ConditionBadge`: color pill + condition name text
- `HPBar`: animated progress bar, green→yellow→red, aria-compliant
- `SyncIndicator`: subtle header dot — green (synced), amber (syncing), red (reconnecting)
- `RoundCounter`: "Round N" persistent header display

## UX Consistency Patterns

### Loading States
- **Combat actions (HP, conditions, turn advance):** No loading state — optimistic UI only. Silent background sync.
- **Oracle search results:** Instant (Fuse.js client-side). No spinner.
- **Session join (player):** Skeleton loader for initiative board while initial state loads. Max 1s.
- **Page-level navigation:** Next.js loading.tsx skeleton. Not applicable during active combat.

### Error Handling
- **Sync failure (combat action):** shadcn Toast — "Couldn't save change. Retrying..." Auto-retry once. If retry fails: "Change lost — please re-enter." Never blocking.
- **Connection lost:** Header `SyncIndicator` turns red. "Reconnecting..." text. No modal. No action required from user.
- **Oracle offline:** Oracle still functions from IndexedDB cache. No error shown — search works normally.
- **Invalid input (HP adjust):** Inline validation — red border on input, "Enter a number" label. No toast.

### Empty States
- **No campaigns saved:** Dashboard empty state — "No campaigns yet. Create your first encounter →"
- **Empty encounter:** Encounter view with "Add monsters" and "Add players" prominent CTAs
- **No spell results:** Oracle shows "No results for '[query]'" with suggestion to check spelling or try a different term
- **No monsters in search:** Same pattern as spells

### Confirmation Patterns
- **Delete saved campaign:** Confirmation dialog (destructive action, not combat)
- **End session:** Confirmation dialog ("End session? Players will be disconnected.")
- **Remove combatant mid-combat:** No confirmation — action available in expanded row, reversible by re-adding
- **No confirmation for:** HP changes, condition toggles, turn advance, stat block switches — all reversible or low-stakes

### Feedback Patterns
- **Success (combat actions):** Silent — visual state change is the confirmation
- **Success (save/load):** Brief Toast "Campaign saved" (2s, auto-dismiss)
- **Turn advance:** Highlight moves with 150ms transition. Player views update within 500ms.
- **Player joins session:** DM sees subtle toast "Player joined" (non-blocking, 3s)

## Responsive Design & Accessibility

### Breakpoint Strategy

This product has two purpose-built views — NOT a responsive single layout:

| View | Breakpoint | Route | User |
|------|-----------|-------|------|
| DM Command Center | ≥1024px | `/session/[id]` | Rafael (laptop) |
| Player Companion | <768px | `/join/[token]` | Camila (mobile) |
| Tablet | 768–1023px | Both views adapt | Either role |

**Design constraint:** The DM view does not gracefully degrade to mobile. The player view does not scale up to desktop. Each is designed for its primary device. Tablet shows a functional but secondary experience for either role.

### DM View (Desktop) Layout

```
┌─────────────────────────────────────────────────────┐
│ Header: [projeto-rpg] [Round 3] [Next Turn] [🔍 ⚙️] │
├─────────────────────────────────────────────────────┤
│ Initiative List                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ▶ Goblin Boss        ████████░░ 32/45  [Stunned]│ │
│ │ ─ Thorin (Player)    ██████████ 45/45           │ │
│ │ ─ Troll              ██░░░░░░░░  8/80  [Prone]  │ │
│ │ + Add Combatant                                  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ [Session Link: copy] [End Session]                   │
└─────────────────────────────────────────────────────┘
```

**Expanded row (inline):**
```
│ ▶ Goblin Boss        ████████░░ 32/45  [Stunned]    │
│   AC: 15 | DC: 13 | CR: 3 | 2024 ▾                 │
│   HP: [-] [32] [+]   Conditions: [+ Add]            │
│   ─ ACTIONS ──────────────────────────────────────  │
│   Multiattack | Scimitar +4 1d6+2 | Shortbow...     │
└──────────────────────────────────────────────────── ┘
```

### Player View (Mobile) Layout

```
┌─────────────────────┐
│ projeto-rpg  Round 3│
├─────────────────────┤
│ YOUR CHARACTER      │
│ Lyra (Wizard)       │
│ HP: ██████████ 38/38│
├─────────────────────┤
│ INITIATIVE ORDER    │
│ ▶ Goblin Boss       │
│   Thorin            │
│ → LYRA (you)        │
│   Troll             │
├─────────────────────┤
│         [🔍 Spells] │
└─────────────────────┘
```

### Accessibility Implementation

**Keyboard shortcuts (DM view):**

| Shortcut | Action |
|----------|--------|
| `Cmd+K` / `Ctrl+K` | Open oracle search |
| `Space` | Advance turn |
| `↑` / `↓` | Navigate combatant rows |
| `Enter` | Expand/collapse active row |
| `Escape` | Close modal / collapse row |
| `H` | Focus HP adjust on active combatant |
| `C` | Open condition selector on active combatant |

**ARIA implementation:**
- Initiative list: `role="list"`, each row `role="listitem"`
- Active turn: `aria-current="true"` on active combatant row
- HP bar: `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax`
- Oracle: `role="combobox"` with `aria-expanded` and `aria-controls`
- Modals: `role="dialog"` with `aria-labelledby` and `aria-modal="true"`

**Touch targets:** All interactive elements on mobile: min 44×44px. HP adjust buttons: 48×48px. "Next Turn" button: full-width, 56px height.

**Reduced motion:** All animations wrapped in `@media (prefers-reduced-motion: no-preference)`. Fallback: instant state changes, no transitions.

---

## V2 Addendum — Novas Features (PRD V2)

> **Contexto:** Este addendum cobre todas as features novas do PRD V2 (FR42–FR63, FR51b, NFR29–NFR38). Todas as decisões de design seguem os fundamentos visuais, color semantics, tipografia, e patterns estabelecidos nas seções anteriores. Referências de tech stack: `docs/tech-stack-libraries.md`.

---

### V2.1 Mid-Combat Add (FR42)

**Contexto:** DM pode adicionar monstros ou jogadores durante combate ativo sem interromper o turno atual.

**UX Pattern:**

O botão "+ Adicionar" já existe no layout V1 (final da initiative list). Para V2:

- **Trigger:** Botão subtle verde (`bg-emerald-900/30 text-emerald-400`) no footer da initiative list: `+ Adicionar ao combate`
- **Ação:** Abre um `Sheet` (slide-over lateral, 400px) — NÃO um modal, para que o DM veja o combate atrás
- **Conteúdo do Sheet:**
  - Tabs: `Monstro` | `Jogador`
  - Tab Monstro: campo de busca (reutiliza `OracleSearch` com filtro `type:monster`), selecionar → preenche automaticamente stats do SRD
  - Tab Jogador: form simples (nome, HP, AC, iniciativa)
  - Campo de iniciativa obrigatório — DM decide onde o novo combatante entra na ordem
  - Botão "Adicionar" (`bg-emerald-600`) — ação construtiva
- **Feedback:** Novo combatante aparece na lista com `AnimatePresence` (Framer Motion) — fade-in + slide-down suave (200ms). Jogadores conectados veem a adição em real-time.
- **Constraint:** Sheet NÃO pausa o turno atual. O indicador de turno permanece no combatente ativo.

**Layout do Sheet:**
```
┌─ Adicionar ao Combate ───────────┐
│ [Monstro] [Jogador]              │
│                                   │
│ 🔍 Buscar monstro...            │
│ ┌────────────────────────────┐   │
│ │ Goblin        CR 1/4       │   │
│ │ Goblin Boss   CR 1         │   │
│ │ Hobgoblin     CR 1/2       │   │
│ └────────────────────────────┘   │
│                                   │
│ Iniciativa: [___]                │
│ Display name: [___] (opcional)   │
│                                   │
│     [Adicionar] (verde)          │
└──────────────────────────────────┘
```

---

### V2.2 Display Names para Monstros (FR43)

**Contexto:** DM define nome visível para jogadores. Nome real do SRD fica visível apenas para o DM. Core anti-metagaming.

**UX Pattern:**

- **DM View (desktop):** Na row colapsada, mostra `Display Name` com nome real em `text-muted` entre parênteses: `"O Guardião" (Troll)`. Ao expandir, campo editável de display name com placeholder "Nome visível para jogadores".
- **Player View (mobile):** Mostra APENAS o display name. Nunca o nome real. Se DM não definiu display name, mostra o nome genérico do SRD.
- **Ponto de entrada:** Campo aparece no `Sheet` de mid-combat add E na row expandida do combatante existente.
- **Sanitização:** Display name limitado a 40 caracteres, sanitizado contra XSS (NFR33).

**Layout na CombatantRow (DM, colapsada):**
```
│ ▶ "O Guardião" (Troll)  ████░░░░ 28/80  [Prone] │
```

**Layout na CombatantRow (Player):**
```
│   O Guardião            ■■■□ HEAVY                │
```

---

### V2.3 Monster Grouping (FR44–FR46)

**Contexto:** DM agrupa múltiplos monstros sob uma única entrada de iniciativa. HP individual. Expand/collapse do grupo.

**UX Pattern:**

- **Criação do grupo:** No Sheet de mid-combat add (ou encounter setup), DM seleciona monstro e define quantidade (input numérico, 2–20). Botão "Adicionar como Grupo" (`bg-emerald-600`).
- **Visualização colapsada (grupo):** Uma row que mostra: `▶ Goblins (×5)` + barra de HP agregada (média visual) + badges de condições comuns.
- **Expand grupo:** Click na row → expande para mostrar cada monstro individual como sub-row indentada (padding-left +24px). Cada sub-row tem HP individual, conditions individuais, e display name individual.
- **Collapse grupo:** Click no header do grupo → volta para row única.
- **Iniciativa:** Uma única entrada. Ao avançar turno para o grupo, DM resolve cada monstro individual na ordem que quiser.
- **Defeated individual:** Sub-row dimmed (`opacity-40`), strike-through no nome. Grupo atualiza contagem: `Goblins (×3/5)`.

**Layout do Grupo (colapsado):**
```
│ ▶ Goblins (×5)        ████████░░  avg  [—]       │
```

**Layout do Grupo (expandido):**
```
│ ▼ Goblins (×5)                                    │
│   ├ Goblin 1           ██████████ 7/7             │
│   ├ Goblin 2           ████░░░░░░ 3/7  [Prone]   │
│   ├ Goblin 3           ██████████ 7/7             │
│   ├ Goblin 4           ░░░░░░░░░░ 0/7  DEFEATED  │
│   └ Goblin 5           ████████░░ 5/7             │
```

**Player View:** Grupo aparece como uma única entrada com contagem: `Goblins (×5)`. Sub-rows NÃO expandem no player view — jogadores veem apenas o grupo como unidade. Display names se aplicam ao grupo (ex: `"Os Sentinelas" (×5)`).

---

### V2.4 Late-Join Player (FR47)

**Contexto:** Jogador que entra na sessão depois do combate ter iniciado pode registrar dados e entrar na iniciativa.

**UX Flow:**

```
Jogador abre link → PlayerLobby
├─→ Sessão em combate ativo? → Sim
│   ├─→ Mostra banner: "Combate em andamento — Round N"
│   ├─→ Form: Nome, HP, AC, Iniciativa
│   ├─→ Botão "Entrar no Combate" (gold, CTA primário)
│   └─→ Enviado → DM recebe notificação
│
DM View:
├─→ Toast (Novu in-app): "[Nome] quer entrar no combate (Init: 14)"
├─→ Toast tem botões: [Aceitar ✓] (verde) [Recusar ✗] (neutral)
├─→ Aceitar → jogador inserido na posição correta da iniciativa
│   └─→ Jogador vê: PlayerInitiativeBoard (transição animada)
└─→ Recusar → jogador vê: "O mestre recusou sua entrada. Aguarde."
```

**Design Notes:**
- O toast do DM usa `Novu <Inbox />` integrado ao header do DM view.
- Aceitar/recusar NÃO pausa o turno — é async.
- `AnimatePresence` para inserir o novo jogador na lista suavemente.

---

### V2.5 Notificações de Turno (FR48–FR49)

**Contexto:** Jogador recebe notificação visual quando falta 1 turno (FR48) e quando é sua vez (FR49).

**UX Pattern — "Você é o próximo" (FR48):**

- **Trigger:** Quando o combatente anterior ao jogador inicia seu turno.
- **Visual:** Banner sutil no topo do PlayerInitiativeBoard:
  - Background: `bg-amber-900/30`
  - Texto: `⚔️ Prepare-se — você é o próximo!`
  - Animação: slide-down (Framer Motion, 300ms) + fade-in
  - Persiste até o turno do jogador começar
- **Novu channel:** `in-app` notification (não email/push neste momento).

**UX Pattern — "É sua vez!" (FR49):**

- **Trigger:** Quando o turno avança para o jogador.
- **Visual:** Takeover momentâneo do player view:
  - Full-screen overlay (1.5s): fundo `bg-gold/20` com texto grande `Cinzel text-4xl`: **"É SUA VEZ!"**
  - Animação: scale-in (Magic UI `fade-text` ou Framer Motion `scale: [0.8, 1]`) + golden `border-beam` (Magic UI) ao redor da tela
  - Após 1.5s: overlay faz fade-out, revela PlayerInitiativeBoard com a row do jogador destacada (`accent` gold border + glow)
- **Som:** Opcional, configurável nas settings. Default: off. Se ativado, toque curto tipo "ding" (Web Audio API, ≤100ms).
- **Accessibility:** Texto do overlay é `aria-live="assertive"`. Screen readers anunciam "É sua vez" imediatamente.

**Layout do Overlay "É sua vez":**
```
┌─────────────────────────┐
│                         │
│    ⚔️ É SUA VEZ! ⚔️    │  ← Cinzel, text-4xl, gold
│                         │
│    border-beam dourado  │
│                         │
└─────────────────────────┘
       ↓ fade-out (1.5s)
┌─────────────────────────┐
│ Round 5                 │
│ ┌─────────────────────┐ │
│ │▶ LYRA (VOCÊ) ★      │ │ ← gold glow border
│ │   HP: ████████ 38/38│ │
│ └─────────────────────┘ │
│   Goblin Boss           │
│   Troll                 │
│   Thorin                │
└─────────────────────────┘
```

---

### V2.6 Auto-Join — Jogador Logado (FR51b)

**Contexto:** Jogador cadastrado que entra numa sessão ativa aparece automaticamente na tela do DM.

**UX Pattern:**

- **Implementação:** Supabase Realtime `Presence` — jogador faz `channel.track()` ao entrar, DM recebe evento `presence.sync`.
- **DM View:** Toast informativo (3s, auto-dismiss): `"[Nome] entrou na sessão"`. Se jogador já está na initiative list (campanha), row atualiza com indicador online (dot verde ao lado do nome).
- **Player View:** Transição suave do PlayerLobby para PlayerInitiativeBoard (sem form de iniciativa se já está na campanha).
- **Indicador online:** Dot `8×8px` verde (`#2dd4bf` success) ao lado do nome na CombatantRow do DM view. Tooltip: "Online". Se desconectar: dot muda para `text-muted` cinza.

---

### V2.7 GM Private Notes (FR52)

**Contexto:** DM pode criar, editar e visualizar notas privadas durante sessão ativa. Nunca broadcast.

**UX Pattern:**

- **Trigger:** Ícone `📝` no header do DM view, ao lado do oracle search. Neutral button (`bg-white/[0.06]`).
- **Container:** `Sheet` lateral direito (360px) — não cobre a initiative list.
- **Conteúdo:**
  - Textarea com auto-save (debounce 1s)
  - Markdown básico suportado (bold, italic, lists)
  - Timestamp automático: `[14:32] nota do mestre...`
  - Nunca enviado via Supabase Broadcast/Presence — persist local + Supabase DB (postgres_changes apenas para o DM)
- **Visual:**
  - Background: `surface-elevated` (`#222234`)
  - Borda: `border-hover` (`rgba(255,255,255,0.15)`)
  - Badge "PRIVADO" vermelho sutil no header do Sheet para reforçar que não é compartilhado

---

### V2.8 File Sharing em Sessão (FR53)

**Contexto:** DM compartilha imagens e PDFs com jogadores conectados.

**UX Pattern:**

- **Trigger:** Ícone `📎` no header do DM view. Neutral button.
- **Upload:** Dialog modal com drag-and-drop zone + botão "Selecionar arquivo".
  - Tipos aceitos: `image/*`, `application/pdf`
  - Limite: 10MB (NFR32). Progresso visual via barra de upload.
  - Feedback: Toast sucesso `"Arquivo compartilhado com a mesa"` ou erro `"Arquivo muito grande (máx 10MB)"`
- **Player View:** Arquivo aparece como card no topo do PlayerInitiativeBoard:
  - Imagem: thumbnail clicável → abre em modal fullscreen
  - PDF: ícone + nome do arquivo → abre em nova aba
  - Animação: slide-down + fade-in (Framer Motion)
  - DM pode remover: botão `✗` red subtle na DM view
- **Storage:** Supabase Storage bucket `session-files`, com RLS vinculado à sessão.

---

### V2.9 Freemium Feature Gating (FR57–FR61)

**Contexto:** Features Pro visíveis com cadeado no tier Free. Upsell contextual. Trial. Modelo "Mesa".

**Design System de Gating:**

**Ícone de cadeado:**
- `🔒` (ou SVG lock icon) em `text-muted` (`#5c5a65`), 16×16px
- Posicionado à direita do label da feature
- Tooltip (desktop): `"Disponível no plano Pro"` — shadcn `Tooltip`
- Tap (mobile): abre mini-card de upsell

**Upsell contextual inline:**
- NÃO é pop-up. É um card inline que substitui a feature bloqueada.
- Background: `surface-elevated` + borda `accent` gold sutil
- Conteúdo: "Esta feature é Pro. [Experimentar grátis por 14 dias →]"
- CTA: botão gold shimmer (Magic UI `shimmer-button`): `"Teste grátis"` — leva para página de trial

**Features com gating visual no tier Free:**

| Feature | Onde aparece | Indicador |
|---------|-------------|-----------|
| Salvar campanha | Dashboard | Lock + tooltip |
| Salvar preset | Encounter setup | Lock + tooltip |
| Export PDF/JSON | Pós-sessão | Lock + upsell card |
| Homebrew | Compendium | Lock + upsell card |
| Analytics | Dashboard | Lock + upsell card |
| CR Calculator | Encounter builder | Lock + tooltip |

**Modelo "Mesa" (FR60):**
- Badge `PRO` (gold, `bg-gold text-background`, 12px, bold) ao lado do nome do DM na session header.
- Todos os jogadores conectados à sessão do DM Pro recebem features Pro automaticamente. Sem indicação visual para jogadores — a experiência é simplesmente "completa".
- Se assinatura expira mid-session: nenhuma mudança visual até fim da sessão (graceful degradation NFR34).

---

### V2.10 Convite de Jogador via Email (FR54–FR55)

**Contexto:** DM Pro convida jogadores para campanha via email. Jogador cria conta → personagem vinculado automaticamente.

**UX Flow:**

```
DM → Dashboard → Campanha → Gerenciar Jogadores
├─→ Botão "Convidar Jogador" (verde, construtivo)
│   └─→ Dialog: campo de email + mensagem opcional
│       └─→ Enviar → Novu email workflow
│           └─→ Toast: "Convite enviado para [email]"
│
Jogador recebe email:
├─→ CTA no email: "Aceitar convite" → /auth/sign-up?invite=[token]
├─→ Signup com role selection (FR50): Jogador | Mestre | Ambos
├─→ Conta criada → personagem auto-linked à campanha (FR55)
└─→ Redirect → Dashboard com campanha visível
```

**Rate limiting visual (NFR30):** Após 15 convites no dia, o campo de email mostra hint: `"Você pode enviar mais 5 convites hoje"`. Ao atingir 20: botão desabilitado com tooltip.

---

### V2.11 Role Selection no Signup (FR50)

**Contexto:** Jogador escolhe se é "Jogador", "Mestre" ou "Ambos" durante o cadastro.

**UX Pattern:**

- **Onde:** Tela de signup (`/auth/sign-up`), após campos de email/senha.
- **UI:** Três cards selecionáveis (radio group visual):
  - `⚔️ Jogador` — "Eu jogo nas mesas dos outros"
  - `📋 Mestre` — "Eu comando as sessões"
  - `⚔️📋 Ambos` — "Eu faço os dois"
- **Visual:** Cards com border neutral. Selected: border gold + gold glow. Icon + label + descrição curta.
- **Default:** Nenhum pré-selecionado — obrigatório.
- **Impacto:** Define dashboard view (DM vê campanhas + encounters, Jogador vê convites + personagens, Ambos vê tudo).

---

### V2.12 CR Calculator (FR62)

**Contexto:** DM Pro calcula dificuldade do encontro automaticamente.

**UX Pattern:**

- **Onde:** Encounter setup view, abaixo da lista de monstros adicionados.
- **Visual:** Card com background `surface` que mostra:
  - Party: `N jogadores, nível médio M`
  - Encounter CR: calculado automaticamente (SRD 2014 ou 2024 conforme ruleset)
  - Difficulty rating: badge colorida
    - `Easy` → verde `bg-emerald-900/30 text-emerald-400`
    - `Medium` → amber `bg-amber-900/30 text-amber-400`
    - `Hard` → orange `bg-orange-900/30 text-orange-400`
    - `Deadly` → vermelho `bg-red-900/20 text-red-400`
  - XP total + threshold table reference
- **Interação:** Atualiza em real-time conforme DM adiciona/remove monstros. Zero ação necessária.
- **Gating:** Free vê o card com lock + tooltip. Pro vê completo.

---

### V2.13 Homebrew — Criar Conteúdo Customizado (FR63)

**Contexto:** DM Pro cria monstros, magias e itens customizados.

**UX Pattern:**

- **Onde:** Compendium → tab "Homebrew" (com badge `PRO` gold).
- **Tipos:** Monstros | Magias | Itens (tabs dentro da seção).
- **Criação:** Botão "Criar [tipo]" (verde, construtivo) → Form em Dialog fullscreen:
  - Form segue a estrutura do SRD stat block (para monstros), spell description (para magias), ou item description (para itens)
  - Fields pré-populados com placeholders descritivos
  - Preview live no lado direito do dialog (desktop) ou toggle view (mobile)
- **Salvamento:** Supabase DB, vinculado ao user. Aparece no Oracle search com badge `Homebrew` (purple pill `bg-purple-900/30 text-purple-400`).
- **Visual consistência:** Homebrew content usa exatamente a mesma formatação visual que SRD content — mesmas fonts, mesmos dividers ornamentais, mesma estrutura de stat block. A única diferença é o badge purple "Homebrew".

---

### V2.14 Player Character Linking (FR56)

**Contexto:** DM Pro atribui personagem da campanha a jogador que entrou via QR.

**UX Pattern:**

- **Trigger:** Quando jogador anônimo entra na sessão e DM tem campanha com jogadores salvos.
- **DM View:** Ao lado do jogador anônimo na initiative list, ícone `🔗` (link) neutral. Click → dropdown com lista de personagens da campanha não-linkados.
- **Ação:** Selecionar personagem → jogador anônimo assume dados do personagem (nome, HP, AC). Row atualiza com `AnimatePresence`.
- **Player View:** Transição suave — nome atualiza, HP sincroniza.
- **Visual:** Badge `Linked ✓` em verde sutil aparece temporariamente (3s) no toast do DM.

---

### V2.15 Novos User Journey Flows (V2)

#### Journey 5: Late-Join Player

```
[Recebe link do DM] → [Abre no celular]
    → [PlayerLobby: "Combate em andamento — Round N"]
    → [Preenche: nome, HP, AC, iniciativa]
    → [Botão gold "Entrar no Combate"]
    → [Aguarda aprovação do DM (loading subtle)]
    → [Aceito → PlayerInitiativeBoard animado]
    → [Ve turno atual, sabe quando é sua vez]
```

#### Journey 6: DM Free → Upsell → Pro

```
[DM logado, Free] → [Combat tracker normal]
    → [Tenta salvar campanha] → [Lock + upsell card inline]
    → [Click "Teste grátis"] → [Trial activation page]
    → [Ativa trial 14 dias] → [Badge PRO no header]
    → [Todas as features Pro desbloqueadas]
    → [Dia 12: Novu email "Seu trial expira em 2 dias"]
    → [Assina ou volta para Free — sem degradação]
```

#### Journey 7: DM Pro — Sessão Completa com Mesa

```
[Dashboard] → [Seleciona campanha] → [Players pré-carregados]
    → [ShareSessionButton → QR code]
    → [Jogadores scanneiam → auto-join via Presence]
    → [DM vê toast "Jogador X entrou"]
    → [Late-join: toast com Accept/Reject]
    → [Combate com: notificações de turno, GM notes, file sharing]
    → [Pós-sessão: analytics, export PDF]
```

---

### V2.16 Novos Componentes (V2)

| Componente | Base | Feature | Notas |
|-----------|------|---------|-------|
| `MonsterGroupRow` | `Collapsible` | FR44–46 | Expand/collapse com sub-rows individuais |
| `MidCombatAddSheet` | `Sheet` | FR42 | Slide-over lateral com search + form |
| `DisplayNameInput` | `Input` | FR43 | Inline editable com placeholder |
| `TurnNotificationOverlay` | Framer Motion | FR49 | Full-screen gold overlay, 1.5s auto-dismiss |
| `TurnUpcomingBanner` | `motion.div` | FR48 | Banner amber slide-down |
| `LateJoinForm` | Custom | FR47 | Form no PlayerLobby para late-join |
| `LateJoinApprovalToast` | Novu `<Inbox />` | FR47 | Toast no DM com Accept/Reject |
| `GMNotesSheet` | `Sheet` | FR52 | Panel lateral com auto-save textarea |
| `FileShareDialog` | `Dialog` | FR53 | Upload drag-and-drop + preview |
| `SharedFileCard` | `Card` | FR53 | Thumbnail/icon no player view |
| `FeatureLockBadge` | `Badge` + `Tooltip` | FR57 | Lock icon + tooltip "Pro" |
| `UpsellCard` | `Card` | FR58 | Inline upsell com shimmer CTA |
| `RoleSelectionCards` | Radio group | FR50 | Três cards selecionáveis no signup |
| `CRCalculatorCard` | `Card` | FR62 | Auto-calculate com difficulty badge |
| `HomebrewCreator` | `Dialog` fullscreen | FR63 | Form + live preview |
| `PlayerLinkDropdown` | `DropdownMenu` | FR56 | Dropdown de personagens da campanha |
| `OnlineIndicator` | Custom | FR51b | Dot verde 8px via Presence |
| `PresenceTracker` | Supabase Presence | FR51b | Hook para track/sync jogadores online |

---

### V2.17 Animações V2 (Framer Motion + Magic UI)

**Princípio inalterado:** Animações são funcionais, não decorativas. Zero animações no core combat loop que não comuniquem estado.

| Animação | Lib | Onde | Duração | Purpose |
|----------|-----|------|---------|---------|
| Creature enter/exit | Framer `AnimatePresence` | Initiative list | 200ms | Feedback visual de add/remove |
| Group expand/collapse | Framer `motion.div` | MonsterGroupRow | 150ms | Smooth disclosure |
| "Você é o próximo" banner | Framer `motion.div` | Player view | 300ms slide-down | Awareness |
| "É sua vez!" overlay | Framer + Magic `border-beam` | Player view | 1.5s total | Attention capture |
| File shared card | Framer `motion.div` | Player view | 200ms slide-down | Notify content available |
| Shimmer CTA (upsell) | Magic `shimmer-button` | Upsell cards | Continuous subtle | Draw attention to conversion |
| Online dot pulse | CSS `@keyframes` | CombatantRow | 2s loop | Indicate live connection |
| Late-join toast | Framer `motion.div` | DM header | 300ms + 5s persist | Require DM action |

**Anti-patterns V2 (NUNCA fazer):**
- ❌ Animação no overlay "É sua vez" que dure mais que 2s — deve sair do caminho rápido
- ❌ Som ativado por default — sempre opt-in nas settings
- ❌ Particles/efeitos visuais no combat tracker durante turno — distrai do HP/conditions
- ❌ Shimmer/pulse em qualquer elemento que não seja conversion CTA
