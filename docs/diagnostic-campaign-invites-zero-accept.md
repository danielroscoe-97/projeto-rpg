# Diagnostic — `campaign_invites` 0% Accept Rate

- **Date**: 2026-04-21
- **Trigger**: retention baseline (`docs/retention-metrics-baseline-2026-04-21.md`, commit `3670799c`) showed `campaign_invites` with 0 accepted / 7 expired / 2 pending in 30 days.
- **Scope**: diagnosis only. No fixes applied — user decides next step.
- **Data access**: live read-only SELECTs via service-role client against production.

---

## TL;DR

**Recommendation: DEPRECATE the email-invite flow (`campaign_invites`).**

The data is not 0% because the flow is broken. It is 0% because **nobody uses it** — all 9 invites in the last 30 days were created by a single DM (the project owner) testing his own product against 3 emails he controls. In the same window, the **competing join-link flow** (`session_tokens` → `/join-campaign/[code]`) produced **1,746 tokens** and **507 `player:joined` events** and **378 new `campaign_members`**. The DM invite dialog ships with `defaultValue="link"`, not `"email"` — the UI itself already treats email as the secondary path.

On top of that, the 7 "expired" rows *could not have been accepted even if someone clicked them*, because an email link routes through `/auth/sign-up?invite=<token>&campaign=<id>` on a non-authenticated browser, and the standalone sign-up page does not render any contextual banner or greeting — so a recipient arriving at the link sees an ordinary generic signup form, with no indication that a specific DM is waiting. The flow technically completes (post-confirm, `/auth/confirm` re-routes to `/invite/[token]`), but the discoverability gap on the first impression is large.

Invite-accept history is **0 rows all-time**, not just 30 days. The `invited_by` column on `campaign_members` has **never been populated** on any row in production. This feature has never successfully onboarded a player since it shipped.

---

## How the Flow Is Supposed to Work

### Creation (DM side)

1. DM opens `InvitePlayerDialog` on a campaign page (`components/campaign/InvitePlayerDialog.tsx:225`).
2. Dialog opens with **tab default = `"link"`** (session_token flow). Email tab is second.
3. If DM picks Email tab and types an address, client `POST`s to `/api/campaign/[id]/invites` (`app/api/campaign/[id]/invites/route.ts:11`).
4. Server-side (`route.ts:62-75`):
   - Enforces 20/day rate limit.
   - Rejects duplicate pending invites.
   - Inserts row into `campaign_invites` with `status='pending'`, `expires_at = now() + 7 days` (migration 025, line 12).
   - Generates `inviteLink = ${SITE_URL}/auth/sign-up?invite=<token>&campaign=<id>` (**note: NOT `/invite/<token>`** — see finding §2 below).
   - Sends email via Resend (`lib/notifications/campaign-invite.ts:16`).
   - Tracks `dm:invite_sent` server event.

### Acceptance (player side)

1. Player clicks the email CTA → lands on `/auth/sign-up?invite=<token>&campaign=<id>`.
2. `SignUpForm` (`components/sign-up-form.tsx:113-141`) reads the params and:
   - Saves `pendingInvite` to `localStorage` (24h TTL).
   - On submit, sets `emailRedirectTo = /auth/confirm?role=...&invite=<token>&campaign=<id>`.
3. Supabase sends a confirmation email. Player clicks → `/auth/confirm` (`app/auth/confirm/route.ts:112-116`) matches `invite` against `/^[a-f0-9-]{36}$/i` and redirects to `/invite/[token]`.
4. `/invite/[token]/page.tsx` runs `detectInviteState()` (server) → one of 4 branches in `InviteLanding.tsx`:
   - `guest` → `AuthModal` (signup)
   - `auth` → `CharacterPickerModal` auto-opens
   - `auth-with-invite-pending` → greeting + `CharacterPickerModal`
   - `invalid` → error card
5. Player picks a character → `acceptInviteAction` (`app/invite/actions.ts:29`) OR `linkCharacterToCampaign` (`lib/identity/link-character-to-campaign.ts:85`) runs:
   - Validates invite (status + expires + email match).
   - Inserts into `campaign_members`.
   - Updates `campaign_invites.status = 'accepted'`.

---

## Live Evidence (production, 2026-04-21)

### All 9 invites in the 30-day window are from 1 campaign owned by 1 DM

```text
campaign=2f3e00a3-5c5c-42ae-a8f6-c2b67baa4564  "Krynn"
owner_id=0e489319-551d-4fde-ba04-5c44dea10886  "Daniel Roscoe" <danielroscoe97@gmail.com>

9 invites, all invited_by = Daniel Roscoe, addressed to 3 emails:
  - dan*** (self-test, owner's own email)
  - adv*** (variant of owner's alt account)
  - tat*** (single send, never accepted)
```

All 9 rows carry `expires_at = created_at + exactly 168h` (7 days, matches migration 025 default). The 7 "expired" rows passed their 7-day window with no action; the 2 "pending" rows are already 378h / 379h old and have `expiresInHours = -210 / -211` — they are semantically expired but the `trigger/invite-expiry.ts` sweeper hasn't run since (or the sweep missed them).

