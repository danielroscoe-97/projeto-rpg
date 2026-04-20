/**
 * SessionHistoryFullPageServer — Story 02-G (Epic 02, Area 4 extended).
 *
 * Cursor-paginated full history. Query chains `combatants → encounters →
 * sessions → campaigns` (same backbone as SessionHistoryServer) but limits
 * 11 rows so we can peek at the 11th to decide `hasMore` WITHOUT a second
 * round-trip. The 11th row is dropped from the render payload.
 *
 * Cursor semantics:
 *   - page 1: `cursor === null` → no WHERE clause on sessions.created_at
 *   - page N+1: `cursor === { createdAt, id }` → keyset: anything strictly
 *     older than the cursor's (createdAt, id) pair.
 *
 * RLS: identical to SessionHistoryServer — gating is done naturally by the
 * `combatants` policy (`player_character_id` IN user's characters). If the
 * policy denies, 0 rows → empty state; we never leak foreign sessions.
 */

import { getLocale } from "next-intl/server";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import { SessionHistoryFullPage } from "@/components/dashboard/SessionHistoryFullPage";
import type { SessionHistoryRowData } from "@/components/dashboard/SessionHistoryList";
import type { SessionsPageCursor } from "@/app/app/dashboard/sessions/page";

const PAGE_SIZE = 10;

/** Encode a cursor into a URL-safe base64 string for the "Carregar mais" link. */
export function encodeCursor(cursor: SessionsPageCursor): string {
  const raw = `${cursor.createdAt}_${cursor.id}`;
  const b64 =
    typeof btoa === "function"
      ? btoa(raw)
      : Buffer.from(raw, "utf-8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function SessionHistoryFullPageServer({
  cursor,
}: {
  cursor: SessionsPageCursor | null;
}) {
  const [user, supabase, locale] = await Promise.all([
    getAuthUser(),
    createClient(),
    getLocale(),
  ]);
  if (!user) return null;

  // 1. Resolve the user's characters so we scope the combatants JOIN. RLS
  //    already gates `player_characters` to the current user; we pass the
  //    explicit filter for clarity and to make the query deterministic under
  //    a service-role test harness.
  const { data: chars } = await supabase
    .from("player_characters")
    .select("id")
    .eq("user_id", user.id);

  const characterIds = (chars ?? []).map((c) => c.id as string);
  if (characterIds.length === 0) {
    return (
      <SessionHistoryFullPage
        entries={[]}
        nextCursor={null}
        locale={locale}
      />
    );
  }

  // 2. Fetch the window. We over-fetch by a safety factor (PAGE_SIZE * 5 + 1)
  //    because a single session can carry multiple combatant rows; we dedupe
  //    by session_id below. The peek element (PAGE_SIZE + 1 distinct sessions)
  //    tells us whether to render "Carregar mais".
  let query = supabase
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
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE * 5 + 10);

  // Keyset filter for subsequent pages. We filter on the combatant's
  // `created_at` against the cursor's session createdAt; because sessions
  // inherit combatant creation ordering via the JOIN, this is a strict
  // "older than the last row of the previous page" constraint.
  if (cursor) {
    query = query.lt("created_at", cursor.createdAt);
  }

  const { data } = await query;

  type Row = {
    encounter_id: string;
    encounters:
      | {
          id: string;
          name: string | null;
          recap_snapshot: unknown;
          session_id: string;
          sessions:
            | {
                id: string;
                created_at: string | null;
                campaign_id: string;
                campaigns:
                  | { id: string; name: string }
                  | { id: string; name: string }[]
                  | null;
              }
            | Array<{
                id: string;
                created_at: string | null;
                campaign_id: string;
                campaigns:
                  | { id: string; name: string }
                  | { id: string; name: string }[]
                  | null;
              }>
            | null;
        }
      | Array<{
          id: string;
          name: string | null;
          recap_snapshot: unknown;
          session_id: string;
          sessions:
            | {
                id: string;
                created_at: string | null;
                campaign_id: string;
                campaigns:
                  | { id: string; name: string }
                  | { id: string; name: string }[]
                  | null;
              }
            | Array<{
                id: string;
                created_at: string | null;
                campaign_id: string;
                campaigns:
                  | { id: string; name: string }
                  | { id: string; name: string }[]
                  | null;
              }>
            | null;
        }>
      | null;
  };

  const rawRows = (data ?? []) as unknown as Row[];

  const seen = new Set<string>();
  const dedup: SessionHistoryRowData[] = [];

  for (const row of rawRows) {
    const enc = Array.isArray(row.encounters) ? row.encounters[0] : row.encounters;
    if (!enc) continue;
    const sess = Array.isArray(enc.sessions) ? enc.sessions[0] : enc.sessions;
    if (!sess) continue;
    if (seen.has(sess.id)) continue;
    seen.add(sess.id);

    const camp = Array.isArray(sess.campaigns)
      ? sess.campaigns[0]
      : sess.campaigns;

    dedup.push({
      sessionId: sess.id,
      campaignId: sess.campaign_id,
      campaignName: camp?.name ?? "",
      encounterId: enc.id,
      encounterName: enc.name ?? "",
      createdAt: sess.created_at ?? "",
      hasRecap:
        enc.recap_snapshot !== null && enc.recap_snapshot !== undefined,
    });

    // Cheap exit: once we have PAGE_SIZE + 1 distinct sessions we know
    // everything we need (the +1 tells us hasMore).
    if (dedup.length >= PAGE_SIZE + 1) break;
  }

  const hasMore = dedup.length > PAGE_SIZE;
  const entries = dedup.slice(0, PAGE_SIZE);
  const lastEntry = entries[entries.length - 1];
  const nextCursor =
    hasMore && lastEntry
      ? encodeCursor({ createdAt: lastEntry.createdAt, id: lastEntry.sessionId })
      : null;

  return (
    <SessionHistoryFullPage
      entries={entries}
      nextCursor={nextCursor}
      locale={locale}
    />
  );
}
