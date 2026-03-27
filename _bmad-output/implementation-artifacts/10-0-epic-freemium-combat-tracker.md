# Epic 10: Freemium — Combat Tracker

## Epic Overview

Enable any visitor to run a **complete single-combat session without creating an account**, accessible directly from the Landing Page via a new "Try it free" CTA. All combat state lives in-browser (Zustand + `sessionStorage`) — no Supabase writes. When the user tries to save or export, a contextual upsell modal nudges them toward a free account. The core DM experience (encounter setup, initiative, HP, conditions, Oracle) is fully available in guest mode.

## Business Value

- **Reduce time-to-first-value**: Users experience the product's core loop before any sign-up friction
- **Top-of-funnel conversion**: "Try it free" CTA captures users who won't sign up cold — they convert *after* the aha-moment
- **Market differentiation**: No competitor offers a zero-friction, no-account combat tracker as a demo/onboarding path
- **Retention seed**: Guest users who save their progress become registered users with real investment in the product

## Scope Definition

### In Scope — Guest Mode Includes

- Full encounter setup: add monsters via Oracle search or manual entry, add PCs/NPCs
- Full initiative flow: enter values, auto-sort, drag-and-drop tiebreak
- Full combat flow: turn advancement, HP tracking (damage/healing/temp HP), conditions (all 13), defeat, add/remove mid-combat
- Oracle access: monster search + inline stat block, spell search + modal, condition lookup
- Single active combat — no campaign, no save-to-server, no history
- All session state stored in `sessionStorage` (survives navigation within tab, cleared on tab close)

### Explicitly Out of Scope

- Campaign/party persistence
- Save-to-account or combat history
- Player view link generation (requires a server-side session — this is the logged-in upsell)
- Ruleset version switching per-combatant (mid-combat) — available in logged-in version only
- Multi-session continuity

## Route Architecture

- New public route: **`/try`** — bypasses all auth middleware guards
- Existing `/app/*` routes remain fully protected
- Middleware already scoped to `pathname.startsWith("/app/")` — `/try` requires zero middleware changes
- No new API endpoints required — all state is ephemeral client-side

## Dependencies

- Existing combat state stores (Zustand) — will be reused/adapted without server sync
- Existing `EncounterSetup`, `CombatantRow`, Oracle components — reused as-is
- Existing SRD data bundles (334 monsters, 319 spells) — already client-side, zero changes
- `sessionStorage` — browser-native, no new library needed
- LP (`app/page.tsx`) — one new CTA button added to HeroSection and FinalCtaSection

## Conversion Funnel

```
LP → "Testar Gratis" button
  → /try (no auth, no redirect)
    → Pre-populated sample encounter (instant aha-moment)
    → Guest banner: "Modo visitante — combate nao sera salvo"
    → Full combat experience
      → Save/Export attempt → Upsell modal → /auth/sign-up
      → Natural session end → Footer nudge: "Gostou? Salve suas campanhas →"
```

---

## Story 10.1: Landing Page — "Testar Gratis" CTA

**Priority**: P1 (Entry Point)
**Estimate**: 2 SP

### Description

Add a secondary "Testar Gratis — sem cadastro" CTA button to the Landing Page `HeroSection` and update `FinalCtaSection`. The button links directly to `/try`.

### Acceptance Criteria

- [ ] `HeroSection` in `app/page.tsx` has a new tertiary CTA below existing buttons: **"Testar Gratis — sem cadastro →"**
- [ ] Button style: ghost/outline variant, distinct from the primary gold "Criar Conta Gratis" button
- [ ] `href="/try"` — direct link, no auth check
- [ ] `FinalCtaSection` gains a smaller secondary text link: *"Ou teste agora sem criar conta →"*
- [ ] Navbar Supabase button (optional): consider adding "Testar" link in navbar right slot alongside Login/Criar Conta
- [ ] CTA is keyboard accessible and meets WCAG AA touch target (min 44×44px)
- [ ] No changes to existing auth CTAs or their styling

### Technical Notes

```tsx
// app/page.tsx — HeroSection CTAs block
<div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
  <Link href="/auth/sign-up" className="...gold primary...">
    Criar Conta Gratis
  </Link>
  <Link href="/auth/login" className="...ghost secondary...">
    Ja tenho conta
  </Link>
  <Link href="/try" className="...ghost tertiary text-sm underline-offset-4 hover:underline text-muted-foreground...">
    Testar sem cadastro →
  </Link>
</div>
```

