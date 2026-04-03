import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { CURRENT_AGREEMENT_VERSION } from "@/lib/constants/content";

const handler: Parameters<typeof withRateLimit>[0] = async function (
  request: NextRequest
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const version =
    typeof body.agreement_version === "number"
      ? body.agreement_version
      : CURRENT_AGREEMENT_VERSION;

  // Capture server-side metadata for digital signature
  const headersList = request.headers;
  const ipAddress =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    null;
  const userAgent = headersList.get("user-agent") ?? null;

  const { data, error } = await supabase
    .from("content_agreements")
    .insert({
      user_id: user.id,
      agreement_version: version,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select("agreed_at")
    .single();

  if (error) {
    // Unique constraint violation = already agreed
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Already agreed to this version" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to record agreement" }, { status: 500 });
  }

  return NextResponse.json({ success: true, agreed_at: data.agreed_at });
};

export const POST = withRateLimit(handler, { max: 10, window: "15 m" });
