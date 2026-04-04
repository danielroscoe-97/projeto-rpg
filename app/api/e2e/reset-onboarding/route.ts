import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/e2e/reset-onboarding
 * Resets user_onboarding state for the authenticated user.
 * Only available in development/test environments.
 */
export async function POST(request: Request) {
  // Block in production (E2E_ENABLED must be exactly "true" to allow)
  if (process.env.NODE_ENV === "production" && process.env.E2E_ENABLED !== "true") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const wizardCompleted = body.wizard_completed ?? true;
  const dashboardTourCompleted = body.dashboard_tour_completed ?? false;

  const { error } = await supabase
    .from("user_onboarding")
    .upsert(
      {
        user_id: user.id,
        wizard_completed: wizardCompleted,
        dashboard_tour_completed: dashboardTourCompleted,
        source: "fresh",
      },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
