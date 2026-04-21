#!/usr/bin/env bash
# scripts/test-pgtap.sh
#
# Run pgTap tests against a throwaway postgres container.
#
# Flow:
#   1. Start postgres:16 container (with pgtap extension installed via apt)
#   2. Apply every migration in supabase/migrations/*.sql (in order)
#   3. Load supabase/tests/helpers/setup.sql
#   4. Run pg_prove supabase/tests/rls/*.sql
#   5. Tear down container (via trap, even on failure)
#
# Exit code = pg_prove's exit code (0 = all tests passed).
#
# Requirements:
#   - docker (Desktop or daemon) running and reachable
#   - bash 4+ (Git Bash on Windows works; WSL works; macOS /bin/bash 3.2
#     also works — we don't use assoc arrays)
#
# Manual debug: see supabase/tests/rls/README.md "Manual (debug a single file)"

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
CONTAINER_NAME="${PGTAP_CONTAINER:-pocketdm-pgtap-test}"
IMAGE="${PGTAP_IMAGE:-postgres:16}"
PG_USER="postgres"
PG_PASSWORD="pgtap-${RANDOM}"
PG_DB="postgres"

# Paths relative to repo root (script assumes it's run from repo root via
# `npm run test:pgtap`, but we can also be invoked from scripts/ directly —
# resolve either way).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MIGRATIONS_DIR="${REPO_ROOT}/supabase/migrations"
TESTS_DIR="${REPO_ROOT}/supabase/tests/rls"
# Extra test dirs (one-per-concern). Each directory gets copied into the
# container and fed to pg_prove alongside the RLS suite. Add new entries
# here when a new concern area gets its own folder (e.g. upsell RPCs,
# matviews, triggers). pgTap file prefixes still determine run order
# WITHIN each directory.
EXTRA_TESTS_DIRS=(
  "${REPO_ROOT}/supabase/tests/upsell"
)
HELPERS_FILE="${REPO_ROOT}/supabase/tests/helpers/setup.sql"

# ---------------------------------------------------------------------------
# Cleanup on exit (always)
# ---------------------------------------------------------------------------
cleanup() {
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo ""
    echo "==> Cleaning up container ${CONTAINER_NAME}"
    docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not found on PATH. Install Docker Desktop or docker CLI." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: docker daemon not running. Start Docker Desktop and retry." >&2
  exit 1
fi

if [ ! -d "${MIGRATIONS_DIR}" ]; then
  echo "ERROR: ${MIGRATIONS_DIR} not found. Are you in the repo root?" >&2
  exit 1
fi

if [ ! -d "${TESTS_DIR}" ]; then
  echo "ERROR: ${TESTS_DIR} not found. Scaffold missing?" >&2
  exit 1
fi

# Remove any lingering container from a previous failed run.
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "==> Removing stale container ${CONTAINER_NAME}"
  docker rm -f "${CONTAINER_NAME}" >/dev/null
fi

# ---------------------------------------------------------------------------
# Start container
# ---------------------------------------------------------------------------
echo "==> Starting ${IMAGE} container (${CONTAINER_NAME})"
docker run --rm -d \
  --name "${CONTAINER_NAME}" \
  -e POSTGRES_PASSWORD="${PG_PASSWORD}" \
  -e POSTGRES_DB="${PG_DB}" \
  "${IMAGE}" >/dev/null

# Wait for postgres to accept connections.
echo "==> Waiting for postgres to be ready"
for i in $(seq 1 30); do
  if docker exec "${CONTAINER_NAME}" pg_isready -U "${PG_USER}" >/dev/null 2>&1; then
    echo "    postgres up (took ${i}s)"
    break
  fi
  if [ "${i}" -eq 30 ]; then
    echo "ERROR: postgres did not become ready in 30s" >&2
    docker logs "${CONTAINER_NAME}" >&2
    exit 1
  fi
  sleep 1
done

# ---------------------------------------------------------------------------
# Install pgtap + pg_prove
# ---------------------------------------------------------------------------
# pgtap: SQL extension (apt package postgresql-16-pgtap)
# pg_prove: Perl TAP runner (apt package libtap-parser-sourcehandler-pgtap-perl)
echo "==> Installing pgtap + pg_prove in container"
docker exec "${CONTAINER_NAME}" bash -c '
  set -e
  apt-get update -qq >/dev/null
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends \
    postgresql-16-pgtap \
    libtap-parser-sourcehandler-pgtap-perl \
    >/dev/null
' || {
  echo "ERROR: failed to install pgtap packages. Check container apt sources." >&2
  docker logs "${CONTAINER_NAME}" >&2 | tail -20
  exit 1
}

