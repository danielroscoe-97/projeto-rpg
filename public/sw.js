/// <reference lib="webworker" />

const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const SRD_CACHE = `srd-${CACHE_VERSION}`;
const AUDIO_CACHE = `audio-${CACHE_VERSION}`;
const STATIC_CACHE = `static-${CACHE_VERSION}`;

// App shell files to pre-cache on install
const APP_SHELL_FILES = [
  "/",
  "/app/dashboard",
  "/manifest.json",
];

// ── Install ────────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_FILES))
  );
  // Activate immediately, don't wait for existing tabs to close
  self.skipWaiting();
});

// ── Activate — clean up old caches ─────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  const validCaches = [APP_SHELL_CACHE, SRD_CACHE, AUDIO_CACHE, STATIC_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => caches.delete(key))
      )
    )
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

  // API calls — Network-First with cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request, APP_SHELL_CACHE));
    return;
  }

  // App shell (HTML, JS, CSS) — Stale-While-Revalidate
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
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
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
    .catch(() => cached);

  // Return cached immediately if available, otherwise wait for network
  return cached || fetchPromise;
}

// ── Update notification ────────────────────────────────────────────────────────

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
