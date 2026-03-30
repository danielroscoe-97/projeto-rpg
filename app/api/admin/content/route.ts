import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!data?.is_admin) return null;
  return user;
}

/** GET: Search monsters or spells by name */
const getHandler: Parameters<typeof withRateLimit>[0] = async function getHandler(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const entityType = request.nextUrl.searchParams.get("type") ?? "monsters";
  const search = request.nextUrl.searchParams.get("search") ?? "";
  const table = entityType === "spells" ? "spells" : "monsters";

  let query = adminClient.from(table).select("*").order("name").limit(20);
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
};

/** PUT: Update a monster or spell */
const putHandler: Parameters<typeof withRateLimit>[0] = async function putHandler(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await request.json();
  const { entity_type, entity_id, updates } = body;

  if (!entity_type || !entity_id || !updates) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate entity_id is a UUID to prevent schema leakage via DB error messages
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(entity_id)) {
    return NextResponse.json({ error: "Invalid entity_id" }, { status: 400 });
  }

  // Whitelist editable fields — prevent mass-assignment of id, created_at, etc.
  const MONSTER_EDITABLE = ["name", "hp", "ac", "cr", "type", "size", "alignment", "speed", "str", "dex", "con", "int", "wis", "cha", "saves", "skills", "resistances", "immunities", "senses", "languages", "traits", "actions", "legendary_actions", "description", "ruleset_version"] as const;
  const SPELL_EDITABLE = ["name", "level", "school", "casting_time", "range", "components", "duration", "description", "higher_levels", "classes", "ritual", "concentration", "ruleset_version"] as const;

  const table = entity_type === "spells" ? "spells" : "monsters";
  const allowedFields = entity_type === "spells" ? SPELL_EDITABLE : MONSTER_EDITABLE;
  const safeUpdates = Object.fromEntries(
    Object.entries(updates).filter(([key]) => (allowedFields as readonly string[]).includes(key))
  );

  if (Object.keys(safeUpdates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error } = await adminClient.from(table).update(safeUpdates).eq("id", entity_id);
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  // Broadcast content update via Realtime (NFR28)
  const channel = adminClient.channel("content:update");
  try {
    await channel.subscribe();
    await channel.send({
      type: "broadcast",
      event: "content:update",
      payload: {
        entity_type,
        entity_id,
        ruleset_version: safeUpdates.ruleset_version ?? null,
      },
    });
  } finally {
    adminClient.removeChannel(channel);
  }

  return NextResponse.json({ success: true });
};

const rateLimitConfig = { max: 30, window: "15 m" } as const;
export const GET = withRateLimit(getHandler, rateLimitConfig);
export const PUT = withRateLimit(putHandler, rateLimitConfig);
