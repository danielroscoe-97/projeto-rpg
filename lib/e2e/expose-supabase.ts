"use client";

/**
 * lib/e2e/expose-supabase.ts
 *
 * Client-side helper that exposes the Supabase browser client on
 * `window.__pocketdm_supabase` so Playwright specs can drive auth flows
 * (`supabase.auth.updateUser`, `supabase.auth.signInAnonymously`, etc.)
 * that are impossible to trigger via UI in the current build.
 *
 * ### Why this exists
 *
 * Story 01-F shipped 3 Playwright specs that need to invoke Phase 2 of the
 * identity-upgrade saga (client-side `updateUser`). The UI to surface that
 * action lives in Epic 02's dashboard — which has not landed yet. Rather
 * than block the whole testing contract, we expose the client so the specs
 * can call `updateUser` directly via `page.evaluate()`.
 *
 * Once Epic 02 dashboard ships the upgrade form, the specs can switch to
 * the UI path and this hook becomes belt-and-suspenders.
 *
 * ### Hard gate — zero production exposure
 *
 * The hook ONLY runs if `NEXT_PUBLIC_E2E_MODE === "true"` (strict equality,
 * see `is-e2e-mode.ts`). The env var defaults to "false"/unset in all real
 * deployments. If someone flips it on in production by accident, the helper
 * still does nothing harmful — `window.__pocketdm_supabase` just points at
 * the same public anon client the app already uses. There is no elevation
 * of privilege here; service-role keys live server-side only.
 *
 * ### How Playwright uses it
 *
 * ```ts
 * await page.evaluate(() => {
 *   // eslint-disable-next-line @typescript-eslint/no-explicit-any
 *   const win = window as any;
 *   return win.__pocketdm_supabase.auth.updateUser({ email, password });
 * });
 * ```
 */

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isE2eMode } from "@/lib/e2e/is-e2e-mode";

/**
 * React component that exposes `window.__pocketdm_supabase` on mount when
 * `NEXT_PUBLIC_E2E_MODE === "true"`. Renders nothing.
 *
 * Place once at the root layout, inside the client boundary. Safe to mount
 * multiple times — `createClient()` returns a singleton.
 */
export function ExposeSupabaseForE2E(): null {
  useEffect(() => {
    if (!isE2eMode()) return;
    if (typeof window === "undefined") return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    // Idempotent — don't overwrite if something else already set it.
    if (win.__pocketdm_supabase) return;
    win.__pocketdm_supabase = createClient();

    // Cleanup on unmount: leave the reference in place. Tests may re-use it
    // across React re-renders, and the browser client itself is a singleton
    // in client.ts. Nothing to tear down.
  }, []);

  return null;
}
