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
