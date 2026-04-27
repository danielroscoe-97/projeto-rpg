# Observability Setup — Estabilidade Combate

**Sprint:** CR-1 (Sprint 1) · **Owner:** Dani · **Created:** 2026-04-26
**Beta #5 prep (D-3 to D-1):** complete the checklist below before terça 2026-05-05.

This runbook configures Sentry alerts and a dashboard so the Beta #5 session has live signal. Without it, regressions surface only in Lucas's anecdotal feedback — too late.

## Prereqs

- Sentry org access (admin needed to create alerts and dashboards)
- Sentry project: `pocketdm` (or whatever the Vercel-Sentry integration created)
- Slack workspace integrated with Sentry (channel suggestion: `#estabilidade-combate-alerts` — temporary, dismantle post-Beta)

## What this runbook covers

1. **Alert rules** — fire when something is going wrong, push to Slack
2. **Dashboard** — historical view of the 4 KPIs from the tech spec §6
3. **Validation** — synthetic events to confirm the pipeline before relying on it

## Step 1 — Alert rules

Open `Sentry > Alerts > Create Alert > Issues alert` for each of the rules below. All target the project `pocketdm` (or equivalent).

### 1.1 — `AbortError` storm in `/api/combat/*`

| Field | Value |
|---|---|
| **Rule name** | `Estabilidade — AbortError /api/combat/* > 5/5min` |
| **Environment** | `production` |
| **When** | An issue is seen more than `5` times in `5m` |
| **And the issue's** | `transaction` matches `/api/combat/*` AND `error.type` equals `AbortError` |
| **Trigger action** | Send Slack message to `#estabilidade-combate-alerts` |
| **Severity** | High |

### 1.2 — `too_stale` rate > 10% in 10min

This one's easier with a metric alert (not issue alert):

| Field | Value |
|---|---|
| **Type** | Metric Alert |
| **Metric** | `count(logger.warn)` filtered to `[combat-events] too_stale` |
| **Threshold** | `> 10` events in any 10-minute window |
| **Severity** | High |
| **Action** | Slack `#estabilidade-combate-alerts` |

