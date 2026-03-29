// Types for the campaign membership system (Epic: Dual-Role Campaign)

export type CampaignRole = "dm" | "player";
export type MembershipStatus = "active" | "inactive" | "banned";

export interface CampaignMember {
  id: string;
  campaign_id: string;
  user_id: string;
  role: CampaignRole;
  joined_at: string;
  invited_by: string | null;
  status: MembershipStatus;
}

export interface UserMembership {
  role: CampaignRole;
  joined_at: string;
  campaign_id: string;
  campaign_name: string;
  campaign_description: string | null;
  dm_name: string | null;
  dm_email: string;
  player_count: number;
  active_sessions: number;
  // Player-specific (only when role='player')
  character_name?: string | null;
  character_hp?: number | null;
  character_max_hp?: number | null;
}

export interface CampaignInviteWithDetails {
  id: string;
  campaign_id: string;
  campaign_name: string;
  dm_name: string;
  dm_email: string;
  token: string;
  status: "pending" | "accepted" | "expired";
  created_at: string;
  expires_at: string;
}
