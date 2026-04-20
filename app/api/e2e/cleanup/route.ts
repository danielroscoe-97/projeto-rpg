import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isE2eMode } from "@/lib/e2e/is-e2e-mode";

/**
 * DELETE /api/e2e/cleanup
 *
 * Dev-only route. Drops fixtures Playwright created during a spec run so the
 * next run starts clean. The caller provides the ids to wipe — we never do
 * a "truncate everything" because the shared dev DB may host other data.
 *
 * Hard gate: NEXT_PUBLIC_E2E_MODE !== "true" → 404.
 *
 * Body: {
 *   sessionTokenIds?: string[];        // session_tokens.id rows to delete
 *   anonUserIds?: string[];            // auth.users rows to delete (anon only)
 *   playerCharacterIds?: string[];     // player_characters.id rows to delete
 * }
 *
 * Returns:
 *   200 { ok: true, deleted: { ... } }
 *   404 (empty body) — gate off
 *   400 { ok: false, error }
 */

type Body = {
  sessionTokenIds?: string[];
  anonUserIds?: string[];
  playerCharacterIds?: string[];
};

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!isE2eMode()) return notFound();

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    // Empty body is valid — caller may only want to delete one bucket.
    body = {};
  }

  const svc = createServiceClient();
  const deleted = { sessionTokens: 0, anonUsers: 0, playerCharacters: 0 };
  const errors: string[] = [];

  // --- session_tokens ---
  if (body.sessionTokenIds && isStringArray(body.sessionTokenIds) && body.sessionTokenIds.length > 0) {
    const { error, count } = await svc
      .from("session_tokens")
      .delete({ count: "exact" })
      .in("id", body.sessionTokenIds);
    if (error) errors.push(`session_tokens: ${error.message}`);
    else deleted.sessionTokens = count ?? 0;
  }

  // --- player_characters ---
  if (
    body.playerCharacterIds &&
    isStringArray(body.playerCharacterIds) &&
    body.playerCharacterIds.length > 0
  ) {
    const { error, count } = await svc
      .from("player_characters")
      .delete({ count: "exact" })
      .in("id", body.playerCharacterIds);
    if (error) errors.push(`player_characters: ${error.message}`);
    else deleted.playerCharacters = count ?? 0;
  }

  // --- auth.users (anon only — service role path) ---
  // We intentionally only delete rows the caller claims are anon. The admin
  // API has no bulk anon-only filter, so we loop and ask the admin API to
  // delete each id one at a time. If one fails we keep going.
  if (body.anonUserIds && isStringArray(body.anonUserIds) && body.anonUserIds.length > 0) {
    for (const uid of body.anonUserIds) {
      const { error } = await svc.auth.admin.deleteUser(uid);
      if (error) errors.push(`auth.users[${uid}]: ${error.message}`);
      else deleted.anonUsers += 1;
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { ok: false, deleted, errors },
      { status: 207 }, // multi-status — partial success allowed
    );
  }

  return NextResponse.json({ ok: true, deleted }, { status: 200 });
}
