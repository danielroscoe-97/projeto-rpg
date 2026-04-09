"use server";

import { createClient, createServiceClient } from "./server";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { captureError } from "@/lib/errors/capture";
import { grantXpAsync } from "@/lib/xp/grant-xp";
import type {
  CampaignMember,
  CampaignMemberWithUser,
  CampaignInviteWithDetails,
  UserMembership,
} from "@/lib/types/campaign-membership";

/** Generate a cryptographically random 32-char token. */
function generateSessionToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

/**
 * Returns all campaigns for a user with role, stats, and character info.
 * Orders DM memberships first, then player, both by most recently updated.
 */
export async function getUserMemberships(
  userId: string
): Promise<UserMembership[]> {
  const supabase = await createClient();

  // Fetch memberships with campaign and DM info
  const { data: memberships, error } = await supabase
    .from("campaign_members")
    .select(
      `
      role,
      joined_at,
      campaign_id,
      campaigns!inner (
        id,
        name,
        description,
        cover_image_url,
        owner_id,
        users!campaigns_owner_id_fkey ( display_name, email )
      )
    `
    )
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    captureError(new Error(`Failed to fetch memberships: ${error.message}`), {
      component: "getUserMemberships",
      action: "fetchMemberships",
      category: "database",
      extra: { userId, code: error.code },
    });
    return [];
  }

  if (!memberships || memberships.length === 0) return [];

  // Fetch player counts and active sessions for each campaign
  const campaignIds = memberships.map(
    (m: Record<string, unknown>) =>
      (m.campaigns as Record<string, unknown>).id as string
  );

  const [playerCountsResult, activeSessionsResult] = await Promise.all([
    supabase
      .from("campaign_members")
      .select("campaign_id")
      .in("campaign_id", campaignIds)
      .eq("status", "active")
      .eq("role", "player")
      .limit(500),
    supabase
      .from("sessions")
      .select("campaign_id")
      .in("campaign_id", campaignIds)
      .eq("is_active", true)
      .limit(100),
  ]);

  const playerCounts = playerCountsResult.data;
  const activeSessions = activeSessionsResult.data;

  // Build player count map
  const playerCountMap: Record<string, number> = {};
  for (const row of playerCounts ?? []) {
    playerCountMap[row.campaign_id] =
      (playerCountMap[row.campaign_id] ?? 0) + 1;
  }

  // Build active session count map
  const activeSessionMap: Record<string, number> = {};
  for (const row of activeSessions ?? []) {
    activeSessionMap[row.campaign_id] =
      (activeSessionMap[row.campaign_id] ?? 0) + 1;
  }

  // For player memberships, fetch character info
  const playerCampaignIds = memberships
    .filter((m: Record<string, unknown>) => m.role === "player")
    .map(
      (m: Record<string, unknown>) =>
        (m.campaigns as Record<string, unknown>).id as string
    );

  const characterMap: Record<
    string,
    { name: string; current_hp: number; max_hp: number; race: string | null; characterClass: string | null; level: number | null }
  > = {};

  if (playerCampaignIds.length > 0) {
    const { data: characters } = await supabase
      .from("player_characters")
      .select("campaign_id, name, current_hp, max_hp, race, class, level")
      .in("campaign_id", playerCampaignIds)
      .eq("user_id", userId)
      .limit(100);

    for (const pc of characters ?? []) {
      if (!characterMap[pc.campaign_id]) {
        characterMap[pc.campaign_id] = {
          name: pc.name,
          current_hp: pc.current_hp,
          max_hp: pc.max_hp,
          race: pc.race ?? null,
          characterClass: pc.class ?? null,
          level: pc.level ?? null,
        };
      }
    }
  }

  // Map to UserMembership
  const results: UserMembership[] = memberships.map(
    (m: Record<string, unknown>) => {
      const campaign = m.campaigns as Record<string, unknown>;
      const dmUser = campaign.users as Record<string, unknown> | null;
      const campaignId = campaign.id as string;
      const character = characterMap[campaignId];

      return {
        role: m.role as UserMembership["role"],
        joined_at: m.joined_at as string,
        campaign_id: campaignId,
        campaign_name: campaign.name as string,
        campaign_description: (campaign.description as string) ?? null,
        cover_image_url: (campaign.cover_image_url as string) ?? null,
        dm_name: (dmUser?.display_name as string) ?? null,
        dm_email: (dmUser?.email as string) ?? "",
        player_count: playerCountMap[campaignId] ?? 0,
        active_sessions: activeSessionMap[campaignId] ?? 0,
        ...(m.role === "player" && {
          character_name: character?.name ?? null,
          character_hp: character?.current_hp ?? null,
          character_max_hp: character?.max_hp ?? null,
          character_race: character?.race ?? null,
          character_class: character?.characterClass ?? null,
          character_level: character?.level ?? null,
        }),
      };
    }
  );

  // Sort: DM first, then player, each group by joined_at DESC
  results.sort((a, b) => {
    if (a.role !== b.role) return a.role === "dm" ? -1 : 1;
    return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
  });

  return results;
}

