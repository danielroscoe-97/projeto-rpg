import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isE2eMode } from "@/lib/e2e/is-e2e-mode";

/**
 * POST /api/e2e/seed-session-token
 *
 * Dev-only route. Creates a `session_tokens` row for a given campaign's active
 * session and returns the share token so Playwright can drop straight into
 * `/join/[token]` without going through the DM's UI to issue a link.
 *
 * Hard gate: if NEXT_PUBLIC_E2E_MODE is not exactly "true" this endpoint
 * answers 404 — identical to a non-existent route.
 *
 * Body: { campaignId: string, playerName?: string }
 *
 * Returns:
 *   200 { ok: true, token, sessionTokenId, sessionId }
 *   400 { ok: false, error }
 *   404 (body empty)                 — gate off
 */

type Body = { campaignId?: string; playerName?: string };

function notFound(): NextResponse {
  // Mirror Next.js's default 404 — empty body, not a JSON error — so probes
  // can't tell the route ever existed. Zero exposure in prod.
  return new NextResponse(null, { status: 404 });
}

/** Generate a cryptographically random share token (mirrors session-token.ts). */
function generateToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isE2eMode()) return notFound();

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.campaignId || typeof body.campaignId !== "string") {
    return NextResponse.json(
      { ok: false, error: "campaignId required" },
      { status: 400 },
    );
  }

  const playerName = typeof body.playerName === "string" ? body.playerName : null;

  const svc = createServiceClient();

  // Find an active session for the campaign. E2E tests expect the DM to have
  // already created one; we do NOT create sessions here because sessions
  // require `owner_id` (tied to the DM) and sprawling invariants.
  const { data: session, error: sessionErr } = await svc
    .from("sessions")
    .select("id")
    .eq("campaign_id", body.campaignId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionErr) {
    return NextResponse.json(
      { ok: false, error: `sessions_lookup_failed: ${sessionErr.message}` },
      { status: 500 },
    );
  }

  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "no_active_session — seed a DM session for this campaign before calling this route",
      },
      { status: 400 },
    );
  }

  const token = generateToken();

  const { data: inserted, error: insertErr } = await svc
    .from("session_tokens")
    .insert({
      session_id: session.id,
      token,
      player_name: playerName,
      is_active: true,
    })
    .select("id, token")
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json(
      {
        ok: false,
        error: `insert_failed: ${insertErr?.message ?? "no row returned"}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      token: inserted.token,
      sessionTokenId: inserted.id,
      sessionId: session.id,
    },
    { status: 200 },
  );
}
