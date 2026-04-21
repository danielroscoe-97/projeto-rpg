# Wave 3 Manual QA Checklist — Epic 03 Conversion Moments

**Epic:** 03 Conversion Moments (Stories 03-C / 03-D / 03-E / 03-F / 03-H)
**Release window:** Wave 3a + 3b (post Cluster Δ + Cluster ε polish)
**Master tip at QA dispatch:** `dd3ce94f` (or later)
**Execution target:** Staging
**Execution owner:** Quinn (QA) + Daniel (DM persona)
**Expected duration:** ~90-120 min for a single full pass

> **Legend.** 🔴 blocker (release-stop) · 🟠 high (hotfix-within-24h) · 🟡 follow-up (post-release ticket)

---

## 1. Pre-flight

### 1.1 Environment

- **Staging URL:** `https://staging.pocketdm.com.br` (or the current staging alias from Vercel dashboard).
- **Test accounts:**
  - DM primary: seeded via `scripts/seed-test-accounts.ts` (or `E2E_DM_EMAIL` / `E2E_DM_PASSWORD` in `.env.staging`).
  - QA user (fresh signups): use `qa+wave3-<timestamp>@test-taverna.com` alias pattern.
- **Emails:** staging must point at a real inbox (Mailpit, MailHog, or Resend catch-all) for email-confirmation path. If email confirmations are OFF in staging, note it — several checks become N/A.
- **Supabase project:** `pocketdm-staging` (verify in Vercel env `NEXT_PUBLIC_SUPABASE_URL`).

### 1.2 Browser matrix (recommended — minimum = Chrome + Safari-iOS)

- [ ] Chrome / Edge latest (Chromium)
- [ ] Firefox latest
- [ ] Safari latest (macOS + iOS — ITP storage edge-cases)
- [ ] Android Chrome (Galaxy/Pixel WebView realism)

### 1.3 Clear state (run BEFORE every persona)

In each browser / incognito window:

1. DevTools → **Application → Storage → Clear site data** (cookies + localStorage + sessionStorage + IndexedDB).
2. Confirm no residual keys before starting:
   - `pocketdm_guest_migrate_pending_v1`
   - `pocketdm_session_token_id`
   - `pocketdm_dismissal_*`
   - `pocketdm_conversion_*`
3. Keep DevTools open on three tabs:
   - **Console** — look for red errors + `conversion:*` log lines.
   - **Network** — filter on `/api/track` + `/api/player-identity/*`.
   - **Application → Storage** — watch localStorage + sessionStorage live.

### 1.4 DevTools tooling setup

- Install React DevTools (optional, helpful for AuthModal state).
- Enable **Preserve log** on Network tab so POSTs don't vanish on redirect.
- Add a console filter: `conversion` (captures all `conversion:*` + conversion debug logs).

---

## 2. Critical flows (checklist per persona)

### 2.1 Anon → Auth via Waiting Room (Story 03-C)

**Persona:** Anon player joins DM's lobby via share link, converts before combat starts.

- [ ] Open `/join/<valid-token>` in incognito.
- [ ] Lobby form renders; fill name + initiative + (HP/AC if visible); submit.
- [ ] Waiting-room view appears with `WaitingRoomSignupCTA` card:
  - [ ] `data-testid="conversion.waiting-room-cta"` present.
  - [ ] Headline uses `<em>` tag around character name (rich-text contract).
  - [ ] Primary CTA button + dismiss button + "keep playing" link all visible.
- [ ] Click **primary CTA** ("Criar minha conta" / "Create my account"):
  - [ ] AuthModal opens with signup tab active.
  - [ ] Network: `conversion:cta_clicked` POST to `/api/track` with `moment: "waiting_room"`.
- [ ] **Path A — Email signup:**
  - [ ] Fill email/password; submit.
  - [ ] AuthModal shows "check your email" success state (no redirect).
  - [ ] Click confirmation link in inbox.
  - [ ] Callback URL resolves to `/auth/callback/continue?next=/app/dashboard` (NOT `/auth/confirm`).
  - [ ] After redirect: dashboard shows character linked to the joined campaign.
  - [ ] `session_token_id` in Application → localStorage preserved across the whole flow.
- [ ] **Path B — OAuth (Google):**
  - [ ] Click Google button → provider redirect → return to app.
  - [ ] Network: `conversion:completed` with `flow: "upgrade"` + `moment: "waiting_room"`.
  - [ ] Dashboard shows character linked to campaign.
  - [ ] No stale pending in localStorage (`pocketdm_guest_migrate_pending_v1` absent — this is an anon upgrade, not guest migrate).

