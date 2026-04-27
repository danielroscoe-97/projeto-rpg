# F08 — `campaign_settings.srd_full_access` (migration 188)

Standalone bundle to apply migration 188 via the Supabase Dashboard SQL Editor without `db push`. Mirrors the shape of `sprint-3-bundle/`.

## What it does

Adds a single boolean column `srd_full_access` to `campaign_settings`, default `false`. When the Mestre flips it on in Campaign HQ Settings, joining players receive the full SRD dataset via `/api/srd/full/*` instead of the public subset. The auth gate on that route stays the primary defense — this flag only changes the client-side data source on top of it.

## Files

| Order | File | Purpose |
|---|---|---|
| 1 | `00_sanity.sql` | Read-only check — confirm the column does NOT exist yet. |
| 2 | `01_apply.sql` | Idempotent `ADD COLUMN IF NOT EXISTS` + `COMMENT`. |
| 3 | `02_verify.sql` | Read-only check — confirm column + default + comment landed. |

## Run order (Dashboard SQL Editor)

1. Run `00_sanity.sql`. Expect `srd_full_access_exists = false` and a recent migration version below 188.
2. Run `01_apply.sql`. One `ALTER TABLE` + one `COMMENT` inside `BEGIN/COMMIT`. Re-runnable.
3. Run `02_verify.sql`. Expect `data_type = boolean`, `is_nullable = NO`, `column_default = false`, and `rows_already_true = 0`.

## After apply

The Next.js code path was deployed earlier and reads `campaign_settings.srd_full_access` in `app/join/[token]/page.tsx`. Until the column existed in prod the SELECT would fail silently (caught in the wrapping try/catch) and `srdFullAccess` defaulted to `false` — matching the pre-migration behavior. Once this bundle runs, the Mestre's toggle in Campaign HQ Settings → "Compêndio e regras" starts taking effect.

No backfill required. No client cache to bust — `<SrdInitializer />` re-evaluates on every page load.