# Enable the extension in our DB.
docker exec "${CONTAINER_NAME}" psql -U "${PG_USER}" -d "${PG_DB}" -c 'create extension if not exists pgtap;' >/dev/null

# Also ensure the auth schema exists (Supabase convention) — migrations
# assume it. In vanilla postgres we fake it with a minimal auth.users table.
# If your migrations reference more of the auth schema, extend this stub.
echo "==> Creating minimal auth schema stub"
docker exec -i "${CONTAINER_NAME}" psql -U "${PG_USER}" -d "${PG_DB}" <<'SQL' >/dev/null
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  aud text,
  role text,
  is_anonymous boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- auth.uid(): Supabase exposes this as a SECURITY DEFINER function. We mirror
-- it so RLS policies that call auth.uid() work inside pgTap.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- Roles that RLS GRANTs target. In Supabase these pre-exist; in vanilla
-- postgres we create them no-login so GRANT statements succeed.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end$$;
SQL

# ---------------------------------------------------------------------------
# Apply migrations in order
# ---------------------------------------------------------------------------
echo "==> Applying migrations from ${MIGRATIONS_DIR}"
migration_count=0
for f in "${MIGRATIONS_DIR}"/*.sql; do
  [ -f "${f}" ] || continue
  migration_count=$((migration_count + 1))
  fname="$(basename "${f}")"
  if ! docker exec -i "${CONTAINER_NAME}" psql -v ON_ERROR_STOP=1 -U "${PG_USER}" -d "${PG_DB}" < "${f}" >/dev/null 2>/tmp/pgtap-err-$$; then
    echo "ERROR: migration ${fname} failed:" >&2
    cat /tmp/pgtap-err-$$ >&2
    rm -f /tmp/pgtap-err-$$
    exit 1
  fi
done
rm -f /tmp/pgtap-err-$$
echo "    applied ${migration_count} migrations"

# ---------------------------------------------------------------------------
# Load helpers
# ---------------------------------------------------------------------------
if [ -f "${HELPERS_FILE}" ]; then
  echo "==> Loading helpers from ${HELPERS_FILE}"
  docker exec -i "${CONTAINER_NAME}" psql -v ON_ERROR_STOP=1 -U "${PG_USER}" -d "${PG_DB}" < "${HELPERS_FILE}" >/dev/null
else
  echo "WARNING: ${HELPERS_FILE} not found, skipping"
fi

# ---------------------------------------------------------------------------
# Run pg_prove
# ---------------------------------------------------------------------------
echo "==> Running pg_prove ${TESTS_DIR}/*.sql"
echo ""

# pg_prove expects connection args. We pass them via env vars consumed by
# the in-container invocation. psql inside the container doesn't need
# password because local peer/trust is default for the postgres superuser
# on the unix socket.
#
# We copy the test files into the container so pg_prove can read them from
# the container's filesystem (pg_prove doesn't accept SQL via stdin).
docker cp "${TESTS_DIR}" "${CONTAINER_NAME}:/tmp/rls-tests/"

# Copy each extra tests directory under its basename (e.g. /tmp/upsell-tests/).
# We track the list of container paths to hand to pg_prove in one invocation.
PGPROVE_PATHS=("/tmp/rls-tests/*.sql")
for extra_dir in "${EXTRA_TESTS_DIRS[@]}"; do
  if [ -d "${extra_dir}" ]; then
    base="$(basename "${extra_dir}")"
    dest="/tmp/${base}-tests"
    docker cp "${extra_dir}" "${CONTAINER_NAME}:${dest}/"
    PGPROVE_PATHS+=("${dest}/*.sql")
  else
    echo "WARNING: extra tests dir ${extra_dir} not found, skipping"
  fi
done

# Execute. The exit code propagates.
docker exec "${CONTAINER_NAME}" bash -c "
  pg_prove \
    --username ${PG_USER} \
    --dbname ${PG_DB} \
    --ext .sql \
    ${PGPROVE_PATHS[*]}
"

# (trap handles cleanup)
