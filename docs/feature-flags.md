# Feature Flags Reference

This repo uses three coexisting feature-flag systems. Pick the right one
for the situation before adding a new toggle.

| System | File | Purpose | Storage |
|---|---|---|---|
| Env-driven beta rollouts | [`lib/flags.ts`](../lib/flags.ts) | Architecture-change rollouts (e.g. `ff_combatant_add_reorder`) with `window.__RPG_FLAGS__` runtime override for tests | `process.env.NEXT_PUBLIC_FF_*` + hard-coded defaults + runtime override |
| Plan / subscription gating | [`lib/feature-flags.ts`](../lib/feature-flags.ts) | Features tied to user plan (`free` vs `pro`) | Supabase table (server-resolved) |
| Single-purpose redesign flags | `lib/flags/*` | One file per large surface redesign (current: Grimório / Player HQ V2) | `process.env.NEXT_PUBLIC_*` with strict compare |

The "single-purpose" folder is intentional so Sprint-10-style cleanup
is a clean file delete + grep-replace, without touching the shared
`lib/flags.ts` enum every time a redesign lands.

---

## `NEXT_PUBLIC_PLAYER_HQ_V2` — Grimório / Player HQ V2

**Module:** [`lib/flags/player-hq-v2.ts`](../lib/flags/player-hq-v2.ts)
**Owner:** Grimório workstream (Track A + Track B, Sprint 1–10)
**Spec:** [`_bmad-output/party-mode-2026-04-22/14-sprint-plan.md §2`](../_bmad-output/party-mode-2026-04-22/14-sprint-plan.md)
**PRD decisions:** [`_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md`](../_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md) decisions #27–#47

### What it gates (once Sprint 2+ adds call sites)

All surfaces that make up the 4-tab Player HQ redesign:

- `components/player/PlayerHqShell.tsx` — 4-tab shell (Herói / Arsenal / Diário / Mapa) vs. current 7-tab sheet
- `/app/campaigns/[id]/sheet` route — rendering path picks V1 or V2 shell by flag
- `/app/campaigns/[id]/journey` — new route only exists when flag ON
- 3 conversion components that redirect post-combat per decision #43:
  - `components/conversion/RecapCtaCard.tsx` — flag ON redirects to `/sheet?tab=heroi`
  - `components/conversion/GuestRecapFlow.tsx` — same
  - `components/conversion/GuestUpsellModal.tsx` — same
- Level Up wizard (Sprint 7–8 — gated by the same flag + optional sub-flag `NEXT_PUBLIC_LEVELUP_WIZARD`)

### Strict-compare semantics

Only the exact string `"true"` enables the flag. Any other value — `"1"`,
`"yes"`, empty string, unset, a typo — resolves to `false`. This mirrors
`NEXT_PUBLIC_E2E_MODE` and is intentional: a typo can never flip V2 on in
prod accidentally.

```ts
// Correct
NEXT_PUBLIC_PLAYER_HQ_V2=true    // → flag ON

// All of these → flag OFF
NEXT_PUBLIC_PLAYER_HQ_V2=True
NEXT_PUBLIC_PLAYER_HQ_V2=1
NEXT_PUBLIC_PLAYER_HQ_V2=yes
NEXT_PUBLIC_PLAYER_HQ_V2=tru
NEXT_PUBLIC_PLAYER_HQ_V2=
// (unset)
```

### Recommended Vercel configuration

| Environment | Value | Rationale |
|---|---|---|
| Production | `false` (or unset) | Master stays deployable through all 8 dev sprints; users see V1 until Sprint 10 flip |
| Preview (PR deploys) | `true` | Every PR is tested against V2 automatically |
| Staging | `true` | Continuous V2 QA for Dani and QA leads |
| Development (local + agent worktrees) | `true` | Dev work happens on V2 by default |

Set these via Vercel → Project → Settings → Environment Variables. Scope
each value to the matching environment.

### Local development

Copy `.env.example` → `.env.local` and set:

```
NEXT_PUBLIC_PLAYER_HQ_V2=true
```

Then restart `next dev` — Next.js inlines `NEXT_PUBLIC_*` vars at build
time, so env changes do NOT hot-reload.

### Usage in code

```ts
import { isPlayerHqV2Enabled } from "@/lib/flags/player-hq-v2";

// In a server component, route handler, or client component
if (isPlayerHqV2Enabled()) {
  return <PlayerHqShell campaignId={id} />;
}
return <LegacyPlayerSheet campaignId={id} />;
```

Do not call the function at module top-level if you need SSR+CSR consistency —
call it inside a component/handler so both environments evaluate the same
inlined value.

### Rollout timeline

| Sprint | Track A owns | Track B owns | Flag state |
|---|---|---|---|
| 1 | EP-0 consolidations | Flag lib + CI parity + E2E scaffold | OFF everywhere (no call sites yet) |
| 2 | A1–A6 (Fase A quick wins) | A6 conversion rewrites + post-combat redirect | OFF prod / ON staging |
| 3–4 | B1–B6 (Fase B topologia 4 tabs) | Tab state hook + Wave 3 scaffolds | OFF prod / ON staging |
| 5–6 | C1–C7 (Ribbon Vivo + Combat Auto) | D1+E1 migrations + Diário + 5e unit tests | OFF prod / ON staging |
| 7–8 | E4–E6 (Wizard Level Up) | E2/E7 Mestre UI + polish | OFF prod / ON staging |
| 9 | QA/regression + bug bash | QA + prod migration deploy | OFF prod / ON staging |
| 10 | **Flip ON prod** (10 % → 50 % → 100 % Tue/Wed/Thu) | Retrospective + post-flip monitoring | **ON everywhere** |
| 10 (Fri) | **Cleanup PR** — delete flag, delete V1 code | Same | Flag deleted |

### Sprint 10 cleanup checklist

1. `rtk grep "NEXT_PUBLIC_PLAYER_HQ_V2"` — list every call site
2. Replace every `if (isPlayerHqV2Enabled())` branch with the V2 path
3. Delete:
   - `lib/flags/player-hq-v2.ts`
   - `lib/flags/player-hq-v2.test.ts`
   - V1 files (old sheet shell, old conversion redirect branches)
   - `.env.example` section and Vercel env vars
   - This subsection of `docs/feature-flags.md`
4. Verify `rtk tsc --noEmit` + `rtk lint` clean
5. Open `chore/hq-v2-cleanup` PR on Friday of Sprint 10

### Do NOT

- Use `NEXT_PUBLIC_PLAYER_HQ_V4` — legacy doc-only name. Grep 2026-04-23
  showed zero code references; standardized on V2 per Dani directive.
- Extend `lib/flags.ts` enum for this — the single-purpose file keeps
  cleanup trivial.
- Call `isPlayerHqV2Enabled()` inside `useMemo` deps or similar reactive
  contexts — it is a constant per deploy, not reactive.
- Flip the prod flag before the Sprint 9 QA gate closes — rollout cadence
  is authorized by Dani only.
