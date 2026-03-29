"use server";

import {
  acceptCampaignInvite as _acceptCampaignInvite,
  declineCampaignInvite as _declineCampaignInvite,
} from "@/lib/supabase/campaign-membership";

/**
 * Server Action wrappers for campaign invite operations.
 * These are safe to call from client components.
 */

export async function acceptInviteAction(token: string) {
  return _acceptCampaignInvite(token);
}

export async function declineInviteAction(inviteId: string) {
  return _declineCampaignInvite(inviteId);
}
