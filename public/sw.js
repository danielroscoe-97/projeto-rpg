/// <reference lib="webworker" />

// S1.2 (Track B / Finding 2 fix): bump invalidates old PWA caches so players
// on the legacy client get the new `combat:combatant_add_reorder` handler
// before the `ff_combatant_add_reorder` flag is flipped in prod. Mixed-fleet
// without this bump produces silent breakage (new DM → old player sees no add).
// S5.1 (Wave 2B / ff_polymorph_v1): bumped v4 → v5 because the Combatant
// type added an optional `polymorph` object — it piggy-backs on the
// CombatStateBroadcast payload (Combatant is the ABI carrier), which per
// CLAUDE.md is an ABI change that MUST invalidate stale caches before the
// flag flips in prod.
const CACHE_VERSION = "v5";
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const SRD_CACHE = `srd-${CACHE_VERSION}`;
const AUDIO_CACHE = `audio-${CACHE_VERSION}`;
const STATIC_CACHE = `static-${CACHE_VERSION}`;

// App shell files to pre-cache on install (only public/unauthenticated routes)
const APP_SHELL_FILES = [
  "/",
  "/manifest.json",
];

// ── Install ────────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_FILES))
  );
  // Do NOT call skipWaiting() here — let the update banner show so the user
  // can choose when to activate. skipWaiting is triggered via the SKIP_WAITING
  // message handler when the user clicks "Update".
});

// ── Activate — clean up old caches and stale app-shell entries ────────────────

self.addEventListener("activate", (event) => {
  const validCaches = [APP_SHELL_CACHE, SRD_CACHE, AUDIO_CACHE, STATIC_CACHE];
  event.waitUntil(
    Promise.all([
      // Remove obsolete cache buckets
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => !validCaches.includes(key))
            .map((key) => caches.delete(key))
        )
      ),
      // Purge stale HTML from app-shell cache so users get fresh pages
      caches.open(APP_SHELL_CACHE).then((cache) =>
        cache.keys().then((requests) =>
          Promise.all(
            requests
              .filter((req) => {
                const url = new URL(req.url);
                // Delete cached HTML pages (navigation) — they'll be re-fetched network-first
                return !url.pathname.startsWith("/api/") &&
                       !url.pathname.match(/\.(js|css|json)$/);
              })
              .map((req) => cache.delete(req))
          )
        )
      ),
    ])
  );
  // Claim all open tabs immediately
  self.clients.claim();
});

// ── Fetch Strategy Router ───────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip Supabase Realtime WebSocket connections
  if (url.protocol === "wss:" || url.pathname.includes("/realtime/")) return;

  // Skip external analytics / Sentry / Stripe
  if (
    url.hostname.includes("sentry.io") ||
    url.hostname.includes("vercel-scripts") ||
    url.hostname.includes("stripe.com") ||
    url.hostname.includes("va.vercel-scripts.com")
  ) return;

  // Skip Supabase REST/Auth API calls — must always hit the server fresh
  if (url.hostname.includes("supabase")) return;

  // SRD bundles — Cache-First (immutable content)
  if (url.pathname.startsWith("/srd/")) {
    event.respondWith(cacheFirst(event.request, SRD_CACHE));
    return;
  }

  // Audio files — Cache on First Use
  if (url.pathname.startsWith("/sounds/")) {
    event.respondWith(cacheFirst(event.request, AUDIO_CACHE));
    return;
  }

  // Static assets (images, fonts, icons, art) — Cache-First
  if (
    url.pathname.startsWith("/art/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(woff2?|ttf|otf|png|jpg|jpeg|webp|svg|ico)$/)
  ) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Next.js hashed chunks (/_next/static/) — Cache-First
  // These have content hashes in filenames, so cached = correct
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // API calls — Network-First with cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request, APP_SHELL_CACHE));
    return;
  }

  // RSC (React Server Component) requests — Network-First
  // RSC payloads are version-specific: a stale cached RSC from a previous deploy
  // paired with updated JS chunks causes hydration crashes ("Algo Deu Errado")
  if (url.searchParams.has("_rsc") || event.request.headers.get("Rsc")) {
    event.respondWith(networkFirst(event.request, APP_SHELL_CACHE));
    return;
  }

  // Navigation requests (HTML pages) — Network-First
  // Ensures fresh HTML that references correct CSS/JS chunk hashes
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, APP_SHELL_CACHE));
    return;
  }

  // Everything else — Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(event.request, APP_SHELL_CACHE));
});

// ── Cache Strategies ────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline — resource not cached", { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Skip caching private/no-cache responses (e.g. personal vote data)
      const cc = response.headers.get("cache-control") || "";
      if (!cc.includes("private") && !cc.includes("no-cache")) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return HTML for navigation requests, JSON for API calls
    if (request.mode === "navigate") {
      return new Response(
        "<!DOCTYPE html><html><head><meta charset=utf-8><title>Offline</title></head>" +
        "<body style='font-family:system-ui;text-align:center;padding:4rem 1rem;color:#999'>" +
        "<h1>Offline</h1><p>Check your connection and try again.</p></body></html>",
        { status: 503, headers: { "Content-Type": "text/html" } }
      );
    }
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Revalidate in background regardless
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached ?? new Response("Offline", { status: 503 }));

  // Return cached immediately if available, otherwise wait for network
  return cached || fetchPromise;
}

// ── Update notification ────────────────────────────────────────────────────────

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Web Push — Turn Notifications ─────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Pocket DM", body: event.data.text() };
  }

  const title = payload.title ?? "Pocket DM";
  const options = {
    body: payload.body ?? "É a sua vez!",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: `turn-${payload.sessionId ?? "session"}`, // Collapse duplicate turn notifications
    renotify: true,
    requireInteraction: false,
    data: {
      url: payload.url ?? "/app/dashboard",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/app/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If the player tab is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(url.split("?")[0]) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});
