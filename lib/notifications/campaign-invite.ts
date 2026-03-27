import { Novu } from "@novu/node";
import { captureError, captureWarning } from "@/lib/errors/capture";

/**
 * Lazy-initialized Novu client.
 * Fail-open: if NOVU_API_KEY is not set, invites still work (link-only, no email).
 */
let novuClient: Novu | null = null;

function getNovuClient(): Novu | null {
  if (novuClient) return novuClient;
  const apiKey = process.env.NOVU_API_KEY;
  if (!apiKey) {
    captureWarning("NOVU_API_KEY not set — email invites disabled (link-only mode)", {
      component: "notifications/campaign-invite",
      category: "network",
    });
    return null;
  }
  novuClient = new Novu(apiKey);
  return novuClient;
}

interface CampaignInvitePayload {
  /** Recipient email address */
  email: string;
  /** DM's display name or email */
  dmName: string;
  /** Campaign name */
  campaignName: string;
  /** Full invite URL (absolute) */
  inviteLink: string;
  /** Invite token for deduplication */
  inviteToken: string;
}

/**
 * Trigger Novu `campaign-invite` workflow to send a branded email invite.
 * Fail-open: returns false if Novu is unavailable, invite link still works.
 */
export async function sendCampaignInviteEmail(payload: CampaignInvitePayload): Promise<boolean> {
  const novu = getNovuClient();
  if (!novu) return false;

  try {
    await novu.trigger("campaign-invite", {
      to: {
        subscriberId: payload.email,
        email: payload.email,
      },
      payload: {
        dm_name: payload.dmName,
        campaign_name: payload.campaignName,
        invite_link: payload.inviteLink,
      },
      transactionId: payload.inviteToken,
    });
    return true;
  } catch (error) {
    captureError(error, {
      component: "notifications/campaign-invite",
      action: "sendCampaignInviteEmail",
      category: "network",
      extra: { campaignName: payload.campaignName },
    });
    return false;
  }
}
