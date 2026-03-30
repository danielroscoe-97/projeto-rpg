import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/errors/capture";
import { withRateLimit } from "@/lib/rate-limit";

const MAX_INVITES_PER_DAY = 20;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const postHandler: Parameters<typeof withRateLimit>[0] = async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id: campaignId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify campaign ownership
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("id", campaignId)
    .eq("owner_id", user.id)
    .single();

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const body = await request.json();
  const email = body.email?.trim()?.toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    // Rate limit: max 20 invites per DM per 24h
    const { count: todayCount } = await supabase
      .from("campaign_invites")
      .select("id", { count: "exact", head: true })
      .eq("invited_by", user.id)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if ((todayCount ?? 0) >= MAX_INVITES_PER_DAY) {
      return NextResponse.json({ error: "rate_limit", message: "Daily invite limit reached (20/day)" }, { status: 429 });
    }

    // Check duplicate pending invite
    const { data: existing } = await supabase
      .from("campaign_invites")
      .select("id, expires_at")
      .eq("campaign_id", campaignId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "duplicate", message: "Pending invite already exists for this email" }, { status: 409 });
    }

    // Create invite
    const token = crypto.randomUUID();
    const { data: invite, error: insertError } = await supabase
      .from("campaign_invites")
      .insert({
        campaign_id: campaignId,
        invited_by: user.id,
        email,
        token,
      })
      .select("id, email, token, status, created_at, expires_at")
      .single();

    if (insertError) throw insertError;

    // TODO: Trigger Novu campaign-invite workflow here
    // For now, return the invite link for the DM to share manually
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const inviteLink = `${baseUrl}/auth/sign-up?invite=${token}&campaign=${campaignId}`;

    return NextResponse.json({
      data: {
        ...invite,
        invite_link: inviteLink,
        campaign_name: campaign.name,
      },
    });
  } catch (err) {
    captureError(err, { component: "CampaignInvitesAPI", action: "createInvite", category: "database" });
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
};

const getHandler: Parameters<typeof withRateLimit>[0] = async function getHandler(
  _request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id: campaignId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Auto-expire old invites
    await supabase
      .from("campaign_invites")
      .update({ status: "expired" })
      .eq("campaign_id", campaignId)
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    // Fetch all invites for this campaign
    const { data: invites, error } = await supabase
      .from("campaign_invites")
      .select("id, email, status, created_at, expires_at")
      .eq("campaign_id", campaignId)
      .eq("invited_by", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: invites ?? [] });
  } catch (err) {
    captureError(err, { component: "CampaignInvitesAPI", action: "fetchInvites", category: "database" });
    return NextResponse.json({ error: "Failed to fetch invites" }, { status: 500 });
  }
};

const deleteHandler: Parameters<typeof withRateLimit>[0] = async function deleteHandler(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id: campaignId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const inviteId = searchParams.get("inviteId");
  if (!inviteId) return NextResponse.json({ error: "Missing inviteId" }, { status: 400 });

  try {
    const { error } = await supabase
      .from("campaign_invites")
      .update({ status: "expired" })
      .eq("id", inviteId)
      .eq("campaign_id", campaignId)
      .eq("invited_by", user.id)
      .eq("status", "pending");

    if (error) throw error;

    return NextResponse.json({ data: { cancelled: true } });
  } catch (err) {
    captureError(err, { component: "CampaignInvitesAPI", action: "cancelInvite", category: "database" });
    return NextResponse.json({ error: "Failed to cancel invite" }, { status: 500 });
  }
};

const rateLimitConfig = { max: 20, window: "15 m" } as const;
export const POST = withRateLimit(postHandler, rateLimitConfig);
export const GET = withRateLimit(getHandler, rateLimitConfig);
export const DELETE = withRateLimit(deleteHandler, rateLimitConfig);