**🔴 Blockers:** character not linked · `session_token_id` mutated · callback goes to `/auth/confirm`.

---

### 2.2 Anon → Auth via Recap (Story 03-D)

**Persona:** Anon player plays a combat to completion, sees recap, converts.

- [ ] 2 browsers: DM logged in + anon via share link (empty localStorage).
- [ ] DM sets up combat with at least one monster (e.g. "Training Dummy").
- [ ] Anon plays to monster's death (or DM ends combat via "End Encounter").
- [ ] Recap renders for the anon:
  - [ ] `RecapCtaCard` visible with `headline` containing `<em><strong>` around character name (rich-text).
  - [ ] "Salvar Combate" button also visible (F6: co-exist with save-combat legacy action).
- [ ] Click primary ("Salvar e criar conta"):
  - [ ] AuthModal opens in signup mode.
  - [ ] Network: `conversion:cta_clicked` with `moment: "recap_anon"`.
- [ ] Complete signup (email or Google):
  - [ ] Dashboard shows character linked to the correct campaign_id.
  - [ ] Network: `conversion:completed` with `flow: "upgrade"` + `moment: "recap_anon"`.

**🔴 Blockers:** character not saved · save-combat button disappeared (F6 regression) · rich-text renders as literal HTML.

---

### 2.3 Guest → Auth via Recap (Story 03-E)

**Persona:** Guest in `/try`, plays combat with multiple player combatants, picks one to save during signup.

- [ ] Open `/try` in incognito.
- [ ] Add monster + at least 2 player combatants (e.g. Thorin HP 45, Legolas HP 30).
- [ ] Start combat; play to completion OR use DM End Encounter.
- [ ] Recap renders with picker (F7):
  - [ ] **0 players:** primary button disabled + copy "Sem personagem pra salvar".
  - [ ] **1 player:** pre-selected silently (no picker UI).
  - [ ] **2+ players:** radio picker visible, ordered by max_hp **desc** (Thorin appears before Legolas).
- [ ] Select Thorin → click primary ("Salvar Thorin"):
  - [ ] AuthModal opens in signup mode.
  - [ ] Application → localStorage: `pocketdm_guest_migrate_pending_v1` written with `characterId: "Thorin-uuid"`.
- [ ] **Path A — Email signup:**
  - [ ] Toast confirms "verify email" (PT-BR: "Personagem salvo. Confirme seu e-mail…").
  - [ ] Page does NOT redirect.
  - [ ] Click email link → callback drains pending → dashboard shows Thorin.
  - [ ] Legolas (non-picked) remains in guest snapshot: go back to `/try`, verify Legolas still in Zustand store.
- [ ] **Path B — OAuth:**
  - [ ] Google redirect → return → callback runs migrate endpoint.
  - [ ] Dashboard shows Thorin (only).
  - [ ] Network trace: POST `/api/player-identity/migrate-guest-character` returned 200; body includes `characterId`.
  - [ ] `pocketdm_guest_migrate_pending_v1` cleared from localStorage post-migrate.
- [ ] **Deprecation check:** `GuestUpsellModal` DOES NOT render when the new RecapCtaCard path fires. Inspect DOM for `[data-testid^="guest-upsell-modal"]` — should have count 0.
- [ ] **Legacy fallback:** temporarily break `RecapCtaCard` (e.g. inject `window.localStorage.setItem('pocketdm_disable_cta','1')` if the flag exists, OR manually click "Salvar Combate" button) — `handleSaveAndSignup` path still works as fallback. (This is a smoke check for regression — skip if env not configured.)

**🔴 Blockers:** Thorin not saved to `player_characters` · Legolas overwritten · pending leaks across users (see 2.7) · picker orders wrong (HP asc).

---

### 2.4 Turn-safety (Story 03-F)

**Persona:** Anon player with AuthModal open while DM advances combat. Two browsers.

- [ ] Browser 1 (DM): `/app/combat/<id>` active.
- [ ] Browser 2 (Player anon): `/join/<token>`, registered, **combat already started** OR still in waiting-room.
- [ ] Player clicks `data-testid="join.waiting-room.auth-cta"` (or `conversion.waiting-room-cta.primary` if still pre-combat).
- [ ] AuthModal opens.
- [ ] Switch to DM tab. In `PlayersOnlinePanel`:
  - [ ] Presence row for the player has `data-status="authenticating"`.
  - [ ] An inline italic badge (`data-testid="player-authenticating-<player_id>"`) appears with copy "cadastrando" (PT-BR) / "signing up" (EN).
  - [ ] The indicator dot is amber and pulsing (`bg-amber-400 animate-pulse`).
  - [ ] `players_online` count still INCLUDES this player (authenticating != offline).
