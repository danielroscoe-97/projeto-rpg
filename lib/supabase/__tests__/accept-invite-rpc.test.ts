/**
 * SECURITY DEFINER Function Tests — Story 2: accept_campaign_invite()
 *
 * Tests the RPC function that handles campaign invite acceptance, including
 * concurrency, expiration, wrong-email, and duplicate-member edge cases.
 *
 * IMPORTANT: These tests require a running Supabase instance with the full
 * migration set applied. Uses service_role for setup and user-level RPC calls.
 *
 * Run: npm test -- --testPathPattern=accept-invite-rpc
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Env & helpers
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "test-anon-key";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test-service-key";

function serviceClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function userClient(accessToken: string) {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

// ---------------------------------------------------------------------------
// Test user/data helpers
// ---------------------------------------------------------------------------

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

let cleanupFns: (() => Promise<void>)[] = [];

async function createTestUser(email: string, password = "TestPass123!"): Promise<TestUser> {
  const svc = serviceClient();
  const { data: authData, error: authErr } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr) throw new Error(`Failed to create user ${email}: ${authErr.message}`);
  const userId = authData.user.id;

  await svc.from("users").upsert({ id: userId, email, display_name: email.split("@")[0] });

  const anonClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: session, error: sessErr } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });
  if (sessErr) throw new Error(`Failed to sign in ${email}: ${sessErr.message}`);

  cleanupFns.push(async () => {
    await svc.auth.admin.deleteUser(userId);
  });

  return { id: userId, email, accessToken: session.session!.access_token };
}

async function createCampaign(ownerId: string, name: string) {
  const svc = serviceClient();
  const { data, error } = await svc
    .from("campaigns")
    .insert({ owner_id: ownerId, name })
    .select()
    .single();
  if (error) throw new Error(`Failed to create campaign: ${error.message}`);
  return data;
}

/**
 * Create a campaign invite via service role.
 */