---

## Story 10.2: Guest Route — `/try` Page Shell

**Priority**: P0 (Blocker)
**Estimate**: 3 SP

### Description

Create the `app/try/` route. This is a public page that renders the full combat tracker UI without any auth guard. The page initializes the guest combat store and renders the encounter setup flow.

### Acceptance Criteria

- [ ] `app/try/page.tsx` exists and renders without authentication
- [ ] Route is accessible when logged out — no redirect to `/auth/login`
- [ ] Route is accessible when logged in — no redirect away
- [ ] Page renders the `GuestCombatLayout` wrapper with guest-mode banner
- [ ] Page title: `"Pocket DM — Combat Tracker (Modo Visitante)"`
- [ ] Middleware `proxy.ts` has no changes needed — `/try` is not under `/app/` so it is already public
- [ ] Vercel/Next.js build passes with new route

### Technical Notes

```
app/
  try/
    page.tsx          ← new public route
    layout.tsx        ← optional: minimal layout without Navbar auth links
```

No middleware changes required. Current guard is:
```ts
if (pathname.startsWith("/app/") && !user) { ... redirect }
```
`/try` is outside this guard by design.

---

## Story 10.3: Ephemeral Combat State — Guest Zustand Store

**Priority**: P0 (Foundation)
**Estimate**: 5 SP

### Description

Create a dedicated Zustand store (`useGuestCombatStore`) that manages the complete guest combat lifecycle — encounter setup through combat end — without any Supabase writes. State is persisted in `sessionStorage` to survive same-tab navigation.

### Acceptance Criteria

- [ ] `lib/stores/guest-combat-store.ts` created using Zustand + `persist` middleware with `sessionStorage`
- [ ] Store manages: combatants list, initiative order, current turn, round number, combat phase (`setup | initiative | combat | ended`)
- [ ] `addCombatant(combatant)` — adds monster or PC/NPC to the setup list
- [ ] `removeCombatant(id)` — removes from list at any phase
- [ ] `setInitiative(id, value)` — sets initiative value for a combatant
- [ ] `startCombat()` — sorts combatants by initiative, transitions to `combat` phase
- [ ] `nextTurn()` — advances active turn, increments round at wrap-around
- [ ] `applyDamage(id, amount)` / `applyHealing(id, amount)` — modifies current HP, enforces 0 floor and max HP ceiling
- [ ] `setTempHp(id, value)` — sets temp HP; damage reduces temp HP before current HP
- [ ] `toggleCondition(id, condition)` — adds or removes a condition from a combatant
- [ ] `defeatCombatant(id)` — marks as defeated, removes from active turn order
- [ ] `resetCombat()` — clears all state (used when user starts over or closes)
- [ ] Store is fully isolated from any Supabase or server-sync logic
- [ ] Unit tests for all store actions (happy path + edge cases)
- [ ] `sessionStorage` key: `guest-combat-v1`

### Technical Notes

```typescript
// lib/stores/guest-combat-store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type CombatPhase = 'setup' | 'initiative' | 'combat' | 'ended'

interface GuestCombatant {
  id: string
  name: string
  type: 'monster' | 'pc' | 'npc'
  maxHp: number
  currentHp: number
  tempHp: number
  ac: number
  initiative: number | null
  conditions: string[]
  isDefeated: boolean
  rulesetVersion?: '2014' | '2024'
  monsterId?: string // for Oracle link
}

interface GuestCombatState {
  phase: CombatPhase
  combatants: GuestCombatant[]
  activeIndex: number
  round: number
  // actions...
}
```

---

## Story 10.4: Pre-Populated Sample Encounter

**Priority**: P1 (UX)
**Estimate**: 2 SP

### Description

When a visitor lands on `/try`, the encounter setup screen is pre-populated with a sample encounter (3 Goblins + 2 unnamed PCs) so the user immediately sees the product in action rather than a blank state.

### Acceptance Criteria