- [ ] DM advances turn via `[data-testid="next-turn-btn"]`.
- [ ] Player browser shows toast:
  - [ ] `combat_started` toast if combat was not yet started when modal opened (PT-BR: "Combate começou. Pode terminar o cadastro…").
  - [ ] `your_turn` toast when turn pointer matches the player (PT-BR: "É seu turno. Se quiser jogar agora, feche o cadastro.").
- [ ] Heartbeat continues — inspect Network tab for realtime channel messages; no presence drop.
- [ ] Player closes AuthModal (without submitting):
  - [ ] DM side: `data-status` returns to `"online"`; badge disappears.
- [ ] Player re-opens + completes signup successfully:
  - [ ] Modal closes; DM badge cleared.
  - [ ] Player view shows current turn pointer (no "lost turn" banner — `[data-testid="lost-turn-banner"]` count = 0).
  - [ ] `session_token_id` preserved pre→post.

**🔴 Blockers:** badge never appears · player removed from players-online count · "lost turn" banner appears · `session_token_id` mutated.

---

### 2.5 Dismissal memory (cap + per-campaign + TTL)

- [ ] Dismiss waiting-room CTA 3x in the **same** campaign (Browser 1 anon; re-join share link after each dismiss).
- [ ] 4th visit: CTA does NOT render (cap hit).
- [ ] Open a **different** campaign share link → CTA renders again (per-campaign scope preserved).
- [ ] DevTools → Application → localStorage → find `pocketdm_dismissal_*` entry for the first campaign.
  - [ ] Edit `lastDismissedAt` to 8 days ago → reload → CTA returns (7-day cooldown passed).
  - [ ] Edit `lastDismissedAt` to 91 days ago → reload → CTA returns AND entry is purged from localStorage (90-day TTL).
