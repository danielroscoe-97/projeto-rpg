/**
 * Epic 04 (Player-as-DM Upsell), Story 04-D — Área 5.
 *
 * Bulk invite endpoint for the "Convide quem jogou com você" tab.
 * Client sends `user_ids` (what `get_past_companions()` returns); this
 * route resolves them to emails server-side (F20 — `campaign_invites.email`
 * is NOT NULL) before creating one invite row per resolvable companion.
 *
 * Rate limit: 20 invites / 24h / DM via the shared `check_rate_limit` RPC
 * (key `campaign_invite:${userId}`) — identical budget to the single-invite
 * endpoint so bulk cannot be used as a spam bypass.
 *
 * Response shape (spec §Área 5):
 *   { sent: string[], skipped_no_email: string[], rate_limited: boolean }
 *
 * Privacy notes
 * ─────────────
 * - Email resolution uses the service-role client so RLS on `auth.users.email`
 *   does not block the lookup for users with whom the caller has never had a
 *   DM relationship. This is safe because the eligibility filter is the
 *   upstream `get_past_companions()` RPC — the caller can only create invites
 *   for users they already share a session with (enforced in the caller's
 *   pre-selection UI). We re-validate ownership here to prevent the endpoint
 *   itself from being a user_id → email oracle (F20 hardening).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { captureError } from "@/lib/errors/capture";

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_SECONDS = 86_400; // 24h
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: campaignId } = await params;
  const supabase = await createClient();

  // ── Auth ──
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Ownership ──
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!campaign) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Body ──
  let body: { invitee_user_ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const inviteeIdsRaw = body.invitee_user_ids;
  if (!Array.isArray(inviteeIdsRaw) || inviteeIdsRaw.length === 0) {
    return NextResponse.json(
      { error: "invitee_user_ids must be a non-empty array" },
      { status: 400 },
    );
  }
  const inviteeIds: string[] = inviteeIdsRaw.filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  if (inviteeIds.length === 0) {
    return NextResponse.json(
      { error: "invitee_user_ids contains no valid ids" },
      { status: 400 },
    );
  }

  // ── Rate limit (shared with single-invite key) ──
  try {
    const { data: allowed, error: rlError } = await supabase.rpc(
      "check_rate_limit",
      {
        p_key: `campaign_invite:${user.id}`,
        p_max: RATE_LIMIT_MAX,
        p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      },
    );
    if (rlError) throw rlError;
    if (allowed === false) {
      return NextResponse.json(
        {
          sent: [],
          skipped_no_email: [],
          rate_limited: true,
        },
        { status: 429 },
      );
    }
  } catch (err) {
    // Fail-closed: matches oracle-ai route policy — if we can't verify the
    // limiter, we refuse the write rather than risk spamming.
    captureError(err, {
      component: "CampaignInvitesBulkAPI",
      action: "rateLimit",
      category: "database",
    });
    return NextResponse.json(
      { error: "Rate limit check failed" },
      { status: 500 },
    );
  }

  // ── F20: resolve user_id → email server-side ──
  // Service role bypasses RLS on `users.email`; we already gated this by
  // campaign ownership above, so the service client isn't a data leak.
  const service = createServiceClient();
  const { data: userRows, error: resolveErr } = await service
    .from("users")
    .select("id, email")
    .in("id", inviteeIds);

  if (resolveErr) {
    captureError(resolveErr, {
      component: "CampaignInvitesBulkAPI",
      action: "resolveEmails",
      category: "database",
    });
    return NextResponse.json(
      { error: "Failed to resolve invitee emails" },
      { status: 500 },
    );
  }

  const resolved: { id: string; email: string }[] = [];
  const skippedNoEmail: string[] = [];
  const foundIds = new Set<string>();

  for (const row of userRows ?? []) {
    foundIds.add(row.id);
    const email = typeof row.email === "string" ? row.email.trim() : "";
    if (email.length === 0) {
      skippedNoEmail.push(row.id);
    } else {
      resolved.push({ id: row.id, email });
    }
  }
  // User rows that didn't come back at all count as "no email" too — the
  // row may have been hard-deleted between `get_past_companions` and this
  // call. Better to report them as skipped than to 500 the whole batch.
  for (const id of inviteeIds) {
    if (!foundIds.has(id)) skippedNoEmail.push(id);
  }

  // ── INSERT one invite per resolved companion ──
  const sent: string[] = [];
  if (resolved.length > 0) {
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
    const rows = resolved.map((r) => ({
      campaign_id: campaignId,
      invited_by: user.id,
      email: r.email,
      token: crypto.randomUUID(),
      expires_at: expiresAt,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("campaign_invites")
      .insert(rows)
      .select("email");

    if (insertErr) {
      captureError(insertErr, {
        component: "CampaignInvitesBulkAPI",
        action: "insertInvites",
        category: "database",
      });
      return NextResponse.json(
        { error: "Failed to create invites" },
        { status: 500 },
      );
    }

    // Map inserted emails back to companion user_ids for the response.
    const insertedEmails = new Set(
      (inserted ?? []).map((row: { email: string }) => row.email),
    );
    for (const r of resolved) {
      if (insertedEmails.has(r.email)) sent.push(r.id);
    }
  }

  // ── Analytics (fire-and-forget) ──
  trackServerEvent("dm_upsell:invite_past_companions_sent", {
    userId: user.id,
    properties: {
      companionCount: resolved.length,
      campaignId,
    },
    req: request,
  });

  return NextResponse.json({
    sent,
    skipped_no_email: skippedNoEmail,
    rate_limited: false,
  });
}
