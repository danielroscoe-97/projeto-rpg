# Entity Graph QA Report — 2026-04-20

## Scope

This QA deliverable covers the Entity Graph stack shipping in the 2026-04-20/21 window: Fases 3b (Location Hierarchy), 3c (NPC ↔ Location), 3d (Factions), 3e (Note Mentions), 3f (Views/Filters), and Onda 6a (Mind Map Focus). DB footprint: migrations 146 through 154 (entity_links backbone, hierarchy cycle guard, faction triggers, dual-read note mentions). Codebase was hardened through 5 adversarial review passes (Blind Hunter, Edge Case, Acceptance Auditor variants) before this QA gate. 12 commits landed between 2026-04-20 and 2026-04-21, and this is the first time the surface is being exercised at the browser-level E2E layer.

## Methodology

Rather than a one-shot Playwright MCP manual walkthrough, we authored 6 reproducible Playwright specs covering the highest-risk flows. Rationale: MCP runs are ephemeral and non-regression-safe, while spec files double as CI guards that catch drift on every future commit. Each spec was written by a spec-author agent against the canonical AC list in `docs/PRD-entity-graph.md`, then typecheck-validated. Running the suite against a live dev server is deferred to a follow-up session (requires `.env.local` + seeded DM + Supabase access).

## Playwright specs created

| # | Spec | LOC | ACs covered | Runs-what |
|---|------|-----|-------------|-----------|
| 1 | `entity-graph-combat-parity.spec.ts` | 201 | REG-04, REG-05 | Guest `/try` + anon `/join` render zero Entity Graph testids; forged deep links rejected; hard-reload survival |
| 2 | `entity-graph-location-hierarchy.spec.ts` | 326 | AC-3b-02, 3b-03, 3b-05, 3b-07, 3b-08, 3f-01, 3f-03 | Indent rendering, chevron collapse, cycle guard dropdown, duplicate rejection, delete re-parent, view persist |
| 3 | `entity-graph-npc-location-link.spec.ts` | 476 | AC-3c-01, 3c-02, 3c-03, 3c-06 | Morada chip render ≤300ms, reverse habitants panel, edit persists edge, double-click idempotent save |
| 4 | `entity-graph-faction-members.spec.ts` | 347 | AC-3d-02, 3d-03, 3d-04, 3d-05 | Member count + HQ chip, NPC faction chip, HQ reverse panel, DB cascade on delete |
| 5 | `entity-graph-note-mentions.spec.ts` | 637 | AC-3e-02, 3e-03, 3e-04 | Multi-target linking (NPC+Location+Faction), reverse "Notas sobre isto" on all 3 card types, legacy dual-read compat |
| 6 | `entity-graph-mindmap-focus.spec.ts` | 484 | Onda 6a (focus chip, ?focus= URL, dim opacity, hidden-banner, back-button) | ReactFlow focus state, deep-link, non-neighbour dimming, filter-hide banner, history back |

**Total LOC: 2,471** across the 6 specs.

## AC-by-AC status

Legend: Covered by E2E / Jest/DB unit / Not yet verified / Manual QA required

| AC | Status | Notes |
|----|--------|-------|
| AC-3b-01 (tree root query) | Jest/DB | Covered by migration test + repository layer |
| AC-3b-02, 3b-03 | E2E | spec #2 |
| AC-3b-04 (drag-to-reparent) | Manual QA | Subjective drag UX, not scripted |
| AC-3b-05 | E2E | spec #2 cycle-guard dropdown |
| AC-3b-06 (depth >5 warning) | Not verified | No spec written |
| AC-3b-07, 3b-08 | E2E | spec #2 |
| AC-3b-09 (breadcrumb trail) | Not verified | Visible in card but no assertion |
| AC-3b-10 (search in tree) | Not verified | Out of QA scope this pass |
| AC-3c-01, 3c-02, 3c-03 | E2E | spec #3 |
| AC-3c-04 (5s undo toast) | Deferred | Shipped post-Fase A; see Known Gaps |
| AC-3c-05 (historical moradas) | Not verified | No spec |
| AC-3c-06 | E2E | spec #3 (assumes `upsertEntityLink` idempotency) |
| AC-3d-01 (faction CRUD base) | Jest/DB | Repository-level test |
| AC-3d-02, 3d-03, 3d-04, 3d-05 | E2E | spec #4 |
| AC-3e-01 (mig 153 idempotency) | Jest/DB | Repeat-run migration test |
| AC-3e-02, 3e-03, 3e-04 | E2E | spec #5 |
| AC-3e-05 (orphan-note cleanup) | Not verified | DB trigger tested indirectly via 3d-05 pattern |
| AC-3f-01, 3f-03 | E2E | spec #2 view persistence |
| AC-3f-02 (filter combinator UX) | Manual QA | Needs subjective check |
| AC-3f-04 (empty-state copy) | Not verified | Copy review deferred |
| REG-01 (auth-only routes) | Jest | Route guards |
| REG-02 (RLS enforcement) | Jest/DB | SQL policy tests |
| REG-03 (i18n PT-BR/EN parity) | Not verified | No spec |
| REG-04, REG-05 | E2E | spec #1 |

## Assumptions that need live-run verification

- `upsertEntityLink` is truly idempotent (AC-3c-06 relies on server-side dedup)
- Column `campaign_npcs.user_id` exists and is queryable by the spec helpers
- i18n strings "Mais opções" / "More options" match the exact toggle labels rendered
- ReactFlow DOM selectors (`.react-flow__node`, `data-id`) survive version bumps
- Filter UI is discoverable via the selectors used in `CampaignMindMap` spec #6
- Debounce/TTL windows (focus ease 450ms, hydration 300ms) hold under CI latency

## Known gaps / deferred

- **AC-3c-04 (5s undo)** — Deferred to Onda 6 / post-sprint Fase A (needs toast+undo subsystem)
- **AC-3e-01 (mig 153 idempotency)** — Covered by Jest migration test, not E2E
- **AC-REG-05 (lib/realtime/* untouched)** — Verified via git blame, not runtime
- **Subjective UX** — 450ms focus ease, camera centering, dim curve: manual QA only

## How to run

```
rtk npm run test:e2e -- entity-graph
```

Requires: running dev server, `.env.local` with `SUPABASE_SERVICE_ROLE_KEY`, seeded DM account (`danielroscoe97@gmail.com` per `.env.e2e`).

## Next steps

- Run the suite against staging once dev env is green
- File issues for any failures; triage by AC-ID
- Add a follow-up spec for AC-3c-04 after Fase A ships the toast+undo subsystem
- Close coverage gaps on AC-3b-06, 3b-09, 3b-10, 3c-05, 3e-05, REG-03 in next QA wave