- [ ] **Shared dismissal:** dismiss waiting-room CTA → play combat → recap shows — confirm recap CTA does NOT render in the same campaign (Q#25 decision). Then re-run in a different campaign → recap CTA renders.

**🟠 High:** dismissal doesn't scope to campaign (leaks to other sessions) · cap bypass · TTL never purges.

---

### 2.6 Race condition (F30 — waiting-room-signup-race)

**Persona:** Anon clicks primary CTA mid-lobby; DM starts combat while AuthModal is open.

- [ ] Anon clicks CTA → AuthModal opens → start filling signup form partially (don't submit).
- [ ] DM starts combat (add monster + "Start Combat").
- [ ] **Branch (a):** Combat UI loads under the modal without blocking — player-view testid mounts in DOM while modal is still on top. Confirm via Elements tab.
- [ ] **Branch (b):** Signup completes BEFORE player's first turn:
  - [ ] Upgrade runs; modal closes; player acts authenticated.
- [ ] **Branch (c):** Signup completes AFTER player's turn already advanced:
  - [ ] DM sees "cadastrando" badge for full modal-open duration.
  - [ ] Player enters next turn cycle normally — NO "lost turn" banner.
- [ ] **Branch (d):** `session_token_id` preserved across ALL paths.

**🔴 Blockers:** combat UI blocked behind modal · "lost turn" banner in (c) · token ID mutated.

---

### 2.7 Cross-account leak prevention (Cluster Δ C4)

**Persona:** Guest starts migrate flow, then LOGS IN as an existing different user (instead of signing up).

- [ ] Browser A: guest combat → primary CTA click → AuthModal opens.
- [ ] Application → localStorage: confirm `pocketdm_guest_migrate_pending_v1` is written.
- [ ] In AuthModal, switch to **Login** tab (NOT signup).
- [ ] Verify localStorage: `pocketdm_guest_migrate_pending_v1` is **cleared** (C4 invariant).
- [ ] Sign in with Google OAuth to an **existing, different** account.
- [ ] After callback: dashboard does NOT show the guest character migrated to this unrelated user.
- [ ] Verify DB (if access): `player_characters` for the logged-in user has NO new row from this session.

**🔴 Blockers:** guest character migrated into wrong account · pending not cleared on tab switch.

---

### 2.8 Email-confirmation path (Cluster Δ C5)

- [ ] Guest → primary CTA → email signup.
- [ ] Receive confirmation email.
- [ ] **Inspect link target (before clicking):** must be `{origin}/auth/callback/continue?next=/app/dashboard` (NOT `/auth/confirm`).
- [ ] Click link → callback processes pending → dashboard shows migrated character.
- [ ] localStorage: `pocketdm_guest_migrate_pending_v1` cleared.

**🔴 Blockers:** wrong callback URL · pending not drained.

---

## 3. Analytics funnel verification

Run the following in Supabase SQL Editor (project: `pocketdm-staging`) **after QA session completes**:

```sql
SELECT event_type,
       event_payload->>'moment' AS moment,
       event_payload->>'flow'   AS flow,
       event_payload->>'error'  AS error,
       COUNT(*)
FROM analytics_events
WHERE event_type LIKE 'conversion:%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1, 2, 3, 4
ORDER BY 5 DESC;
```

Expected rows:

- [ ] `conversion:cta_shown` with `moment` in `{waiting_room, recap_anon, recap_guest}`.
- [ ] `conversion:cta_clicked` proportionate to shown (should NOT exceed shown count per moment).
- [ ] `conversion:completed`:
  - [ ] `flow: "upgrade"` for anon OAuth + waiting-room/recap-anon flows.
  - [ ] `flow: "signup_and_migrate"` for guest recap flow.
- [ ] `conversion:failed` (if any): `error` MUST be one of the allowlisted codes — `invalid_input`, `already_authenticated`, `unauthorized`, `internal`, `network`, `unknown`, `http_400`, `http_401`, `http_403`, `http_404`, `http_409`, `http_410`, `http_429`, `http_500`, `http_502`, `http_503`, `http_504`, `rate_limited`, `rate_limit`, `dup_id_dedupe`, `storage_write_failed`, `user_dismissed`, `invalid_character_id`, `TypeError`, `AbortError`, `NetworkError`, `SyntaxError`. Anything outside = 🔴.
- [ ] `guest:recap_save_signup` legacy event still fires in parallel on guest recap path (F15 regression guard).

**🔴 Blockers:** unknown error codes leaking into `conversion:failed` · CTA clicks > CTA shown · `completed` without prior `cta_clicked`.

---

## 4. Regression check (Epic 01/02 intact)

- [ ] **Epic 01 — anon upgrade via InviteClient:** open `/invite/<token>` as anon → `/upgrade` saga → confirm UUID preserved pre→post.
- [ ] **Epic 01 — migrate-guest-character standalone:** from dashboard (or legacy save-combat), migrate a guest combat → character persists.
- [ ] **Epic 02 — Area 3 M2 OAuth upgrade:** logged-in user via `/invite/<token>` → Google upgrade with `upgradeContext` preserved.
- [ ] **Epic 02 — CombatRecap DM path:** DM (auth) sees "Salvar Combate" button in recap even WITHOUT `saveSignupContext` (F6 regression guard).
- [ ] **Dismissal store — M15 `migrateDismissalEntry`:** dismissals recorded pre-03-C still honored post-upgrade (DB migration preserved them).

---

## 5. Accessibility spot-checks

- [ ] AuthModal: Escape closes; focus returns to CTA button.
- [ ] AuthModal tabs: keyboard nav (←/→) switches login/signup.
- [ ] `player-authenticating-<id>` badge has accessible `aria-label` from the dot `<span>` (per commit `c9e1e194`).
- [ ] Radio picker in guest recap: keyboard nav works; screen reader announces character names.
- [ ] No `autoFocus` traps that prevent iOS Safari from rendering the keyboard.

---

## 6. Rollback criteria

| Severity | Finding | Action |
|----|----|----|
| 🔴 | Character lost · cross-account leak · session_token mutated · unknown analytics error code | **Pause deploy. Rollback to pre-Δ tip. Hotfix + re-QA required.** |
| 🟠 | Toast missing copy · CTA ordering wrong · dismissal scope off | Open hotfix ticket; ship within 24h; monitor analytics. |
| 🟡 | Copy typo · animation stutter · edge-browser layout shift | Follow-up ticket; ship in next wave. |

**Rollback commit (if needed):** `4ba31122` (last pre-Δ stable) — but consult Daniel before executing.

---

## 7. Sign-off

| Field | Value |
|---|---|
| QA lead | |
| Start time | |
| End time | |
| Browser matrix covered | |
| Blockers found | |
| High/follow-ups | |
| Smoke script status | PASS / FAIL (see `scripts/qa/smoke-wave-3.mjs`) |
| Analytics snapshot | (paste SQL query output) |
| **Deploy decision** | GO / NO-GO |

---

## 8. Post-deploy monitoring (first 24h)

- [ ] Sentry / error tracker — watch for new `conversion:*` exception clusters.
- [ ] Supabase logs — `migrate-guest-character` 500s should be zero.
- [ ] Re-run SQL query from §3 at T+2h / T+24h — compare event counts vs pre-release baseline.
- [ ] If `conversion:failed` spikes → investigate + rollback per §6.
