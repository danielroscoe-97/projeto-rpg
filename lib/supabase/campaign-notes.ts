import { createClient } from "./client";
import type { CampaignNoteFolder } from "@/lib/types/database";

/**
 * Fetch all folders for a campaign, ordered by sort_order.
 */
export async function getFolders(
  campaignId: string,
): Promise<CampaignNoteFolder[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaign_note_folders")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Create a new folder inside a campaign.
 */
export async function createFolder(
  campaignId: string,
  name: string,
  parentId?: string | null,
): Promise<CampaignNoteFolder> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaign_note_folders")
    .insert({
      campaign_id: campaignId,
      name,
      parent_id: parentId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Rename a folder.
 */
export async function updateFolder(
  folderId: string,
  name: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("campaign_note_folders")
    .update({ name })
    .eq("id", folderId);

  if (error) throw error;
}

/**
 * Delete a folder. Notes inside become unfiled (ON DELETE SET NULL).
 */
export async function deleteFolder(folderId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("campaign_note_folders")
    .delete()
    .eq("id", folderId);

  if (error) throw error;
}

/**
 * Move a note into a folder (or set null to unfile).
 */
export async function moveNoteToFolder(
  noteId: string,
  folderId: string | null,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("campaign_notes")
    .update({ folder_id: folderId, updated_at: new Date().toISOString() })
    .eq("id", noteId);

  if (error) throw error;
}

/**
 * Toggle note shared/private visibility.
 */
export async function toggleNoteShared(
  noteId: string,
  isShared: boolean,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("campaign_notes")
    .update({ is_shared: isShared, updated_at: new Date().toISOString() })
    .eq("id", noteId);

  if (error) throw error;
}
