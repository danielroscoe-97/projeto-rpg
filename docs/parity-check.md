# Combat Parity CI Gate

**Workflow:** [`.github/workflows/parity-check.yml`](../.github/workflows/parity-check.yml)
**Script:** [`scripts/ci/parity-check.mjs`](../scripts/ci/parity-check.mjs)
**Rule:** [Combat Parity Rule in CLAUDE.md](../CLAUDE.md#combat-parity-rule--guest-vs-auth)

## What it does

Every PR against `master` runs a lightweight gate (~15s, no Playwright)
that enforces the Combat Parity Rule: **if you change combat/player/guest
runtime code, you must ship test coverage for all 3 access modes** —
Guest (`/try`), Anonymous (`/join`), and Authenticated (`/invite` + login).

The gate:

1. Diffs the PR against its base.
2. Flags files under `components/combat/`, `components/player/`, `components/guest/`, or the corresponding `app/**` routes (`/try`, `/join`, `/invite`, `/app/combat`, `/app/campaigns/*/sheet|journey|run`).
3. For each added/changed `e2e/**.spec.ts` in the same PR, scans for mode-specific signals:
   - **Guest** — `/try`, `GuestCombatClient`, `guest-try-mode` references
   - **Anon** — `/join/`, `signInAnonymously`, `session_tokens` references
   - **Auth** — `loginAs`/`loginAsDM`, `/invite/`, `E2E_DM_EMAIL`, `campaign_members` references
4. **Passes** only when every mode has at least one spec with evidence — OR the PR author declares the mode is N/A (see below).
5. Never runs for draft PRs.

## Mode → client reference

Reproduced from CLAUDE.md for convenience:

| Mode | Client Principal | Store/Auth | Entry Point |
|------|-----------------|------------|-------------|
| Guest | `components/guest/GuestCombatClient.tsx` | Zustand + localStorage | `/app/try/page.tsx` |
| Anônimo | `components/player/PlayerJoinClient.tsx` | Supabase anon auth + session_tokens | `/app/join/[token]/page.tsx` |
| Autenticado | `components/player/PlayerJoinClient.tsx` | Supabase auth + campaign_members | `/app/invite/[token]/page.tsx` |

## When the gate is wrong

The heuristic is intentionally conservative — false positives are cheap
to clear, false negatives let parity drift and break prod. Three escape
hatches in order of preference:

### 1. Declare parity-intent in the PR body

Best for features that genuinely are Auth-only (data persistence, DM-only
features, realtime that Guest can't do). Add a block anywhere in the PR
description:

```markdown
<!-- parity-intent
guest: n/a (data persistence, Auth-only)
anon: n/a (requires campaign_members)
-->
```

The gate parses the block and accepts `n/a`, `na`, `skip`, or `exempt` as
the value. The Auth mode cannot be declared n/a — every combat-touching
change must have at least one Auth-mode spec covering it.

### 2. Use the `parity-exempt` PR label

For pure refactors with no behavior change (type renames, comment sweeps,
import reordering, extracting a helper without call-site changes). The gate
logs the exempted files but passes. The PR description should still explain
WHY parity does not apply.

### 3. Add the missing spec

The canonical fix. Add or extend an `e2e/**.spec.ts` that exercises the
missing mode. Reference the table above for entry points and the
[`e2e/helpers/auth.ts`](../e2e/helpers/auth.ts) helpers:

```ts
// Auth mode
await loginAs(page, PLAYER_WARRIOR);

// Anon mode
await joinSession(page, shareToken);  // drives /join/[token]

// Guest mode
await page.goto("/try");
```

## What the gate does NOT do

- **Does not run Playwright** — the actual tests run in the existing [E2E Tests](../.github/workflows/e2e.yml) workflow. This gate only enforces coverage breadth, not correctness.
- **Does not validate spec quality** — a spec that imports `/try` but doesn't actually exercise combat flow still passes the heuristic. The reviewer owns that judgment call.
- **Does not check unit tests** — unit tests in `tests/` or `lib/**/*.test.ts` don't count toward parity.
- **Does not run on pushes to `master`** — the gate is PR-only. Merges to master are already downstream of the gate.
- **Does not run on draft PRs** — gives authors room to iterate before the red X appears.

## Failure output

When the gate fails, the job logs include:

```
❌ Combat Parity Gate FAILED.

This PR changes combat/player/guest runtime but does not ship spec
evidence for: GUEST, ANON

To resolve, do ONE of the following:
  1. Add/edit e2e/**.spec.ts files that exercise the missing mode(s).
  2. Add a parity-intent block to the PR body (...)
  3. Add the label `parity-exempt` if this is a pure refactor.
```

Fix by pushing another commit to the same branch (gate re-runs on
`synchronize`) or by editing the PR body / adding a label and retrying
via the Re-run jobs button.

## Development — testing the gate locally

Simulate a PR by setting the env vars manually:

```bash
cd /path/to/repo
CHANGED_FILES="components/combat/CombatantRow.tsx" \
PR_BODY="" \
PR_LABELS="[]" \
node scripts/ci/parity-check.mjs
# → exits 1 (no spec evidence)

CHANGED_FILES="components/combat/CombatantRow.tsx
e2e/combat/player-view.spec.ts" \
PR_BODY="" \
PR_LABELS="[]" \
node scripts/ci/parity-check.mjs
# → exits 1 if the spec doesn't cover all modes
```

The script auto-exits 0 when CHANGED_FILES contains only docs, tests, or
non-triggering paths.

## Roadmap

- Add a matrix-expansion check: "if you added a new Playwright spec, does
  the corresponding Playwright project list both desktop-chrome + mobile?"
  Out of scope for Sprint 1 — will revisit when mobile parity becomes a
  sprint focus.
- Integrate with CODEOWNERS to auto-ping the combat parity expert on gate
  failures. Deferred pending team expansion.