- [ ] On first load (no `sessionStorage` state), guest store initializes with: 3× Goblin (SRD 2014, CR 1/4, HP 7, AC 15) + 2× PC (name "Herói 1" / "Herói 2", HP 12, AC 14)
- [ ] If `sessionStorage` has existing state (user navigated away and back), restore that state instead of resetting
- [ ] Sample encounter data is hardcoded constants — no API call required
- [ ] Tooltip or subtle annotation on sample monsters: *"Exemplo — edite ou remova à vontade"*
- [ ] "Limpar tudo" button in setup resets to blank state (not sample)

### Technical Notes

```typescript
// constants/sample-encounter.ts
export const SAMPLE_ENCOUNTER: GuestCombatant[] = [
  { id: 'sample-goblin-1', name: 'Goblin 1', type: 'monster', maxHp: 7, currentHp: 7, ac: 15, ... },
  { id: 'sample-goblin-2', name: 'Goblin 2', type: 'monster', maxHp: 7, currentHp: 7, ac: 15, ... },
  { id: 'sample-goblin-3', name: 'Goblin 3', type: 'monster', maxHp: 7, currentHp: 7, ac: 15, ... },
  { id: 'sample-pc-1',     name: 'Herói 1', type: 'pc',      maxHp: 12, currentHp: 12, ac: 14, ... },
  { id: 'sample-pc-2',     name: 'Herói 2', type: 'pc',      maxHp: 12, currentHp: 12, ac: 14, ... },
]
```

---

## Story 10.5: Guest Mode UI Banner

**Priority**: P1 (UX)
**Estimate**: 1 SP

### Description

Display a non-intrusive persistent banner at the top of the `/try` page indicating guest mode, with a subtle CTA to create an account.

### Acceptance Criteria

- [ ] Banner renders at the top of the guest combat layout (below navbar if any, above encounter content)
- [ ] Copy: *"Modo visitante — seu combate não será salvo."* + link *"Criar conta grátis →"*
- [ ] Style: subtle, muted — does not compete visually with the combat UI
- [ ] Banner is dismissible (localStorage key `guest-banner-dismissed`) — stays dismissed across page reloads in same browser
- [ ] Not shown to logged-in users (not applicable on `/try`, but defensive check)
- [ ] Accessible: role="status", not `role="alert"` (non-urgent)

---

## Story 10.6: Full Combat Flow Parity in Guest Mode

**Priority**: P0 (Core)
**Estimate**: 5 SP

### Description

Wire the existing combat UI components (`EncounterSetup`, `CombatantRow`, initiative sort, turn advancement) to the `useGuestCombatStore` instead of the authenticated session store. All combat features available in the logged-in tracker must work identically in guest mode.

### Acceptance Criteria

- [ ] Encounter setup renders with all combatant add/edit/remove functionality
- [ ] Initiative entry + auto-sort works
- [ ] Drag-and-drop tiebreak works (existing `dnd-kit` setup)
- [ ] "Start Combat" transitions to combat phase
- [ ] Turn advancement ("Next Turn") works correctly through all combatants and rounds
- [ ] HP damage / healing / temp HP all work
- [ ] All 13 conditions can be applied/removed per combatant
- [ ] Defeat/remove combatant mid-combat works
- [ ] Add combatant mid-combat works
- [ ] Edit combatant stats (name, HP max, AC) mid-combat works
- [ ] No Supabase calls anywhere in the guest combat flow
- [ ] No auth imports or auth context reads in guest components
- [ ] All existing UI component tests still pass (components reused, not modified)

### Technical Notes

Components to wire to guest store:
- `components/combat/EncounterSetup.tsx` — props-based, no store coupling; wire via `/try/page.tsx`
- `components/combat/CombatantRow.tsx` — same pattern
- New wrapper page at `app/try/page.tsx` passes store actions as props or via context

Do NOT modify existing components to add guest-mode branching. Instead, use the components as-is, passing guest store actions where authenticated store actions were passed. If components have hard-coded auth context reads, extract those to props first.

---

## Story 10.7: Oracle Access in Guest Mode

**Priority**: P1 (Value)
**Estimate**: 1 SP

### Description

Confirm and validate that the Oracle (monster search, spell search, condition lookup) works correctly in guest mode. The Oracle is already stateless (pure SRD data, no auth), so this story is primarily a validation + any wiring needed in the guest layout.

### Acceptance Criteria

