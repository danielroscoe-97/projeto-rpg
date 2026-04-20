import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";
import {
  recoverUpgradePlayerIdentity,
  type UpgradeErrorCode,
  type UpgradeResult,
} from "@/lib/supabase/player-identity";

/**
 * POST /api/player-identity/upgrade-recovery — retry Phase 3 after a
 * `migration_partial_failure` from the upgrade route.
 *
 * This re-runs every Phase 3 step (all idempotent). No credentials needed:
 * by the time this is called, the auth user already exists — we look up
 * email via `public.users` (set by step 6 on first attempt) or via the
 * auth admin API as a last-resort.
 *
 * Body: { sessionTokenId: string }
 */

type Body = { sessionTokenId?: string };

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
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.is_anonymous) {
    return NextResponse.json(
      {
        ok: false,
        code: "already_authenticated",
        retryable: false,
        message: "Caller ainda está anônimo — recovery só faz sentido após upgrade",
      },
      { status: 409 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
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

  try {
    const result = await recoverUpgradePlayerIdentity(body.sessionTokenId, user.id);
    return toResponse(result);
  } catch (err) {
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

// Slightly tighter limit than /upgrade — if recovery also fails, client
// should surface the issue rather than hammer the endpoint.
export const POST = withRateLimit(handler, { max: 3, window: "15 m" });
