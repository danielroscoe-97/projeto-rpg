# Player HQ E2E — Baseline

Sprint 1 Track B (EP-INFRA.4) scaffold. Lives side-by-side with the
existing `e2e/features/active-effects*.spec.ts` Player HQ coverage but
targets the **shell topology** instead of feature-level lifecycle.

## What's here

| Spec | Mode | Target |
|---|---|---|
| `sheet-smoke.spec.ts` | Auth | Pre-refactor baseline: 7-tab shell renders on `/app/campaigns/[id]/sheet` |
| `sheet-smoke-anon.spec.ts` | Anon (via `/join/[token]`) | Anon player cannot reach `/sheet` (documents the redirect) |
| `sheet-smoke-guest.spec.ts` | Guest (via `/try`) | Guest does not have `/sheet` equivalent (documents the gap) |

All three are **baseline** — they capture the current V1 behavior so
Sprint 2+ can catch regressions when the V2 shell arrives behind
`NEXT_PUBLIC_PLAYER_HQ_V2`.

## Running locally

```bash
# Full player-hq folder
rtk playwright test e2e/player-hq/

# Single spec
rtk playwright test e2e/player-hq/sheet-smoke.spec.ts --project=desktop-chrome

# Headed for debugging
rtk playwright test e2e/player-hq/sheet-smoke.spec.ts --headed
```

## What these specs deliberately do NOT assert

- **Tab switching interaction** — reserved for Sprint 2+ when B5 deep-links
  + B4 persistence land. Today the tabs are purely client-state so a
  pre-refactor test would be fragile.
- **Content correctness inside each tab** — `e2e/features/active-effects.spec.ts`
  owns that for Resources; `e2e/journeys/j21-player-ui-panels.spec.ts`
  owns spell slots; etc.
- **Feature-flag gating** — the V2 flag has zero call sites as of Sprint 1;
  assertions tied to it will appear in Sprint 2+ once `isPlayerHqV2Enabled()`
  is consumed.

## Why 3 specs for parity

The Combat Parity Rule (see `CLAUDE.md` § *Combat Parity Rule — Guest vs
Auth*) requires spec evidence for all 3 modes (Guest / Anon / Auth)
whenever combat or player runtime changes. The Anon and Guest specs
document **why** those modes do NOT have a `/sheet` equivalent so that
future refactors make that intentional gap explicit rather than
accidentally introducing broken redirects.
