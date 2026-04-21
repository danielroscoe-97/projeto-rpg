/**
 * Epic 04 (Player-as-DM Upsell), Story 04-D — Área 5.
 *
 * Bulk invite endpoint for the "Convide quem jogou com você" tab. Client
 * sends `invitee_user_ids` (what `get_past_companions()` returns); this
 * route:
 *   1. Validates every id is actually a past companion (C1 — closes the
 *      user_id → email oracle introduced by the service-role resolution).
 *   2. Resolves each id to a verified email via the service-role client
 *      (F20 — `campaign_invites.email` is NOT NULL).
 *   3. Applies the SAME 20/24h rate-limit mechanism the single-invite route
 *      uses (C3 — SELECT COUNT on campaign_invites, not the check_rate_limit
 *      RPC which would have been a separate budget and a trivial bypass).
 *   4. Skips companions whose email is already on a pending invite for
 *      this campaign (H1 — single-invite route returns 409 on that shape;
 *      bulk aggregates them into `skipped_duplicate` rather than 409-ing
 *      the whole batch).
 *   5. Sends the actual email via Resend per invite (C2 — prior version
 *      inserted rows but never called `sendCampaignInviteEmail`, so
 *      invitees literally never got the link).
 *   6. Caps the batch at MAX_BULK_INVITE_SIZE (H2) and truncates to the
 *      remaining daily budget (C3 conservative — prefers "some went through,
 *      others are in `skipped_budget`" to spamming).
 *
 * Response shape:
 *   {
 *     sent: string[],             // invite created AND email delivered
 *     skipped_no_email: string[], // user has no email / malformed email
 *     skipped_duplicate: string[],// pending invite already exists
 *     skipped_budget: string[],   // rate-limit budget exhausted mid-batch
 *     email_failed: string[],     // invite row created but Resend failed
 *     rate_limited: boolean,
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { captureError } from "@/lib/errors/capture";
import { sendCampaignInviteEmail } from "@/lib/notifications/campaign-invite";

const MAX_INVITES_PER_DAY = 20;
const MAX_BULK_INVITE_SIZE = 50; // H2 — matches get_past_companions default page
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // M1 — same as single-invite

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

  // ── Ownership (also grab name for email body) ──
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name")
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

  const uniqueInviteeIds: string[] = Array.from(
    new Set(
      inviteeIdsRaw.filter(
        (v): v is string => typeof v === "string" && v.length > 0,
      ),
    ),
  );
  if (uniqueInviteeIds.length === 0) {
    return NextResponse.json(
      { error: "invitee_user_ids contains no valid ids" },
      { status: 400 },
    );
  }

  // H2 — array length cap. Larger pages should paginate via repeated calls.
  if (uniqueInviteeIds.length > MAX_BULK_INVITE_SIZE) {
    return NextResponse.json(
      { error: `invitee_user_ids exceeds ${MAX_BULK_INVITE_SIZE} per request` },
      { status: 400 },
    );
  }

  // ── C1: verify every id is actually a past companion ────────────────
  // Without this, service-role email resolution below is a user_id → email
  // oracle — any DM owner could probe random UUIDs and learn which ones
  // correspond to real users. get_past_companions runs under SECURITY
  // DEFINER + auth.uid(), so it returns exactly the caller's graph.
  // Limitation: p_limit is clamped to 200 inside the RPC; a caller with
  // more than 200 companions will see the tail rejected as "not a
  // companion". Acceptable for MVP — if someone hits that ceiling we can
  // add pagination client-side later.
  const { data: companions, error: companionsErr } = await supabase.rpc(
    "get_past_companions",
    { p_limit: 200, p_offset: 0 },
  );
  if (companionsErr) {
    captureError(companionsErr, {
      component: "CampaignInvitesBulkAPI",
      action: "validatePastCompanions",
      category: "database",
    });
    return NextResponse.json(
      { error: "Failed to validate past companions" },
      { status: 500 },
    );
  }
  const companionIds = new Set(
    ((companions ?? []) as { companion_user_id: string }[]).map(
      (c) => c.companion_user_id,
    ),
  );
  const unauthorizedIds = uniqueInviteeIds.filter(
    (id) => !companionIds.has(id),
  );
  if (unauthorizedIds.length > 0) {
    return NextResponse.json(
      {
        error: "Some invitee IDs are not past companions",
        unauthorized_count: unauthorizedIds.length,
      },
      { status: 403 },
    );
  }

  // ── C3: rate limit — SAME mechanism as single-invite ────────────────
  // Counts actual rows, not RPC calls, so the bulk endpoint cannot be
  // used to bypass the single-invite daily cap.
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const { count: todayCount, error: rlErr } = await supabase
    .from("campaign_invites")
    .select("id", { count: "exact", head: true })
    .eq("invited_by", user.id)
    .gte("created_at", twentyFourHoursAgo);

  if (rlErr) {
    captureError(rlErr, {
      component: "CampaignInvitesBulkAPI",
      action: "rateLimit",
      category: "database",
    });
    return NextResponse.json(
      { error: "Rate limit check failed" },
      { status: 500 },
    );
  }

  const sentSoFar = todayCount ?? 0;
  const remainingBudget = Math.max(0, MAX_INVITES_PER_DAY - sentSoFar);
  if (remainingBudget === 0) {
    return NextResponse.json(
      {
        sent: [],
        skipped_no_email: [],
        skipped_duplicate: [],
        skipped_budget: uniqueInviteeIds,
        email_failed: [],
        rate_limited: true,
      },
      { status: 429 },
    );
  }

  // ── F20 — resolve user_id → email server-side ──
  const service = createServiceClient();
  const { data: userRows, error: resolveErr } = await service
    .from("users")
    .select("id, email")
    .in("id", uniqueInviteeIds);

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

  // M1 — email validation + normalize. Malformed rows (legacy accounts,
  // partial migrations) are dropped into skipped_no_email rather than
  // propagated to Resend, which would either 400 or silently 200.
  const resolved: { id: string; email: string }[] = [];
  const skippedNoEmail: string[] = [];
  const foundIds = new Set<string>();

  for (const row of userRows ?? []) {
    foundIds.add(row.id);
    const email =
      typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
    if (email.length === 0 || !EMAIL_RE.test(email)) {
      skippedNoEmail.push(row.id);
    } else {
      resolved.push({ id: row.id, email });
    }
  }
  for (const id of uniqueInviteeIds) {
    if (!foundIds.has(id)) skippedNoEmail.push(id);
  }

  // ── H1 — skip companions whose email already has a pending invite ──
  const skippedDuplicate: string[] = [];
  let afterDedupe = resolved;
  if (resolved.length > 0) {
    const candidateEmails = resolved.map((r) => r.email);
    const { data: existing, error: existErr } = await supabase
      .from("campaign_invites")
      .select("email")
      .eq("campaign_id", campaignId)
      .eq("status", "pending")
      .in("email", candidateEmails);

    if (existErr) {
      captureError(existErr, {
        component: "CampaignInvitesBulkAPI",
        action: "dedupePending",
        category: "database",
      });
      return NextResponse.json(
        { error: "Failed to check existing invites" },
        { status: 500 },
      );
    }

    const pendingEmails = new Set(
      ((existing ?? []) as { email: string }[]).map((r) => r.email),
    );
    afterDedupe = [];
    for (const r of resolved) {
      if (pendingEmails.has(r.email)) {
        skippedDuplicate.push(r.id);
      } else {
        afterDedupe.push(r);
      }
    }
  }

  // ── C3 conservative — truncate to remaining budget ──
  const toInvite = afterDedupe.slice(0, remainingBudget);
  const skippedBudget: string[] = afterDedupe
    .slice(remainingBudget)
    .map((r) => r.id);

  // ── INSERT + send email per invite ──
  const sent: string[] = [];
  const emailFailed: string[] = [];

  if (toInvite.length > 0) {
    // Pull DM display name once — used in every email body.
    const { data: dmUser } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    const dmName =
      (dmUser?.display_name as string | undefined) ??
      user.email ??
      "Dungeon Master";

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://pocketdm.com.br";
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

    // Serial INSERT+send (not batch insert) so per-invite email failures
    // are observable. A batch insert would make the "sent" classification
    // ambiguous when a duplicate uniq-violates mid-batch.
    for (const r of toInvite) {
      const token = crypto.randomUUID();
      const { error: insertErr } = await supabase
        .from("campaign_invites")
        .insert({
          campaign_id: campaignId,
          invited_by: user.id,
          email: r.email,
          token,
          expires_at: expiresAt,
        })
        .select("id")
        .single();

      if (insertErr) {
        captureError(insertErr, {
          component: "CampaignInvitesBulkAPI",
          action: "insertInvite",
          category: "database",
          extra: { companionId: r.id },
        });
        emailFailed.push(r.id);
        continue;
      }

      // C2 — actually send the email (prior version never did).
      const inviteLink = `${baseUrl}/auth/sign-up?invite=${token}&campaign=${campaignId}`;
      const emailSent = await sendCampaignInviteEmail({
        email: r.email,
        dmName,
        campaignName: (campaign.name as string) ?? "Campanha",
        inviteLink,
        inviteToken: token,
      });

      if (emailSent) {
        sent.push(r.id);
      } else {
        emailFailed.push(r.id);
      }
    }
  }

  // M2 — analytics fires in every non-401/403/400 path with enough detail
  // to distinguish success, partial, budget-exhausted, all-no-email.
  trackServerEvent("dm_upsell:invite_past_companions_sent", {
    userId: user.id,
    properties: {
      campaignId,
      companionCount: toInvite.length,
      sentCount: sent.length,
      skippedNoEmailCount: skippedNoEmail.length,
      skippedDuplicateCount: skippedDuplicate.length,
      skippedBudgetCount: skippedBudget.length,
      emailFailedCount: emailFailed.length,
    },
    req: request,
  });

  return NextResponse.json({
    sent,
    skipped_no_email: skippedNoEmail,
    skipped_duplicate: skippedDuplicate,
    skipped_budget: skippedBudget,
    email_failed: emailFailed,
    rate_limited: false,
  });
}
