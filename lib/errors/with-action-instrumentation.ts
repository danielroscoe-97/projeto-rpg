import { captureError } from "@/lib/errors/capture";

/**
 * Wrap a Next.js server action so that any thrown error is:
 *
 * 1. Logged to stdout with the **original, unsanitized message** prefixed by
 *    `[action:<actionName>]`. Next.js / React swallow the real message in the
 *    Server Components render stream ("An error occurred in the Server
 *    Components render"), and Sentry inherits that sanitized framing. The
 *    `console.error` here is the escape hatch: Vercel runtime logs keep the
 *    raw string, so operators can `npx vercel logs <deployment> | grep
 *    "[action:"` to recover the message in seconds instead of patching the
 *    action with temporary logging and redeploying.
 * 2. Reported to Sentry + Supabase via `captureError` with structured tags
 *    (`component: <actionName>`, `action: "entry"`). This preserves the
 *    original exception (and its stack) even though the message is stripped
 *    in the UI-facing error.
 * 3. Re-thrown unchanged. The wrapper NEVER swallows — server actions rely on
 *    `throw` semantics for `redirect()` and error-UI propagation.
 *
 * Pattern: `export const myAction = withActionInstrumentation("myAction", async (…) => …)`.
 * See `docs/patterns-server-action-error-handling.md`.
 */
export function withActionInstrumentation<TArgs extends unknown[], TResult>(
  actionName: string,
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    try {
      return await fn(...args);
    } catch (err) {
      // 0. `redirect()` and `notFound()` propagate via thrown control-flow
      // errors carrying a digest string. These are the SUCCESS path in Next.js
      // — logging them or reporting to Sentry would spam ops dashboards with
      // false alarms on every successful redirect. Let them through untouched.
      if (isNextControlFlowError(err)) throw err;

      // 1. Preserve the raw message in Vercel runtime logs.
      // Use a stable prefix so operators can grep. Guard against non-Error
      // throws (strings, plain objects, undefined) so the logger itself never
      // throws and drops the signal. Strip CR/LF so a message containing
      // user input (`throw new Error(\`bad: ${userInput}\`)`) cannot forge
      // a fake `[action:...]` entry on a subsequent line.
      const rawMessage = (
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : (() => {
              try {
                return JSON.stringify(err);
              } catch {
                return String(err);
              }
            })()
      ).replace(/[\r\n]+/g, " ");
      // eslint-disable-next-line no-console -- Intentional: Vercel runtime log signal.
      console.error(`[action:${actionName}] ${rawMessage}`);

      // 2. Report to Sentry + Supabase with structured tags. Guard the
      // observability call itself: if the Sentry SDK throws (rare but
      // documented), we must NOT shadow the original action error. Callers
      // always care about `err`, not the telemetry failure.
      try {
        captureError(err, {
          component: actionName,
          action: "entry",
        });
      } catch {
        // Swallow observability failures.
      }

      // 3. Re-throw untouched so Next.js can surface render errors normally
      // and error boundaries still fire.
      throw err;
    }
  };
}

/**
 * Next.js encodes `redirect()` and `notFound()` as thrown errors carrying a
 * `digest` string of the form `NEXT_REDIRECT;...` or `NEXT_NOT_FOUND`. They
 * are the control-flow success path, not failure — framework code downstream
 * catches them and converts to the intended response.
 */
function isNextControlFlowError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const digest = (err as { digest?: unknown }).digest;
  if (typeof digest !== "string") return false;
  return digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND";
}
