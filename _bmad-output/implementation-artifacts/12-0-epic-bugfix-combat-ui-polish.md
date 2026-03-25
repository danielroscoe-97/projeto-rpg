# Epic 12 — Bug Fix Sprint: Combat Setup & UI Polish

## Epic Overview

| Field             | Value                                      |
| ----------------- | ------------------------------------------ |
| **Epic ID**       | 12                                         |
| **Title**         | Bug Fix Sprint: Combat Setup & UI Polish   |
| **Status**        | IN-PROGRESS                                |
| **Total SP**      | 4                                          |
| **Priority**      | P0 — user-facing bugs impacting core flow  |
| **Source**        | QA agent test report (2026-03-25)          |

## Business Value

- Eliminates frustrating input concatenation that corrupts initiative/HP values
- Fixes stale validation state that blocks users from starting combat
- Ensures "Limpar tudo" performs a full, clean reset
- Improves condition panel UX during active combat
- Fixes intermittent navbar click issues on /try route

## Stories

### Story 12.1 — Input Auto-Select on Focus (P0, 1 SP)

**Bug**: Clicking a pre-filled numeric input (Initiative, HP, AC) appends typed characters instead of replacing. E.g., field has "7", user types "20" → gets "720".

**Root Cause**: No `onFocus` handler to auto-select input content.

**Fix**: Add `onFocus={(e) => e.target.select()}` to all numeric inputs in:
- `CombatantSetupRow.tsx` — Init, HP, AC inputs
- `GuestCombatClient.tsx` — Add row Init, HP, AC inputs
- `EncounterSetup.tsx` — Add row Init, HP, AC inputs

**Acceptance Criteria**:
- [ ] Clicking a pre-filled numeric input selects all text
- [ ] Typing replaces the value instead of appending
- [ ] Works on both setup row and add row inputs

---

### Story 12.2 — Limpar Tudo Full Reset (P0, 1 SP)

**Bug #3**: "Limpar tudo" clears combatants but validation message ("X combatentes ainda precisam de iniciativa") remains visible.

**Bug #4**: "Limpar tudo" does not clear the Add row form inputs (Name, HP, etc.).

**Root Cause**: `resetCombat()` only resets the Zustand store. Local React state (`submitError`, `addRow`) is not cleared.

**Fix**: In `GuestCombatClient.tsx` → `GuestEncounterSetup`, wrap the reset handler to also clear `submitError` and `addRow`. Same pattern in `EncounterSetup.tsx`.

**Acceptance Criteria**:
- [ ] "Limpar tudo" clears the combatant list
- [ ] "Limpar tudo" clears the Add row form fields
- [ ] "Limpar tudo" hides any validation error messages
- [ ] SRD search query is also cleared

---

### Story 12.3 — Validation State Sync (P1, 1 SP)

**Bug**: "Iniciar Combate" button validation can show stale "X combatentes ainda precisam de iniciativa" even after all initiatives are filled. Requires extra interaction to re-render.

**Root Cause**: `submitError` is only evaluated on button click. If user fills in missing initiatives after seeing the error, the stale message persists until the next click.

**Fix**: Clear `submitError` reactively when combatants change (initiative updates).

**Acceptance Criteria**:
- [ ] After fixing a missing initiative, the error message disappears automatically
- [ ] "Iniciar Combate" button remains correctly disabled when combatants === 0

---

### Story 12.4 — Condition Panel Auto-Close on Defeat (P1, 0.5 SP)

**Bug**: Condition selector panel stays open when a combatant is marked as defeated.

**Root Cause**: `setDefeated` does not close `openPanel` state in `CombatantRow`.

**Fix**: Add `useEffect` to close `openPanel` when `combatant.is_defeated` becomes true.

**Acceptance Criteria**:
- [ ] Marking a combatant as defeated closes any open panel (HP, conditions, edit)
- [ ] Panels can still be opened/closed normally for non-defeated combatants

---

### Story 12.5 — Navbar Click Reliability on /try (P2, 0.5 SP)

**Bug**: Login/Criar Conta links in navbar sometimes require double-click on /try route.

**Root Cause**: The `GuestBanner` component sits below the navbar but could capture pointer events on overlap area during render timing. Also, `FloatingCardContainer` might have z-index interference.

**Fix**: Ensure proper `z-index` stacking and `pointer-events` on banner/floating elements so they don't intercept navbar clicks.

**Acceptance Criteria**:
- [ ] Login and Criar Conta links respond on first click consistently
- [ ] GuestBanner does not overlap navbar clickable area
- [ ] FloatingCardContainer does not block navbar interactions

## Files Impacted

| File | Stories |
|------|---------|
| `components/combat/CombatantSetupRow.tsx` | 12.1 |
| `components/guest/GuestCombatClient.tsx` | 12.1, 12.2, 12.3 |
| `components/combat/EncounterSetup.tsx` | 12.1, 12.2, 12.3 |
| `components/combat/CombatantRow.tsx` | 12.4 |
| `app/try/layout.tsx` | 12.5 |
| `components/guest/GuestBanner.tsx` | 12.5 |

## Architecture Notes

- All fixes are component-level — no store or API changes needed
- Fixes apply to both Guest (free) and Auth (logged-in) combat flows
- No new dependencies required
