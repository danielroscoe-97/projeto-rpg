# Pattern — Server Action Error Handling

## Problem

Next.js 15 / React 19.3-canary Server Components strip thrown `Error` messages from the action response when the error propagates through the render stream. The client sees `"An error occurred in the Server Components render"` and Sentry records the same sanitized framing — the **real** message (e.g. `"Código inválido"`, `"Unauthorized"`, `"Campanha cheia"`) is dropped from both.

This turns "read the error, find the line" into "add temporary `console.log`, redeploy, reproduce, read Vercel runtime logs, revert" — a 45-minute debugging loop for a 1-line bug. The 2026-04-21 `JOIN_CODE_RE` drift incident was the forcing function (see `docs/bugfix-join-code-validator-drift-2026-04-21.md`).

## Solution

Wrap server actions with `withActionInstrumentation(actionName, fn)` from `lib/errors/with-action-instrumentation.ts`. The wrapper:

1. **Passes through Next.js control-flow errors first.** `redirect()` and `notFound()` propagate via thrown digest-errors (`NEXT_REDIRECT;…`, `NEXT_NOT_FOUND`). These are the SUCCESS path — the wrapper re-throws them immediately without logging or reporting, so wrapping a redirect-using action does not spam stdout or Sentry on every happy-path call.
2. Logs the **original** unsanitized message to `console.error` with a `[action:<name>]` prefix — stdout in Vercel Functions is durable and searchable. CR/LF are stripped from the message so that an error whose text interpolates user input cannot forge a fake `[action:…]` line.
3. Reports the exception to Sentry + Supabase via the existing `captureError` helper with `component: <actionName>, action: "entry"` tags. The `captureError` call is wrapped in its own `try/catch` — an observability failure must not shadow the real action error the caller cares about.
4. Re-throws the original error untouched so error boundaries and the client action contract still work.

Zero change to the action's body. No sanitization, no swallowing.

## When to use

Wrap any server action where:

- Thrown `Error` messages encode **actionable failure reasons** (bad input, auth failure, domain invariant broken) — i.e. where losing the message costs debugging time.
- The action is on a hot path — user-facing flows, paid features, anything that would show up in a support ticket.

**Adoption is incremental.** We do **not** wrap every action in a big-bang refactor. As each action is touched for other reasons, wrap it then. The join flow (`acceptJoinCodeAction`) is the pilot.

## How to use

```ts
"use server";

import { withActionInstrumentation } from "@/lib/errors/with-action-instrumentation";

export const myAction = withActionInstrumentation(
  "myAction",
  async (input: MyInput): Promise<MyResult> => {
    if (!isValid(input)) throw new Error("Invalid input");
    // ... rest of action ...
    return { ok: true };
  },
);
```

The exported name and signature are unchanged — callers keep importing `myAction` and awaiting it as before.

## How to read the logs

When a server action throws in production, fetch Vercel Functions logs and filter by the action prefix:

```bash
npx vercel logs <deployment-url> | grep "\[action:"
```

For a specific action:

```bash
npx vercel logs <deployment-url> | grep "\[action:acceptJoinCodeAction\]"
```

To tail live (during a repro):

```bash
npx vercel logs <deployment-url> --follow | grep "\[action:"
```

## Example output

A failed `acceptJoinCodeAction` call with a mistyped join code:

```
[action:acceptJoinCodeAction] Código inválido
Error: Código inválido
    at acceptJoinCodeAction (/var/task/.next/server/app/join-campaign/[code]/actions.js:42:11)
    ...
```

The first line is what the wrapper emitted — exact match for the `throw new Error(...)` message in the source. Sentry will also have a matching exception with `component=acceptJoinCodeAction, action=entry` tags, but the Vercel log is the fastest path when the message itself is the diagnostic signal.

## Why we don't apply to every action yet

- **Risk surface**: wrapping a server action in a factory function subtly changes the export shape (`function` → `const` bound to an async arrow). Next.js currently accepts this, but we prefer to validate on one action (`acceptJoinCodeAction`) in production before mass-adopting.
- **Cost of reverting**: if a Next.js upgrade ever breaks the pattern, unwrapping one action is trivial; unwrapping 60 is not.
- **Signal vs noise**: not every action is debugged often enough to justify the extra log line. Wrap proactively only on the painful ones.

When touching an unwrapped action for other reasons, adding the wrapper is a cheap win — do it in the same commit.

## Related

- Helper source: `lib/errors/with-action-instrumentation.ts`
- Capture helper it delegates to: `lib/errors/capture.ts` (`captureError`)
- Pilot application: `app/join-campaign/[code]/actions.ts` (`acceptJoinCodeAction`)
- Forcing-function postmortem: `docs/bugfix-join-code-validator-drift-2026-04-21.md`