- [ ] Monster search renders and returns results on `/try`
- [ ] Inline stat block expansion works
- [ ] Spell search renders and modal opens correctly
- [ ] Condition lookup works
- [ ] Pinned cards (Epic 9) work in guest mode if Epic 9 is already merged
- [ ] No auth-dependent code paths are triggered from Oracle components when in guest mode
- [ ] Validated via manual smoke test on `/try` without any authenticated session

### Technical Notes

Oracle components (`MonsterSearch`, `SpellSearch`, `ConditionBadge`, `MonsterStatBlock`) have zero Supabase dependency — they read from the SRD data bundle. This story is likely a 0–1 SP pass-through once Story 10.6 is wired, but scoped separately to keep concerns isolated.

---

## Story 10.8: Upgrade Nudge — Save Intercept + Upsell Modal

**Priority**: P1 (Conversion)
**Estimate**: 3 SP

### Description

When a guest user attempts to save, export, or generate a player view link, intercept the action and display an upsell modal prompting them to create a free account. The modal shows the value proposition of the registered experience.

### Acceptance Criteria

- [ ] `GuestUpsellModal` component created at `components/guest/GuestUpsellModal.tsx`
- [ ] Modal triggers on: "Salvar" button click, "Exportar" button click, "Gerar Link de Sessao" button click (any save/share action in the guest flow)
- [ ] Modal copy: *"Seu combate merece ser lembrado."* + *"Crie uma conta gratuita para salvar encontros, carregar grupos de jogadores e gerar links para seus jogadores."*
- [ ] Modal has two actions: **"Criar Conta Gratis"** (→ `/auth/sign-up`) and **"Continuar sem salvar"** (dismiss modal, stay in guest mode)
- [ ] Modal does NOT appear for actions that don't require persistence (e.g., Oracle lookups, HP changes)
- [ ] Current guest combat state is passed as URL param or `sessionStorage` hand-off so sign-up flow can offer to restore it post-registration (nice-to-have, can be skipped v1)
- [ ] Modal is accessible: focus trap, ESC to dismiss, ARIA modal role

### Technical Notes

```tsx
// components/guest/GuestUpsellModal.tsx
interface GuestUpsellModalProps {
  isOpen: boolean
  onClose: () => void
  trigger: 'save' | 'export' | 'player-link'
}
```

Gate any "save" or "share" buttons in guest UI with:
```tsx
const { openUpsell } = useGuestUpsellModal()
<button onClick={() => openUpsell('save')}>Salvar</button>
```

---

## Story Dependency Map

```
10.2 (Route Shell)
  └→ 10.3 (Guest Store)
       └→ 10.4 (Sample Encounter)    ← parallel with 10.5
       └→ 10.6 (Combat Flow Parity)
            └→ 10.7 (Oracle Validation)
            └→ 10.8 (Upsell Modal)
10.1 (LP CTA) ← independent, can ship last or in parallel
```

**Recommended Implementation Order**: 10.2 → 10.3 → 10.6 → 10.4 → 10.5 → 10.7 → 10.8 → 10.1

---

## Story Summary

| # | Story | Priority | Estimate | Phase |
|---|-------|----------|----------|-------|
| 10.1 | LP "Testar Gratis" CTA | P1 | 2 SP | Entry |
| 10.2 | Guest route `/try` shell | P0 | 3 SP | Foundation |
| 10.3 | Ephemeral guest Zustand store | P0 | 5 SP | Foundation |
| 10.4 | Pre-populated sample encounter | P1 | 2 SP | UX |
| 10.5 | Guest mode UI banner | P1 | 1 SP | UX |
| 10.6 | Full combat flow parity | P0 | 5 SP | Core |
| 10.7 | Oracle access validation | P1 | 1 SP | Value |
| 10.8 | Upsell modal — save intercept | P1 | 3 SP | Conversion |
| | **Total** | | **22 SP** | |

---

## Definition of Done

- All AC items checked for all stories
- `/try` route works end-to-end without any Supabase session
- No auth-related redirects when visiting `/try` unauthenticated
- Upsell modal fires correctly at all save/share intercept points
- "Testar Gratis" button visible and functional on LP
- No regressions in existing `/app/*` authenticated flow
- All unit tests pass (`npm test`)
- Manual smoke test: complete combat from LP visit → `/try` → encounter setup → initiative → combat → save attempt → upsell modal → sign-up CTA
