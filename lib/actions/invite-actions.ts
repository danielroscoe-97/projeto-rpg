"use server";

import {
  getCampaignMembers as _getCampaignMembers,
  removeCampaignMember as _removeCampaignMember,
  removeMemberAndCharacter as _removeMemberAndCharacter,
} from "@/lib/supabase/campaign-membership";

/**
 * Server Action wrappers for campaign membership operations.
 * Safe to call from client components.
 *
 * The email-invite accept/decline wrappers used to live here
 * (`acceptInviteAction`, `declineInviteAction`) and were removed together
 * with the `campaign_invites` table (migration 180, 2026-04-21). The
 * canonical accept flow is `/join-campaign/[code]`.
 */

export async function getCampaignMembersAction(campaignId: string) {
  return _getCampaignMembers(campaignId);
}

export async function removeCampaignMemberAction(
  campaignId: string,
  targetUserId: string
) {
  return _removeCampaignMember(campaignId, targetUserId);
}

export async function removeMemberAndCharacterAction(
  campaignId: string,
  userId: string,
  alsoRemoveCharacter: boolean
): Promise<void> {
  return _removeMemberAndCharacter(campaignId, userId, alsoRemoveCharacter);
}
