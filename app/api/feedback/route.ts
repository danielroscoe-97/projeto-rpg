import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";

const FeedbackBodySchema = z.object({
  token: z.string().min(4).max(128),
  encounter_id: z.string().uuid(),
  vote: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  voter_fingerprint: z.string().uuid(),
  notes: z.string().max(280).optional(),
});

/**
 * Strip HTML tags and collapse whitespace. The notes field is user-submitted
 * plain text that we display only to the DM in aggregate views — we never
 * render it as HTML, but defence-in-depth stripping protects against
 * accidental interpolation downstream (exports, emails, etc.).
 */
function sanitizeNotes(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

const handlePost: Parameters<typeof withRateLimit>[0] = async function handlePost(req) {
  let parsed: z.infer<typeof FeedbackBodySchema>;
  try {
    const raw = await req.json();
    parsed = FeedbackBodySchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_body", detail: err instanceof Error ? err.message : "bad request" },
      { status: 400 },
    );
  }

  // Service client: the RPC is SECURITY DEFINER and validates the token itself.
  // Using service client ensures we can call the RPC regardless of auth state.
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("cast_late_vote_via_token", {
    p_token: parsed.token,
    p_encounter_id: parsed.encounter_id,
    p_vote: parsed.vote,
    p_voter_fingerprint: parsed.voter_fingerprint,
  });

  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("invalid or inactive")) {
      return NextResponse.json({ error: "invalid_token" }, { status: 404 });
    }
    if (msg.includes("does not belong")) {
      return NextResponse.json({ error: "encounter_mismatch" }, { status: 403 });
    }
    if (msg.includes("vote must be")) {
      return NextResponse.json({ error: "invalid_vote" }, { status: 400 });
    }
    if (msg.includes("voter_fingerprint required")) {
      return NextResponse.json({ error: "invalid_fingerprint" }, { status: 400 });
    }
    if (msg.includes("rate limit exceeded")) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    console.warn("[api/feedback] RPC error", { code: error.code, hint: error.hint });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Best-effort notes persistence — never fail the vote if this fails.
  if (parsed.notes && parsed.notes.trim().length > 0) {
    const clean = sanitizeNotes(parsed.notes);
    if (clean.length > 0) {
      try {
        // Resolve the session_token_id once so we can store it alongside the note.
        const { data: tokenRow } = await supabase
          .from("session_tokens")
          .select("id")
          .eq("token", parsed.token)
          .eq("is_active", true)
          .maybeSingle();

        await supabase.from("encounter_feedback_notes").insert({
          encounter_id: parsed.encounter_id,
          session_token_id: tokenRow?.id ?? null,
          voter_fingerprint: parsed.voter_fingerprint,
          notes: clean,
        });
      } catch (err) {
        console.warn("[api/feedback] notes insert failed (best-effort)", err);
      }
    }
  }

  // Shape: { avg, count }
  const result = (data ?? {}) as { avg?: number; count?: number };

  return NextResponse.json({
    ok: true,
    avg: result.avg ?? null,
    count: result.count ?? null,
  });
};

/**
 * Rate limit 10 requests / 1 min per TOKEN. We key on the body's token field
 * (not the client IP) because a DM typically shares ONE link with N players
 * on the same home NAT — IP-based limiting would starve a 6-player group
 * off their first vote each. Falls back to IP if the body lacks a token
 * (malformed request will 400 anyway downstream).
 */
export const POST = withRateLimit(handlePost, {
  max: 10,
  window: "1 m",
  prefix: "feedback",
  identifier: async (request) => {
    try {
      // Clone so the downstream handler can still call req.json().
      const cloned = request.clone();
      const body = (await cloned.json()) as { token?: unknown };
      if (typeof body?.token === "string" && body.token.length >= 4) {
        return `token:${body.token}`;
      }
    } catch {
      // fall through
    }
    return null;
  },
});
