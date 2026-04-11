import { createServiceClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const VALID_LEVELS = new Set(["error", "warning", "info"]);
const VALID_CATEGORIES = new Set([
  "validation", "database", "network", "realtime",
  "auth", "payment", "analytics", "combat", "unknown",
]);
const VALID_SESSION_MODES = new Set(["guest", "anon", "auth"]);
const MAX_PAYLOAD_BYTES = 8192;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Generate a fingerprint from message + component to group duplicate errors */
function generateFingerprint(message: string, component?: string, stack?: string): string {
  const stackFirstLine = stack?.split("\n")[1]?.trim() ?? "";
  const raw = `${message}|${component ?? ""}|${stackFirstLine}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export const POST = withRateLimit(
  async (request: NextRequest) => {
    // Read body as text first for reliable size check (sendBeacon may not set content-length)
    let rawText: string;
    try {
      rawText = await request.text();
    } catch {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    if (rawText.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }

    let body: {
      level?: string;
      message?: string;
      stack?: string;
      component?: string;
      action?: string;
      category?: string;
      url?: string;
      user_id?: string;
      session_mode?: string;
      metadata?: Record<string, unknown>;
    };

    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    if (!body.message) {
      return NextResponse.json({ error: "message_required" }, { status: 400 });
    }

    const level = body.level && VALID_LEVELS.has(body.level) ? body.level : "error";
    const category = body.category && VALID_CATEGORIES.has(body.category) ? body.category : "unknown";
    const sessionMode = body.session_mode && VALID_SESSION_MODES.has(body.session_mode)
      ? body.session_mode
      : null;

    // Validate user_id as UUID to prevent FK and type errors
    const userId = body.user_id && UUID_RE.test(body.user_id) ? body.user_id : null;

    const fingerprint = generateFingerprint(body.message, body.component, body.stack);

    // Limit metadata JSONB size
    let metadata = body.metadata ?? {};
    const metadataStr = JSON.stringify(metadata);
    if (metadataStr.length > 4096) {
      metadata = { _truncated: true, original_size: metadataStr.length };
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from("error_logs").insert({
      level,
      message: body.message.slice(0, 2000),
      stack: body.stack?.slice(0, 10000) ?? null,
      component: body.component?.slice(0, 100) ?? null,
      action: body.action?.slice(0, 100) ?? null,
      category,
      url: body.url?.slice(0, 500) ?? null,
      user_id: userId,
      session_mode: sessionMode,
      fingerprint,
      metadata,
    });

    if (error) {
      // If FK violation on user_id, retry without it — never lose an error log
      if (error.code === "23503" && userId) {
        const { error: retryError } = await supabase.from("error_logs").insert({
          level,
          message: body.message.slice(0, 2000),
          stack: body.stack?.slice(0, 10000) ?? null,
          component: body.component?.slice(0, 100) ?? null,
          action: body.action?.slice(0, 100) ?? null,
          category,
          url: body.url?.slice(0, 500) ?? null,
          user_id: null,
          session_mode: sessionMode,
          fingerprint,
          metadata: { ...metadata, original_user_id: userId },
        });
        if (retryError) {
          console.error("[error-log] retry insert failed:", retryError.message);
          return NextResponse.json({ error: "insert_failed" }, { status: 500 });
        }
        return NextResponse.json({ ok: true });
      }

      console.error("[error-log] insert failed:", error.message);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  },
  { max: 30, window: "1 m", prefix: "error-log" }
);
