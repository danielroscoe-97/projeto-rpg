import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendFirstCombatEmail } from "@/lib/notifications/first-combat-email";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { NextResponse } from "next/server";

/**
 * POST /api/first-combat-check
 * Fire-and-forget from client after encounter creation.
 * Checks if this is the user's first encounter — if so, sends celebratory email.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({}, { status: 200 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({}, { status: 200 });
  }

  const { encounterName, playerCount, monsterCount } = body as {
    encounterName?: string;
    playerCount?: number;
    monsterCount?: number;
  };

  try {
    const service = createServiceClient();

    // Count total encounters owned by this user
    const { count } = await service
      .from("encounters")
      .select("id", { count: "exact", head: true })
      .eq("sessions.owner_id", user.id)
      .not("id", "is", null);

    // Supabase doesn't support JOIN in count queries easily,
    // so query via sessions first
    const { data: sessions } = await service
      .from("sessions")
      .select("id")
      .eq("owner_id", user.id);

    if (!sessions || sessions.length === 0) return NextResponse.json({}, { status: 200 });

    const sessionIds = sessions.map((s) => s.id);
    const { count: encounterCount } = await service
      .from("encounters")
      .select("id", { count: "exact", head: true })
      .in("session_id", sessionIds);

    // Only send email if this is the very first encounter
    if (encounterCount !== 1) return NextResponse.json({}, { status: 200 });

    const { data: profile } = await service
      .from("users")
      .select("display_name")
      .eq("id", user.id)
      .single();

    await sendFirstCombatEmail({
      email: user.email,
      displayName: profile?.display_name ?? user.email.split("@")[0],
      encounterName: (encounterName as string) || "Encounter 1",
      playerCount: typeof playerCount === "number" ? playerCount : 0,
      monsterCount: typeof monsterCount === "number" ? monsterCount : 0,
    });

    trackServerEvent("email:first_combat_sent", { userId: user.id });
  } catch {
    // Fire-and-forget — never fail
  }

  return NextResponse.json({}, { status: 200 });
}
