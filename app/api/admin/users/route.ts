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

const handler: Parameters<typeof withRateLimit>[0] = async function getHandler(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const search = request.nextUrl.searchParams.get("search") ?? "";

  let query = adminClient
    .from("users")
    .select("id, email, display_name, is_admin, created_at, campaigns(count)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) {
    query = query.ilike("email", `%${search}%`);
  }

  const { data: users, error } = await query;
  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });

  const result = (users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    display_name: u.display_name,
    is_admin: u.is_admin,
    created_at: u.created_at,
    campaign_count: (u.campaigns as { count: number }[])?.[0]?.count ?? 0,
  }));

  return NextResponse.json({ data: result });
};

export const GET = withRateLimit(handler, { max: 30, window: "15 m" });
