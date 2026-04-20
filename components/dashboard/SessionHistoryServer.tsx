/**
 * SessionHistoryServer — Story 02-F full (Epic 02, Area 4, Section 4).
 *
 * Async server component. Pulls the last 10 session/encounter pairings for
 * the authenticated player by chaining `player_characters → combatants →
 * encounters → sessions → campaigns`.
 *
 * WINSTON M4 NOTE — RLS VALIDATION:
 *   This query relies on RLS policies on `sessions` (and `combatants`) to
 *   scope results correctly. A player sees a session only when they have a
 *   combatant linked to one of the session's encounters via their own
 *   `player_characters` row. If a policy is missing or more restrictive than
 *   we expect, this query simply returns 0 rows — which renders as the
 *   "you haven't played any sessions yet" empty state. That is the CORRECT
 *   fallback: we never surface sessions the player isn't a member of.
 *
 *   The JOIN is written from `combatants` upward so RLS on `combatants`
 *   (which filters by the player's own character via `player_character_id`)
 *   does the gating naturally.
 */

import { getLocale } from "next-intl/server";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import {
  SessionHistoryList,
  type SessionHistoryRowData,
} from "@/components/dashboard/SessionHistoryList";

export async function SessionHistoryServer() {
  const [user, supabase, locale] = await Promise.all([
    getAuthUser(),
    createClient(),
    getLocale(),
  ]);
  if (!user) return null;

  // 1. Resolve the user's characters. RLS scopes `player_characters` to
  //    `user_id = auth.uid()` already, but we pass it explicitly for clarity.
  const { data: chars } = await supabase
    .from("player_characters")
    .select("id")
    .eq("user_id", user.id);

  const characterIds = (chars ?? []).map((c) => c.id as string);
  if (characterIds.length === 0) {
    return <SessionHistoryList rows={[]} locale={locale} />;
  }

  // 2. Chain combatants → encounters → sessions → campaigns. We over-fetch
  //    (limit 50) and dedupe session IDs client-side so we reliably get the
  //    LAST 10 distinct sessions even when the player has multiple
  //    combatants per encounter.
  //
  // WINSTON M7 NOTE — ordering:
  //   We MUST order by `sessions.created_at`, NOT `combatants.created_at`.
  //   A combatant can be created long after the session it belongs to
  //   (e.g. mid-combat monster adds), so combatant-order would surface
  //   RECENT-COMBATANT sessions instead of RECENT sessions. Using
  //   foreignTable: "encounters.sessions" pushes the ORDER BY through the
  //   nested join so the server returns rows sorted by the canonical
  //   session timestamp.
  const { data } = await supabase
    .from("combatants")
    .select(
      `
      encounter_id,
      encounters!inner (
        id,
        name,
        recap_snapshot,
        session_id,
        sessions!inner (
          id,
          created_at,
          campaign_id,
          campaigns!inner ( id, name )
        )
      )
    `,
    )
    .in("player_character_id", characterIds)
    .order("created_at", {
      ascending: false,
      foreignTable: "encounters.sessions",
    })
    .limit(50);

  type Row = {
    encounter_id: string;
    encounters: {
      id: string;
      name: string | null;
      recap_snapshot: unknown;
      session_id: string;
      sessions: {
        id: string;
        created_at: string | null;
        campaign_id: string;
        campaigns: { id: string; name: string } | { id: string; name: string }[] | null;
      } | Array<{
        id: string;
        created_at: string | null;
        campaign_id: string;
        campaigns: { id: string; name: string } | { id: string; name: string }[] | null;
      }> | null;
    } | Array<{
      id: string;
      name: string | null;
      recap_snapshot: unknown;
      session_id: string;
      sessions: {
        id: string;
        created_at: string | null;
        campaign_id: string;
        campaigns: { id: string; name: string } | { id: string; name: string }[] | null;
      } | Array<{
        id: string;
        created_at: string | null;
        campaign_id: string;
        campaigns: { id: string; name: string } | { id: string; name: string }[] | null;
      }> | null;
    }> | null;
  };

  const rawRows = (data ?? []) as unknown as Row[];

  const seenSessions = new Set<string>();
  const rows: SessionHistoryRowData[] = [];

  for (const row of rawRows) {
    const enc = Array.isArray(row.encounters) ? row.encounters[0] : row.encounters;
    if (!enc) continue;

    const sess = Array.isArray(enc.sessions) ? enc.sessions[0] : enc.sessions;
    if (!sess) continue;

    // Dedupe by session id — a player often has multiple encounters per
    // session, but the dashboard row represents the session, not each
    // encounter. Keep the most recent encounter (ordered DESC above).
    if (seenSessions.has(sess.id)) continue;
    seenSessions.add(sess.id);

    const camp = Array.isArray(sess.campaigns)
      ? sess.campaigns[0]
      : sess.campaigns;

    rows.push({
      sessionId: sess.id,
      campaignId: sess.campaign_id,
      campaignName: camp?.name ?? "",
      encounterId: enc.id,
      encounterName: enc.name ?? "",
      createdAt: sess.created_at ?? "",
      hasRecap: enc.recap_snapshot !== null && enc.recap_snapshot !== undefined,
    });

    if (rows.length >= 10) break;
  }

  return <SessionHistoryList rows={rows} locale={locale} />;
}
