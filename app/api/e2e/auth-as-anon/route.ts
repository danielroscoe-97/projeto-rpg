import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isE2eMode } from "@/lib/e2e/is-e2e-mode";

/**
 * POST /api/e2e/auth-as-anon
 *
 * Dev-only route. Performs a server-side `signInAnonymously()` and sets the
 * Supabase session cookies on the response. After calling this endpoint,
 * the browser carries a valid anon JWT and can hit RLS-protected routes
 * without going through `/join/[token]`.
 *
 * Hard gate: NEXT_PUBLIC_E2E_MODE !== "true" → 404. Never exposed in prod.
 *
 * Returns:
 *   200 { ok: true, userId, expiresAt }
 *   404 (empty body) — gate off
 *   500 { ok: false, error }
 */

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

export async function POST(_request: NextRequest): Promise<NextResponse> {
  if (!isE2eMode()) return notFound();

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error || !data?.user) {
    return NextResponse.json(
      {
        ok: false,
        error: `signInAnonymously_failed: ${error?.message ?? "no user"}`,
      },
      { status: 500 },
    );
  }

  // Note: the supabase server client from `@/lib/supabase/server` installs
  // Set-Cookie headers on the response automatically via the `setAll`
  // cookie adapter (see server.ts). Nothing more to do here.
  return NextResponse.json(
    {
      ok: true,
      userId: data.user.id,
      expiresAt: data.session?.expires_at ?? null,
    },
    { status: 200 },
  );
}
