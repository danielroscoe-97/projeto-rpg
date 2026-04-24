import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sanitizeCombatantsForPlayer } from "@/lib/utils/sanitize-combatants";
import { captureError } from "@/lib/errors/capture";
import { withRateLimit } from "@/lib/rate-limit";
import { coalesce } from "@/lib/cache/request-coalesce";
import { isFeatureFlagEnabled } from "@/lib/flags";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Per-kind TTLs from the 2026-04-24 postmortem (§Causa #2). Combatants are
 * the only genuinely hot path — everything else mutates orders-of-magnitude
 * slower than the 2s polling cadence.
 *
 * TOKEN_TTL_MS: 15s — the canonical trade-off. A DM revoking a token (setting
 * `is_active = false`) loses up to 15s of immediacy. No active revocation
 * flow exists in-code as of this commit; when one is added, call
 * `invalidate("tok:{sessionId}:{userId}")` from `lib/cache/request-coalesce`
 * to bust the cache explicitly.
 */
const TTL = {
  TOKEN_MS: 15_000,
  SESSION_MS: 10_000,
  ENCOUNTER_MS: 5_000,
  TOKEN_OWNER_MS: 60_000,
  LOBBY_TOKENS_MS: 5_000,
} as const;

type SessionTokenRow = { id: string } | null;
type SessionRow = {
  dm_plan: string | null;
  dm_last_seen_at: string | null;
} | null;
type EncounterRow = {
  id: string;
  round_number: number;
  current_turn_index: number;
  is_active: boolean;
} | null;

const handler: Parameters<typeof withRateLimit>[0] = async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id: sessionId } = await params;
  const tokenIdParam = request.nextUrl.searchParams.get("token_id");
  const supabase = await createClient();

  // Verify auth — player must have an active token for this session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  try {
    const serviceClient = createServiceClient();
    const coalesceEnabled = isFeatureFlagEnabled("ff_combat_state_coalesce_v1");

    // ────────────────────────────────────────────────────────────────────
    // Queries 1-3 in parallel. When coalesce is enabled, cache keys scope
    // by (kind, sessionId[, userId|tokenIdParam]) with per-kind TTLs.
    // ────────────────────────────────────────────────────────────────────
    const tokenPromise: Promise<SessionTokenRow> = coalesceEnabled
      ? coalesce(`tok:${sessionId}:${user.id}`, TTL.TOKEN_MS, async () => {
          const { data, error } = await serviceClient
            .from("session_tokens")
            .select("id")
            .eq("session_id", sessionId)
            .eq("anon_user_id", user.id)
            .eq("is_active", true)
            .limit(1)
            .single();
          // Re-throw anything that isn't "zero rows" so callers can capture.
          if (error && error.code !== "PGRST116") throw error;
          return (data ?? null) as SessionTokenRow;
        })
      : (async () => {
          const { data, error } = await serviceClient
            .from("session_tokens")
            .select("id")
            .eq("session_id", sessionId)
            .eq("anon_user_id", user.id)
            .eq("is_active", true)
            .limit(1)
            .single();
          if (error && error.code !== "PGRST116") throw error;
          return (data ?? null) as SessionTokenRow;
        })();

    const sessionPromise: Promise<SessionRow> = coalesceEnabled
      ? coalesce(`ses:${sessionId}`, TTL.SESSION_MS, async () => {
          const { data, error } = await serviceClient
            .from("sessions")
            .select("dm_plan, dm_last_seen_at")
            .eq("id", sessionId)
            .single();
          if (error && error.code !== "PGRST116") throw error;
          return (data ?? null) as SessionRow;
        })
      : (async () => {
          const { data, error } = await serviceClient
            .from("sessions")
            .select("dm_plan, dm_last_seen_at")
            .eq("id", sessionId)
            .single();
          if (error && error.code !== "PGRST116") throw error;
          return (data ?? null) as SessionRow;
        })();

    const encounterPromise: Promise<EncounterRow> = coalesceEnabled
      ? coalesce(`enc:${sessionId}`, TTL.ENCOUNTER_MS, async () => {
          const { data, error } = await serviceClient
            .from("encounters")
            .select("id, round_number, current_turn_index, is_active")
            .eq("session_id", sessionId)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          if (error && error.code !== "PGRST116") throw error;
          return (data ?? null) as EncounterRow;
        })
      : (async () => {
          const { data, error } = await serviceClient
            .from("encounters")
            .select("id, round_number, current_turn_index, is_active")
            .eq("session_id", sessionId)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          if (error && error.code !== "PGRST116") throw error;
          return (data ?? null) as EncounterRow;
        })();

    let tokenRow: SessionTokenRow;
    let sessionRow: SessionRow;
    let encounter: EncounterRow;
    try {
      [tokenRow, sessionRow, encounter] = await Promise.all([
        tokenPromise,
        sessionPromise,
        encounterPromise,
      ]);
    } catch (err) {
      captureError(err, { component: "SessionStateAPI", action: "batchFetch", category: "database" });
      return NextResponse.json({ error: "Failed to fetch session state" }, { status: 500 });
    }

    if (!tokenRow) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // ────────────────────────────────────────────────────────────────────
    // Token owner + combatants in parallel. Combatants are NEVER cached —
    // HP/conditions/is_defeated are the hot path.
    // ────────────────────────────────────────────────────────────────────
    const fetchTokenOwner = async (): Promise<string | null> => {
      if (!tokenIdParam || !UUID_RE.test(tokenIdParam)) return null;
      const { data } = await serviceClient
        .from("session_tokens")
        .select("anon_user_id")
        .eq("id", tokenIdParam)
        .eq("session_id", sessionId)
        .eq("is_active", true)
        .single();
      return data?.anon_user_id ?? null;
    };
    const tokenOwnerPromise: Promise<string | null> =
      coalesceEnabled && tokenIdParam && UUID_RE.test(tokenIdParam)
        ? coalesce(`own:${sessionId}:${tokenIdParam}`, TTL.TOKEN_OWNER_MS, fetchTokenOwner)
        : fetchTokenOwner();

    const combatantsPromise = encounter
      ? serviceClient
          .from("combatants")
          .select(
            "id, name, display_name, current_hp, max_hp, temp_hp, ac, spell_save_dc, initiative_order, conditions, is_defeated, is_player, is_hidden, monster_id, ruleset_version, monster_group_id, group_order, condition_durations, death_saves, session_token_id"
          )
          .eq("encounter_id", encounter.id)
          .order("initiative_order", { ascending: true })
          .order("id", { ascending: true }) // R4: Stable tiebreaker for initiative collisions
          .limit(200)
          .then(({ data }) => data)
      : Promise.resolve(null);

    const [tokenOwner, combatants] = await Promise.all([tokenOwnerPromise, combatantsPromise]);

    if (!encounter) {
      // BT2-04: Include active session tokens so the lobby can show waiting players
      const lobbyTokensPromise = coalesceEnabled
        ? coalesce(`lob:${sessionId}`, TTL.LOBBY_TOKENS_MS, async () => {
            const { data } = await serviceClient
              .from("session_tokens")
              .select("id, player_name")
              .eq("session_id", sessionId)
              .eq("is_active", true)
              .order("created_at", { ascending: true })
              .limit(50);
            return data ?? [];
          })
        : serviceClient
            .from("session_tokens")
            .select("id, player_name")
            .eq("session_id", sessionId)
            .eq("is_active", true)
            .order("created_at", { ascending: true })
            .limit(50)
            .then(({ data }) => data ?? []);
      const tokens = await lobbyTokensPromise;

      return NextResponse.json({
        data: {
          encounter: null,
          combatants: [],
          dm_plan: sessionRow?.dm_plan ?? null,
          dm_last_seen_at: sessionRow?.dm_last_seen_at ?? null,
          token_owner: tokenOwner,
          lobby_players: tokens,
        },
      });
    }

    // Strip sensitive data from monsters — players see only HP status label.
    // Also filter out hidden combatants and apply display_name anti-metagaming.
    const playerCombatants = sanitizeCombatantsForPlayer(combatants ?? []);

    return NextResponse.json({
      data: {
        encounter,
        combatants: playerCombatants,
        dm_plan: sessionRow?.dm_plan ?? null,
        dm_last_seen_at: sessionRow?.dm_last_seen_at ?? null,
        token_owner: tokenOwner,
      },
    });
  } catch (err) {
    captureError(err, { component: "SessionStateAPI", action: "getState", category: "database" });
    return NextResponse.json({ error: "Failed to fetch session state" }, { status: 500 });
  }
};

export const GET = withRateLimit(handler, { max: 60, window: "1 m" });
