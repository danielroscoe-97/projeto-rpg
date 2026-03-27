"use client";

/**
 * Client-side analytics tracking.
 *
 * Uses navigator.sendBeacon (non-blocking) with fetch fallback.
 * Respects Do Not Track. Generates persistent anonymous ID.
 */

// Migration: carry over old anon ID so analytics history is preserved
const LEGACY_ANON_ID_KEY = "taverna_anon_id";
const ANON_ID_KEY = "pocketdm_anon_id";

function migrateAnonId(): void {
  try {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(ANON_ID_KEY)) return;
    const legacy = localStorage.getItem(LEGACY_ANON_ID_KEY);
    if (legacy) {
      localStorage.setItem(ANON_ID_KEY, legacy);
      localStorage.removeItem(LEGACY_ANON_ID_KEY);
    }
  } catch { /* ignore */ }
}

if (typeof window !== "undefined") migrateAnonId();
const TRACK_ENDPOINT = "/api/track";

// Session-scoped fallback when localStorage is unavailable (Safari ITP, iframes)
let _sessionAnonId: string | null = null;

/** Get or create a persistent anonymous ID for this browser */
function getOrCreateAnonId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    // localStorage blocked (Safari ITP, cookies disabled, iframe) — use session-scoped ID
    if (!_sessionAnonId) _sessionAnonId = crypto.randomUUID();
    return _sessionAnonId;
  }
}

/** Check if user has Do Not Track enabled */
function isDntEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.doNotTrack === "1";
}

/**
 * Track a client-side event. Fire-and-forget — never throws.
 *
 * @param name - Event name from the allowed catalog (e.g. "lp:cta_click")
 * @param properties - Event-specific data (no PII!)
 */
export function trackEvent(
  name: string,
  properties?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;
  if (isDntEnabled()) return;

  try {
    const payload = JSON.stringify({
      event_name: name,
      properties,
      page_path: window.location.pathname,
      referrer: document.referrer || undefined,
      anonymous_id: getOrCreateAnonId(),
    });

    // sendBeacon is non-blocking and survives page unload
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      const sent = navigator.sendBeacon(TRACK_ENDPOINT, blob);
      if (!sent) {
        // Fallback if sendBeacon queue is full
        void fetch(TRACK_ENDPOINT, {
          method: "POST",
          body: payload,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        }).catch(() => {});
      }
    } else {
      void fetch(TRACK_ENDPOINT, {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Silent — tracking should never break the app
  }
}

/**
 * React hook for tracking events. Convenience wrapper around trackEvent.
 *
 * Usage:
 * ```tsx
 * const { track } = useTrack()
 * track('lp:cta_click', { cta: 'signup' })
 * ```
 */
export function useTrack() {
  return { track: trackEvent };
}
