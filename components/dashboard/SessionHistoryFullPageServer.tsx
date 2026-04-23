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
import type { SessionsPageCursor } from "@/app/app/(with-sidebar)/dashboard/sessions/page";

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

  // 2. Fetch the window. We over-fetch by a safety factor (PAGE_SIZE * 5 + 10)
  //    because a single session can carry multiple combatant rows; we dedupe
  //    by session_id below. The peek element (PAGE_SIZE + 1 distinct sessions)
  //    tells us whether to render "Carregar mais".
  //
  // WINSTON M7+M9+M10 NOTE — ordering + cursor:
  //   Strategy: start the query from `sessions` (not `combatants`) so the
  //   ORDER BY and keyset filter apply to `sessions.created_at` + `sessions.id`
  //   directly, without the PostgREST foreignTable song-and-dance. The
  //   membership filter is expressed as an `.in("id", eligibleSessionIds)`
  //   against a pre-computed list fetched from `combatants`. This:
  //     * Fixes M7 — ordering is by session timestamp (canonical), not by
  //       combatant timestamp (which can drift if combatants are added late).
  //     * Fixes M9 — keyset filter uses sessions.(created_at, id) with a
  //       proper tiebreaker via `.or(...)` so pages don't skip/repeat rows
  //       when two sessions share a created_at.
  //     * Fixes M10 — cursor encodes sessions.id, which matches what the
  //       outer page's `encodeCursor` emits and `parseCursorParam` decodes.
  const { data: combatantRows } = await supabase
    .from("combatants")
    .select("encounters!inner ( session_id )")
    .in("player_character_id", characterIds);

  type CombatantSessionLink = {
    encounters:
      | { session_id: string }
      | { session_id: string }[]
      | null;
  };

  const eligibleSessionIds = new Set<string>();
  for (const row of (combatantRows ?? []) as CombatantSessionLink[]) {
    const enc = Array.isArray(row.encounters) ? row.encounters[0] : row.encounters;
    if (enc?.session_id) eligibleSessionIds.add(enc.session_id);
  }

  if (eligibleSessionIds.size === 0) {
    return (
      <SessionHistoryFullPage
        entries={[]}
        nextCursor={null}
        locale={locale}
      />
    );
  }

  // Query sessions directly so ORDER BY + keyset apply to real session columns.
  let query = supabase
    .from("sessions")
    .select(
      `
      id,
      created_at,
      campaign_id,
      campaigns!inner ( id, name ),
      encounters!inner (
        id,
        name,
        recap_snapshot,
        created_at
      )
    `,
    )
    .in("id", Array.from(eligibleSessionIds))
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);

  // Keyset filter for subsequent pages: strict "older than cursor" with a
  // tiebreaker on id. The PostgREST `.or()` syntax translates to:
  //   (created_at < X) OR (created_at = X AND id < Y)
  if (cursor) {
    const createdAtIso = cursor.createdAt;
    const cursorId = cursor.id;
    query = query.or(
      `created_at.lt.${createdAtIso},and(created_at.eq.${createdAtIso},id.lt.${cursorId})`,
    );
  }

  const { data } = await query;

  type SessionRow = {
    id: string;
    created_at: string | null;
    campaign_id: string;
    campaigns:
      | { id: string; name: string }
      | { id: string; name: string }[]
      | null;
    encounters:
      | {
          id: string;
          name: string | null;
          recap_snapshot: unknown;
          created_at: string | null;
        }
      | Array<{
          id: string;
          name: string | null;
          recap_snapshot: unknown;
          created_at: string | null;
        }>
      | null;
  };

  const rawRows = (data ?? []) as unknown as SessionRow[];

  const dedup: SessionHistoryRowData[] = [];

  for (const sess of rawRows) {
    const camp = Array.isArray(sess.campaigns)
      ? sess.campaigns[0]
      : sess.campaigns;

    // Pick the most-recent encounter for display (encounters are not sorted
    // by PostgREST unless asked; we sort client-side by their own created_at).
    const encArr = Array.isArray(sess.encounters)
      ? sess.encounters
      : sess.encounters
        ? [sess.encounters]
        : [];
    if (encArr.length === 0) continue;

    const enc =
      encArr
        .slice()
        .sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        })[0] ?? null;
    if (!enc) continue;

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
    // everything we need (the +1 tells us hasMore). Sessions are already
    // distinct because the source query was keyed on sessions.id.
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
