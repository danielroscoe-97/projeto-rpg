import { createClient } from "./client";
import type {
  CampaignNote,
  CampaignNoteVisibility,
  JournalEntryVisibility,
} from "@/lib/types/database";

/**
 * Player <-> DM notes visibility helpers (Wave 4 / Migration 149).
 *
 * Spec: docs/SPEC-player-notes-visibility.md
 *
 * Security: every function here relies on the RLS policies added in migration
 * 149. Never bypass via service_role from a client bundle.
 */

/**
 * Toggle the visibility of a player journal entry (quick note / journal / lore).
 *
 * Only the authoring player can call this (RLS `journal_author_update`).
 */
export async function updateJournalEntryVisibility(
  entryId: string,
  visibility: JournalEntryVisibility,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("player_journal_entries")
    .update({ visibility, updated_at: new Date().toISOString() })
    .eq("id", entryId);
  if (error) throw error;
}

/**
 * DM creates a private note targeted at a specific player character.
 *
 * Visibility is forced to `dm_private_to_player`. Target is mandatory (CHECK
 * constraint at DB). `is_shared` is explicitly false so the legacy
 * `campaign_notes_shared_read` policy does not widen visibility.
 */
export async function createDmPrivateNote(input: {
  campaignId: string;
  dmUserId: string;
  targetCharacterId: string;
  title: string;
  content: string;
}): Promise<CampaignNote> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaign_notes")
    .insert({
      campaign_id: input.campaignId,
      user_id: input.dmUserId,
      title: input.title,
      content: input.content,
      visibility: "dm_private_to_player",
      target_character_id: input.targetCharacterId,
      is_shared: false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Update the visibility of an existing campaign_note.
 *
 * NOTE: if moving TO `dm_private_to_player`, callers MUST pass
 * `targetCharacterId`, otherwise the DB CHECK constraint rejects the update.
 * If moving OUT OF `dm_private_to_player`, we also clear the target to satisfy
 * the inverse CHECK.
 */
export async function updateCampaignNoteVisibility(
  noteId: string,
  visibility: CampaignNoteVisibility,
  targetCharacterId: string | null = null,
): Promise<void> {
  if (visibility === "dm_private_to_player" && !targetCharacterId) {
    throw new Error(
      "dm_private_to_player requires a targetCharacterId (DB CHECK would reject).",
    );
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("campaign_notes")
    .update({
      visibility,
      target_character_id:
        visibility === "dm_private_to_player" ? targetCharacterId : null,
      // Keep is_shared mirrored for transitional compat (migration window).
      is_shared: visibility === "campaign_public",
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId);
  if (error) throw error;
}
