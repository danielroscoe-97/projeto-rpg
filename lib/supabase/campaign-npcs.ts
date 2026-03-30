"use client";

import { createClient } from "./client";
import type {
  CampaignNpc,
  CampaignNpcInsert,
  CampaignNpcUpdate,
  NpcStats,
} from "@/lib/types/campaign-npcs";

function mapRow(row: Record<string, unknown>): CampaignNpc {
  return {
    id: row.id as string,
    campaign_id: row.campaign_id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    stats: (row.stats as NpcStats) ?? {},
    avatar_url: (row.avatar_url as string) ?? null,
    is_visible_to_players: row.is_visible_to_players as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** List all NPCs for a campaign, ordered by name. */
export async function getNpcs(campaignId: string): Promise<CampaignNpc[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaign_npcs")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("name");

  if (error) throw new Error(`Failed to fetch NPCs: ${error.message}`);
  return (data ?? []).map(mapRow);
}

/** Get a single NPC by ID. */
export async function getNpc(npcId: string): Promise<CampaignNpc | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaign_npcs")
    .select("*")
    .eq("id", npcId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch NPC: ${error.message}`);
  return data ? mapRow(data) : null;
}

/** Create a new NPC. */
export async function createNpc(npc: CampaignNpcInsert): Promise<CampaignNpc> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaign_npcs")
    .insert({
      campaign_id: npc.campaign_id,
      name: npc.name,
      description: npc.description,
      stats: npc.stats,
      avatar_url: npc.avatar_url,
      is_visible_to_players: npc.is_visible_to_players,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create NPC: ${error.message}`);
  return mapRow(data);
}

/** Update an existing NPC. */
export async function updateNpc(
  npcId: string,
  updates: CampaignNpcUpdate
): Promise<CampaignNpc> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaign_npcs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", npcId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update NPC: ${error.message}`);
  return mapRow(data);
}

/** Delete an NPC by ID. */
export async function deleteNpc(npcId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("campaign_npcs")
    .delete()
    .eq("id", npcId);

  if (error) throw new Error(`Failed to delete NPC: ${error.message}`);
}

/** Toggle NPC visibility for players. */
export async function toggleNpcVisibility(
  npcId: string,
  visible: boolean
): Promise<CampaignNpc> {
  return updateNpc(npcId, { is_visible_to_players: visible });
}
