import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { shouldShowDmCta } from "@/lib/upsell/should-show-dm-cta";

/**
 * GET /api/upsell/should-show-dm-cta
 *
 * Epic 04 (Player-as-DM Upsell), Story 04-B.
 *
 * Thin wrapper around `shouldShowDmCta(auth.uid())`. Returns 401 if no auth
 * session; otherwise mirrors the server action's return shape as JSON so the
 * dashboard can gate the CTA with a single fetch.
 *
 * See `lib/upsell/should-show-dm-cta.ts` for the decision logic and AC Test 4
 * enumeration.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decision = await shouldShowDmCta(user.id);
  return NextResponse.json(decision, { status: 200 });
}
