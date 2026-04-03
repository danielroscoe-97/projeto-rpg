export type QuestStatus = "available" | "active" | "completed";

export interface CampaignQuest {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  status: QuestStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuestFormData {
  title: string;
  description?: string;
  status?: QuestStatus;
}

export interface PlayerQuestNote {
  id: string;
  quest_id: string;
  user_id: string;
  campaign_id: string;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestWithPlayerNotes extends CampaignQuest {
  player_quest_notes: PlayerQuestNote[] | null;
}
