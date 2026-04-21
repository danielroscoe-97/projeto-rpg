# Bugfix — Join-code validator drift (2026-04-21)

**Severity:** 🔴 P0 — broke onboarding for ~93% of new players accepting invites
**Affected releases:** all deployments since migration `122_create_campaign_atomic.sql` (2026-03-xx) introduced the md5-hex generator without updating the client-side regex.
**Fixed in:** commits `b46beba6` + follow-up `<pending>` for `app/auth/confirm/route.ts`.

---

## The bug in one sentence

The server generates 8-char join codes from uppercase md5 hex (`[0-9A-F]`); the client regex validated them against `[A-Z2-9]{8}` (excluding `0` and `1`), so any code containing a `0` or `1` — ~93% of generated codes (see math below) — was rejected by the server action before it even touched the database, returning a 500 to the browser.

---

## Timeline (2026-04-21 QA session)

| Time | Event |
|---|---|
| ~18:50 | During Run #2 of the Playwright QA, player invites started returning 500. |
| 18:50–19:10 | First three fix attempts targeted the wrong theory (Server Component re-render / `redirect()` throws inside the post-action stream): commits `bf954bca`, `6d8b3c67`, `0bad75e8`. Each was a structurally correct improvement that *didn't* fix the actual bug. All three still reproduced the 500 with identical Sentry signatures. |
| ~19:15 | Added `trace()` + outer `try/catch` with `console.error` scaffolding to `acceptJoinCodeAction` (commit `7e7505c6`), deployed, reproduced the bug again, pulled the Vercel runtime log. |
| ~19:25 | Runtime log showed the action threw `Error: "Código inválido"` on its **very first instruction** — `if (!JOIN_CODE_RE.test(data.code)) throw …`. Minus-one step from any DB call. |
| ~19:30 | Read `create_campaign_with_settings` SQL function body — generator was `upper(substr(md5(random()::text), 1, 8))`. md5 hex charset `[0-9A-F]` vs. validator `[A-Z2-9]`. Instant diff. |
| ~19:35 | Fix committed (`b46beba6`) — regex corrected in both `actions.ts` and `proxy.ts`, traces reverted, structural improvements from the earlier attempts kept. Deployed, validated end-to-end: TORIN accepted the invite, became a member, character was linked, user landed on `/app/dashboard`. Bug closed. |
| ~19:50 | Audit sweep for same-class drift found one additional stale validator in `app/auth/confirm/route.ts:109` (same `[A-Z2-9]` pattern, used in the post-signup redirect back to join flow). Fixed. |

---

## Why the Vercel log, not Sentry, found this

Sentry wrapped the throw as `"An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details."` — that's Next.js 15's default behavior when an unhandled Error escapes a Server Action and propagates up into the RSC stream. The *real* message (`"Código inválido"`) and its stack location (`JOIN_CODE_RE.test()`) were stripped from the client-visible event. Only the **Vercel runtime log** preserved the `console.error` output, which is why the diagnostic commit that added trace logging was necessary.

Lesson: when a Server Action Sentry event only says "Server Components render" with no concrete message, reach for Vercel runtime logs (`npx vercel logs <deployment>`) before theorizing about re-render lifecycles.

---

## Root cause

**Generator** — [`supabase/migrations/122_create_campaign_atomic.sql`](../supabase/migrations/122_create_campaign_atomic.sql), inside `create_campaign_with_settings`:

```sql
v_join_code := upper(substr(md5(random()::text), 1, 8));
```

md5 hex = characters `0123456789abcdef`, uppercased to `0123456789ABCDEF`.

**Validator (3 locations, all rejecting `0` and `1`):**

