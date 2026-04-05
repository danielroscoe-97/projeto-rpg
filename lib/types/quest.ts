export type QuestStatus = "available" | "active" | "completed" | "failed" | "cancelled";
export type QuestType = "main" | "side" | "bounty" | "escort" | "fetch";

export const QUEST_STATUSES: QuestStatus[] = ["available", "active", "completed", "failed", "cancelled"];
export const QUEST_TYPES: QuestType[] = ["main", "side", "bounty", "escort", "fetch"];

export interface CampaignQuest {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  status: QuestStatus;
  quest_type: QuestType;
  context: string;
  objective: string;
  reward: string;
  image_url: string | null;
  is_visible_to_players: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuestFormData {
  title: string;
  description?: string;
  status?: QuestStatus;
  quest_type?: QuestType;
  context?: string;
  objective?: string;
  reward?: string;
  image_url?: string | null;
  is_visible_to_players?: boolean;
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
