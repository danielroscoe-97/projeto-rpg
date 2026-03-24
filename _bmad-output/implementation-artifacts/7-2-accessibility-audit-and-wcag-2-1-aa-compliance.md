# Story 7.2: Accessibility Audit & WCAG 2.1 AA Compliance

Status: review

## Story

As a **user with accessibility needs**,
I want the app to meet WCAG 2.1 AA standards,
So that the product is usable regardless of visual, motor, or cognitive differences.

## Acceptance Criteria

1. **Given** all user-facing routes
   **When** audited for WCAG 2.1 AA compliance
   **Then** no critical or major violations are found (NFR20)

2. **Given** any status indicator (current turn, conditions, HP threshold)
   **When** displayed in the UI
   **Then** color is never the sole indicator — icons or text labels are used alongside color (NFR21)

3. **Given** the default theme
   **When** the app loads
   **Then** dark mode is active with background color #1a1a2e (NFR22)
   **And** minimum body text size is 16px on all breakpoints (NFR23)

4. **Given** the mobile player view
   **When** interactive elements are rendered
   **Then** all tap targets are minimum 44×44px (NFR24)

5. **Given** the DM view on desktop
   **When** the DM uses keyboard only
   **Then** turn advance, HP edit, condition apply, stat block open, and spell search are all accessible without mouse (NFR25)

---

## Codebase Audit Findings

These findings are the result of reading all affected components before writing this story. They are the authoritative basis for all tasks below.

### AC1 — WCAG 2.1 AA General Audit