/**
 * Returns pending campaign invites for a given email address.
 * Only returns invites that are still pending and not expired.
 */
export async function getPendingInvites(
  userEmail: string
): Promise<CampaignInviteWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_invites")
    .select(
      `
      id,
      campaign_id,
      token,
      status,
      created_at,
      expires_at,
      campaigns!inner (
        name,
        owner_id,
        users!campaigns_owner_id_fkey ( display_name, email )
      )
    `
    )
    .eq("email", userEmail)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());

  if (error) {
    captureError(new Error(`Failed to fetch invites: ${error.message}`), {
      component: "getPendingInvites",
      action: "fetchInvites",
      category: "database",
      extra: { userEmail, code: error.code },
    });
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const campaign = row.campaigns as Record<string, unknown>;
    const dmUser = campaign.users as Record<string, unknown> | null;

    return {
      id: row.id as string,
      campaign_id: row.campaign_id as string,
      campaign_name: campaign.name as string,
      dm_name: (dmUser?.display_name as string) ?? "",
      dm_email: (dmUser?.email as string) ?? "",
      token: row.token as string,
      status: row.status as CampaignInviteWithDetails["status"],
      created_at: row.created_at as string,
      expires_at: row.expires_at as string,
    };
  });
}

/**
 * Accepts a campaign invite by calling the `accept_campaign_invite` RPC.
 * Returns the campaign_id and campaign_name on success, or an error message.
 */
export async function acceptCampaignInvite(
  token: string
): Promise<
  { campaign_id: string; campaign_name: string } | { error: string }
> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("accept_campaign_invite", {
    invite_token: token,
  });

  if (error) {
    captureError(new Error(`Failed to accept invite: ${error.message}`), {
      component: "acceptCampaignInvite",
      action: "rpc",
      category: "database",
      extra: { code: error.code },
    });
    return { error: error.message };
  }

  // The RPC returns JSON with campaign_id and campaign_name, or an error key
  const result = typeof data === "string" ? JSON.parse(data) : data;

  if (result?.error) {
    return { error: result.error };
  }

  trackServerEvent("campaign:invite_accepted", {
    properties: { campaign_id: result.campaign_id },
  });

  // XP: Player joined campaign + DM gets XP for player invited
  const userSupabase = await createClient();
  const { data: { user: currentUser } } = await userSupabase.auth.getUser();
  if (currentUser) {
    grantXpAsync(currentUser.id, "player_campaign_joined", "player", { campaign_id: result.campaign_id });
    // Grant XP to DM who owns the campaign
    if (result.campaign_id) {
      const { data: campaign } = await userSupabase
        .from("campaigns")
        .select("owner_id")
        .eq("id", result.campaign_id)
        .single();
      if (campaign?.owner_id && campaign.owner_id !== currentUser.id) {
        grantXpAsync(campaign.owner_id, "dm_player_invited", "dm", { campaign_id: result.campaign_id });
      }
    }
  }

  return {
    campaign_id: result.campaign_id,
    campaign_name: result.campaign_name,
  };
}

