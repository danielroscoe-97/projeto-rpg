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
  notes: z.string().max(280).optional(),
});

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
    console.warn("[api/feedback] RPC error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Shape: { avg, count }
  const result = (data ?? {}) as { avg?: number; count?: number };

  return NextResponse.json({
    ok: true,
    avg: result.avg ?? null,
    count: result.count ?? null,
  });
};

// Rate limit: 10 requests / 1 min per IP per route.
// Token-scoped limiting is achieved by combining with the route path prefix.
export const POST = withRateLimit(handlePost, {
  max: 10,
  window: "1 m",
  prefix: "feedback",
});
