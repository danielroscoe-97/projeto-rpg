"use server";

import { createClient, createServiceClient } from "./server";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { captureError } from "@/lib/errors/capture";
import type { CampaignSettings as CampaignSettingsRow } from "@/lib/types/database";

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

  try {
    // Atomic RPC: creates campaign + settings in a single transaction
    // DM membership is auto-inserted by DB trigger handle_new_campaign()
    const { data, error } = await supabase.rpc("create_campaign_with_settings", {
      p_owner_id: userId,
      p_name: name,
      p_description: description || null,
    });

    if (error || !data) {
      captureError(error ?? new Error("No data returned from RPC"), {
        component: "campaign-settings",
        action: "createCampaignWithSettings",
        category: "database",
        extra: { userId },
      });
      return null;
    }

    const { campaign_id: campaignId, join_code: joinCode } = data as {
      campaign_id: string;
      join_code: string;
    };

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
