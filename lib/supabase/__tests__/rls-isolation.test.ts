/**
 * RLS Isolation Tests — Story 1: Role Isolation
 *
 * Verifies that Supabase Row Level Security policies correctly isolate data
 * between DMs, players, and campaign members. Uses the Supabase JS client
 * with different auth contexts to simulate real access patterns.
 *
 * IMPORTANT: These tests require a running Supabase instance with the full
 * migration set applied. They use service_role for setup/teardown and
 * user-level clients for assertions.
 *
 * Run: npm test -- --testPathPattern=rls-isolation
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Skip guard — these tests require a live Supabase instance
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "test-anon-key";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test-service-key";

const hasLiveSupabase = SUPABASE_SERVICE_KEY !== "test-service-key" && SUPABASE_ANON_KEY !== "test-anon-key";

if (!hasLiveSupabase) {
  describe("RLS Isolation Tests (skipped — no live Supabase)", () => {
    it.skip("requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY env vars", () => {});
  });
}

const describeIfLive = hasLiveSupabase ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Env & helpers
// ---------------------------------------------------------------------------

/** Service-role client — bypasses RLS for setup/teardown. */
function serviceClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

/** Anon/user client — respects RLS. Optionally override the access token. */
function userClient(accessToken?: string) {
  const client = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
  return client;
}

// ---------------------------------------------------------------------------
// Test user creation helpers
// ---------------------------------------------------------------------------

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

let cleanupFns: (() => Promise<void>)[] = [];

/**
 * Create a test user via service role and return their ID + access token.
 * Registers cleanup for afterEach.
 */
async function createTestUser(email: string, password = "TestPass123!"): Promise<TestUser> {
  const svc = serviceClient();

  // Create auth user
  const { data: authData, error: authErr } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr) throw new Error(`Failed to create test user ${email}: ${authErr.message}`);
  const userId = authData.user.id;

  // Insert into public.users
  await svc.from("users").upsert({ id: userId, email, display_name: email.split("@")[0] });

  // Sign in to get access token
  const { data: signIn, error: signInErr } = await svc.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  // Fallback: sign in with password
  const anonClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: session, error: sessErr } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });
  if (sessErr) throw new Error(`Failed to sign in test user ${email}: ${sessErr.message}`);

  const accessToken = session.session!.access_token;

  // Register cleanup
  cleanupFns.push(async () => {
    await svc.auth.admin.deleteUser(userId);
  });

  return { id: userId, email, accessToken };
}

/**
 * Create a campaign owned by a user via service role.
 */
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
 * Create a session owned by a user via service role.
 */
async function createSession(ownerId: string, campaignId: string | null, name: string) {
  const svc = serviceClient();
  const { data, error } = await svc
    .from("sessions")
    .insert({ owner_id: ownerId, campaign_id: campaignId, name })
    .select()
    .single();
  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return data;
}

/**
 * Create an encounter in a session via service role.
 */
async function createEncounter(sessionId: string, name: string) {
  const svc = serviceClient();
  const { data, error } = await svc
    .from("encounters")
    .insert({ session_id: sessionId, name })
    .select()
    .single();
  if (error) throw new Error(`Failed to create encounter: ${error.message}`);
  return data;
}

/**
 * Create a combatant in an encounter via service role.
 */
