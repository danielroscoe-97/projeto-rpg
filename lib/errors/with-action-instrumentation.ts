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
      // 1. Preserve the raw message in Vercel runtime logs.
      // Use a stable prefix so operators can grep. Guard against non-Error
      // throws (strings, plain objects, undefined) so the logger itself never
      // throws and drops the signal.
      const rawMessage =
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
            })();
      // eslint-disable-next-line no-console -- Intentional: Vercel runtime log signal.
      console.error(`[action:${actionName}] ${rawMessage}`);

      // 2. Report to Sentry + Supabase with structured tags. captureError
      // already guards against non-Error throws internally.
      captureError(err, {
        component: actionName,
        action: "entry",
      });

      // 3. Re-throw untouched so Next.js can convert `redirect()` / render
      // errors normally and error boundaries still fire.
      throw err;
    }
  };
}
