/**
 * /app/dashboard/sessions — Story 02-G (Epic 02, Area 4 extended).
 *
 * Cursor-paginated full session history for the authenticated player. The
 * dashboard itself shows the last 10 via <SessionHistoryServer>; this page
 * extends that with "Carregar mais" links that thread a cursor through the
 * URL so pagination is fully server-driven (no client state, no JS required).
 *
 * Cursor format: `<createdAt_ISO>_<sessionId>` base64url-encoded. A composite
 * (createdAt, id) cursor is STABLE against sessions created in the same
 * millisecond and matches the canonical sort `ORDER BY created_at DESC, id DESC`.
 */

export const dynamic = "force-dynamic";

import { Suspense } from "react";

import { SessionHistoryFullPageServer } from "@/components/dashboard/SessionHistoryFullPageServer";
import { SessionHistoryFullPageSkeleton } from "@/components/dashboard/SessionHistoryFullPageSkeleton";

export interface SessionsPageCursor {
  createdAt: string;
  id: string;
}

/**
 * Parse the `?cursor=` searchParam back into a structured cursor.
 * Returns `null` when the param is missing or malformed — the page then
 * renders the first page of results.
 */
export function parseCursorParam(raw: string | undefined): SessionsPageCursor | null {
  if (!raw) return null;
  try {
    // Node 18+ supports `Buffer.from(base64url)` natively via atob with
    // url-safe char swap. Keep pure-JS path so the helper stays testable.
    const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf-8");
    const sep = decoded.lastIndexOf("_");
    if (sep <= 0 || sep === decoded.length - 1) return null;
    const createdAt = decoded.slice(0, sep);
    const id = decoded.slice(sep + 1);
    if (!createdAt || !id) return null;
    // Basic ISO shape check — `new Date()` on junk returns Invalid Date.
    if (Number.isNaN(new Date(createdAt).getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ cursor?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const cursor = parseCursorParam(params.cursor);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Suspense fallback={<SessionHistoryFullPageSkeleton />}>
        <SessionHistoryFullPageServer cursor={cursor} />
      </Suspense>
    </div>
  );
}
