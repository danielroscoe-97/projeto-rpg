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
  cover_image_url?: string | null;
  dm_name: string | null;
  dm_email: string;
  player_count: number;
  active_sessions: number;
  // Player-specific (only when role='player')
  character_name?: string | null;
  character_hp?: number | null;
  character_max_hp?: number | null;
  character_race?: string | null;
  character_class?: string | null;
  character_level?: number | null;
}

export interface CampaignMemberWithUser {
  id: string;
  campaign_id: string;
  user_id: string;
  role: CampaignRole;
  joined_at: string;
  status: MembershipStatus;
  display_name: string | null;
  email: string;
  character_name: string | null;
  character_id: string | null;
  character_class: string | null;
}

// CampaignInviteWithDetails removed in 2026-04-21 with the email-invite flow
// (migration 179). The /join-campaign/[code] flow does not need a typed row
// because it consumes session_tokens directly; see `app/join-campaign/[code]`.