The endpoint logs `[combat-events] too_stale: session=…` on each too_stale response (see [route.ts:84](../../app/api/combat/[encounterId]/events/route.ts#L84)).

### 1.3 — Connection `degraded` for > 60s

| Field | Value |
|---|---|
| **Rule name** | `Estabilidade — Connection degraded > 60s` |
| **Trigger** | Issue with message matching `^Connection degraded — reason=` AND seen more than 1 time in 1m |
| **Action** | Slack `#estabilidade-combate-alerts` |

The breadcrumb is emitted by [`useCombatResilience.ts`](../../lib/hooks/useCombatResilience.ts) on every `degraded` transition (F3 wiring).

### 1.4 — Resume endpoint 500s

| Field | Value |
|---|---|
| **Rule name** | `Estabilidade — /events 500` |
| **Trigger** | Issue's `transaction` equals `GET /api/combat/[encounterId]/events` AND `level` equals `error` |
| **Action** | Slack `#estabilidade-combate-alerts` |

A 500 is a real bug (not a too_stale, which is 200). Page on first occurrence.

### 1.5 — Broker outage signal (broker_down reason)

| Field | Value |
|---|---|
| **Rule name** | `Estabilidade — broker_down detected` |
| **Trigger** | Issue with message matching `Connection degraded — reason=broker_down` |
| **Action** | Slack `#estabilidade-combate-alerts` AT-MENTION (high severity) |

`broker_down` means we burned 15 retries WITHOUT `navigator.onLine === false` — the OS thinks we're online but Supabase isn't responding. Page on this; it's likely a Supabase outage we should flag publicly.

## Step 2 — Dashboard

`Sentry > Dashboards > Create Dashboard`. Name it **"Estabilidade Combate"**. Add 4 widgets:

### 2.1 — `resume_success_rate`

| Field | Value |
|---|---|
| **Visualization** | Line chart |
| **Query** | `transaction:"GET /api/combat/[encounterId]/events" AND http.status_code:200` |
| **Aggregate** | `count_if(http.status_code, equals, 200) / count() * 100` |
| **Group by** | None |
| **Time range** | Last 24h |
| **Target** | `> 95%` (per spec §6) |

### 2.2 — `too_stale_rate`

Same query as 2.1, but counts the `too_stale` log line:

| Field | Value |
|---|---|
| **Visualization** | Line chart |
| **Query** | `message:"[combat-events] too_stale"` |
| **Aggregate** | `count()` |
| **Time range** | Last 24h |
| **Target** | `< 5%` of total `/events` calls |

If you can compose both queries, `too_stale_count / events_count * 100` is the metric you want.

### 2.3 — `journal_buffer_size_p95`

Per-session journal size. Without a custom Sentry metric for this, use a saved Supabase query as a fallback panel (link from the dashboard description):

```sql
-- Run in Supabase Dashboard > SQL Editor for ad-hoc visibility:
SELECT
  session_id,
  COUNT(*) AS journal_size,
  MIN(created_at) AS oldest,
  MAX(created_at) AS newest
FROM combat_events
GROUP BY session_id
ORDER BY journal_size DESC
LIMIT 20;
```

Trigger to migrate journal to Redis: any session shows `journal_size = 100` for >5min sustained while combat is active (suggests trigger isn't trimming fast enough OR cap is too low).

### 2.4 — `connection_state_transitions`

| Field | Value |
|---|---|
| **Visualization** | Stacked bar chart |
| **Query** | `message:"Connection degraded"` |
| **Group by** | `extra.reason` (one of: `ceiling_hit`, `network_offline`, `broker_down`) |
| **Time range** | Last 24h |
| **What it shows** | Distribution of degrade reasons. `network_offline` dominating = users on bad networks. `broker_down` rising = Supabase health issue. |

## Step 3 — Synthetic validation

Before relying on these in Beta #5, fire test signals to confirm the alert pipeline works end-to-end:

### 3.1 — Validate Slack delivery

In Sentry > Alerts > Test Alert, fire a manual test for each rule. Each should produce a Slack message in `#estabilidade-combate-alerts` within ~30s.

### 3.2 — Validate `degraded` breadcrumb arrival

Open prod (or preview), throttle network to offline in DevTools, wait 2 minutes (until ceiling_hit or network_offline transition fires). Sentry should ingest the breadcrumb. Search:

```
component:useCombatResilience action:connection_state level:warning
```

If empty, `captureWarning` isn't reaching Sentry — check `lib/errors/capture.ts` Sentry init + DSN.

### 3.3 — Validate too_stale logging

Use the `/events` endpoint manually with an absurdly low `since_seq`:

```bash
curl -s "https://pocketdm.com.br/api/combat/<some-real-encounter>/events?since_seq=0&token=<some-real-token>" | jq
```

If a session has >100 events buffered, this returns `kind: "too_stale"` and Sentry should ingest the warn log.

## Step 4 — Beta #5 day-of (terça 2026-05-05)

| Time | Action |
|---|---|
| `T-30min` | Open the dashboard in a secondary monitor. Slack channel pinned. |
| `T-15min` | Confirm last alert test fired (3.1) is visible — pipeline is warm. |
| `T-0` | Lucas starts session. Start a stopwatch tagged "Beta #5". |
| `Mid-session` | Watch the 4 widgets. Anything red → write down timestamp + scenario, do NOT interrupt unless blocking. |
| `+30 min` | Spot-check `combat_events` row count (Supabase Dashboard > SQL): should be growing roughly linearly with DM actions. |
| `End of session` | Export dashboard screenshot. Save Slack alerts thread. Schedule debrief. |

## Step 5 — Post-Beta cleanup

If Beta #5 passes (🟢 in [02-BETA-5-GATE.md](02-BETA-5-GATE.md)):

- [ ] Demote alerts from "page" to "info" tier — they should stay forever as canaries but not wake anyone up
- [ ] Move `#estabilidade-combate-alerts` Slack channel to archived / read-only
- [ ] Keep dashboard live indefinitely — it's the canonical health view for combat realtime
- [ ] Update `docs/postmortem-supabase-cdc-pool-exhaustion-2026-04-24.md` checklist marking these alerts as "done"

If Beta #5 partial / fails:

- [ ] Promote any rule that DIDN'T fire (and should have) — write the alert that would've caught the regression
- [ ] Schedule Beta #5.5 follow-up after fixes ship

## Notes on what's NOT alerting

Deliberately NOT alerted:

- **Successful resume** — too noisy; the dashboard tracks the rate
- **Cursor advance failures** (silent client-side `setItem` failure in private browsing) — best-effort by design; would generate noise from incognito users
- **Skeleton render duration** — visual polish, not functional. Track via Story 03 follow-up if Lucas reports flicker.
- **`/state` fallback rate** — the existing `fetchFullState` orchestrator already has its own metrics; duplicating would dilute.

## References

- Spec §6: [01-TECH-SPEC.md](01-TECH-SPEC.md#6-observabilidade)
- Beta #5 gate: [02-BETA-5-GATE.md](02-BETA-5-GATE.md)
- Postmortem with R5 (alerts): [docs/postmortem-supabase-cdc-pool-exhaustion-2026-04-24.md](../../docs/postmortem-supabase-cdc-pool-exhaustion-2026-04-24.md)