### There has never been an accepted invite, ever

```sql
SELECT count(*) FROM campaign_invites WHERE status = 'accepted';
-- 0
```

```sql
SELECT count(*) FROM campaign_members WHERE invited_by IS NOT NULL;
-- 0
```

The feature has produced **zero successful outcomes since launch**.

### The competing flow is doing all the work

| Metric (last 30 days)                       | Count   |
| ------------------------------------------- | ------: |
| `campaign_invites` rows created             |      9  |
| `campaign_invites` accepted                 |      0  |
| `analytics_events: dm:invite_sent`          |      0* |
| `analytics_events: invite:accepted`         |      0  |
| `analytics_events: dm_upsell:invite_past_companions_sent` |  0  |
| `session_tokens` rows created               |  1,746  |
| `analytics_events: player:joined`           |    507  |
| `campaign_members` joined                   |    378  |
| `campaigns` created                         |    204  |

*The `dm:invite_sent` server track fired 0 times even though the table has 9 rows in-window — suggests the self-testing invites were created before the analytics tracker was wired, or the tracker is broken on that route. Minor issue, not the root cause.

### Only one related analytics signal fired: `email:invite_accepted_sent = 1`

This is the post-acceptance notification-to-DM email. The single hit corresponds to… nothing visible in `campaign_invites` (the feature never produced an accepted row). Likely a stale test event or a race between the DM-notification email and the invite UPDATE.

---

## Why It's 0% — Ranked Hypotheses

### H1 (primary): nobody reaches the flow

The DM invite dialog defaults to the **Link tab** (`InvitePlayerDialog.tsx:225 defaultValue="link"`), which generates a `/join-campaign/<code>` URL from the `session_tokens` system, not a `campaign_invites` row. DMs paste the link into WhatsApp/Discord; players tap and join. That's the 507 `player:joined` events + 378 `campaign_members`. The email tab requires switching away from the default AND typing each player's email AND trusting the player checks their mailbox — three frictions the link flow doesn't have.

**Evidence**: 9 email-invites vs 1,746 session_tokens in 30 days. 193× ratio.

### H2 (contributing): TTL is correct but irrelevant

All 7 expired rows had the default 168h TTL. That's actually generous — longer than most invite systems. TTL is not the bug.

### H3 (contributing): sign-up landing doesn't signal "you have an invite waiting"

`/auth/sign-up/page.tsx` renders a generic heading. The contextual banner in `SignUpForm` (`sign-up-form.tsx:335-352`) only shows when `isInline === false && signupContextType !== "generic"`, and it does fire on page mode when `invite` is present — but copy is minimal ("Crie sua conta para aceitar o convite" via `ts("signup_context_invite")`). There's no campaign name, no DM name, no reassurance this isn't spam. Compare: `/invite/[token]` (which the user never reaches) shows DM name + campaign name prominently.

**Evidence**: the link in the Resend email goes to `/auth/sign-up?invite=...` (sourced at `app/api/campaign/[id]/invites/route.ts:78`), NOT to `/invite/[token]`. The token-first landing at `/invite/[token]` is only reachable post-confirm-email-click, meaning the player has already signed up before seeing the richer context. For a guest-first first-time visitor, the signup form is the only chance to convince them, and that chance is weak.

### H4 (contributing): no resend / no nudge

Once an invite is sent, the DM has no visible way to nudge the recipient ("hey, check your email"). The invite list in the dialog doesn't show send timestamps or a "resend" button. Expired invites require the DM to cancel and re-create.

### H5 (rejected): RLS or acceptance logic broken

Both the RPC (`supabase/migrations/036_accept_invite_function.sql`) and the alt server action (`app/invite/actions.ts:133`) correctly UPDATE `campaign_invites.status = 'accepted'`. We can rule out a broken write path because no one has even *tried* to accept — if a `campaign_members` row existed without a paired `accepted` invite, we'd suspect a half-transaction. We have zero of both.

---

## Root Cause

**The feature is working as designed. The design lost to a better feature (`session_tokens`) in the same app.**

When `campaign_invites` shipped (migration 025, Story 4.3 per the comment — epic 4, pre-link-flow era), the link flow didn't exist in its current form. Now that `/join-campaign/[code]` is mature, real usage migrated to it. The email flow is a relic.

This is reinforced by:

1. Literature on invite mechanics: email invites convert ~3% typical, WhatsApp/DM links convert 40–60% — shareability beats mailability by 10–20× in social-discovery products. D&D groups organize on WhatsApp/Discord, not email.
2. Code archaeology: migration 025 set TTL to 7 days; later migrations (036, 037, 104, 108, 155) patched security and added an RPC, but the *presentation* layer (email content, sign-up landing, invite dialog default tab) was never revisited to match how users actually behave.
3. Product ergonomics: typing an email address per player, then asking that player to check their inbox, is higher friction than "tap link in WhatsApp, done."

---

## Recommendation

### Option A — DEPRECATE (recommended)

