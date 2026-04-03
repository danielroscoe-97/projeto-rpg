export interface NpcStats {
  hp?: number;
  ac?: number;
  initiative_mod?: number;
  cr?: string;
  notes?: string;
}

export interface CampaignNpc {
  id: string;
  campaign_id: string | null; // null for global NPCs
  user_id: string;
  name: string;
  description: string | null;
  stats: NpcStats;
  avatar_url: string | null;
  is_visible_to_players: boolean;
  created_at: string;
  updated_at: string;
}

export type CampaignNpcInsert = Omit<CampaignNpc, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type CampaignNpcUpdate = Partial<Omit<CampaignNpc, 'id' | 'campaign_id' | 'user_id' | 'created_at'>>;