/**
 * Declines a campaign invite by marking it as expired.
 * Uses service client because recipients have no UPDATE RLS policy.
 * Validates the invite belongs to the caller's email before updating.
 */
export async function declineCampaignInvite(inviteId: string): Promise<void> {
  const userSupabase = await createClient();

  // Get the caller's email to verify ownership
  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  if (!user?.email) {
    throw new Error("Authentication required");
  }

  const supabase = createServiceClient();

  // Only update if the invite belongs to this user's email
  const { data, error } = await supabase
    .from("campaign_invites")
    .update({ status: "expired" })
    .eq("id", inviteId)
    .eq("email", user.email)
    .select("id")
    .maybeSingle();

  if (error) {
    captureError(new Error(`Failed to decline invite: ${error.message}`), {
      component: "declineCampaignInvite",
      action: "updateStatus",
      category: "database",
      extra: { inviteId, code: error.code },
    });
    throw new Error(`Failed to decline invite: ${error.message}`);
  }

  if (!data) {
    throw new Error("Invite not found or does not belong to this account");
  }

  trackServerEvent("campaign:invite_declined", {
    properties: { invite_id: inviteId },
  });
}

/**
 * Creates or retrieves a session token for a logged-in player.
 * Uses service client to bypass RLS (players cannot create tokens directly).
 * Validates campaign membership internally before creating the token.
 */
export async function getOrCreatePlayerSessionToken(
  sessionId: string,
  userId: string,
  playerCharacterId: string
): Promise<string> {
  // Verify the caller IS the userId (prevent token forgery)
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  if (!user || user.id !== userId) {
    throw new Error("Authentication mismatch: caller is not the specified user");
  }

  const supabase = createServiceClient();

  // Verify the user is an active member of the campaign that owns this session
  const { data: sessionRow } = await supabase
    .from("sessions")
    .select("campaign_id")
    .eq("id", sessionId)
    .single();

  if (!sessionRow) {
    throw new Error("Session not found");
  }

  const { data: membership } = await supabase
    .from("campaign_members")
    .select("id")
    .eq("campaign_id", sessionRow.campaign_id)
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    throw new Error("User is not an active member of this campaign");
  }

  // Check for an existing active token for this user in this session
  const { data: existing } = await supabase
    .from("session_tokens")
    .select("token")
    .eq("session_id", sessionId)
    .eq("anon_user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (existing) return existing.token;

  // Fetch player character name to attach to the token
  const { data: pc } = await supabase
    .from("player_characters")
    .select("name")
    .eq("id", playerCharacterId)
    .maybeSingle();

  // Generate a new token
  const token = generateSessionToken();

  const { error } = await supabase.from("session_tokens").insert({
    session_id: sessionId,
    token,
    anon_user_id: userId,
    player_name: pc?.name ?? null,
    is_active: true,
  });

  if (error) {
    captureError(new Error(`Failed to create player session token: ${error.message}`), {
      component: "getOrCreatePlayerSessionToken",
      action: "insertToken",
      category: "database",
      extra: { sessionId, userId, code: error.code },
    });
    throw new Error(`Failed to create player session token: ${error.message}`);
  }

  trackServerEvent("player:session_token_created", {
    properties: { session_id: sessionId, user_id: userId },
  });

  return token;
}

/**
 * Returns a single campaign membership record, or null if not found.
 */
