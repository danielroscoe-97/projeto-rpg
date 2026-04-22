import { createBrowserClient } from "@supabase/ssr";

/** BUG-004: True singleton — every call returns the SAME instance.
 *  Multiple instances cause lock contention on the auth storage,
 *  leading to "AbortError: The operation was aborted" (navigator.locks). */
let singleton: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!singleton) {
    singleton = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        realtime: {
          params: {
            // Raise the send-side rate limit. The default 10 events/s is a
            // throttle on outgoing `channel.send()` calls — it does NOT affect
            // subscribe/phx_join. Real combat bursts exceed 10/s easily when
            // turn_advance + state_sync + rapid HP updates + presence
            // heartbeats align, which pushes realtime-js to fall back to the
            // REST broadcast endpoint and log
            // "Realtime send() is automatically falling back to REST API".
            // Raising to 60 keeps sends on the WS path where ordering is
            // preserved. Does not fix subscribe TIMED_OUT (different code
            // path) — for that see `broadcast.ts:createAndSubscribe` retry.
            eventsPerSecond: 60,
          },
        },
      },
    );
  }
  return singleton;
}
