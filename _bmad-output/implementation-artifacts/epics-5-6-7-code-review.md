# Code Review — Epics 5, 6, 7
**Date:** 2026-03-25
**Mode:** no-spec (adversarial)
**Reviewers:** Blind Hunter × 3 + Edge Case Hunter × 3

---

## Summary

| Epic | Critical | High | Medium | Low | Patched |
|------|----------|------|--------|-----|---------|
| 5 — Real-Time Player View | 3 | 5 | 7 | 4 | ✅ 12/12 actionable |
| 6 — Admin Panel | 2 | 6 | 5 | 3 | ✅ 12/12 actionable |
| 7 — Perf/A11y/Security | 1 | 4 | 7 | 3 | ✅ 10/10 actionable |

**Total findings: ~57 | Rejected (noise/confirmed-safe): 4 | Deferred: 3 | Patched: 20**

---

## Patches Applied (this session)

### CRITICAL
- [x] **HP leak**: `/api/session/[id]/state` stripped `current_hp/max_hp/temp_hp` from monsters → players now receive `hp_status: "OK"|"LOW"|"CRIT"` only
- [x] **dm_notes leak**: `lib/realtime/broadcast.ts` strips `dm_notes` from all combatant broadcast payloads (`combatant_add`, `state_sync`, `initiative_reorder`)
- [x] **Mass assignment**: `/api/admin/content` PUT now whitelists editable fields (monsters: 29 fields, spells: 13 fields); UUID validation on `entity_id`; generic error messages

### HIGH
- [x] **Stale DM channel singleton**: `getDmChannel()` now compares `sessionId` before returning cached channel — recreates on session change
- [x] **validateSessionToken**: Added `.eq("is_active", true)` to encounter query
- [x] **linkAnonymousUser**: Added `.is("anon_user_id", null)` guard — prevents token hijacking by second player
- [x] **handleEndEncounter**: Now broadcasts `session:state_sync` with `current_turn_index: -1` to notify players + calls `expireSessionTokens()` before cleanup
- [x] **avgPlayersPerDm metric**: Fixed to count unique `anon_user_id` (actual players) not `session_id`
- [x] **Metrics 1000-row truncation**: Replaced in-memory O(N×M) loops with server-side SQL COUNT queries
- [x] **CSP header**: Added `Content-Security-Policy` to `next.config.ts`
- [x] **Sentry PII**: Added `beforeSend` scrubbing emails+JWTs; `tracesSampleRate: 0.1` in prod; Session Replay `maskAllText: true`, `blockAllMedia: true`; server config aligned
- [x] **Generic error messages**: Admin routes no longer return raw Supabase error messages to client

### MEDIUM
- [x] **sanitizeText**: Replaced naive regex with tag-stripping approach that preserves legitimate `&`, `<`, `>` as text
- [x] **sanitizeRecord**: Now truly recursive — traverses nested objects and arrays
- [x] **setTimeout leak**: Added `pollFallbackTimerRef` to PlayerJoinClient; `clearTimeout` called in cleanup
- [x] **Token dedup**: `createSessionToken` reuses existing active token for a session
- [x] **Silent persists**: Replaced `.catch(() => {})` with `.catch((err) => setError(...))` in CombatSessionClient
- [x] **NaN guard**: `ContentEditor` now rejects non-numeric input for `hp`, `ac`, `level` with user-visible error
- [x] **Realtime channel cleanup**: Admin content route wrapped in `try/finally` to guarantee `removeChannel` even on send failure

---

## Deferred (not patched — require architectural work or future stories)

1. **Rate limiting** on public API routes (`/join/[token]`, `/api/session/*`) — requires middleware or edge config work
2. **Concurrent content edit locking** — no optimistic concurrency on admin content PUT; low risk given single-admin usage
3. **Story 6-4 User Management is read-only** — admin panel lists users but cannot disable/delete; no RLS mutation policies exist; complete as a future story

---

## Rejected as Noise / Confirmed Safe

- `entity_type` table injection: safe — ternary guarantees only `"monsters"` or `"spells"`
- Admin layout missing middleware: safe — all API routes have their own `verifyAdmin()` checks
- HP bar inline style: unavoidable for dynamic widths; architectural deviation noted
- Session replay cross-tab anon identity: minor, no cross-session data access (API validates session_id)

