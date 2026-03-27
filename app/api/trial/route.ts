import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

/**
 * POST /api/trial — Activate 14-day free trial.
 * One trial per user. Uses atomic upsert to prevent race conditions.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate trial end: 14 days from now
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Atomic upsert: INSERT if no row exists, UPDATE only if trial_ends_at IS NULL.
    // This prevents race conditions — only the first concurrent request wins.
    const { data, error } = await supabase.rpc("activate_trial", {
      p_user_id: user.id,
      p_trial_ends_at: trialEndsAt.toISOString(),
    });

    if (error) throw error;

    // RPC returns false if trial was already used
    if (data === false) {
      return NextResponse.json(
        { error: "trial_already_used" },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, trial_ends_at: trialEndsAt.toISOString() });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Failed to activate trial" },
      { status: 500 }
    );
  }
}
