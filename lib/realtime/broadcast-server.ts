import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics/track";
import type { RealtimeEvent } from "@/lib/types/realtime";

/**
 * Broadcast via server-side API route.
 * The server sanitizes and rebroadcasts to the player channel.
 * Returns true if successful, false if the server is unreachable (triggers fallback).
 *
 * Beta 4 fix C1: on HTTP 401 the module triggers a silent `refreshSession()`
 * (single-flight across concurrent broadcasts) and retries the request once.
 * Mirrors the pattern validated in `lib/realtime/fetch-orchestrator.ts:212-217`.
 */

type UnauthorizedHandler = () => Promise<boolean>;

// Default: refresh the browser Supabase session. Why not inline into the 401
// branch? Tests need to substitute a deterministic handler without stubbing
// the whole supabase-js surface.
const defaultUnauthorizedHandler: UnauthorizedHandler = async () => {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.refreshSession();
    return !error;
  } catch {
    return false;
  }
};

let unauthorizedHandler: UnauthorizedHandler = defaultUnauthorizedHandler;
// Single-flight: concurrent 401s from simultaneous broadcasts must share ONE refresh.
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Override the 401 recovery hook. Safe to call repeatedly (last-wins) —
 * used by tests to inject a deterministic handler.
 */
export function setBroadcastUnauthorizedHandler(
  handler: UnauthorizedHandler | null,
): void {
  unauthorizedHandler = handler ?? defaultUnauthorizedHandler;
}

async function runRefreshSingleFlight(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      return await unauthorizedHandler();
    } catch {
      return false;
    } finally {
      // Reset after resolution so the next 401 triggers a fresh attempt.
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function sendBroadcast(
  sessionId: string,
  event: RealtimeEvent,
  accessToken: string,
): Promise<Response> {
  return fetch("/api/broadcast", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId, event }),
  });
}

export async function broadcastViaServer(
  sessionId: string,
  event: RealtimeEvent,
): Promise<boolean> {
  try {
    const supabase = createClient();
    const firstSession = await supabase.auth.getSession();
    const accessToken = firstSession.data.session?.access_token;

    if (!accessToken) {
      return false; // No auth — fall back to client-side
    }

    let res = await sendBroadcast(sessionId, event, accessToken);

    if (res.status === 401) {
      const refreshed = await runRefreshSingleFlight();
      if (!refreshed) {
        trackEvent("auth:silent_refresh_failed", {
          actor: "dm",
          reason: "refresh_token_expired",
        });
        trackEvent("broadcast:401_retry_failed", {
          event_type: event.type,
          session_id: sessionId,
          reason: "refresh_failed",
        });
        return false;
      }

      trackEvent("auth:silent_refresh_success", {
        actor: "dm",
        trigger: "401_intercept",
      });

      const retrySession = await supabase.auth.getSession();
      const retryToken = retrySession.data.session?.access_token;
      if (!retryToken) {
        trackEvent("broadcast:401_retry_failed", {
          event_type: event.type,
          session_id: sessionId,
          reason: "no_token_post_refresh",
        });
        return false;
      }

      res = await sendBroadcast(sessionId, event, retryToken);
      if (res.ok) {
        trackEvent("broadcast:401_retry_success", {
          event_type: event.type,
          session_id: sessionId,
        });
        return true;
      }
      trackEvent("broadcast:401_retry_failed", {
        event_type: event.type,
        session_id: sessionId,
        reason: `status_${res.status}`,
      });
      return false;
    }

    if (res.status === 429) {
      console.warn("[broadcast-server] Rate limited");
      return false;
    }

    // B01 (beta test 3): /api/broadcast returns 404 when the session has been
    // deleted/ended but a straggler broadcast is still in flight. That's an
    // expected race — the DM client silences the fire-and-forget failure and
    // falls back to the client-direct path (see broadcast.ts). Treat 404 as a
    // benign "session gone" signal instead of a network error.
    if (res.status === 404) {
      return false;
    }

    return res.ok;
  } catch {
    // Network error — fall back to client-side
    return false;
  }
}
