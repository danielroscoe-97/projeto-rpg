import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/errors/capture";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pocketdm.com.br";

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

type RouteContext = { params: Promise<{ id: string }> };

const DEFAULT_EXPIRY_DAYS = 30;

async function getAuthenticatedOwner(campaignId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    captureError(authError ?? new Error("No user in session"), {
      component: "api/join-link",
      action: "getAuthenticatedOwner",
      category: "auth",
      extra: { campaignId, authErrorCode: authError?.code },
    });
    return { error: "Unauthorized", status: 401 as const, supabase, user: null };
  }

  const { data: campaign, error: queryError } = await supabase
    .from("campaigns")
    .select("id, join_code, join_code_active, max_players")
    .eq("id", campaignId)
    .eq("owner_id", user.id)
    .single();

  if (!campaign) {
    captureError(queryError ?? new Error("Campaign not found for owner"), {
      component: "api/join-link",
      action: "getAuthenticatedOwner",
      category: "database",
      extra: { campaignId, userId: user.id },
    });
    return { error: "Campaign not found", status: 404 as const, supabase, user: null };
  }

  return { campaign, supabase, user, error: null };
}

/** GET — returns current join link (generates one if null) */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id: campaignId } = await params;

  try {
    const result = await getAuthenticatedOwner(campaignId);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

    const { campaign, supabase } = result;
    let { join_code, join_code_active } = campaign!;

    if (!join_code) {
      join_code = generateJoinCode();
      join_code_active = true;
      const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 86400000).toISOString();
      const [{ error: updateError }, { error: settingsError }] = await Promise.all([
        supabase
          .from("campaigns")
          .update({ join_code, join_code_active: true })
          .eq("id", campaignId),
        supabase
          .from("campaign_settings")
          .upsert(
            { campaign_id: campaignId, join_code_expires_at: expiresAt },
            { onConflict: "campaign_id" },
          ),
      ]);
      if (updateError) throw updateError;
      if (settingsError) throw settingsError;
    }

    // Fetch member count + expiration in parallel
    const [{ count: currentPlayers }, { data: settingsRow }] = await Promise.all([
      supabase
        .from("campaign_members")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("status", "active"),
      supabase
        .from("campaign_settings")
        .select("join_code_expires_at")
        .eq("campaign_id", campaignId)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      data: {
        code: join_code,
        is_active: join_code_active,
        link: `${BASE_URL}/join-campaign/${join_code}`,
        current_players: currentPlayers ?? 0,
        max_players: campaign!.max_players,
        expires_at: settingsRow?.join_code_expires_at ?? null,
      },
    });
  } catch (err) {
    captureError(err, { component: "api/join-link", action: "GET", category: "network" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** PATCH — toggle join_code_active */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id: campaignId } = await params;

  try {
    const result = await getAuthenticatedOwner(campaignId);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

    const { supabase } = result;
    const body = await req.json();
    const is_active = Boolean(body.is_active);

    const { error: updateError } = await supabase
      .from("campaigns")
      .update({ join_code_active: is_active })
      .eq("id", campaignId);
    if (updateError) throw updateError;

    return NextResponse.json({ data: { is_active } });
  } catch (err) {
    captureError(err, { component: "api/join-link", action: "PATCH", category: "network" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** POST — regenerate join_code */
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id: campaignId } = await params;

  try {
    const result = await getAuthenticatedOwner(campaignId);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

    const { supabase } = result;
    const join_code = generateJoinCode();
    const expires_at = new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 86400000).toISOString();

    // Update join code + set new expiration
    const [{ error: updateError }, { error: settingsError }] = await Promise.all([
      supabase
        .from("campaigns")
        .update({ join_code, join_code_active: true })
        .eq("id", campaignId),
      supabase
        .from("campaign_settings")
        .upsert(
          { campaign_id: campaignId, join_code_expires_at: expires_at },
          { onConflict: "campaign_id" },
        ),
    ]);
    if (updateError) throw updateError;
    if (settingsError) throw settingsError;

    return NextResponse.json({
      data: {
        code: join_code,
        link: `${BASE_URL}/join-campaign/${join_code}`,
        expires_at,
      },
    });
  } catch (err) {
    captureError(err, { component: "api/join-link", action: "POST", category: "network" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