| File | Purpose |
|---|---|
| [`app/join-campaign/[code]/actions.ts`](../app/join-campaign/%5Bcode%5D/actions.ts) | The `acceptJoinCodeAction` server action — the hot path where the bug manifested as a 500 and the direct QA repro. |
| [`lib/supabase/proxy.ts:159`](../lib/supabase/proxy.ts#L159) | Middleware branch that redirects `/auth/login?join_code=…` to `/join-campaign/…` after authed-user detection. |
| [`app/auth/confirm/route.ts:109`](../app/auth/confirm/route.ts#L109) | Post-signup email-confirmation callback; redirects new users back to the invite flow when `join_code` was carried on the signup URL. |

All three had `/^[A-Z2-9]{8}$/` (excludes `0` and `1`, presumably added for O/0 + I/1 readability at some earlier stage of the join-code design — a charset that the current SQL generator **does not produce**).

### The math

P(a single md5-hex char is 0 or 1) = 2/16 = 12.5%
P(an 8-char code has **zero** 0s or 1s) = `(14/16)^8` ≈ 34.4%
P(an 8-char code contains at least one 0 or 1) ≈ **65.6%**

Two in three codes were broken on arrival. The actual rate at which we hit the bug in QA was higher (both `07EF06CC` and `DDD121AC` triggered it) because once the player retried, the same broken code hit the validator again.

---

## Fix

Three 1-line changes, all to validators (leaving the generator untouched so existing codes in prod stay valid):

```diff
- const JOIN_CODE_RE = /^[A-Z2-9]{8}$/;
+ const JOIN_CODE_RE = /^[0-9A-F]{8}$/;
```

```diff
- } else if (joinCode && /^[A-Z2-9]{8}$/i.test(joinCode)) {
+ } else if (joinCode && /^[0-9A-F]{8}$/i.test(joinCode)) {
```

```diff
- if (joinCode && /^[A-Z2-9]{8}$/.test(joinCode)) {
+ if (joinCode && /^[0-9A-F]{8}$/i.test(joinCode)) {
```

Kept from the three earlier failed attempts (because the shape was right even if the theory wasn't):

- `acceptJoinCodeAction` now returns `{ redirectTo: "/app/dashboard" }` and the client does `router.push` (avoids any future `redirect()` interaction with post-action re-render streams — defense-in-depth).
- `page.tsx`'s former `if (existing) redirect("/app/dashboard")` replaced with a client `<AlreadyMemberRedirect />` (same reason — no throws inside RSC renders that might be re-run post-action).

---

## Audit for same-class bugs elsewhere

Full sweep ran via an Explore agent across `app/**`, `lib/**`, `components/**`, and `supabase/migrations/**`.

**Critical drift — other than the three above**: zero.

**Potentially adjacent patterns that were checked and cleared:**
- **UUIDs** — validators use `[a-f0-9-]{36}` or `[0-9a-f]{36}`, which matches `gen_random_uuid()` / `crypto.randomUUID()`. Safe.
- **Anonymous player session tokens** — generator in `session_tokens` table is server-side, consumers read the token as opaque text, no regex gating. Safe.
- **Character claim tokens** — UUID-based, consistent. Safe.
- **Combat session invite tokens** (the `/app/combat/new` share flow) — also UUID-based. Safe.
- **Email and phone** — format-agnostic at the call site, delegated to Supabase Auth. Safe.

---

## Recurrence prevention

Recommended follow-ups (not done in this commit, sized for a follow-up ticket):

1. **Unit test the charset invariant.** Add `lib/__tests__/join-code-charset.test.ts` with two assertions: (a) every char the SQL generator emits matches the client validator; (b) sample N ≥ 1000 generated codes and assert all pass the validator. If generator changes, this test fails immediately. The generator body can be imported via `supabase.rpc("create_campaign_with_settings")` against a test database, or asserted purely at the regex level by reading the function source.

2. **Centralize the regex constant.** Move `JOIN_CODE_RE` out of the three per-file definitions into `lib/validation/join-code.ts` so there's only one source of truth. All three current sites import from it. Next drift would need someone to edit the shared constant, which is immediately suspicious in review.

3. **Document the contract in the SQL function.** Add a leading comment on `create_campaign_with_settings` stating the emitted charset and pointing to `lib/validation/join-code.ts`. Makes future schema editors aware that changing the generator implies a client update.

4. **Sentry enrichment.** Server actions that throw should tag Sentry with `actionName + stepName` (equivalent of the `trace()` calls we added temporarily). Low effort and would have shortened today's diagnosis from ~45min to ~5min. Candidate for a small Sentry middleware helper in `lib/errors/`.

---

## Related, non-regex

Bug #2 from the same QA run (`player_characters_campaign_id_fkey ON DELETE CASCADE` → data loss across user boundaries when DM deletes a campaign) is **unrelated** to this regex drift but was fixed in the same session via migration [`175_player_characters_fk_set_null.sql`](../supabase/migrations/175_player_characters_fk_set_null.sql) / commit `bf954bca`. Full writeup in [docs/qa-playwright-run-2-2026-04-21.md](qa-playwright-run-2-2026-04-21.md).
