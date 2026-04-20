# pgTap RLS Test Harness

Scaffold for testing Postgres Row-Level-Security policies end-to-end against a
real Postgres instance. Jest cannot assert RLS because jest has no database —
this harness is the answer.

Follow-up ticket: `docs/HANDOFF-player-identity-session-3.md` §3 row 1
(Winston, SLA 2-3d). Current state: **scaffold only**. Two example tests live
here; five tests remain marked `describe.skip` in `tests/player-identity/` and
are candidates for migration (see "How to destravar the 5 skipped tests"
below).

## Why pgTap, not jest/integration

| Concern | Jest (unit) | Supabase JS (integration) | pgTap (this harness) |
|---|---|---|---|
| Assert SELECT returns row | no | yes | yes |
| Assert UPDATE affected 0 rows under RLS | no | yes (but verbose) | yes, `results_eq` |
| Assert CHECK violation raises SQLSTATE 23514 | no | yes | yes, `throws_ok` |
| Run in CI without a running Next.js | yes | no (needs supabase running) | yes |
| Zero network hops (fast) | n/a | slow | fast |
| Tests live next to migrations | no | no | yes |

## File Convention

```
supabase/tests/
  helpers/
    setup.sql               # shared helpers (test_setup_user, etc.)
  rls/
    README.md               # this file
    00_smoke.sql            # sanity: pgTap itself works
    01_campaign_members_rls.sql
    02_player_characters_rls.sql
    NN_<area>_rls.sql       # one file per RLS area, numbered by run-order
```

Rules for new files:

1. **Numeric prefix**: two digits, zero-padded. Determines run order — later
   files can assume earlier ones left state clean via `rollback`.
2. **One `begin;` / `rollback;` per file**: every test MUST end with `rollback`
   so migrations stay clean between files. pgTap's `finish();` does NOT roll
   back.
3. **Declare plan count upfront**: `select plan(N);` where N = number of
   assertions. Mismatch = red.
4. **Use the helpers in `supabase/tests/helpers/setup.sql`** for user creation
   and JWT claim impersonation — do NOT hand-roll `auth.uid()` stubs per file.

## Running Locally

### Prerequisites

- Docker Desktop running
- Bash (Git Bash on Windows, or WSL)
- ~30s for first run (pulls postgres:16 + builds pgtap)

### One-shot: `npm run test:pgtap`

```bash
npm run test:pgtap
```

This wraps `scripts/test-pgtap.sh`, which:

1. Starts a throwaway `postgres:16` container with pgtap pre-installed
2. Applies every file in `supabase/migrations/*.sql` in order
3. Loads `supabase/tests/helpers/setup.sql`
4. Runs `pg_prove supabase/tests/rls/*.sql`
5. Tears down the container (container name: `pocketdm-pgtap-test`, removed on
   exit)

Exit code = pg_prove's exit code, so CI can consume it.

### Manual (debug a single file)

```bash
# start the harness container
docker run --rm -d \
  --name pocketdm-pgtap-debug \
  -e POSTGRES_PASSWORD=pgtap \
  -p 5433:5432 \
  postgres:16

# wait ~5s for boot
docker exec pocketdm-pgtap-debug psql -U postgres -c 'create extension pgtap;'

# apply all migrations
for f in supabase/migrations/*.sql; do
  docker exec -i pocketdm-pgtap-debug psql -U postgres < "$f"
done

# load helpers
docker exec -i pocketdm-pgtap-debug psql -U postgres < supabase/tests/helpers/setup.sql

# run ONE file
docker exec -i pocketdm-pgtap-debug psql -U postgres < supabase/tests/rls/01_campaign_members_rls.sql

# cleanup
docker rm -f pocketdm-pgtap-debug
```

### From inside Supabase local stack (alternative)

If you already run `supabase start` for Next.js dev, pgTap is NOT installed in
the official supabase/postgres image by default as of this writing. Prefer the
throwaway container above — it isolates test state from dev state.

## pgTap Cheat Sheet (the subset we actually use)

