import { Novu } from "@novu/node";
import { captureError, captureWarning } from "@/lib/errors/capture";

let novuClient: Novu | null = null;

function getNovuClient(): Novu | null {
  if (novuClient) return novuClient;
  const apiKey = process.env.NOVU_API_KEY;
  if (!apiKey) {
    captureWarning("NOVU_API_KEY not set — campaign-joined email disabled", {
      component: "notifications/campaign-joined",
      category: "network",
    });
    return null;
  }
  novuClient = new Novu(apiKey);
  return novuClient;
}

interface CampaignJoinedPayload {
  dmEmail: string;
  dmName: string;
  playerName: string;
  playerEmail: string;
  campaignName: string;
  campaignUrl: string;
}

/**
 * Trigger Novu `campaign-member-joined` workflow to notify DM via email.
 * Fail-open: returns false if Novu is unavailable, join still works.
 */
export async function sendCampaignJoinedEmail(payload: CampaignJoinedPayload): Promise<boolean> {
  const novu = getNovuClient();
  if (!novu) return false;

  try {
    await novu.trigger("campaign-member-joined", {
      to: {
        subscriberId: payload.dmEmail,
        email: payload.dmEmail,
      },
      payload: {
        dm_name: payload.dmName,
        player_name: payload.playerName,
        player_email: payload.playerEmail,
        campaign_name: payload.campaignName,
        campaign_url: payload.campaignUrl,
      },
    });
    return true;
  } catch (error) {
    captureError(error, {
      component: "notifications/campaign-joined",
      action: "sendCampaignJoinedEmail",
      category: "network",
      extra: { campaignName: payload.campaignName },
    });
    return false;
  }
}