export async function getCampaignMembership(
  campaignId: string,
  userId: string
): Promise<CampaignMember | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_members")
    .select("id, campaign_id, user_id, role, joined_at, invited_by, status")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    captureError(new Error(`Failed to fetch membership: ${error.message}`), {
      component: "getCampaignMembership",
      action: "fetchMembership",
      category: "database",
      extra: { campaignId, userId, code: error.code },
    });
    return null;
  }

  return data as CampaignMember | null;
}

/**
 * Allows a user to leave a campaign by deleting their membership record.
 * DMs cannot leave their own campaign — they must transfer ownership or delete it.
 */
export async function leaveCampaign(
  campaignId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  // Atomic delete: only delete if role is not 'dm' (avoids TOCTOU race)
  const { data: deleted, error } = await supabase
    .from("campaign_members")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .neq("role", "dm")
    .select("id")
    .maybeSingle();

  if (error) {
    captureError(new Error(`Failed to leave campaign: ${error.message}`), {
      component: "leaveCampaign",
      action: "deleteMembership",
      category: "database",
      extra: { campaignId, userId, code: error.code },
    });
    throw new Error(`Failed to leave campaign: ${error.message}`);
  }

  if (!deleted) {
    // Either membership not found or user is a DM
    const { data: membership } = await supabase
      .from("campaign_members")
      .select("role")
      .eq("campaign_id", campaignId)
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (membership?.role === "dm") {
      throw new Error(
        "DMs cannot leave their own campaign. Transfer ownership or delete the campaign instead."
      );
    }
    throw new Error("Membership not found");
  }

  trackServerEvent("campaign:member_left", {
    properties: { campaign_id: campaignId, user_id: userId },
  });
}

/**
 * Returns all members of a campaign with user details (display_name, email).
 * Sorts DM first, then by display_name.
 */