| Function | Example | Purpose |
|---|---|---|
| `plan(n)` | `select plan(3);` | Declare N assertions expected in this file |
| `finish()` | `select * from finish();` | End the plan; pg_prove reads the tap output |
| `ok(cond, name)` | `select ok(1=1, 'math works');` | Truthy assertion |
| `is(a, b, name)` | `select is(count(*), 1::bigint, 'one row');` | Equality |
| `results_eq(sql, vals, name)` | `select results_eq('select name from t', $$VALUES ('a')$$);` | Multi-row compare |
| `throws_ok(sql, err, msg)` | `select throws_ok($$update ...$$, '23514');` | Assert SQL raises SQLSTATE |
| `lives_ok(sql, name)` | `select lives_ok($$select 1$$);` | Assert SQL does NOT raise |
| `has_table` / `has_column` | schema assertions | For migration smoke tests |
| `is_empty(sql, name)` | `select is_empty('select * from t where x=1');` | Assert 0 rows |

Full reference: https://pgtap.org/documentation.html

## JWT / `auth.uid()` Impersonation

Supabase RLS hinges on `auth.uid()`, which reads `current_setting('request.jwt.claims', true)::json->>'sub'`.
In tests we set this setting manually via the helper:

```sql
-- in your test file
set local role authenticated;
select helpers.test_setup_user('alice@example.com');  -- creates user, sets jwt.sub

-- now auth.uid() returns alice's UUID
select campaigns_i_can_see.* from ...;

-- switch persona mid-test
select helpers.test_setup_user('bob@example.com');
```

See `supabase/tests/helpers/setup.sql` for the full helper API.

## How to destravar the 5 skipped tests

The 5 `describe.skip` tests in `tests/player-identity/` are documented SQL
assertions waiting for this harness. Migration path per test:

### From `tests/player-identity/avatar-url-constraint.test.ts`

**1. `describe.skip("avatar_url CHECK — live Postgres assertion (pgTap follow-up)")`**
→ create `supabase/tests/rls/03_avatar_url_check.sql`.

```sql
-- pseudocode outline
begin;
select plan(2);

insert into auth.users (id, email) values (gen_random_uuid(), 't@t.com');
insert into users (id, email) values ((select id from auth.users where email='t@t.com'), 't@t.com');

-- attempt malicious update — must fail with 23514
select throws_ok(
  $$update users set avatar_url = 'javascript:alert(1)' where email = 't@t.com'$$,
  '23514',
  'javascript: URL rejected by CHECK users_avatar_url_safe'
);

-- valid URL lives
select lives_ok(
  $$update users set avatar_url = 'https://cdn.pocketdm.com.br/a.png' where email = 't@t.com'$$,
  'https:// URL accepted'
);

select * from finish();
rollback;
```

### From `tests/player-identity/rls-soft-claim-integration.test.ts`

**2. `"anon with session_token A can UPDATE a soft-claimed character's name field"`**
→ `supabase/tests/rls/04_player_characters_soft_claim.sql` (one `it` per
assertion; multiple assertions fit in the same file).

**3. `"anon cannot UPDATE claimed_by_session_token to a token they do not own"`**
→ same file, `results_eq` with 0 rows affected.

**4. `"anon CANNOT self-promote by setting user_id directly (migration 145 guard)"`**
→ same file. This is the critical test — migration 145's `with check` should
zero-row the UPDATE.

**5. `"after upgradePlayerIdentity completes, anon JWT cannot see the character; auth JWT can"`**
→ `supabase/tests/rls/05_upgrade_identity_visibility.sql`. Needs two personas
via `helpers.test_setup_user` (same UUID played as anon then as auth).

### Migration procedure (per test)

1. Write the pgTap file with one file per logical grouping (usually 1 file
   per jest `describe.skip` block).
2. Run `npm run test:pgtap` locally. Green = good.
3. In the jest file, replace `describe.skip("T4.c ...")` with a note:
   `// SQL assertions migrated to supabase/tests/rls/04_player_characters_soft_claim.sql`
4. Commit both changes together with message
   `test(pgtap): migrate <jest-describe-name> to pgTap`.

## Troubleshooting

**`pg_prove: command not found`**: the Docker container entrypoint installs
pgtap + pg_prove via `cpanm TAP::Parser::SourceHandler::pgTAP`. If offline,
expect a 60-120s hang on first run while cpanm pulls deps. Cache is baked into
subsequent runs.

**`ERROR: could not load library pgtap`**: the container wasn't given enough
time to finish boot. Bump the `until pg_isready` loop in `test-pgtap.sh`.

**Test file rolled back but dev DB still dirty**: you are running against
`supabase start` instead of the throwaway container. Use the `test:pgtap`
script — it is namespaced specifically to avoid this.

**Plan count mismatch**: `expected N, got M` — your `plan(N)` declaration is
off. Count every `ok/is/throws_ok/lives_ok/results_eq/is_empty` call.
