import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";
import {
  upgradePlayerIdentity,
  type UpgradeErrorCode,
  type UpgradeResult,
} from "@/lib/supabase/player-identity";
import type { Combatant } from "@/lib/types/combat";

/**
 * POST /api/player-identity/upgrade — Phase 3 entry point.
 *
 * Client has already completed `supabase.auth.updateUser({ email, password })`
 * and now carries the new authenticated JWT in cookies. We validate the JWT,
 * pass the saga params to `upgradePlayerIdentity`, and translate the Result
 * into an HTTP status code.
 *
 * Body: {
 *   sessionTokenId: string,           // stable session_tokens.id
 *   credentials: { email, password, displayName? },
 *   guestCharacter?: Combatant        // optional — migrate guest store char
 * }
 */

type Body = {
  sessionTokenId?: string;
  credentials?: {
    email?: string;
    password?: string;
    displayName?: string;
  };
  guestCharacter?: Combatant;
};

/** Translate a `UpgradeResult` error code to an HTTP status. */
function statusForCode(code: UpgradeErrorCode): number {
  switch (code) {
    case "invalid_credentials":
    case "session_token_not_found":
      return 400;
    case "email_already_exists":
    case "already_authenticated":
      return 409;
    case "update_user_failed":
      return 502;
    case "migration_partial_failure":
      // 207 (Multi-Status) communicates "request accepted but not all parts
      // succeeded" — fits the partial-migration semantics. Callers with an
      // older HTTP stack can rely on the `ok: false` body field.
      return 207;
    case "internal":
    default:
      return 500;
  }
}

function toResponse(result: UpgradeResult): NextResponse {
  if (result.ok) {
    return NextResponse.json(result, { status: 200 });
  }
  return NextResponse.json(result, { status: statusForCode(result.code) });
}

const handler: Parameters<typeof withRateLimit>[0] = async function POST(
  request: NextRequest,
) {
  // 1. Auth — caller must be a real authenticated user (updateUser has
  //    already happened). Anonymous sessions are rejected here.
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.is_anonymous) {
    // Guard: the client was supposed to call updateUser first. Hitting this
    // route as an anon means the client bug-skipped Phase 2.
    return NextResponse.json(
      {
        ok: false,
        code: "already_authenticated",
        retryable: false,
        message: "Caller ainda está anônimo — chame supabase.auth.updateUser primeiro",
      },
      { status: 409 },
    );
  }

  // 2. Body parse + shape check.
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.sessionTokenId || typeof body.sessionTokenId !== "string") {
    return NextResponse.json(
      {
        ok: false,
        code: "session_token_not_found",
        retryable: false,
        message: "Campo sessionTokenId obrigatório",
      },
      { status: 400 },
    );
  }
  if (!body.credentials?.email || !body.credentials?.password) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_credentials",
        retryable: false,
        message: "Campos credentials.email e credentials.password obrigatórios",
      },
      { status: 400 },
    );
  }

  // 3. Run the saga.
  try {
    const result = await upgradePlayerIdentity({
      sessionTokenId: body.sessionTokenId,
      callerUserId: user.id,
      credentials: {
        email: body.credentials.email,
        password: body.credentials.password,
        displayName: body.credentials.displayName,
      },
      guestCharacter: body.guestCharacter,
    });
    return toResponse(result);
  } catch (err) {
    // Unexpected throw — the saga returns Results for expected failures.
    return NextResponse.json(
      {
        ok: false,
        code: "internal",
        retryable: true,
        message: err instanceof Error ? err.message : "Erro interno",
      } satisfies UpgradeResult,
      { status: 500 },
    );
  }
};

// Rate limit: per-user IP, 5 per 15 minutes — generous enough for retries,
// tight enough to deter credential-stuffing if this route were ever reached
// without auth (it isn't; the 401 gate above catches that).
export const POST = withRateLimit(handler, { max: 5, window: "15 m" });
