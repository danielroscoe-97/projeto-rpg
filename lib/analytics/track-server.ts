import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

// Lazy singleton — avoids crash when env vars aren't set at build time
let _supabaseAdmin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient | null {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.warn("[analytics] SUPABASE_SERVICE_ROLE_KEY or URL not set — skipping tracking");
      return null;
    }
    _supabaseAdmin = createClient(url, key);
  }
  return _supabaseAdmin;
}

/** Rotate daily so IP hashes can't be correlated across days */
function dailySalt(): string {
  return new Date().toISOString().slice(0, 10); // "2026-03-26"
}

/** Hash IP for privacy (LGPD-safe — never stores raw IP) */
function hashIp(ip: string): string {
  return createHash("sha256")
    .update(ip + dailySalt())
    .digest("hex")
    .slice(0, 16);
}

interface TrackOptions {
  userId?: string;
  anonymousId?: string;
  properties?: Record<string, unknown>;
  pagePath?: string;
  referrer?: string;
  req?: Request;
}

/**
 * Server-side event tracking — fire-and-forget.
 * Does NOT block the response. Errors are silently caught.
 */
export function trackServerEvent(name: string, opts: TrackOptions = {}) {
  const admin = getAdmin();
  if (!admin) return;

  const ipRaw = opts.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  void admin
    .from("analytics_events")
    .insert({
      event_name: name,
      user_id: opts.userId ?? null,
      anonymous_id: opts.anonymousId ?? null,
      properties: opts.properties ?? {},
      page_path: opts.pagePath ?? null,
      referrer: opts.referrer ?? null,
      ip_hash: ipRaw ? hashIp(ipRaw) : null,
      user_agent: opts.req?.headers.get("user-agent") ?? null,
    })
    .then(({ error }) => {
      if (error) console.error("[analytics] insert failed:", error.message);
    });
}
