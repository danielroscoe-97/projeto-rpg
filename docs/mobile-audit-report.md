# Mobile Responsiveness Audit Report

**Date:** 2026-03-28
**Device:** Pixel 5 (393x851)
**Method:** Playwright MCP + manual code review
**Scope:** All 28 navigable pages, all major components

---

## Summary

| Metric | Value |
|--------|-------|
| Pages tested | 17 (all unique layouts) |
| Critical issues found | 5 |
| Issues fixed | 5 |
| Components with responsive patterns | 36/58 (62%) |
| Components WITHOUT responsive patterns | 22/58 (38%) |

---

## Pages That Work Well on Mobile (No Changes Needed)

| Page | Route | Status |
|------|-------|--------|
| Landing page | `/` | Fully responsive |
| Login | `/auth/login` | Clean layout |
| Sign-up | `/auth/sign-up` | Clean layout |
| Forgot password | `/auth/forgot-password` | Clean layout |
| Pricing | `/pricing` | Stacks properly |
| Compendium - Monsters | `/app/compendium?tab=monsters` | Excellent |
| Compendium - Spells | `/app/compendium?tab=spells` | Excellent |
| Compendium - Stat blocks | (monster detail view) | Excellent |
| Settings | `/app/settings` | Clean layout |
| Presets | `/app/presets` | Clean layout |
| Session selection | `/app/session/new` | Clean layout |
| QR code share dialog | (modal) | Functional |
| HP adjuster | (inline panel) | Functional |
| Guest banner | (banner component) | Responsive |
| Legal pages | `/legal/*` | Clean layout |

---

## Issues Found & Fixed

### Fix #1: Hamburger Menu Semi-Transparent Background
**Severity:** HIGH
**File:** `components/layout/Navbar.tsx:136`
**Problem:** Mobile menu used `glass-nav` class (85% opacity background) causing page content to bleed through and making menu items unreadable.
**Fix:** Replaced `glass-nav` with `bg-background` (fully opaque) + `bottom-0` to cover full screen + `overflow-y-auto` for scrollable menu.

### Fix #2: Dashboard Title Cut Off by Action Button
**Severity:** HIGH
**File:** `app/app/dashboard/page.tsx:72-87`
**Problem:** Title "DASHBOARD" forced to share horizontal space with "Nova Sessao de Combate" button (`min-w-[240px]`, `shrink-0`). On 393px viewport, title gets clipped to ~3 chars.
**Fix:** Changed to `flex-col sm:flex-row` layout. Button goes full-width below title on mobile, beside it on `sm:` and up.

### Fix #3: Encounter Setup Table Columns Merging ("NOMEHP")
**Severity:** HIGH
**Files:**
- `components/combat/EncounterSetup.tsx:681-690`
- `components/guest/GuestCombatClient.tsx:409-417`
- `components/combat/CombatantSetupRow.tsx:49-238`

**Problem:** Column headers had 337px of fixed-width elements (`w-16` + `w-16` + `w-14` + `w-[170px]` + `w-8` + `w-5`) packed into 393px viewport. "Nome" and "HP" headers merged into "NOMEHP". Notes and actions columns caused horizontal overflow.

**Fix:**
- Reduced column widths on mobile: `w-12 md:w-16` (init, hp), `w-10 md:w-14` (ac)
- Hidden columns on mobile: notes (`hidden md:block`), actions spacer, monster token spacer
- Applied consistently to: column headers, combatant rows, and add row

### Fix #4: Add Combatant Row Cramped on Mobile
**Severity:** HIGH
**Files:**
- `components/combat/EncounterSetup.tsx:727-800`
- `components/guest/GuestCombatClient.tsx:450-517`

**Problem:** Add row button was `w-[170px]` fixed. Notes input, token spacer, and button competed for 393px width. Inputs were truncated/invisible.