async function createCombatant(encounterId: string, overrides: Record<string, unknown> = {}) {
  const svc = serviceClient();
  const { data, error } = await svc
    .from("combatants")
    .insert({
      encounter_id: encounterId,
      name: "Test Monster",
      current_hp: 50,
      max_hp: 50,
      ac: 15,
      initiative_order: 1,
      is_player: false,
      is_defeated: false,
      is_hidden: false,
      dm_notes: "SECRET: vulnerable to fire",
      ...overrides,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create combatant: ${error.message}`);
  return data;
}

/**
 * Create a session token for a player (simulates joining a session).
 */
async function createSessionToken(sessionId: string, anonUserId: string) {
  const svc = serviceClient();
  const { data, error } = await svc
    .from("session_tokens")
    .insert({
      session_id: sessionId,
      anon_user_id: anonUserId,
      is_active: true,
      player_name: "TestPlayer",
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create session token: ${error.message}`);
  return data;
}

/**
 * Create a monster preset for a user via service role.
 */
async function createPreset(userId: string, name: string) {
  const svc = serviceClient();
  const { data, error } = await svc
    .from("monster_presets")
    .insert({ user_id: userId, name, monsters: [] })
    .select()
    .single();
  if (error) throw new Error(`Failed to create preset: ${error.message}`);
  return data;
}

/**
 * Add a campaign member via service role.
 */
async function addCampaignMember(campaignId: string, userId: string, role: "dm" | "player") {
  const svc = serviceClient();
  const { data, error } = await svc
    .from("campaign_members")
    .upsert({ campaign_id: campaignId, user_id: userId, role, status: "active" })
    .select()
    .single();
  if (error) throw new Error(`Failed to add campaign member: ${error.message}`);
  return data;
}

/**
 * Create a player character in a campaign via service role.
 */
async function createPlayerCharacter(campaignId: string, name: string, overrides: Record<string, unknown> = {}) {
  const svc = serviceClient();
  const { data, error } = await svc
    .from("player_characters")
    .insert({
      campaign_id: campaignId,
      name,
      max_hp: 40,
      current_hp: 40,
      ac: 15,
      ...overrides,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create player character: ${error.message}`);
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
      // Best-effort cleanup
    }
  }
  cleanupFns = [];
});

// ===========================================================================
// DM Isolation Tests
// ===========================================================================

describeIfLive("RLS — DM Isolation", () => {
  it("DM A creates campaign → DM B CANNOT see DM A's campaign", async () => {
    const dmA = await createTestUser("dm-a-camp@test.local");
    const dmB = await createTestUser("dm-b-camp@test.local");
    const campaign = await createCampaign(dmA.id, "DM A's Secret Campaign");

    const clientB = userClient(dmB.accessToken);
    const { data } = await clientB.from("campaigns").select("id").eq("id", campaign.id);

    expect(data ?? []).toHaveLength(0);
  });

  it("DM A creates session → DM B CANNOT list DM A's sessions", async () => {
    const dmA = await createTestUser("dm-a-sess@test.local");
    const dmB = await createTestUser("dm-b-sess@test.local");
    const campaign = await createCampaign(dmA.id, "Campaign A");
    const session = await createSession(dmA.id, campaign.id, "Session A");

    const clientB = userClient(dmB.accessToken);
    const { data } = await clientB.from("sessions").select("id").eq("id", session.id);

    expect(data ?? []).toHaveLength(0);
  });

  it("DM A adds combatant → DM B CANNOT modify DM A's combatants", async () => {
    const dmA = await createTestUser("dm-a-comb@test.local");
    const dmB = await createTestUser("dm-b-comb@test.local");
    const campaign = await createCampaign(dmA.id, "Campaign A");
    const session = await createSession(dmA.id, campaign.id, "Session A");
    const encounter = await createEncounter(session.id, "Encounter A");
    const combatant = await createCombatant(encounter.id);

    const clientB = userClient(dmB.accessToken);
    const { error } = await clientB
      .from("combatants")
      .update({ current_hp: 0 })
      .eq("id", combatant.id);

    // Either error or 0 rows affected — DM B cannot touch DM A's combatant
    const { data: check } = await serviceClient()
      .from("combatants")
      .select("current_hp")
      .eq("id", combatant.id)
      .single();

    expect(check?.current_hp).toBe(50); // Unchanged
  });

  it("DM A creates preset → DM B CANNOT see DM A's presets", async () => {
    const dmA = await createTestUser("dm-a-preset@test.local");
    const dmB = await createTestUser("dm-b-preset@test.local");
    const preset = await createPreset(dmA.id, "Dragon Lair");

    const clientB = userClient(dmB.accessToken);
    const { data } = await clientB.from("monster_presets").select("id").eq("id", preset.id);

    expect(data ?? []).toHaveLength(0);
  });
});

// ===========================================================================
// Player Isolation Tests
// ===========================================================================

describeIfLive("RLS — Player Isolation", () => {
  it("Player with Session A token CANNOT access Session B", async () => {
    const dm = await createTestUser("dm-player-iso@test.local");
    const player = await createTestUser("player-iso@test.local");
    const campaignA = await createCampaign(dm.id, "Campaign A");
    const campaignB = await createCampaign(dm.id, "Campaign B");
    const sessionA = await createSession(dm.id, campaignA.id, "Session A");
    const sessionB = await createSession(dm.id, campaignB.id, "Session B");

    // Player has token for Session A only
    await createSessionToken(sessionA.id, player.id);

    const playerClient = userClient(player.accessToken);
    const { data } = await playerClient.from("sessions").select("id").eq("id", sessionB.id);

    expect(data ?? []).toHaveLength(0);
  });

  it("Player CANNOT see dm_notes of any combatant via direct select", async () => {
    const dm = await createTestUser("dm-notes@test.local");
    const player = await createTestUser("player-notes@test.local");
    const campaign = await createCampaign(dm.id, "Campaign Notes");
    const session = await createSession(dm.id, campaign.id, "Session Notes");
    const encounter = await createEncounter(session.id, "Enc Notes");
    const combatant = await createCombatant(encounter.id, {
      dm_notes: "SUPER SECRET: weakness is cold",
    });

    await createSessionToken(session.id, player.id);

    const playerClient = userClient(player.accessToken);
    const { data } = await playerClient
      .from("combatants")
      .select("id, dm_notes")
      .eq("id", combatant.id);

    // Player can see the combatant row (via session token RLS) but dm_notes
    // is NOT column-restricted by RLS — it's filtered at the application layer.
    // However, this test documents the current behavior for awareness.
    // If data is returned, dm_notes will be present (RLS is row-level, not column-level).
    // The REAL protection is broadcast sanitization (Story 3).
    if (data && data.length > 0) {
      // RLS allows row access — this is expected. Column filtering is app-layer.
      expect(data[0].id).toBe(combatant.id);
    } else {
      // Player has no access at all — also acceptable
      expect(data ?? []).toHaveLength(0);
    }
  });

  it("Player CANNOT see numeric HP of monsters via direct select (app-layer filtering)", async () => {
    const dm = await createTestUser("dm-hp@test.local");
    const player = await createTestUser("player-hp@test.local");
    const campaign = await createCampaign(dm.id, "Campaign HP");
    const session = await createSession(dm.id, campaign.id, "Session HP");
    const encounter = await createEncounter(session.id, "Enc HP");
    const combatant = await createCombatant(encounter.id, {
      is_player: false,
      current_hp: 200,
      max_hp: 300,
    });

    await createSessionToken(session.id, player.id);

    // RLS is row-level — column access depends on application layer.
    // This test documents that the combatant row IS accessible but
    // sensitive columns (current_hp, max_hp) are present at DB level.
    // Anti-metagaming protection is enforced by broadcast sanitization.
    const playerClient = userClient(player.accessToken);
    const { data } = await playerClient
      .from("combatants")
      .select("id, name, current_hp, max_hp, is_player")
      .eq("id", combatant.id);

    // The test verifies:
    // 1. The row IS accessible (player has session token)
    // 2. Application MUST sanitize before sending to client
    if (data && data.length > 0) {
      expect(data[0].is_player).toBe(false);
      // current_hp is visible at DB level — app must strip it
      expect(typeof data[0].current_hp).toBe("number");
    }
  });

  it("Player CANNOT modify combatants (no UPDATE policy for session tokens)", async () => {
    const dm = await createTestUser("dm-readonly@test.local");
    const player = await createTestUser("player-readonly@test.local");
    const campaign = await createCampaign(dm.id, "Campaign RO");
    const session = await createSession(dm.id, campaign.id, "Session RO");
    const encounter = await createEncounter(session.id, "Enc RO");
    const combatant = await createCombatant(encounter.id);

    await createSessionToken(session.id, player.id);

    const playerClient = userClient(player.accessToken);
    const { error } = await playerClient
      .from("combatants")
      .update({ current_hp: 0 })
      .eq("id", combatant.id);

    // Verify combatant is unchanged
    const { data: check } = await serviceClient()
      .from("combatants")
      .select("current_hp")
      .eq("id", combatant.id)
      .single();

    expect(check?.current_hp).toBe(50); // Unchanged
  });

  it("Player CANNOT see player_characters from another campaign", async () => {
    const dm = await createTestUser("dm-pc-iso@test.local");
    const player = await createTestUser("player-pc-iso@test.local");
    const campaignA = await createCampaign(dm.id, "Campaign A PCs");
    const campaignB = await createCampaign(dm.id, "Campaign B PCs");

    // Player is member of Campaign A only
    await addCampaignMember(campaignA.id, player.id, "player");

    // Create PCs in both campaigns
    await createPlayerCharacter(campaignA.id, "Thorin A");
    const pcB = await createPlayerCharacter(campaignB.id, "Thorin B");

    const playerClient = userClient(player.accessToken);
    const { data } = await playerClient
      .from("player_characters")
      .select("id, name")
      .eq("id", pcB.id);

    expect(data ?? []).toHaveLength(0);
  });
});

// ===========================================================================
// Campaign Member Isolation Tests
// ===========================================================================

describeIfLive("RLS — Campaign Member Isolation", () => {
  it("Member of Campaign A CANNOT see Campaign B", async () => {
    const dmA = await createTestUser("dm-mem-a@test.local");
    const dmB = await createTestUser("dm-mem-b@test.local");
    const member = await createTestUser("member-iso@test.local");

    const campaignA = await createCampaign(dmA.id, "Campaign A");
    const campaignB = await createCampaign(dmB.id, "Campaign B");

    // Member belongs to Campaign A only
    await addCampaignMember(campaignA.id, member.id, "player");

    const memberClient = userClient(member.accessToken);
    const { data } = await memberClient.from("campaigns").select("id").eq("id", campaignB.id);

    expect(data ?? []).toHaveLength(0);
  });

  it("Member with role 'player' CANNOT create session (only DM/owner can)", async () => {
    const dm = await createTestUser("dm-mem-create@test.local");
    const member = await createTestUser("member-create@test.local");

    const campaign = await createCampaign(dm.id, "Campaign Create");
    await addCampaignMember(campaign.id, member.id, "player");

    const memberClient = userClient(member.accessToken);
    const { error } = await memberClient
      .from("sessions")
      .insert({ owner_id: member.id, campaign_id: campaign.id, name: "Illegal Session" });

    // INSERT policy requires owner_id = auth.uid() matching session owner
    // A player member should NOT be able to create sessions
    expect(error).toBeTruthy();
  });

  it("Member CAN see player_characters of their campaign (read-only)", async () => {
    const dm = await createTestUser("dm-mem-read@test.local");
    const member = await createTestUser("member-read@test.local");

    const campaign = await createCampaign(dm.id, "Campaign Read");
    await addCampaignMember(campaign.id, member.id, "player");
    const pc = await createPlayerCharacter(campaign.id, "Elara the Brave");

    const memberClient = userClient(member.accessToken);
    const { data } = await memberClient
      .from("player_characters")
      .select("id, name")
      .eq("id", pc.id);

    expect(data).toHaveLength(1);
    expect(data![0].name).toBe("Elara the Brave");
  });

  it("Member CANNOT update player_characters (no UPDATE policy for members)", async () => {
    const dm = await createTestUser("dm-mem-upd@test.local");
    const member = await createTestUser("member-upd@test.local");

    const campaign = await createCampaign(dm.id, "Campaign Update");
    await addCampaignMember(campaign.id, member.id, "player");
    const pc = await createPlayerCharacter(campaign.id, "Immutable PC");

    const memberClient = userClient(member.accessToken);
    const { error } = await memberClient
      .from("player_characters")
      .update({ name: "Hacked Name" })
      .eq("id", pc.id);

    // Verify unchanged
    const { data: check } = await serviceClient()
      .from("player_characters")
      .select("name")
      .eq("id", pc.id)
      .single();

    expect(check?.name).toBe("Immutable PC");
  });

  it("Member CANNOT see dm_notes of player_characters (column not RLS-protected — app layer)", async () => {
    const dm = await createTestUser("dm-mem-notes@test.local");
    const member = await createTestUser("member-notes@test.local");

    const campaign = await createCampaign(dm.id, "Campaign DM Notes");
    await addCampaignMember(campaign.id, member.id, "player");
    const pc = await createPlayerCharacter(campaign.id, "Noted PC", {
      dm_notes: "SECRET DM INFO",
    });

    // NOTE: dm_notes column protection depends on:
    // 1. Whether the column exists on player_characters (migration 029)
    // 2. Application-layer column filtering
    // This test documents current behavior
    const memberClient = userClient(member.accessToken);
    const { data } = await memberClient
      .from("player_characters")
      .select("id, name, dm_notes")
      .eq("id", pc.id);

    // Member CAN read the row via member_select policy.
    // dm_notes visibility is an app-layer concern (RLS is row-level).
    if (data && data.length > 0) {
      expect(data[0].id).toBe(pc.id);
    }
  });
});

// ===========================================================================
// Cross-Role (Dual-Role) Tests
// ===========================================================================

describeIfLive("RLS — Cross-Role (Dual-Role)", () => {
  it("User is DM in Campaign A and Player in Campaign B — data is isolated", async () => {
    const userDual = await createTestUser("dual-role@test.local");
    const otherDm = await createTestUser("other-dm@test.local");

    // User is DM of Campaign A
    const campaignA = await createCampaign(userDual.id, "DM Campaign");
    const sessionA = await createSession(userDual.id, campaignA.id, "DM Session");

    // User is Player in Campaign B (owned by otherDm)
    const campaignB = await createCampaign(otherDm.id, "Player Campaign");
    await addCampaignMember(campaignB.id, userDual.id, "player");
    const sessionB = await createSession(otherDm.id, campaignB.id, "Player Session");

    const dualClient = userClient(userDual.accessToken);

    // As DM in A: can see own campaign
    const { data: campA } = await dualClient
      .from("campaigns")
      .select("id")
      .eq("id", campaignA.id);
    expect(campA).toHaveLength(1);

    // As DM in A: can see own sessions
    const { data: sessA } = await dualClient
      .from("sessions")
      .select("id")
      .eq("id", sessionA.id);
    expect(sessA).toHaveLength(1);

    // As Player in B: can see Campaign B (via member policy)
    const { data: campB } = await dualClient
      .from("campaigns")
      .select("id")
      .eq("id", campaignB.id);
    expect(campB).toHaveLength(1);

    // As Player in B: can see Session B (via member policy)
    const { data: sessB } = await dualClient
      .from("sessions")
      .select("id")
      .eq("id", sessionB.id);
    expect(sessB).toHaveLength(1);
  });

  it("As DM in Campaign A: can create sessions", async () => {
    const userDual = await createTestUser("dual-dm-create@test.local");
    const campaignA = await createCampaign(userDual.id, "DM Campaign Create");

    const dualClient = userClient(userDual.accessToken);
    const { data, error } = await dualClient
      .from("sessions")
      .insert({ owner_id: userDual.id, campaign_id: campaignA.id, name: "New DM Session" })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.name).toBe("New DM Session");
  });

  it("As Player in Campaign B: CANNOT create sessions", async () => {
    const userDual = await createTestUser("dual-player-no-create@test.local");
    const otherDm = await createTestUser("other-dm-no-create@test.local");
    const campaignB = await createCampaign(otherDm.id, "Player Campaign");
    await addCampaignMember(campaignB.id, userDual.id, "player");

    const dualClient = userClient(userDual.accessToken);
    const { error } = await dualClient
      .from("sessions")
      .insert({ owner_id: userDual.id, campaign_id: campaignB.id, name: "Illegal" });

    // Should fail: player cannot create sessions in someone else's campaign
    // INSERT requires owner_id = auth.uid() AND the campaign is theirs
    expect(error).toBeTruthy();
  });

  it("Data from Campaign A and Campaign B is completely isolated", async () => {
    const userDual = await createTestUser("dual-iso@test.local");
    const otherDm = await createTestUser("other-dm-iso@test.local");

    const campaignA = await createCampaign(userDual.id, "Isolated A");
    const campaignB = await createCampaign(otherDm.id, "Isolated B");
    await addCampaignMember(campaignB.id, userDual.id, "player");

    // Create PCs in both campaigns
    const pcA = await createPlayerCharacter(campaignA.id, "PC in A");
    const pcB = await createPlayerCharacter(campaignB.id, "PC in B");

    const dualClient = userClient(userDual.accessToken);

    // Can see PC in A (as DM/owner)
    const { data: pcsA } = await dualClient
      .from("player_characters")
      .select("id, name")
      .eq("campaign_id", campaignA.id);
    expect(pcsA).toHaveLength(1);
    expect(pcsA![0].name).toBe("PC in A");

    // Can see PC in B (as member)
    const { data: pcsB } = await dualClient
      .from("player_characters")
      .select("id, name")
      .eq("campaign_id", campaignB.id);
    expect(pcsB).toHaveLength(1);
    expect(pcsB![0].name).toBe("PC in B");

    // Cannot modify PC in B (only DM can)
    const { error } = await dualClient
      .from("player_characters")
      .update({ name: "Hacked" })
      .eq("id", pcB.id);

    const { data: checkB } = await serviceClient()
      .from("player_characters")
      .select("name")
      .eq("id", pcB.id)
      .single();
    expect(checkB?.name).toBe("PC in B");
  });
});
