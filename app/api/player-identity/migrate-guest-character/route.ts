import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";
import { migrateGuestCharacterToAuth } from "@/lib/supabase/character-portability";
import type { Combatant } from "@/lib/types/combat";

/**
 * POST /api/player-identity/migrate-guest-character — explicit migration of a
 * guest Combatant into `player_characters` for an already-authenticated user.
 *
 * Unlike the `/upgrade` saga which promotes anon → auth, this route assumes
 * the user has already signed up (standard signUp flow) and now wants to
 * persist their guest-mode character. Common triggers: post-combat recap on
 * `/try`, or the "import guest character" button in the HQ.
 *
 * Body: {
 *   guestCharacter: Combatant,
 *   campaignId?: string,
 *   setAsDefault?: boolean
 * }
 */

type Body = {
  guestCharacter?: Combatant;
  campaignId?: string;
  setAsDefault?: boolean;
};

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
    // Anon users must go through /upgrade first — no point persisting a
    // character under an anon UUID that may regenerate.
    return NextResponse.json(
      {
        ok: false,
        code: "already_authenticated",
        message: "Caller ainda está anônimo — faça upgrade para auth antes",
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

  if (!body.guestCharacter || typeof body.guestCharacter !== "object") {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_input",
        message: "Campo guestCharacter obrigatório",
      },
      { status: 400 },
    );
  }

  try {
    const character = await migrateGuestCharacterToAuth(
      body.guestCharacter,
      user.id,
      {
        campaignId: body.campaignId,
        setAsDefault: body.setAsDefault,
      },
    );
    return NextResponse.json({ ok: true, character }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    // `migrateGuestCharacterToAuth` throws PT-BR errors starting with
    // "Migração falhou:" (invalid userId, wrong is_player, db error). Map the
    // validation cases to 400; everything else is 500.
    const isValidation =
      message.includes("userId inválido") ||
      message.includes("personagem guest não é player");
    return NextResponse.json(
      { ok: false, code: isValidation ? "invalid_input" : "internal", message },
      { status: isValidation ? 400 : 500 },
    );
  }
};

// Tighter than /upgrade — this is a single-shot persistence and users are
// already authenticated. 10/15min is enough for retries after flaky network.
export const POST = withRateLimit(handler, { max: 10, window: "15 m" });
