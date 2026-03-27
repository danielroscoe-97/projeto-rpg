# Story 0.3: Migrate Rate Limit to Supabase

Status: review

## Story

As a **developer**,
I want to replace the in-memory rate limit Map with a Supabase `rate_limits` table and `check_rate_limit()` RPC,
so that rate limiting works correctly across multiple serverless instances on Vercel, preventing abuse in production.

## Acceptance Criteria

1. Migration `014_rate_limits.sql` creates table `rate_limits` with columns: `key` (TEXT PK), `count` (INTEGER), `window_start` (TIMESTAMPTZ).
2. RPC function `check_rate_limit(p_key, p_max, p_window_seconds)` atomically increments counter or resets window. Returns BOOLEAN.
3. `app/api/oracle-ai/route.ts` uses `supabase.rpc('check_rate_limit', ...)` instead of in-memory Map.
4. Rate limit: 20 requests per 3600 seconds (1 hour) per IP — matching current config.
5. Fail-open: if RPC call fails, request is ALLOWED and error is logged to Sentry.
6. All references to `rateLimitMap`, `isRateLimited`, `RATE_LIMIT_MAX_ENTRIES` removed from route.ts.
7. HTTP 429 returned when rate limit exceeded, with message "Rate limit exceeded. Try again later."

## Tasks / Subtasks

- [x] Task 1: Create migration 016_rate_limits.sql (AC: #1, #2)
  - [x] Create file `supabase/migrations/016_rate_limits.sql` (014 was taken by monster_id_to_text)
  - [x] Create `rate_limits` table:
    ```sql
    CREATE TABLE rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER DEFAULT 1,
      window_start TIMESTAMPTZ DEFAULT now()
    );
    ```
  - [x] Create RPC function:
    ```sql
    CREATE OR REPLACE FUNCTION check_rate_limit(
      p_key TEXT, p_max INTEGER, p_window_seconds INTEGER
    ) RETURNS BOOLEAN AS $$
    DECLARE v_count INTEGER;
    BEGIN
      INSERT INTO rate_limits (key, count, window_start)
      VALUES (p_key, 1, now())
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.window_start + (p_window_seconds || ' seconds')::interval < now()
          THEN 1
          ELSE rate_limits.count + 1
        END,
        window_start = CASE
          WHEN rate_limits.window_start + (p_window_seconds || ' seconds')::interval < now()
          THEN now()
          ELSE rate_limits.window_start
        END
      RETURNING count INTO v_count;
      RETURN v_count <= p_max;
    END;
    $$ LANGUAGE plpgsql;
    ```
  - [x] Add RLS: allow service_role only (API routes use service_role key)

- [x] Task 2: Replace in-memory rate limit in route.ts (AC: #3, #4, #6, #7)
  - [x] Read `app/api/oracle-ai/route.ts` and identify all rate limit code
  - [x] Remove `rateLimitMap` (Map declaration), `isRateLimited` function, `RATE_LIMIT_MAX_ENTRIES` constant
  - [x] Add Supabase client import (service_role for server-side)
  - [x] Replace with:
    ```typescript
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    try {
      const { data: allowed, error } = await supabase.rpc('check_rate_limit', {
        p_key: `oracle:${ip}`,
        p_max: 20,
        p_window_seconds: 3600,
      });
      if (error) throw error;
      if (!allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Try again later.' },
          { status: 429 }
        );
      }
    } catch (error) {
      // Fail-open: allow request if rate limit check fails
      console.error('[Oracle AI] Rate limit check failed:', error);
      Sentry.captureException(error, {
        tags: { component: 'oracle-ai', flow: 'rate-limit' },
      });
    }
    ```

- [x] Task 3: Implement fail-open pattern (AC: #5)
  - [x] Wrap RPC call in try/catch
  - [x] On error: `console.error` + `Sentry.captureException` with tags
  - [x] On error: do NOT return 429 — let request proceed

- [x] Task 4: Test locally (AC: #1-#7)
  - [x] Run `next build` to verify no TypeScript errors — passes clean

## Dev Notes

### Why This Breaks in Serverless

Vercel spawns multiple serverless instances. Each has its own `rateLimitMap` in memory. A user hitting different instances bypasses the limit entirely. The Supabase table is shared across all instances.

### Supabase Client for Server-Side

API routes should use the service_role client:
```typescript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```
Check how the existing route.ts creates its Supabase client and follow the same pattern.

### Migration Numbering

Architecture references `014_rate_limits.sql`. Check existing migrations in `supabase/migrations/` to confirm numbering doesn't conflict.

### Anti-Patterns to Avoid

- **DON'T** fail-closed on RPC error — users should not be blocked by infra failures
- **DON'T** keep the old in-memory Map as a "fallback" — remove it completely
- **DON'T** use anon key for the RPC call — use service_role for server-side
- **DON'T** hardcode rate limit values in the migration — pass as RPC parameters
- **DON'T** forget to prefix key with context (`oracle:${ip}`) for future reuse

### Project Structure Notes

- New file: `supabase/migrations/014_rate_limits.sql`
- Modified file: `app/api/oracle-ai/route.ts`
- Sentry import: `import * as Sentry from "@sentry/nextjs"`

### References

- [Source: _bmad-output/implementation-artifacts/v2-epics-0-1-2-stories.md — Story 0.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — V2.2 Schema, V2.1 TD3]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 0, TD3, NFR14]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Completion Notes List
- Migration numbered 016 (not 014) since 014 and 015 already exist
- Rate limit window changed from 60s to 3600s (1 hour) as specified in story (architecture V2.12 spec)
- Removed all in-memory rate limit code: rateLimitMap, isRateLimited, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, RATE_LIMIT_MAX_ENTRIES
- Added Sentry import + Supabase service client for the rate limit RPC
- Fail-open: on RPC error, request proceeds and error is logged to Sentry

### Change Log
- `supabase/migrations/016_rate_limits.sql`: New migration — rate_limits table + check_rate_limit() RPC + RLS enabled
- `app/api/oracle-ai/route.ts`: Replaced in-memory rate limit with Supabase RPC, added fail-open, added Sentry + Supabase imports

### File List
- `supabase/migrations/016_rate_limits.sql` (new)
- `app/api/oracle-ai/route.ts`
