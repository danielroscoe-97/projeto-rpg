/**
 * `/auth/callback` — Google OAuth continuation entry.
 *
 * Flow:
 *   1. Supabase redirects here with `?code=...` after OAuth.
 *   2. We exchange the code for a session (server-side).
 *   3. We redirect to `/auth/callback/continue` which is a tiny client
 *      component that inspects `localStorage[identity-upgrade-context-v1]`
 *      and, if present, calls `POST /api/player-identity/upgrade`, then
 *      routes to the final destination (dashboard or invite page).
 *
 * The client step is required because localStorage is browser-only and the
 * `upgradeContext` persisted by `AuthModal` lives there (see
 * `lib/auth/upgrade-context-storage.ts`).
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/app/dashboard";
  // Prevent open redirect — only allow relative paths
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : "/app/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // Hand off to the client-side continuation so it can inspect localStorage
  // and (optionally) run the upgrade saga before routing to `next`.
  redirect(`/auth/callback/continue?next=${encodeURIComponent(next)}`);
}