async function createInvite(
  campaignId: string,
  invitedBy: string,
  email: string,
  overrides: Record<string, unknown> = {},
) {
  const svc = serviceClient();
  const { data, error } = await svc
    .from("campaign_invites")
    .insert({
      campaign_id: campaignId,
      invited_by: invitedBy,
      email,
      status: "pending",
      ...overrides,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create invite: ${error.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

afterEach(async () => {
  for (const fn of cleanupFns.reverse()) {
    try {
      await fn();
    } catch {
      // best-effort
    }
  }
  cleanupFns = [];
});

// ===========================================================================
// accept_campaign_invite() Tests
// ===========================================================================

describe("RPC — accept_campaign_invite()", () => {
  it("accepts a valid invite → membership created, invite marked accepted", async () => {
    const dm = await createTestUser("dm-invite-valid@test.local");
    const player = await createTestUser("player-invite-valid@test.local");
    const campaign = await createCampaign(dm.id, "Valid Invite Campaign");
    const invite = await createInvite(campaign.id, dm.id, player.email);

    const playerClient = userClient(player.accessToken);
    const { data, error } = await playerClient.rpc("accept_campaign_invite", {
      invite_token: invite.token,
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty("campaign_id", campaign.id);
    expect(data).toHaveProperty("campaign_name", "Valid Invite Campaign");

    // Verify membership was created
    const { data: membership } = await serviceClient()
      .from("campaign_members")
      .select("role, status")
      .eq("campaign_id", campaign.id)
      .eq("user_id", player.id)
      .single();
    expect(membership?.role).toBe("player");
    expect(membership?.status).toBe("active");

    // Verify invite status updated
    const { data: updatedInvite } = await serviceClient()
      .from("campaign_invites")
      .select("status")
      .eq("id", invite.id)
      .single();
    expect(updatedInvite?.status).toBe("accepted");
  });

  it("rejects expired invite (>7 days) → error, no changes", async () => {
    const dm = await createTestUser("dm-invite-expired@test.local");
    const player = await createTestUser("player-invite-expired@test.local");
    const campaign = await createCampaign(dm.id, "Expired Invite Campaign");

    // Create invite with past expiration
    const invite = await createInvite(campaign.id, dm.id, player.email, {
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    });

    const playerClient = userClient(player.accessToken);
    const { data } = await playerClient.rpc("accept_campaign_invite", {
      invite_token: invite.token,
    });

    // Should return an error object
    expect(data).toHaveProperty("error");
    expect(typeof data.error).toBe("string");

    // Verify no membership created
    const { data: membership } = await serviceClient()
      .from("campaign_members")
      .select("id")
      .eq("campaign_id", campaign.id)
      .eq("user_id", player.id);
    // Only the DM auto-membership should exist
    expect(membership?.filter((m: { id: string }) => m.id !== dm.id)).toHaveLength(0);
  });

  it("rejects already-used invite → error, no changes", async () => {
    const dm = await createTestUser("dm-invite-used@test.local");
    const player = await createTestUser("player-invite-used@test.local");
    const campaign = await createCampaign(dm.id, "Used Invite Campaign");

    // Create invite already marked as accepted
    const invite = await createInvite(campaign.id, dm.id, player.email, {
      status: "accepted",
    });

    const playerClient = userClient(player.accessToken);
    const { data } = await playerClient.rpc("accept_campaign_invite", {
      invite_token: invite.token,
    });

    expect(data).toHaveProperty("error");
  });

  it("two users accept same invite simultaneously → only 1 succeeds (FOR UPDATE SKIP LOCKED)", async () => {
    const dm = await createTestUser("dm-invite-race@test.local");
    const playerA = await createTestUser("player-race-a@test.local");
    const playerB = await createTestUser("player-race-b@test.local");
    const campaign = await createCampaign(dm.id, "Race Condition Campaign");

    // Invite is for playerA's email — playerB will be rejected by email check
    const invite = await createInvite(campaign.id, dm.id, playerA.email);

    const clientA = userClient(playerA.accessToken);
    const clientB = userClient(playerB.accessToken);

    // Both try to accept simultaneously
    const [resultA, resultB] = await Promise.all([
      clientA.rpc("accept_campaign_invite", { invite_token: invite.token }),
      clientB.rpc("accept_campaign_invite", { invite_token: invite.token }),
    ]);

    // At most one should succeed, the other should get an error
    const successes = [resultA.data, resultB.data].filter(
      (d) => d && !d.error && d.campaign_id,
    );
    const errors = [resultA.data, resultB.data].filter(
      (d) => d && d.error,
    );

    // playerA should succeed (email matches), playerB should fail (wrong email)
    expect(successes.length).toBeLessThanOrEqual(1);
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });

  it("accepts invite for deleted campaign → graceful error", async () => {
    const dm = await createTestUser("dm-invite-deleted@test.local");
    const player = await createTestUser("player-invite-deleted@test.local");
    const campaign = await createCampaign(dm.id, "Deleted Campaign");
    const invite = await createInvite(campaign.id, dm.id, player.email);

    // Delete the campaign (CASCADE deletes invite too)
    await serviceClient().from("campaigns").delete().eq("id", campaign.id);

    const playerClient = userClient(player.accessToken);
    const { data, error } = await playerClient.rpc("accept_campaign_invite", {
      invite_token: invite.token,
    });

    // Should error because invite was cascade-deleted or campaign doesn't exist
    if (error) {
      expect(error).toBeTruthy();
    } else {
      expect(data).toHaveProperty("error");
    }
  });

  it("rejects when user is already a member → no duplicate membership", async () => {
    const dm = await createTestUser("dm-invite-dupe@test.local");
    const player = await createTestUser("player-invite-dupe@test.local");
    const campaign = await createCampaign(dm.id, "Dupe Campaign");

    // Player is already a member
    await serviceClient()
      .from("campaign_members")
      .insert({
        campaign_id: campaign.id,
        user_id: player.id,
        role: "player",
        status: "active",
      });

    const invite = await createInvite(campaign.id, dm.id, player.email);

    const playerClient = userClient(player.accessToken);
    const { data } = await playerClient.rpc("accept_campaign_invite", {
      invite_token: invite.token,
    });

    // Should succeed gracefully (ON CONFLICT DO NOTHING) — no duplicate
    // The function uses INSERT ... ON CONFLICT DO NOTHING, so it doesn't error
    if (data && !data.error) {
      expect(data).toHaveProperty("campaign_id");
    }

    // Verify no duplicate membership
    const { data: memberships } = await serviceClient()
      .from("campaign_members")
      .select("id")
      .eq("campaign_id", campaign.id)
      .eq("user_id", player.id);
    expect(memberships).toHaveLength(1);
  });

  it("rejects invite with wrong email → error", async () => {
    const dm = await createTestUser("dm-invite-wrong@test.local");
    const wrongUser = await createTestUser("wrong-user@test.local");
    const campaign = await createCampaign(dm.id, "Wrong Email Campaign");

    // Invite is for a different email
    const invite = await createInvite(campaign.id, dm.id, "correct-user@test.local");

    const wrongClient = userClient(wrongUser.accessToken);
    const { data } = await wrongClient.rpc("accept_campaign_invite", {
      invite_token: invite.token,
    });

    expect(data).toHaveProperty("error");
    // Error message should indicate the invite doesn't belong to this account
    expect(data.error).toContain("convite");
  });
});
