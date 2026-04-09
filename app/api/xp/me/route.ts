import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/xp/me — Authenticated user's XP totals, ranks, and titles.
 */
const handler: Parameters<typeof withRateLimit>[0] = async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user_xp and rank_thresholds in parallel
    const [xpResult, thresholdsResult] = await Promise.all([
      supabase.from("user_xp").select("*").eq("user_id", user.id).single(),
      supabase.from("rank_thresholds").select("*").order("rank"),
    ]);

    const xp = xpResult.data ?? {
      dm_xp: 0,
      dm_rank: 1,
      player_xp: 0,
      player_rank: 1,
    };

    const thresholds = thresholdsResult.data ?? [];

    // Find current titles
    const dmThreshold = thresholds.find(
      (t: { role: string; rank: number }) => t.role === "dm" && t.rank === xp.dm_rank,
    );
    const playerThreshold = thresholds.find(
      (t: { role: string; rank: number }) => t.role === "player" && t.rank === xp.player_rank,
    );

    // Find next rank thresholds
    const dmNext = thresholds.find(
      (t: { role: string; rank: number }) => t.role === "dm" && t.rank === xp.dm_rank + 1,
    );
    const playerNext = thresholds.find(
      (t: { role: string; rank: number }) => t.role === "player" && t.rank === xp.player_rank + 1,
    );

    return NextResponse.json({
      dm_xp: xp.dm_xp,
      dm_rank: xp.dm_rank,
      dm_title_pt: dmThreshold?.title_pt ?? "Aprendiz de Taverna",
      dm_title_en: dmThreshold?.title_en ?? "Tavern Apprentice",
      dm_icon: dmThreshold?.icon ?? "🕯️",
      dm_next_rank_xp: dmNext?.xp_required ?? null,
      player_xp: xp.player_xp,
      player_rank: xp.player_rank,
      player_title_pt: playerThreshold?.title_pt ?? "Aventureiro Novato",
      player_title_en: playerThreshold?.title_en ?? "Novice Adventurer",
      player_icon: playerThreshold?.icon ?? "🗡️",
      player_next_rank_xp: playerNext?.xp_required ?? null,
    });
  } catch {
    return NextResponse.json(
      {
        dm_xp: 0, dm_rank: 1,
        dm_title_pt: "Aprendiz de Taverna", dm_title_en: "Tavern Apprentice", dm_icon: "🕯️",
        dm_next_rank_xp: 100,
        player_xp: 0, player_rank: 1,
        player_title_pt: "Aventureiro Novato", player_title_en: "Novice Adventurer", player_icon: "🗡️",
        player_next_rank_xp: 75,
      },
      { status: 200 },
    );
  }
};

export const GET = withRateLimit(handler, { max: 60, window: "1 m" });