export async function getCampaignMembers(
  campaignId: string
): Promise<CampaignMemberWithUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_members")
    .select(
      `
      id,
      campaign_id,
      user_id,
      role,
      joined_at,
      status,
      users!campaign_members_user_id_fkey (
        display_name,
        email
      )
    `
    )
    .eq("campaign_id", campaignId)
    .eq("status", "active");

  if (error) {
    captureError(new Error(`Failed to fetch campaign members: ${error.message}`), {
      component: "getCampaignMembers",
      action: "fetchMembers",
      category: "database",
      extra: { campaignId, code: error.code },
    });
    return [];
  }

  if (!data || data.length === 0) return [];

  // Fetch character names for players
  const playerUserIds = data
    .filter((m: Record<string, unknown>) => m.role === "player")
    .map((m: Record<string, unknown>) => m.user_id as string);

  const characterMap: Record<string, { name: string; id: string; characterClass: string | null }> = {};
  if (playerUserIds.length > 0) {
    const { data: characters } = await supabase
      .from("player_characters")
      .select("id, user_id, name, class")
      .eq("campaign_id", campaignId)
      .in("user_id", playerUserIds);

    for (const pc of characters ?? []) {
      if (!characterMap[pc.user_id]) {
        characterMap[pc.user_id] = { name: pc.name, id: pc.id, characterClass: pc.class };
      }
    }
  }

  const members: CampaignMemberWithUser[] = data.map(
    (row: Record<string, unknown>) => {
      const user = row.users as Record<string, unknown> | null;
      const userId = row.user_id as string;

      return {
        id: row.id as string,
        campaign_id: row.campaign_id as string,
        user_id: userId,
        role: row.role as CampaignMemberWithUser["role"],
        joined_at: row.joined_at as string,
        status: row.status as CampaignMemberWithUser["status"],
        display_name: (user?.display_name as string) ?? null,
        email: (user?.email as string) ?? "",
        character_name: characterMap[userId]?.name ?? null,
        character_id: characterMap[userId]?.id ?? null,
        character_class: characterMap[userId]?.characterClass ?? null,
      };
    }
  );

  // Sort: DM first, then by display_name
  members.sort((a, b) => {
    if (a.role !== b.role) return a.role === "dm" ? -1 : 1;
    const nameA = (a.display_name ?? a.email).toLowerCase();
    const nameB = (b.display_name ?? b.email).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return members;
}

/**
 * Removes a member from a campaign. Only the campaign owner (DM) can do this.
 * Cannot remove the DM themselves.
 */
export async function removeCampaignMember(
  campaignId: string,
  targetUserId: string
): Promise<void> {
  const supabase = await createClient();

  // Verify caller is the campaign owner
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("owner_id")
    .eq("id", campaignId)
    .single();

  if (!campaign || campaign.owner_id !== user.id) {
    throw new Error("Only the campaign owner can remove members");
  }

  if (targetUserId === user.id) {
    throw new Error("Cannot remove yourself as DM");
  }

  const { error } = await supabase
    .from("campaign_members")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("user_id", targetUserId);

  if (error) {
    captureError(new Error(`Failed to remove member: ${error.message}`), {
      component: "removeCampaignMember",
      action: "deleteMember",
      category: "database",
      extra: { campaignId, targetUserId, code: error.code },
    });
    throw new Error(`Failed to remove member: ${error.message}`);
  }

  trackServerEvent("campaign:member_removed", {
    properties: { campaign_id: campaignId, removed_user_id: targetUserId },
  });
}

/**
 * Removes a campaign member and optionally also deletes their linked character(s).
 * Used in the unified Jogadores view (D7) when a "linked" entry is removed.
 */
export async function removeMemberAndCharacter(
  campaignId: string,
  targetUserId: string,
  alsoRemoveCharacter: boolean
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("owner_id")
    .eq("id", campaignId)
    .single();

  if (!campaign || campaign.owner_id !== user.id) {
    throw new Error("Only the campaign owner can remove members");
  }

  if (targetUserId === user.id) {
    throw new Error("Cannot remove yourself as DM");
  }

  // Order: less-destructive first to minimize blast radius of partial failure.
  // If member delete succeeds but character op fails, the character remains
  // as an orphan the DM can manage — better than the reverse.

  if (!alsoRemoveCharacter) {
    // Unlink characters so they don't carry a stale user_id after member removal
    const { error: unlinkError } = await supabase
      .from("player_characters")
      .update({ user_id: null })
      .eq("campaign_id", campaignId)
      .eq("user_id", targetUserId);

    if (unlinkError) {
      captureError(new Error(`Failed to unlink character: ${unlinkError.message}`), {
        component: "removeMemberAndCharacter",
        action: "unlinkCharacter",
        category: "database",
        extra: { campaignId, targetUserId, code: unlinkError.code },
      });
      throw new Error(`Failed to unlink character: ${unlinkError.message}`);
    }
  }

  const { error: memberError } = await supabase
    .from("campaign_members")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("user_id", targetUserId);

  if (memberError) {
    captureError(new Error(`Failed to remove member: ${memberError.message}`), {
      component: "removeMemberAndCharacter",
      action: "deleteMember",
      category: "database",
      extra: { campaignId, targetUserId, code: memberError.code },
    });
    throw new Error(`Failed to remove member: ${memberError.message}`);
  }

  if (alsoRemoveCharacter) {
    const { error: charError } = await supabase
      .from("player_characters")
      .delete()
      .eq("campaign_id", campaignId)
      .eq("user_id", targetUserId);

    if (charError) {
      captureError(new Error(`Failed to remove character: ${charError.message}`), {
        component: "removeMemberAndCharacter",
        action: "deleteCharacter",
        category: "database",
        extra: { campaignId, targetUserId, code: charError.code },
      });
      // Member already removed — character is orphaned but DM can clean up.
      // Don't throw here to avoid leaving the UI in a confusing state.
      // The member removal was the primary goal.
    }
  }

  trackServerEvent("campaign:member_removed", {
    properties: {
      campaign_id: campaignId,
      removed_user_id: targetUserId,
      also_removed_character: alsoRemoveCharacter,
    },
  });
}