**Already compliant (no work needed):**
- `CombatantRow` HP bar: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` — fully compliant.
- `CombatantRow` conditions list: `role="list"` + `aria-label="{name} conditions"` on wrapper, `role="listitem"` on each badge.
- `CombatantRow` name button: `aria-expanded` + `aria-controls` wired to stat block `id` — correct disclosure pattern.
- `CombatantRow` turn indicator: `aria-label="Current turn"` on the dot span.
- `MonsterSearch` input: `aria-label="Monster search"` present.
- `MonsterSearch` results: `role="list"` + `aria-label="Monster search results"`.
- `MonsterSearch` expand buttons: `aria-expanded` + `aria-controls` wired to stat block `id`.
- `MonsterSearch` add-to-combat buttons: `aria-label="Add {name} to combat"` present.
- `MonsterStatBlock` section: `aria-label="{name} stat block"` present.
- `MonsterStatBlock` ability scores grid: `role="table"` + `aria-label="Ability scores"` present.
- `CampaignLoader` dialog: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing to title `id` — correct.
- `CampaignLoader` close button: `aria-label="Close dialog"` present.
- `PlayerCharacterManager` error paragraph: `role="alert"` present.
- `PlayerCharacterManager` form fields: all inputs have `<Label htmlFor>` + matching `id` — correct.
- shadcn/ui `Button`, `Input`, `Label` components are Radix UI primitives — keyboard focus, ARIA roles, and focus-visible styles are handled by the library.

**Gaps requiring fixes:**

| # | File | Element | Issue |
|---|------|---------|-------|
| G1 | `components/session/CombatSessionClient.tsx` | "Next Turn →" `<button>` | Native `<button>` — no `aria-label` describing action; text content contains arrow character but no explicit label |
| G2 | `components/combat/CombatantRow.tsx` | Turn indicator dot `<span>` | `aria-label` present, but `<li>` only uses `aria-current="true"` (string) — spec requires boolean `true`, not string `"true"` |
| G3 | `app/app/layout.tsx` | `<main>` | Missing `id` for skip-navigation link target; no skip-nav link present |
| G4 | `app/app/layout.tsx` | `<nav>` | Missing `aria-label` — multiple nav landmarks need labels when more than one exists |
| G5 | `components/session/CampaignLoader.tsx` | "Load Campaign" trigger `<button>` | Plain `<button>` — no `type="button"` attribute (defaults to `submit` inside a form context, risk for future wrapping) |
| G6 | `components/session/CampaignLoader.tsx` | Campaign list "Load" buttons | No `aria-label` — visible text is only "Load", no context for screen reader |
| G7 | `components/session/CampaignLoader.tsx` | Dialog focus management | Custom `<div role="dialog">` does NOT trap focus or set initial focus on open — fails WCAG 2.1 SC 2.1.2 |
| G8 | `app/app/session/[id]/page.tsx` | Back link "← Dashboard" | Arrow character `←` in visible text is meaningful — should be `aria-label="Back to Dashboard"` or wrapped with `aria-hidden` on the arrow |
| G9 | `components/combat/InitiativeTracker.tsx` | Tie warning `<span>` | Warning icon `⚠` emoji has no `aria-label` or `role="img"` |

### AC2 — Color as the Sole Indicator (NFR21)

**Audit of all status indicators in `CombatantRow`:**

| Indicator | Current implementation | Color-only? | Fix needed? |
|-----------|----------------------|-------------|-------------|
| Current turn | Red dot (`bg-[#e94560]`) + `aria-current` on `<li>` | YES — visual dot only | YES — add visible icon or text label |
| HP threshold (green/amber/red bar) | Color-coded bar | YES — bar color only conveys severity | YES — add text label or icon alongside bar |
| Condition badges | Color-coded + text name | NO — text name is present | No fix needed |
| Defeated | `opacity-50` + "Defeated" text badge | NO — text is present | No fix needed |
| Temp HP | Purple color + "+N temp" text | NO — text is present | No fix needed |

**Root cause for current turn:** The `<span className="w-2 h-2 rounded-full bg-[#e94560]" aria-label="Current turn">` is ARIA-labelled for screen readers, but sighted users with color-blindness (protanopia/deuteranopia — ~8% of males) cannot distinguish the red dot from the neutral white border. Adding a visible arrow or "▶" glyph (with `aria-hidden="true"`) satisfies NFR21 for sighted low-vision and color-blind users.

**Root cause for HP bar:** The color is green (>50%), amber (25–50%), or red (<25%) — pure color encoding. A sighted color-blind user cannot distinguish the health threshold. Adding an `aria-label` that includes the verbal threshold (e.g., `aria-label="{name} hit points — critical"`) on the bar container, plus a visible abbreviated text label next to the bar (e.g., "OK", "LOW", "CRIT"), satisfies NFR21.

### AC3 — Dark Mode and Font Size (NFR22, NFR23)

**Dark mode (NFR22):**
- `app/app/layout.tsx` line 22: `<div className="min-h-screen flex flex-col bg-[#1a1a2e]">` — confirmed. No changes needed.

**Font size 16px (NFR23):**
- Tailwind's default base font size is 16px (set in `preflight.css` — `html { font-size: 16px }`). However, `app/app/layout.tsx` has no explicit `text-base` class on the root `<div>`, relying on browser default.
- Tailwind's `text-sm` class (14px) is used heavily in child components for secondary text — this is acceptable for secondary/supporting text but NOT for primary body content.
- The `<main>` element at line 49 has no explicit font size — it inherits from the root div. Tailwind preflight sets `html` font size to 16px, which means `rem`-based values work correctly. However, to explicitly enforce NFR23 on all breakpoints, add `text-base` to the root `<div>` in `layout.tsx`.
- No breakpoint overrides that would reduce base font size were found. No changes to component files needed — only the layout root class.

### AC4 — Tap Targets 44×44px (NFR24)

**Audit of interactive elements for minimum 44×44px touch target:**

| Component | Element | Current size classes | Meets 44px? | Fix |
|-----------|---------|---------------------|-------------|-----|
| `CombatantRow` | Name expand button | `flex-1 text-left text-sm` — no min-height | No (height derived from content ~28px) | Add `min-h-[44px]` |
| `CombatSessionClient` | "Next Turn →" button | `px-4 py-2` → ~36px height | No | Add `min-h-[44px]` |
| `MonsterSearch` | Expand/collapse monster button | `flex items-center gap-2 px-3 py-2` — no min-height | No (~36px) | Add `min-h-[44px]` |
| `MonsterSearch` | "+ Add" button | `px-2 py-1 text-xs` → ~28px height | No | Add `min-h-[44px] min-w-[44px]` |
| `CampaignLoader` | "Load Campaign" trigger button | `text-sm ... underline` — no padding/height | No (~20px text height) | Add `min-h-[44px] inline-flex items-center` |
| `CampaignLoader` | Campaign "Load" buttons | `text-xs px-3 py-1` → ~28px | No | Add `min-h-[44px]` |
| `CampaignLoader` | Close "✕" button | `text-sm` — no padding | No (~20px) | Add `min-h-[44px] min-w-[44px]` |
| `PlayerCharacterManager` | "Edit" / "Remove" buttons | `h-7 px-2` = 28px height | No | Add `min-h-[44px]` (override `h-7`) |
| `PlayerCharacterManager` | "+ Add Player" button | shadcn `Button size="sm"` → `h-8` = 32px | No | Add `className="... min-h-[44px]"` |
| `app/app/layout.tsx` | Nav links (Dashboard, Settings) | `text-sm` — no height | Borderline | Add `min-h-[44px] inline-flex items-center` |
| `LogoutButton` | Logout button | Unknown — check separately | Unknown | Verify separately |

**Note on shadcn `Button`:** The Radix-based `Button` component renders a native `<button>`. The `size="sm"` variant uses `h-8` (32px). Tailwind utility `min-h-[44px]` overrides this when added to `className` prop.

### AC5 — Keyboard Navigation for DM View (NFR25)

**Audit of keyboard accessibility for each DM action:**

| Action | Component | Keyboard accessible? | Notes |
|--------|-----------|---------------------|-------|
| Turn advance | `CombatSessionClient` "Next Turn →" | YES — native `<button>`, tab-focusable | No changes needed (G1 label fix still applies) |
| HP edit | No HP edit UI found in session view | N/A — HP editing is not in current session view | Out of scope — no component exists yet |
| Condition apply | No condition-apply UI found in session view | N/A — not yet implemented | Out of scope |
| Stat block open | `CombatantRow` name button | YES — native `<button>`, `aria-expanded` | No changes needed |
| Spell search / Monster search | `MonsterSearch` input | YES — native `<input type="search">` | Tab-focusable; Enter/keyboard nav works |
| Initiative tracker inputs | `InitiativeTracker` inputs | YES — native `<input type="number">` | Keyboard accessible |
| Start Combat button | `InitiativeTracker` | YES — native `<button>` | No changes needed |

**Gap:** Focus management in `CampaignLoader` dialog (G7 above) — custom `<div role="dialog">` does not trap focus, meaning keyboard users can Tab out of the modal into the page behind it. This is the most significant keyboard accessibility failure. Fix: either migrate to shadcn `Dialog` (Radix `DialogContent` handles focus trap automatically) or add a custom focus trap hook.

---

## Tasks / Subtasks

- [ ] Task 1 — Fix `aria-current` boolean type + add visible turn indicator glyph (AC1, AC2 — NFR21)
  - [ ] Edit `components/combat/CombatantRow.tsx`:
    - Change `aria-current={isCurrentTurn ? "true" : undefined}` to `aria-current={isCurrentTurn ? true : undefined}` on the `<li>` element (line 70)
    - Replace the plain red dot `<span className="w-2 h-2 rounded-full bg-[#e94560] shrink-0" aria-label="Current turn">` with a visible arrow glyph: `<span className="text-[#e94560] shrink-0 text-sm leading-none" aria-label="Current turn" aria-hidden="false">▶</span>` — the glyph is visible to sighted color-blind users and read by screen readers via `aria-label`
    - Alternatively: keep the dot AND add `aria-hidden="true"` on it, with a separate visually-hidden `<span className="sr-only">Current turn</span>` — but the glyph approach satisfies both sighted and AT users in one element

- [ ] Task 2 — Add HP threshold text label alongside HP bar (AC2 — NFR21)
  - [ ] Edit `components/combat/CombatantRow.tsx`:
    - Add a computed threshold label: when `pct > 0.5` → `"OK"`, when `pct > 0.25` → `"LOW"`, else → `"CRIT"` (or `""` when `max_hp === 0`)
    - Render the label as a `<span className="text-xs font-medium sr-only">` immediately inside the HP label row so screen readers announce it
    - Update the `aria-label` on the `role="progressbar"` div to include the threshold: `aria-label={`${combatant.name} hit points — ${thresholdLabel}`}`
    - For sighted color-blind users, optionally render the threshold label visibly next to the HP numbers (e.g., `<span className="text-xs font-mono ml-1 text-white/50">{thresholdLabel}</span>`) — this is the recommended approach as it is obvious at a glance without relying on color

- [ ] Task 3 — Add `text-base` to layout root and `aria-label` to nav (AC3, AC1 — NFR23)
  - [ ] Edit `app/app/layout.tsx`:
    - Add `text-base` to the root `<div>` class: `className="min-h-screen flex flex-col bg-[#1a1a2e] text-base"`
    - Add `aria-label="Main navigation"` to the `<nav>` element (line 23)
    - Add a skip-navigation link as the very first child of the root `<div>`:
      ```tsx
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#e94560] focus:text-white focus:rounded-md focus:text-sm"
      >
        Skip to main content
      </a>
      ```
    - Add `id="main-content"` to the `<main>` element: `<main id="main-content" className="flex-1 p-6">`

- [ ] Task 4 — Fix tap targets in `CombatantRow` (AC4 — NFR24)
  - [ ] Edit `components/combat/CombatantRow.tsx`:
    - Name expand button (line 88): add `min-h-[44px] flex items-center` to the className — current classes become `flex-1 flex items-center text-left text-sm font-medium transition-colors min-h-[44px] ...`

- [ ] Task 5 — Fix tap targets in `CombatSessionClient` (AC4 — NFR24)
  - [ ] Edit `components/session/CombatSessionClient.tsx`:
    - "Next Turn →" button (line 89): add `min-h-[44px]` to className; also add `aria-label="Advance to next turn"` (fixes G1)

- [ ] Task 6 — Fix tap targets and ARIA in `MonsterSearch` (AC4, AC1 — NFR24)
  - [ ] Edit `components/oracle/MonsterSearch.tsx`:
    - Monster expand/collapse button (line 82): add `min-h-[44px] flex items-center` to className
    - "+ Add" button (line 109): add `min-h-[44px] min-w-[44px] flex items-center justify-center` to className

- [ ] Task 7 — Migrate `CampaignLoader` to shadcn `Dialog` for focus trap (AC1, AC5 — NFR25, G7)
  - [ ] Edit `components/session/CampaignLoader.tsx`:
    - Replace the custom `<div className="fixed inset-0 ...">` dialog implementation with shadcn/Radix `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`
    - Radix `DialogContent` handles: focus trap, initial focus, `Escape` key close, `aria-modal`, `aria-labelledby` — all automatically
    - The trigger `<button onClick={handleOpen}>` becomes a `DialogTrigger` child or remains a plain button calling `setOpen(true)` (controlled mode with `open={open} onOpenChange={setOpen}`)
    - Add `type="button"` to the "Load Campaign" trigger button
    - Add `aria-label={`Load ${campaign.name} into encounter`}` to each campaign "Load" button (fixes G6)
    - This satisfies WCAG 2.1 SC 2.1.2 (No Keyboard Trap) and SC 1.3.1 (Info and Relationships)

- [ ] Task 8 — Fix tap targets in `PlayerCharacterManager` (AC4 — NFR24)
  - [ ] Edit `components/dashboard/PlayerCharacterManager.tsx`:
    - "Edit" button (line 442): change `className` to remove `h-7` and add `min-h-[44px]`; update `size` to default or remove size prop
    - "Remove" button (line 461): same — remove `h-7`, add `min-h-[44px]`
    - "+ Add Player" button (line 185): add `min-h-[44px]` to existing className
    - "Confirm" and "Cancel" buttons in remove confirmation row: verify they meet 44px (shadcn `size="sm"` = `h-8` = 32px — add `min-h-[44px]`)
    - "Save" and "Cancel" buttons in add/edit forms: verify they meet 44px (same fix)

- [ ] Task 9 — Fix nav tap targets and back-link ARIA in session page (AC1, AC4)
  - [ ] Edit `app/app/layout.tsx`:
    - Nav links "Dashboard" and "Settings" (lines 25–43): add `min-h-[44px] inline-flex items-center` to each `<Link>` className
  - [ ] Edit `app/app/session/[id]/page.tsx`:
    - Back link (line 82): change text from `"← Dashboard"` to `"Dashboard"` and add `aria-label="Back to Dashboard"` — or add `<span aria-hidden="true">← </span>Dashboard` to keep the arrow visually but hide it from screen readers (fixes G8)

- [ ] Task 10 — Fix Initiative Tracker warning emoji ARIA (AC1)
  - [ ] Edit `components/combat/InitiativeTracker.tsx`:
    - Tie warning span (line 43): change `⚠ Ties detected — drag to resolve` to: `<span role="img" aria-label="Warning">⚠</span> Ties detected — drag to resolve`

- [ ] Task 11 — Write accessibility-focused tests (AC1 through AC5)
  - [ ] Create `components/combat/CombatantRow.a11y.test.tsx` (or extend existing `CombatantRow.test.tsx`):
    - Test: `aria-current={true}` (boolean) on active turn `<li>`
    - Test: turn indicator has `aria-label="Current turn"` and is NOT the only visual indicator (assert glyph is present)
    - Test: HP progressbar has `aria-label` containing "critical"/"low"/"ok" threshold text
    - Test: `role="progressbar"` has `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
    - Test: condition badges render text name (not color-only)
  - [ ] Create `components/session/CampaignLoader.a11y.test.tsx` (or extend existing test):
    - Test: on dialog open, focus is trapped inside (mock focus trap or verify first focusable element receives focus)
    - Test: pressing `Escape` closes the dialog
    - Test: campaign "Load" buttons have descriptive `aria-label`
  - [ ] Create `components/oracle/MonsterSearch.a11y.test.tsx` (or extend existing):
    - Test: search input has `aria-label`
    - Test: expand button has `aria-expanded=false` initially, `aria-expanded=true` after click
    - Test: "Add" button has descriptive `aria-label`
  - [ ] Extend or create `app/app/layout.a11y.test.tsx`:
    - Test: skip-nav link exists and points to `#main-content`
    - Test: `<main>` has `id="main-content"`
    - Test: `<nav>` has `aria-label="Main navigation"`

---

## Technical Requirements

### 1. What shadcn/Radix UI Handles Automatically

The following ARIA and keyboard behaviors are provided by Radix UI primitives already in use — the developer does NOT need to implement these manually:

| shadcn Component | Radix Behaviors (automatic) |
|-----------------|---------------------------|
| `Button` | Keyboard focus, `disabled` propagation, `role="button"` |
| `Input` | Keyboard input, focus-visible ring |
| `Label` | `htmlFor` association, click-to-focus |
| `Dialog` / `DialogContent` | Focus trap, initial focus, `Escape` close, `aria-modal`, `aria-labelledby`, scroll lock |
| `DropdownMenu` | Arrow key navigation, `Escape` close, `role="menu"`, `role="menuitem"` |

**Key implication:** The fix for `CampaignLoader` (Task 7) is to swap the custom dialog `<div>` for shadcn `Dialog` — this eliminates the most significant keyboard accessibility failure (no focus trap) with minimal code change.

### 2. Color-Only Indicators — Specific Fix Pattern

For the HP bar threshold (Task 2), the recommended implementation:

```tsx
// In CombatantRow.tsx

function getHpThresholdLabel(current: number, max: number): string {
  if (max === 0) return "";
  const pct = current / max;
  if (pct > 0.5) return "OK";
  if (pct > 0.25) return "LOW";
  return "CRIT";
}

// In JSX — HP bar section:
const thresholdLabel = getHpThresholdLabel(combatant.current_hp, combatant.max_hp);

// Update progressbar aria-label:
aria-label={`${combatant.name} hit points${thresholdLabel ? ` — ${thresholdLabel}` : ""}`}

// Add visible label next to HP numbers (satisfies NFR21 for sighted color-blind users):
{thresholdLabel && (
  <span
    className="text-xs font-mono ml-1 text-white/50"
    data-testid={`hp-threshold-${combatant.id}`}
  >
    {thresholdLabel}
  </span>
)}
```

For the turn indicator (Task 1), the recommended implementation:

```tsx
// Replace the dot span:
{isCurrentTurn && (
  <span
    className="text-[#e94560] shrink-0 text-xs leading-none select-none"
    aria-label="Current turn"
    data-testid="current-turn-indicator"
  >
    ▶
  </span>
)}
```

The `▶` glyph is visible in all color-blind simulations (it's a shape, not a color cue) and the `aria-label` provides the screen reader announcement.

### 3. Skip Navigation Pattern

Skip-nav is a WCAG 2.4.1 (Level A) requirement — technically mandatory for WCAG AA compliance. The pattern:

```tsx
// First child of root <div> in app/app/layout.tsx:
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#e94560] focus:text-white focus:rounded-md focus:text-sm font-medium"
>
  Skip to main content
</a>
```

The `sr-only` class hides it from visual display; `focus:not-sr-only` makes it appear when a keyboard user presses Tab as the first action on the page. This is the standard skip-nav implementation pattern for Tailwind projects.

### 4. CampaignLoader Dialog Migration

The current `CampaignLoader` uses a hand-rolled dialog `<div>` that lacks focus trapping. The `components/ui/dialog.tsx` shadcn component is already present in the project (listed in git status as untracked — it exists). Migration approach:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Replace open/close state management to use Dialog's `open` + `onOpenChange`:
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <button
      type="button"
      onClick={() => { setOpen(true); fetchCampaigns(); }}
      className="text-sm text-white/50 hover:text-white/80 underline transition-colors"
      data-testid="load-campaign-btn"
    >
      Load Campaign
    </button>
  </DialogTrigger>
  <DialogContent className="bg-[#16213e] border border-white/10 max-w-md">
    <DialogHeader>
      <DialogTitle className="text-white">Load Player Group</DialogTitle>
    </DialogHeader>
    {/* ... campaign list content ... */}
  </DialogContent>
</Dialog>
```

**Note:** `DialogContent` from Radix renders its own close button (`X`) by default. Remove the manual close button from the current implementation to avoid duplication, or pass `showCloseButton={false}` if the shadcn wrapper supports it, and keep the existing close UX.

### 5. Tap Target Override Pattern for shadcn Buttons

shadcn `Button size="sm"` uses `h-8` (32px). To meet 44px without modifying the shared Button component:

```tsx
// Pass min-h override in className:
<Button
  size="sm"
  className="bg-[#e94560] hover:bg-[#c73652] text-white min-h-[44px]"
>
  + Add Player
</Button>
```

Tailwind utility classes have higher specificity than component defaults when using `clsx`/`cn` merge — the `min-h-[44px]` will not reduce the height below 44px. For the `h-7` buttons ("Edit"/"Remove"), remove the `h-7` class and add `min-h-[44px]`:

```tsx
<Button
  size="sm"
  variant="ghost"
  className="text-white/50 hover:text-white text-xs px-2 min-h-[44px]"
  // note: h-7 removed
>
  Edit
</Button>
```

### 6. Font Size — Confirmed Baseline

Tailwind's `preflight` CSS sets `html { font-size: 16px }`. Tailwind's `text-base` is `1rem` = 16px. The layout's root `<div>` should explicitly carry `text-base` so that any future Tailwind config change to base font size does not silently break NFR23. This is a one-class addition — no ripple effects.

Text sizes used in child components (`text-sm` = 14px, `text-xs` = 12px) are for labels, badges, and supporting text only — they do NOT violate NFR23 as the NFR refers to minimum body text, not all text.

---

## File Changes Expected

| File | Action | Purpose | AC |
|------|--------|---------|-----|
| `components/combat/CombatantRow.tsx` | Modify | Fix `aria-current` boolean; replace dot with `▶` glyph; add HP threshold label; add `min-h-[44px]` to expand button | AC1, AC2, AC4 |
| `components/session/CombatSessionClient.tsx` | Modify | Add `min-h-[44px]` and `aria-label` to "Next Turn" button | AC4, AC1 |
| `components/oracle/MonsterSearch.tsx` | Modify | Add `min-h-[44px]` to expand and add-to-combat buttons | AC4 |
| `components/session/CampaignLoader.tsx` | Modify | Migrate to shadcn `Dialog`; add `type="button"`; add `aria-label` to Load buttons | AC1, AC4, AC5 |
| `components/dashboard/PlayerCharacterManager.tsx` | Modify | Add `min-h-[44px]` to all action buttons; remove `h-7` from Edit/Remove buttons | AC4 |
| `app/app/layout.tsx` | Modify | Add skip-nav link; add `id="main-content"` to `<main>`; add `aria-label` to `<nav>`; add `text-base` to root div | AC1, AC3 |
| `app/app/session/[id]/page.tsx` | Modify | Fix back-link arrow ARIA (G8); add `min-h-[44px]` to nav links if applicable | AC1 |
| `components/combat/InitiativeTracker.tsx` | Modify | Wrap `⚠` emoji with `role="img"` and `aria-label` | AC1 |
| `components/combat/CombatantRow.test.tsx` | Modify | Add AC1/AC2 ARIA assertions | AC1, AC2 |
| `components/oracle/MonsterSearch.test.tsx` | Modify | Add AC1/AC4 assertions | AC1, AC4 |
| `components/session/CampaignLoader.test.tsx` | Modify | Add focus trap + keyboard Escape + aria-label assertions | AC1, AC5 |

**Do NOT modify:**
- `next.config.ts` — configured in Story 7.1; do not touch
- `lib/srd/` files — no accessibility changes needed
- `components/ui/` shadcn primitives — these are library files; accessibility is already correct
- `components/oracle/MonsterStatBlock.tsx` — `aria-label` on section already present; no changes needed

---

## Architecture Compliance

- **Stack:** Next.js 16 App Router + TypeScript strict + React 19
- **Styling:** Tailwind CSS utilities only — no new CSS files
- **Components:** All fixes use existing components; one component migration (CampaignLoader → shadcn Dialog)
- **shadcn/ui:** `components/ui/dialog.tsx` is already present in the project (per git status)
- **Testing:** Jest + React Testing Library — use `getByRole`, `getByLabelText`, `userEvent.keyboard` for all accessibility assertions
- **No new dependencies:** All fixes use existing Tailwind classes, existing shadcn primitives, and native ARIA attributes

---

## Dev Notes / Completion Checklist

Before marking this story done, confirm ALL of the following:

- [ ] `aria-current={true}` (boolean, not string) on current-turn `<li>` in `CombatantRow`
- [ ] Turn indicator is a shape glyph (`▶`) or equivalent — NOT color-dot only
- [ ] HP bar progressbar `aria-label` includes threshold text ("OK"/"LOW"/"CRIT")
- [ ] HP threshold label is visible as text (not hidden) for color-blind users
- [ ] Skip-nav link `<a href="#main-content">` present as first child of root layout div
- [ ] `<main id="main-content">` in `app/app/layout.tsx`
- [ ] `<nav aria-label="Main navigation">` in `app/app/layout.tsx`
- [ ] `text-base` on root div of `app/app/layout.tsx`
- [ ] All interactive buttons have `min-h-[44px]` — verify in: CombatantRow, CombatSessionClient, MonsterSearch, CampaignLoader, PlayerCharacterManager, layout nav
- [ ] `CampaignLoader` uses shadcn `Dialog` — focus trapped, Escape closes, initial focus set by Radix
- [ ] Campaign "Load" buttons have descriptive `aria-label` including campaign name
- [ ] `⚠` emoji in InitiativeTracker has `role="img"` and `aria-label`
- [ ] Back link in session page does not expose raw `←` to screen readers
- [ ] `npm test` passes — all existing 222 tests plus new accessibility tests
- [ ] Manual keyboard-only test: Tab through session view, advance turn, open stat block, search monster — all reachable without mouse
