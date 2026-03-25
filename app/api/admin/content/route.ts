import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!data?.is_admin) return null;
  return user;
}

/** GET: Search monsters or spells by name */
export async function GET(request: NextRequest) {
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
}

/** PUT: Update a monster or spell */
export async function PUT(request: NextRequest) {
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

  const table = entity_type === "spells" ? "spells" : "monsters";
  const { error } = await adminClient.from(table).update(updates).eq("id", entity_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Broadcast content update via Realtime (NFR28)
  const channel = adminClient.channel("content:update");
  await channel.subscribe();
  await channel.send({
    type: "broadcast",
    event: "content:update",
    payload: {
      entity_type,
      entity_id,
      ruleset_version: updates.ruleset_version ?? null,
    },
  });
  adminClient.removeChannel(channel);

  return NextResponse.json({ success: true });
}
