import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!data?.is_admin) return null;
  return user;
}

// GET — list all whitelist entries (active + revoked) with user info
const getHandler: Parameters<typeof withRateLimit>[0] = async function (
  _request: NextRequest
) {
  const admin = await verifyAdmin();
  if (!admin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: entries, error } = await adminClient
    .from("content_whitelist")
    .select("id, user_id, granted_by, granted_at, revoked_at, notes")
    .order("granted_at", { ascending: false })
    .limit(200);

  if (error)
    return NextResponse.json({ error: "Query failed" }, { status: 500 });

  // Enrich with user info
  const userIds = [
    ...new Set(
      (entries ?? []).flatMap((e) => [e.user_id, e.granted_by])
    ),
  ];

  const { data: users } = await adminClient
    .from("users")
    .select("id, email, display_name")
    .in("id", userIds);

  const userMap = new Map(
    (users ?? []).map((u) => [u.id, u])
  );

  const whitelistResult = (entries ?? []).map((e) => ({
    ...e,
    user_email: userMap.get(e.user_id)?.email ?? "unknown",
    user_display_name: userMap.get(e.user_id)?.display_name ?? null,
    granted_by_email: userMap.get(e.granted_by)?.email ?? "unknown",
  }));

  // Also fetch all content agreements with user info
  const { data: agreements } = await adminClient
    .from("content_agreements")
    .select("id, user_id, agreed_at, agreement_version")
    .order("agreed_at", { ascending: false })
    .limit(200);

  const agreementUserIds = [
    ...new Set((agreements ?? []).map((a) => a.user_id)),
  ];

  // Fetch user info for agreement holders (skip already-fetched) — single query, no redundant re-fetch
  const missingUserIds = agreementUserIds.filter((id) => !userMap.has(id));
  if (missingUserIds.length > 0) {
    const { data: moreUsers } = await adminClient
      .from("users")
      .select("id, email, display_name, created_at, role")
      .in("id", missingUserIds);
    (moreUsers ?? []).forEach((u) => userMap.set(u.id, u));
  }

  const agreementsResult = (agreements ?? []).map((a) => ({
    ...a,
    user_email: userMap.get(a.user_id)?.email ?? "unknown",
    user_display_name: userMap.get(a.user_id)?.display_name ?? null,
    user_created_at: (userMap.get(a.user_id) as Record<string, unknown>)?.created_at ?? null,
    user_role: (userMap.get(a.user_id) as Record<string, unknown>)?.role ?? null,
  }));

  return NextResponse.json({
    data: whitelistResult,
    agreements: agreementsResult,
  });
};

// POST — add user to whitelist
const postHandler: Parameters<typeof withRateLimit>[0] = async function (
  request: NextRequest
) {
  const admin = await verifyAdmin();
  if (!admin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { user_id, notes } = body as { user_id: string; notes?: string };

  if (!user_id)
    return NextResponse.json(
      { error: "user_id is required" },
      { status: 400 }
    );

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if already whitelisted (active)
  const { data: existing } = await adminClient
    .from("content_whitelist")
    .select("id, revoked_at")
    .eq("user_id", user_id)
    .maybeSingle();

  if (existing && !existing.revoked_at) {
    return NextResponse.json(
      { error: "User is already whitelisted" },
      { status: 409 }
    );
  }

  // If previously revoked, update instead of insert
  if (existing && existing.revoked_at) {
    const { error } = await adminClient
      .from("content_whitelist")
      .update({
        revoked_at: null,
        granted_by: admin.id,
        granted_at: new Date().toISOString(),
        notes: notes ?? null,
      })
      .eq("id", existing.id);

    if (error)
      return NextResponse.json({ error: "Update failed" }, { status: 500 });

    return NextResponse.json({ success: true, action: "reactivated" });
  }

  // Insert new entry
  const { error } = await adminClient.from("content_whitelist").insert({
    user_id,
    granted_by: admin.id,
    notes: notes ?? null,
  });

  if (error)
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });

  return NextResponse.json({ success: true, action: "added" });
};

// PATCH — revoke a whitelist entry (soft delete)
const patchHandler: Parameters<typeof withRateLimit>[0] = async function (
  request: NextRequest
) {
  const admin = await verifyAdmin();
  if (!admin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { id } = body as { id: string };

  if (!id)
    return NextResponse.json({ error: "id is required" }, { status: 400 });

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminClient
    .from("content_whitelist")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: "Update failed" }, { status: 500 });

  if (!data)
    return NextResponse.json(
      { error: "Entry not found or already revoked" },
      { status: 404 }
    );

  return NextResponse.json({ success: true });
};

export const GET = withRateLimit(getHandler, { max: 30, window: "15 m" });
export const POST = withRateLimit(postHandler, { max: 20, window: "15 m" });
export const PATCH = withRateLimit(patchHandler, { max: 20, window: "15 m" });
