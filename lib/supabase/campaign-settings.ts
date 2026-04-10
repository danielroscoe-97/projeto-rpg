"use server";

import { createClient, createServiceClient } from "./server";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { captureError } from "@/lib/errors/capture";
import type { CampaignSettings as CampaignSettingsRow } from "@/lib/types/database";

// ── Helpers ──

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

// ── Public API ──

/**
 * Creates a campaign with associated settings and DM membership in one flow.
 * Uses service client for atomic operations bypassing RLS where needed.
 *
 * Steps:
 * 1. Insert into `campaigns` (name, owner_id, description, join_code)
 * 2. Insert into `campaign_settings` (campaign_id, defaults)
 * 3. Insert into `campaign_members` (campaign_id, user_id, role: dm, status: active)
 * 4. Return { campaignId, joinCode }
 */
export async function createCampaignWithSettings(
  userId: string,
  name: string,
  description?: string
): Promise<{ campaignId: string; joinCode: string } | null> {
  // Verify caller is the authenticated user
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user || user.id !== userId) {
    captureError(new Error("Authentication mismatch in createCampaignWithSettings"), {
      component: "campaign-settings",
      action: "createCampaignWithSettings",
      category: "auth",
      extra: { userId },
    });
    return null;
  }

  const supabase = createServiceClient();
  const joinCode = generateJoinCode();

  try {
    // 1. Insert campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        owner_id: userId,
        name,
        description: description || null,
        join_code: joinCode,
        join_code_active: true,
      })
      .select("id")
      .single();

    if (campaignError || !campaign) {
      captureError(campaignError ?? new Error("No campaign returned"), {
        component: "campaign-settings",
        action: "insertCampaign",
        category: "database",
        extra: { userId },
      });
      return null;
    }

    const campaignId = campaign.id;

    // 2. Insert campaign_settings with defaults
    const { error: settingsError } = await supabase
      .from("campaign_settings")
      .insert({
        campaign_id: campaignId,
        game_system: "5e",
        party_level: 1,
        is_oneshot: false,
        allow_spectators: false,
        max_players: 8,
        onboarding_completed: false,
      });

    if (settingsError) {
      // Non-fatal: campaign was created, settings table might not exist yet
      captureError(settingsError, {
        component: "campaign-settings",
        action: "insertSettings",
        category: "database",
        extra: { campaignId },
      });
    }

    // 3. Insert campaign_members (DM role)
    const { error: memberError } = await supabase
      .from("campaign_members")
      .insert({
        campaign_id: campaignId,
        user_id: userId,
        role: "dm",
        status: "active",
      });

    if (memberError) {
      captureError(memberError, {
        component: "campaign-settings",
        action: "insertMember",
        category: "database",
        extra: { campaignId, userId },
      });
      // Critical: DM membership failed — clean up orphaned campaign
      await supabase.from("campaigns").delete().eq("id", campaignId);
      return null;
    }

    trackServerEvent("campaign:created_with_wizard", {
      properties: { campaign_id: campaignId, has_description: !!description },
    });

    return { campaignId, joinCode };
  } catch (err) {
    captureError(err, {
      component: "campaign-settings",
      action: "createCampaignWithSettings",
      category: "database",
      extra: { userId },
    });
    return null;
  }
}

/**
 * Updates campaign settings for a given campaign.
 * Uses the authenticated user's client (RLS enforced).
 */
export async function updateCampaignSettings(
  campaignId: string,
  settings: Partial<{
    game_system: string;
    party_level: number;
    theme: string;
    description: string;
    is_oneshot: boolean;
    max_players: number;
    onboarding_completed: boolean;
  }>
): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("campaign_settings")
      .update(settings)
      .eq("campaign_id", campaignId);

    if (error) {
      captureError(error, {
        component: "campaign-settings",
        action: "updateSettings",
        category: "database",
        extra: { campaignId },
      });
      return false;
    }

    return true;
  } catch (err) {
    captureError(err, {
      component: "campaign-settings",
      action: "updateSettings",
      category: "database",
      extra: { campaignId },
    });
    return false;
  }
}

/**
 * Fetches campaign settings for a given campaign.
 */
export async function getCampaignSettings(
  campaignId: string
): Promise<CampaignSettingsRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_settings")
    .select("*")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) {
    captureError(error, {
      component: "campaign-settings",
      action: "getSettings",
      category: "database",
      extra: { campaignId },
    });
    return null;
  }

  return data as CampaignSettingsRow | null;
}
