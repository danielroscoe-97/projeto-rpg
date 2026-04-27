import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sanitizePayloadServer, validateEventData } from "@/lib/realtime/sanitize";
import { recordEvent } from "@/lib/realtime/event-journal";
import type { RealtimeEvent } from "@/lib/types/realtime";
import type { Combatant } from "@/lib/types/combat";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { captureError } from "@/lib/errors/capture";

/**
 * Server-side broadcast endpoint.
 * DM sends events here instead of broadcasting directly to the Supabase channel.
 * The server sanitizes the payload and broadcasts to the player channel.
 *
 * POST /api/broadcast
 * Body: { sessionId: string, event: RealtimeEvent, skipRebroadcast?: boolean }
 * Auth: Bearer token (Supabase JWT)
 *
 * `skipRebroadcast` (N2 fix, 2026-04-26): when true, the server records the
 * event in the journal but does NOT emit it on the player channel. Used by
 * `broadcast.ts` for events that take the client-direct broadcast path
 * exclusively (combatant_add_reorder — where dual-broadcast caused FIFO
 * race) but still need journal coverage for resume on reconnect. Without
 * this flag, those events were absent from `combat_events` and a player
 * who dropped during a monster-add would always fall back to /state
 * refetch.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, event, skipRebroadcast } = body as {
      sessionId: string;
      event: RealtimeEvent;
      skipRebroadcast?: boolean;
    };

    if (!sessionId || !event) {
      return NextResponse.json(
        { error: "sessionId and event are required" },
        { status: 400 }
      );
    }

    // 1. Validate auth — verify DM is the session owner
    const supabaseAuth = await createServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "X-Auth-Reason": "token_expired" } },
      );
    }

    // Check session ownership
    const { data: session, error: sessionError } = await supabaseAuth
      .from("sessions")
      .select("owner_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.owner_id !== user.id) {
      return NextResponse.json({ error: "Not the session owner" }, { status: 403 });
    }

    // 2. Rate limiting — max 60 events/min per session
    const { limited } = await checkRateLimit(`broadcast:${sessionId}`, 60, "1 m");
    if (limited) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    // 3. Validate event data
    const validationError = validateEventData(event);
    if (validationError) {
      return NextResponse.json(
        { error: `Invalid event: ${validationError.field} — ${validationError.message}` },
        { status: 422 }
      );
    }

    // 4. Fetch combatants ONLY for events that need hidden-combatant context.
    // Events like audio, weather, chat, state_sync (carries own data) skip the DB entirely.
    const NEEDS_COMBATANT_CONTEXT = new Set([
      "combat:turn_advance",
      "combat:hp_update",
      "combat:condition_change",
      "combat:defeated_change",
      "combat:stats_update",
      "combat:player_notes_update",
      "combat:version_switch",
      "combat:reaction_toggle",
    ]);

    let combatants: Combatant[] = [];
    if (NEEDS_COMBATANT_CONTEXT.has(event.type)) {
      const { data: encounter } = await supabaseAuth
        .from("encounters")
        .select("id")
        .eq("session_id", sessionId)
        .eq("is_active", true)
        .single();

      if (encounter) {
        // Minimal columns: only what the sanitizer needs for hidden checks + turn adjustment
        const { data: rawCombatants } = await supabaseAuth
          .from("combatants")
          .select("id, name, is_hidden, is_player, current_hp, max_hp, temp_hp, ac, spell_save_dc, conditions, initiative_order, is_defeated, display_name, condition_durations")
          .eq("encounter_id", encounter.id)
          .order("initiative_order", { ascending: true })
          .limit(200);

        combatants = (rawCombatants ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          is_hidden: r.is_hidden ?? false,
          is_player: r.is_player ?? false,
          current_hp: r.current_hp,
          max_hp: r.max_hp,
          temp_hp: r.temp_hp ?? 0,
          ac: r.ac,
          spell_save_dc: r.spell_save_dc ?? null,
          conditions: r.conditions ?? [],
          initiative: null,
          initiative_order: r.initiative_order ?? null,
          is_defeated: r.is_defeated ?? false,
          monster_id: null,
          token_url: null,
          creature_type: null,
          ruleset_version: null,
          display_name: r.display_name ?? null,
          monster_group_id: null,
          group_order: null,
          dm_notes: "",
          player_notes: "",
          player_character_id: null,
          combatant_role: null,
          condition_durations: (r.condition_durations as Record<string, number> | null) ?? {},
          death_saves: undefined,
          legendary_actions_total: null,
          legendary_actions_used: 0,
          reaction_used: false,
        }));
      }
    }

    // 5. Sanitize payload (server-side — the anti-metagaming gate)
    const safeEvent = sanitizePayloadServer(event, combatants);
    if (!safeEvent) {
      // Event suppressed (e.g. hidden combatant) — not an error
      return NextResponse.json({ ok: true, suppressed: true });
    }

    // 5b. CR-02 journal: record the sanitized event in `combat_events`
    // BEFORE broadcasting, so a late-reconnecting player can resume even
    // if the broadcast itself fails. Failure to journal is non-fatal —
    // the broadcast still goes out (resume just won't have this event).
    const journalSeq = await recordEvent(sessionId, safeEvent);

    // The broadcast payload carries `_journal_seq` so connected players
    // track the cursor in real-time. Players reconnecting later use the
    // last `_journal_seq` they observed as the `since_seq` query param.
    const broadcastPayload =
      journalSeq != null
        ? { ...safeEvent, _journal_seq: journalSeq }
        : safeEvent;

    // 6. Broadcast to player channel via service-role Supabase client.
    // N2 fix: when skipRebroadcast=true, journal already recorded above; no
    // need to emit on the channel (the caller has already done so client-
    // direct, and a server emit would create the dual-broadcast FIFO race).
    if (!skipRebroadcast) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const channel = supabaseAdmin.channel(`session:${sessionId}`);
      await new Promise<void>((resolve, reject) => {
        // Hard timeout — don't let channel subscribe hang the function
        const timeout = setTimeout(() => {
          reject(new Error("Channel subscribe timeout (5s)"));
        }, 5000);

        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channel
              .send({
                type: "broadcast",
                event: safeEvent.type,
                payload: broadcastPayload,
              })
              .then(() => { clearTimeout(timeout); resolve(); })
              .catch((err) => { clearTimeout(timeout); reject(err); });
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            clearTimeout(timeout);
            reject(new Error(`Channel ${status}`));
          }
        });
      });

      // Cleanup — remove channel to free resources
      supabaseAdmin.removeChannel(channel);
    }

    return NextResponse.json({ ok: true, journal_seq: journalSeq, skipped_rebroadcast: !!skipRebroadcast });
  } catch (err) {
    captureError(err, { component: "BroadcastAPI", action: "broadcast", category: "network" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
