/**
 * lib/e2e/is-e2e-mode.ts
 *
 * Single source of truth for the E2E mode flag check. Every dev-only hook
 * (client-side `window.__pocketdm_supabase`, server API routes under
 * `/api/e2e/`, etc.) MUST use this helper so the gate semantics stay
 * identical everywhere.
 *
 * Semantics:
 *   - Strict equality: only the string "true" activates the hooks.
 *   - Anything else (undefined, "false", "1", "yes", "True") returns false.
 *   - `NEXT_PUBLIC_E2E_MODE` is inlined at build time in the browser bundle,
 *     but stays readable server-side via `process.env`.
 *
 * Production default: the env var is unset → hooks are dormant, routes 404.
 */
export function isE2eMode(): boolean {
  return process.env.NEXT_PUBLIC_E2E_MODE === "true";
}