**Fix:**
- Button: `w-auto md:w-[170px]` with `px-3 md:px-0`
- Notes input: `hidden md:block`
- Token spacer: `hidden md:block`
- Init/HP/AC inputs: reduced widths on mobile

### Fix #5: Active Combat & Encounter Setup Headers Cramped
**Severity:** MEDIUM
**Files:**
- `app/app/session/[id]/page.tsx:91-110`
- `components/combat/EncounterSetup.tsx:609`
- `components/guest/GuestCombatClient.tsx:377`

**Problem:** Title + "Compartilhar Sessao" + "Voltar ao Dashboard" all forced into a single horizontal row with `justify-between`, leaving no space on mobile.

**Fix:** Changed to `flex-col sm:flex-row` layout. Elements stack vertically on mobile, sit side-by-side on larger screens.

---

## Mobile UX Behavior Recommendations (Future Work)

### Priority 1 - High Impact
1. **Touch targets**: Some action buttons in combatant rows are below 44x44px minimum. Consider expanding touch areas on mobile.
2. **Notes field**: Currently hidden on mobile. Consider adding an expandable "notes" section below each combatant row that shows on tap.
3. **Combat action buttons** (HP, Cond, Derrotar, Editar, Remover): Consider a swipe-to-reveal pattern or long-press context menu instead of all buttons visible at once.

### Priority 2 - UX Improvements
4. **Keyboard on mobile**: When tapping number inputs (Init, HP, AC), ensure `inputMode="numeric"` is set to bring up the number pad instead of full keyboard.
5. **Scroll position**: After adding a combatant, auto-scroll to show the new row on mobile (may be below the fold).
6. **Compendium search**: Consider full-screen search overlay on mobile instead of inline search bar.
7. **Player view**: Consider sticky header with current turn indicator on mobile.

### Priority 3 - Polish
8. **Landscape mode**: Test on landscape mobile — some sections may need min-height adjustments.
9. **Bottom safe area**: On devices with gesture bars (iPhone), add `pb-safe` padding to floating elements.
10. **PWA optimization**: Consider adding a "Add to Home Screen" prompt for mobile users.

---

## Components Still Missing Responsive Patterns

These components don't have explicit mobile breakpoints but may work acceptably due to flex/auto layouts:

| Component | Risk Level | Notes |
|-----------|-----------|-------|
| `combat/CRCalculator.tsx` | Low | Pro feature, modal |
| `combat/DiceRollLog.tsx` | Medium | Action log sidebar |
| `combat/KeyboardCheatsheet.tsx` | Low | Desktop-only feature |
| `combat/MonsterActionBar.tsx` | Medium | Button bar in combat |
| `combat/StatsEditor.tsx` | Medium | Inline editor modal |
| `dashboard/CampaignManager.tsx` | Low | Uses flex, wraps OK |
| `dashboard/GuestDataImportModal.tsx` | Low | Modal dialog |
| `player/PlayerJoinClient.tsx` | Medium | Login/join flow |

---

## Screenshots

All screenshots saved in `mobile-audit/` directory:
- `01-landing-fullpage.png` - Landing page (full)
- `02-try-setup.png` - Guest /try setup
- `03-login.png` - Login page
- `04-signup.png` - Sign-up page
- `05-pricing.png` - Pricing page
- `06-dashboard.png` - Dashboard (BEFORE fix)
- `07-session-new.png` - Session selection
- `08-encounter-setup-dm.png` - DM encounter setup (BEFORE fix)
- `09-compendium-monsters.png` - Compendium monsters list
- `10-compendium-statblock.png` - Monster stat block
- `11-settings.png` - Settings page
- `12-hamburger-menu.png` - Hamburger menu (BEFORE fix)
- `13-active-combat.png` - Active combat session
- `14-hp-adjuster.png` - HP adjuster panel
- `15-share-session.png` - Share session QR code
- `16-presets.png` - Presets page
- `17-compendium-spells.png` - Compendium spells list
