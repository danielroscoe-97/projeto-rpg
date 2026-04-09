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
  role: string;
  rank: number;
  xp_required: number;
  title_pt: string;
  title_en: string;
}

// ── In-memory caches (survives across requests in same serverless instance) ──

let actionsCache: Map<string, XpAction> | null = null;
let actionsCacheTs = 0;

let thresholdsCache: RankThreshold[] | null = null;
let thresholdsCacheTs = 0;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getActionConfig(supabase: ReturnType<typeof createServiceClient>, actionKey: string): Promise<XpAction | null> {
  const now = Date.now();
  if (!actionsCache || now - actionsCacheTs > CACHE_TTL_MS) {
    const { data } = await supabase
      .from("xp_actions")
      .select("action_key, role, xp_base, cooldown_max, cooldown_period, is_active");
    actionsCache = new Map((data ?? []).map((a: XpAction) => [a.action_key, a]));
    actionsCacheTs = now;
  }
  return actionsCache.get(actionKey) ?? null;
}

async function getThresholds(supabase: ReturnType<typeof createServiceClient>): Promise<RankThreshold[]> {
  const now = Date.now();
  if (!thresholdsCache || now - thresholdsCacheTs > CACHE_TTL_MS) {
    const { data } = await supabase
      .from("rank_thresholds")
      .select("role, rank, xp_required, title_pt, title_en")
      .order("rank");
    thresholdsCache = (data ?? []) as RankThreshold[];
    thresholdsCacheTs = now;
  }
  return thresholdsCache;
}

/**
 * Grant XP to a user for a specific action. Server-side only.
 * Uses service_role client to bypass RLS for INSERT into xp_ledger.
 *
 * Performance: xp_actions and rank_thresholds are cached in-memory (5min TTL).
 * Hot path (cooldown hit) costs only 1 DB query instead of 3+.
 */
export async function grantXp(
  userId: string,
  actionKey: string,
  role: "dm" | "player",
  metadata?: Record<string, unknown>,
): Promise<GrantXpResult> {
  const supabase = createServiceClient();
  const DENIED: GrantXpResult = { granted: false, xp: 0, newTotal: 0, newRank: 1 };

  // 1. Fetch action config (cached — 0 queries in warm path)
  const action = await getActionConfig(supabase, actionKey);
  if (!action || !action.is_active) {
    return { ...DENIED, reason: action ? "action_disabled" : "unknown_action" };
  }

  if (action.role !== "both" && action.role !== role) {
    return { ...DENIED, reason: "role_mismatch" };
  }

  // 2. Check cooldown (1 query — most calls exit here)
  if (action.cooldown_max != null && action.cooldown_period != null) {
    const cooldownStart = getCooldownStart(action.cooldown_period);

    const { count, error: countError } = await supabase
      .from("xp_ledger")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action_key", actionKey)
      .gte("created_at", cooldownStart);

    if (countError) {
      return { ...DENIED, reason: "cooldown_error" };
    }

    if ((count ?? 0) >= action.cooldown_max) {
      return { ...DENIED, reason: "cooldown" };
    }
  }

  // ── Past this point, XP WILL be granted (2-4 queries) ──

  // 3. Get current rank BEFORE insert (for rank-up detection)
  const { data: currentXp } = await supabase
    .from("user_xp")
    .select("dm_xp, dm_rank, player_xp, player_rank")
    .eq("user_id", userId)
    .single();

  const prevRank = role === "dm"
    ? (currentXp?.dm_rank ?? 1)
    : (currentXp?.player_rank ?? 1);

  // 4. Calculate XP amount
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
    return { ...DENIED, reason: "insert_error" };
  }

  // 6. Read updated user_xp (trigger already ran)
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

  // 7. Detect rank up (cached thresholds — 0 queries)
  let rankUp: GrantXpResult["rankUp"];
  if (newRank > prevRank) {
    const thresholds = await getThresholds(supabase);
    const rankInfo = thresholds.find((t) => t.role === role && t.rank === newRank);
    if (rankInfo) {
      rankUp = { from: prevRank, to: newRank, newTitle: rankInfo.title_pt };
    }
  }

  return { granted: true, xp: xpAmount, newTotal, newRank, rankUp };
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

// ── Cooldown period boundaries ──────────────────────────────────────────────

/** Exported for use by callers that want to pre-check cooldown cheaply. */
export function getCooldownStart(period: string): string {
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
