import { createClient } from "@/lib/supabase/server";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/** Allowlist of valid event names — rejects unknown events */
const ALLOWED_EVENTS = new Set([
  // Navigation
  "page:view",
  "page:scroll_depth",
  // Landing page
  "lp:section_view",
  "lp:cta_click",
  // Auth
  "auth:signup_start",
  "auth:login",
  // Combat
  "combat:session_created",
  "combat:encounter_created",
  "combat:started",
  "combat:turn_advanced",
  "combat:ended",
  "combat:hp_changed",
  "combat:condition_toggled",
  // Oracle
  "oracle:search",
  "oracle:result_click",
  // Presets
  "preset:created",
  "preset:loaded",
  // Share
  "share:link_generated",
  "share:link_copied",
  // Player
  "player:joined",
  "player:spell_searched",
  // Compendium
  "compendium:visited",
  // Settings
  "settings:language_changed",
  // Conversion (future-ready)
  "upsell:shown",
  "upsell:clicked",
  "upsell:dismissed",
  "pricing:visited",
  "checkout:started",
  "checkout:completed",
  "checkout:canceled",
  "subscription:canceled",
  // Guest conversion funnel
  "guest:session_expired",
  "guest:expired_cta_signup",
  "guest:expired_cta_reset",
  "guest:combat_imported",
]);

// In-process rate limiter: 60 events/min per IP
// Lazy cleanup on access — no setInterval (serverless-safe)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
const MAX_RATE_LIMIT_ENTRIES = 10_000; // prevent unbounded growth

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    // Lazy cleanup: prune expired entries when map grows too large
    if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
      for (const [key, val] of rateLimitMap) {
        if (now > val.resetAt) rateLimitMap.delete(key);
      }
    }
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Max payload size: 4KB (prevents abuse via huge JSONB properties)
const MAX_PAYLOAD_BYTES = 4096;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // Payload size guard
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let body: {
    event_name?: string;
    properties?: Record<string, unknown>;
    page_path?: string;
    referrer?: string;
    anonymous_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.event_name || !ALLOWED_EVENTS.has(body.event_name)) {
    return NextResponse.json({ error: "unknown_event" }, { status: 400 });
  }

  // Only resolve user_id if auth cookies are present (avoids unnecessary Supabase call)
  let userId: string | undefined;
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore.getAll().some((c) => c.name.includes("auth-token"));
  if (hasAuthCookie) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id;
    } catch {
      // Not authenticated — OK, track as anonymous
    }
  }

  trackServerEvent(body.event_name, {
    userId,
    anonymousId: body.anonymous_id,
    properties: body.properties,
    pagePath: body.page_path,
    referrer: body.referrer,
    req,
  });

  return NextResponse.json({ ok: true });
}