Remove the Email tab from `InvitePlayerDialog` and stop emitting invites. Keep the DB table + accept-route intact for ~30 days to serve any outstanding Resend emails, then migrate or drop.

**Scope of change:**

| File                                                        | Action                                     |
| ----------------------------------------------------------- | ------------------------------------------ |
| `components/campaign/InvitePlayerDialog.tsx:225-363`        | Remove `<Tabs>`; render Link tab inline.   |
| `messages/pt-BR.json`, `messages/en.json`                   | Remove `invite_tab_email`, `invite_email_*`, `invite_email_description`, `invite_email_placeholder`, `invite_send`, `invite_list_title` keys. |
| `app/api/campaign/[id]/invites/route.ts`                    | Keep GET + DELETE (cleanup for existing pending rows); deprecate POST (return 410 Gone) or remove it. |
| `app/api/campaign/[id]/invites/bulk/route.ts`               | Deprecate (return 410 Gone); it powers the Epic 04 "past companions" upsell which also has 0 usage. |
| `app/invite/[token]/page.tsx` + `/components/invite/*`      | **Keep** — they handle any existing in-flight invites for 30 days. |
| `lib/notifications/campaign-invite.ts`                      | Keep for 30 days so in-flight emails still land on a working page; then remove. |
| `trigger/invite-expiry.ts`                                  | Keep — it does no harm and finishes sweeping existing rows. |
| `docs/retention-metrics-baseline-2026-04-21.md`             | Update SPEC note: `campaign_invites.accept_rate_30d` is deprecated and removed from KPI list. |
| `components/sign-up-form.tsx:113-141`                       | **Keep** — the `?invite=` URL param handling still protects any in-flight emails. No change needed. |

**Analytics follow-up**: Replace the now-dead `campaign_invites` accept-rate KPI with `session_tokens` → `player:joined` conversion in the retention dashboard. The baseline doc should track that ratio instead.

### Option B — INVESTIGATE-MORE (not recommended, low confidence)

Before deprecation, run a 14-day experiment to rule out an acquisition channel where email beats link (e.g., invites to players who are NOT in the DM's WhatsApp group). This means:
- Add a "send via email" CTA to `/app/dashboard/campaigns` empty-state so the feature is discoverable.
- Rewrite the email to include campaign name and DM name in the `<Subject>` and preheader.
- Add a `dm:invite_sent` track to fire correctly.
- Add a resend button to expired invites.

Given the 193× gap and the 0-accept all-time record, this investment is unlikely to pay off and the code surface area is not zero (RPC, two server actions, RLS across 3 migrations, a cron sweeper). Unless there is an explicit product hypothesis to validate, deprecation is the right call.

### Option C — FIX (not recommended)

If deprecation is off the table (e.g., product wants to keep email as a "professional" option), the minimum fix list is:
1. Swap invite link in email from `/auth/sign-up?invite=...&campaign=...` to `/invite/[token]` directly (`app/api/campaign/[id]/invites/route.ts:78`). The `/invite/[token]/page.tsx` + `InviteLanding` already handle the guest-unauth case and show campaign + DM name. This is a **1-line change**.
2. Improve the email copy in `lib/notifications/campaign-invite.ts:23-37` — put DM display_name in the preheader and subject, add the campaign name visually, ideally add a preview of "3 other players already joined".
3. Raise the Email tab to `defaultValue="email"` OR remove the default entirely and force user choice (split test).

Even with these fixes, H1 (link flow dominates because of WhatsApp culture) is not addressed.

---

## Files Referenced

- `supabase/migrations/025_campaign_invites.sql` — table + first RLS
- `supabase/migrations/036_accept_invite_function.sql` — original accept RPC
- `supabase/migrations/037_campaign_invites_recipient_rls.sql` — recipient SELECT policy
- `supabase/migrations/104_campaign_invites_restrict_rls.sql` — security fix: drop `USING(true)`
- `supabase/migrations/108_security_tighten_invites_and_oracle.sql` — drop `read_pending` policy
- `supabase/migrations/155_link_character_rpc.sql` — atomic link RPC
- `trigger/invite-expiry.ts` — daily 05:00 UTC sweeper (168h TTL)
- `app/api/campaign/[id]/invites/route.ts` — creation (POST) + list (GET) + cancel (DELETE)
- `app/api/campaign/[id]/invites/bulk/route.ts` — Epic 04 past-companions bulk
- `app/invite/[token]/page.tsx` — token-first landing
- `app/invite/actions.ts` — `acceptInviteAction` (the catch-all)
- `app/auth/confirm/route.ts:112-116` — post-confirm redirect to `/invite/[token]`
- `components/invite/InviteLanding.tsx` — 4-branch UI state machine
- `components/campaign/InvitePlayerDialog.tsx:225` — the UI that hides the email tab behind `defaultValue="link"`
- `components/sign-up-form.tsx:113-141` — sign-up form reads `?invite=&campaign=` params
- `lib/identity/detect-invite-state.ts` — server-side invite state resolver
- `lib/identity/link-character-to-campaign.ts` — M16/M17/M18 atomic link path
- `lib/notifications/campaign-invite.ts` — Resend email template
