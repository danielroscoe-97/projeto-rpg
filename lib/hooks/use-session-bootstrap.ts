"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSessionDate } from "@/lib/time/session-date";

export interface UseSessionBootstrapResult {
  /** ID of the session note for today, or null if not yet ensured. */
  sessionNoteId: string | null;
  /** True while the RPC round-trip is in flight. */
  ensuring: boolean;
  /**
   * Triggers the server-side create-or-get RPC and returns the note id.
   * Cached in localStorage for the calendar day to avoid duplicate RPCs.
   */
  ensureSession: () => Promise<string | null>;
  /** Last error thrown by ensureSession, if any. */
  error: Error | null;
  /** True iff the most recent ensureSession call created a new note. */
  created: boolean;
}

interface SessionBootstrapRpcResponse {
  ok: boolean;
  code?: string;
  note_id?: string;
  created?: boolean;
  session_date?: string;
}

interface CachedBootstrap {
  note_id: string;
  session_date: string;
}

/**
 * Prefix used by every bootstrap cache entry. Kept narrow so the sweeper
 * in writeCache never touches unrelated localStorage keys.
 */
const CACHE_PREFIX = "pocketdm:session-bootstrap:";

function cacheKey(campaignId: string, today: string): string {
  return `${CACHE_PREFIX}${campaignId}:${today}`;
}

function readCache(campaignId: string, today: string): CachedBootstrap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(campaignId, today));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedBootstrap;
    if (!parsed?.note_id || parsed.session_date !== today) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(campaignId: string, today: string, noteId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      cacheKey(campaignId, today),
      JSON.stringify({ note_id: noteId, session_date: today }),
    );
    // Housekeeping: sweep any entries for this campaign whose date is
    // earlier than `today`. Prevents unbounded key growth over months of
    // use. Only touches this campaign's namespace.
    const keep = cacheKey(campaignId, today);
    const campaignPrefix = `${CACHE_PREFIX}${campaignId}:`;
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (!k || k === keep) continue;
      if (!k.startsWith(campaignPrefix)) continue;
      window.localStorage.removeItem(k);
    }
  } catch {
    // localStorage unavailable / quota — silent fallback: cache is best-effort.
  }
}

/**
 * Daily session note bootstrap hook (Fase C).
 *
 * Behavior:
 *   - On mount, hydrates `sessionNoteId` from localStorage if a cached entry
 *     exists for (campaign, today). No network call.
 *   - `ensureSession()` calls the `create_or_get_session_note` RPC (mig 156)
 *     and caches the resulting note id in localStorage.
 *   - Consumer is expected to trigger `ensureSession` explicitly via a user
 *     action (e.g. "Iniciar sessão de hoje" CTA click). The hook does NOT
 *     auto-call on mount.
 *
 * Cache TTL: keyed by calendar day — yesterday's entry becomes inert
 * automatically because today's key differs.
 */
export function useSessionBootstrap(campaignId: string): UseSessionBootstrapResult {
  // Lazy initializer reads cache synchronously on the first render. On the
  // server `typeof window === "undefined"` short-circuits readCache to null,
  // so SSR output is stable and hydration doesn't diff.
  const [sessionNoteId, setSessionNoteId] = useState<string | null>(() => {
    if (!campaignId) return null;
    return readCache(campaignId, getSessionDate())?.note_id ?? null;
  });
  const [ensuring, setEnsuring] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [created, setCreated] = useState(false);
  // De-dupe concurrent ensureSession calls (double-click on the CTA) so the
  // second caller waits on the same promise instead of racing the RPC.
  const inFlightRef = useRef<Promise<string | null> | null>(null);

  // Re-hydrate on campaignId change (initial mount handled by lazy state).
  useEffect(() => {
    if (!campaignId) {
      setSessionNoteId(null);
      return;
    }
    const cached = readCache(campaignId, getSessionDate());
    setSessionNoteId(cached?.note_id ?? null);
  }, [campaignId]);

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (!campaignId) return null;
    // Coalesce concurrent callers onto the same in-flight promise.
    if (inFlightRef.current) return inFlightRef.current;

    const today = getSessionDate();

    // Fast path: hit cache.
    const cached = readCache(campaignId, today);
    if (cached) {
      setSessionNoteId(cached.note_id);
      setCreated(false);
      setError(null);
      return cached.note_id;
    }

    setEnsuring(true);
    setError(null);

    const task = (async (): Promise<string | null> => {
      try {
        const supabase = createClient();
        const { data, error: rpcError } = await supabase.rpc(
          "create_or_get_session_note",
          {
            p_campaign_id: campaignId,
            p_session_date: today,
          },
        );

        if (rpcError) {
          throw rpcError;
        }

        const payload = data as SessionBootstrapRpcResponse | null;
        if (!payload?.ok || !payload.note_id) {
          const code = payload?.code ?? "unknown";
          throw new Error(`create_or_get_session_note failed: ${code}`);
        }

        writeCache(campaignId, today, payload.note_id);
        setSessionNoteId(payload.note_id);
        setCreated(Boolean(payload.created));
        return payload.note_id;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        return null;
      } finally {
        setEnsuring(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = task;
    return task;
  }, [campaignId]);

  return {
    sessionNoteId,
    ensuring,
    ensureSession,
    error,
    created,
  };
}
