import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";
import {
  upgradePlayerIdentity,
  type UpgradeErrorCode,
  type UpgradeMode,
  type UpgradeResult,
} from "@/lib/supabase/player-identity";
import type { Combatant } from "@/lib/types/combat";

/**
 * POST /api/player-identity/upgrade — Phase 3 entry point.
 *
 * Two modes, selected by the `mode` body field:
 *
 *   - `email` (default): server promotes the anon user via
 *     `admin.updateUserById({email, password, user_metadata})` then runs the
 *     saga. This replaces the pre-Wave-2 client-side `updateUser` + POST
 *     sequence that could leave the user half-upgraded when the POST failed
 *     (C2 fix).
 *
 *   - `oauth`: the user has already completed Google OAuth (Phase 2 happened
 *     via Supabase hosted pages + our `/auth/callback`). They arrive here
 *     already authenticated; we skip credential writes entirely and just run
 *     the migration (C1 fix — avoids sending placeholder
 *     `__oauth__@pocketdm.com.br` credentials into the saga).
 *
 * Body: {
 *   sessionTokenId: string,           // stable session_tokens.id
 *   mode?: "email" | "oauth",         // default "email"
 *   credentials?: { email, password, displayName? },  // required for "email"
 *   guestCharacter?: Combatant        // optional — migrate guest store char
 * }
 */

type Body = {
  sessionTokenId?: string;
  mode?: UpgradeMode;
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
  // 1. Auth — caller must have a Supabase session. The *kind* of session we
  //    accept depends on `mode`:
  //      - email mode → caller is STILL anon (we'll promote them server-side)
  //      - oauth mode → caller is already authenticated (OAuth completed)
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const mode: UpgradeMode = body.mode === "oauth" ? "oauth" : "email";

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

  // 3. Mode-specific pre-checks and credential resolution -------------------

  let email: string;
  let password: string | undefined;
  let displayName: string | undefined;

  if (mode === "email") {
    // For email mode we expect to receive credentials and an anonymous user.
    // We'll promote via admin.updateUserById below — the caller should NOT
    // have already run supabase.auth.updateUser client-side.
    if (
      !body.credentials?.email ||
      !body.credentials?.password ||
      typeof body.credentials.email !== "string" ||
      typeof body.credentials.password !== "string"
    ) {
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

    // If the caller is already authenticated in email mode, we have two
    // plausible reads: (a) retry after a partial failure — safe to proceed,
    // admin.updateUserById is idempotent with matching email; (b) legacy
    // client that still ran updateUser before posting — also safe, since
    // we'll just re-apply the same email/password. Either way, we proceed.
    email = body.credentials.email;
    password = body.credentials.password;
    displayName =
      typeof body.credentials.displayName === "string" && body.credentials.displayName
        ? body.credentials.displayName
        : undefined;

    // Server-side credential promotion. Using the service client so we have
    // the admin API. This is the single write that eliminates the
    // half-upgraded race (C2): if it fails we return an error and the user
    // remains anon — no stranded auth.users row with email set but
    // public.users never populated.
    const service = createServiceClient();
    const updatePayload: {
      email: string;
      password: string;
      user_metadata?: Record<string, unknown>;
    } = { email, password };
    if (displayName) {
      updatePayload.user_metadata = { display_name: displayName };
    }

    const { error: adminErr } = await service.auth.admin.updateUserById(
      user.id,
      updatePayload,
    );
    if (adminErr) {
      // Distinguish "email already in use" (the most common path) from
      // generic provider failures, so the client can surface a helpful
      // toast (user_already_registered) vs. a retry prompt.
      const msg = adminErr.message || "";
      const emailInUse =
        /already\s*(exists|registered|taken)|duplicate.*email|email_exists/i.test(
          msg,
        );

      return NextResponse.json(
        {
          ok: false,
          code: emailInUse ? "email_already_exists" : "update_user_failed",
          retryable: !emailInUse,
          message: msg,
        } satisfies UpgradeResult,
        { status: emailInUse ? 409 : 502 },
      );
    }
  } else {
    // oauth mode — caller must be already authenticated (anon session means
    // the client hit this route too early). We take identity (email) from
    // the JWT, ignoring anything the client put in `credentials` (C1).
    if (user.is_anonymous) {
      return NextResponse.json(
        {
          ok: false,
          code: "already_authenticated",
          retryable: false,
          message:
            "OAuth upgrade requires an already-authenticated session — complete the OAuth redirect first",
        } satisfies UpgradeResult,
        { status: 409 },
      );
    }

    if (!user.email) {
      // OAuth providers always return an email for Google; missing email
      // is a setup or provider-side misconfiguration.
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_credentials",
          retryable: false,
          message: "OAuth session missing email claim",
        } satisfies UpgradeResult,
        { status: 400 },
      );
    }

    email = user.email;
    // Password intentionally omitted — oauth users don't have one.
    password = undefined;
    // Prefer explicit displayName if the client sent one, otherwise pull
    // from user_metadata which Google populates on the OAuth link.
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const fromMeta =
      typeof meta.display_name === "string"
        ? meta.display_name
        : typeof meta.full_name === "string"
          ? meta.full_name
          : typeof meta.name === "string"
            ? meta.name
            : undefined;
    displayName =
      typeof body.credentials?.displayName === "string" &&
      body.credentials.displayName
        ? body.credentials.displayName
        : fromMeta;
  }

  // 4. Run the saga.
  try {
    const result = await upgradePlayerIdentity({
      sessionTokenId: body.sessionTokenId,
      callerUserId: user.id,
      mode,
      credentials: {
        email,
        password,
        displayName,
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
