import { createServiceClient } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/utils/streak";

export interface GrantXpResult {
  granted: boolean;
  xp: number;
  newTotal: number;
  newRank: number;
  rankUp?: { from: number; to: number; newTitle: string };
  reason?: string;
}

interface XpAction {
  action_key: string;
  role: string;
  xp_base: number;
  cooldown_max: number | null;
  cooldown_period: string | null;
  is_active: boolean;
}

interface RankThreshold {
  rank: number;
  title_pt: string;
  title_en: string;
}

/**
 * Grant XP to a user for a specific action. Server-side only.
 * Uses service_role client to bypass RLS for INSERT into xp_ledger.
 *
 * @param userId - The authenticated user's ID
 * @param actionKey - The action_key from xp_actions table
 * @param role - 'dm' or 'player'
 * @param metadata - Optional metadata to attach to the ledger entry
 */
export async function grantXp(
  userId: string,
  actionKey: string,
  role: "dm" | "player",
  metadata?: Record<string, unknown>,
): Promise<GrantXpResult> {
  const supabase = createServiceClient();

  // 1. Fetch action config
  const { data: action, error: actionError } = await supabase
    .from("xp_actions")
    .select("action_key, role, xp_base, cooldown_max, cooldown_period, is_active")
    .eq("action_key", actionKey)
    .single<XpAction>();

  if (actionError || !action) {
    return { granted: false, xp: 0, newTotal: 0, newRank: 1, reason: "unknown_action" };
  }

  if (!action.is_active) {
    return { granted: false, xp: 0, newTotal: 0, newRank: 1, reason: "action_disabled" };
  }

  // Validate role matches action config
  if (action.role !== "both" && action.role !== role) {
    return { granted: false, xp: 0, newTotal: 0, newRank: 1, reason: "role_mismatch" };
  }

  // 2. Check cooldown
  if (action.cooldown_max != null && action.cooldown_period != null) {
    const cooldownStart = getCooldownStart(action.cooldown_period);

    const { count, error: countError } = await supabase
      .from("xp_ledger")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action_key", actionKey)
      .gte("created_at", cooldownStart);

    if (countError) {
      console.warn("[xp] Cooldown check failed, denying:", countError.message);
      return { granted: false, xp: 0, newTotal: 0, newRank: 1, reason: "cooldown_error" };
    }

    if ((count ?? 0) >= action.cooldown_max) {
      return { granted: false, xp: 0, newTotal: 0, newRank: 1, reason: "cooldown" };
    }
  }

  // 3. Get current rank BEFORE insert
  const { data: currentXp } = await supabase
    .from("user_xp")
    .select("dm_xp, dm_rank, player_xp, player_rank")
    .eq("user_id", userId)
    .single();

  const prevRank = role === "dm"
    ? (currentXp?.dm_rank ?? 1)
    : (currentXp?.player_rank ?? 1);

  // 4. Calculate XP amount (streak uses multiplier)
  let xpAmount = action.xp_base;
  if (actionKey === "dm_streak_weekly") {
    const streak = await computeStreak(supabase, userId);
    xpAmount = Math.min(action.xp_base * Math.max(streak, 1), action.xp_base * 52);
  }

  // 5. Insert into ledger (trigger updates user_xp)
  const { error: insertError } = await supabase
    .from("xp_ledger")
    .insert({
      user_id: userId,
      action_key: actionKey,
      role,
      xp_amount: xpAmount,
      metadata: metadata ?? {},
    });

  if (insertError) {
    console.error("[xp] Failed to insert xp_ledger:", insertError.message);
    return { granted: false, xp: 0, newTotal: 0, newRank: 1, reason: "insert_error" };
  }

  // 6. Read updated user_xp
  const { data: updatedXp } = await supabase
    .from("user_xp")
    .select("dm_xp, dm_rank, player_xp, player_rank")
    .eq("user_id", userId)
    .single();

  const newTotal = role === "dm"
    ? (updatedXp?.dm_xp ?? xpAmount)
    : (updatedXp?.player_xp ?? xpAmount);
  const newRank = role === "dm"
    ? (updatedXp?.dm_rank ?? 1)
    : (updatedXp?.player_rank ?? 1);

  // 7. Detect rank up
  let rankUp: GrantXpResult["rankUp"];
  if (newRank > prevRank) {
    const { data: rankInfo } = await supabase
      .from("rank_thresholds")
      .select("rank, title_pt, title_en")
      .eq("role", role)
      .eq("rank", newRank)
      .single<RankThreshold>();

    if (rankInfo) {
      rankUp = {
        from: prevRank,
        to: newRank,
        newTitle: rankInfo.title_pt,
      };
    }
  }

  return {
    granted: true,
    xp: xpAmount,
    newTotal,
    newRank,
    rankUp,
  };
}

/**
 * Grant XP without blocking the caller. Fire-and-forget.
 * Logs errors but never throws.
 */
export function grantXpAsync(
  userId: string,
  actionKey: string,
  role: "dm" | "player",
  metadata?: Record<string, unknown>,
): void {
  grantXp(userId, actionKey, role, metadata).catch((err) => {
    console.error("[xp] grantXpAsync failed:", err);
  });
}

function getCooldownStart(period: string): string {
  const now = new Date();
  switch (period) {
    case "day": {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      return d.toISOString();
    }
    case "week": {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      const day = d.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day; // Monday
      d.setUTCDate(d.getUTCDate() + diff);
      return d.toISOString();
    }
    case "month": {
      const d = new Date(now);
      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
      return d.toISOString();
    }
    case "lifetime":
      return "1970-01-01T00:00:00.000Z";
    default:
      return "1970-01-01T00:00:00.000Z";
  }
}
