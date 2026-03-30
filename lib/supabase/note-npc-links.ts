"use client";

import { createClient } from "./client";
import type { NoteNpcLink } from "@/lib/types/note-npc-links";

/** Get all NPC IDs linked to a specific note. */
export async function getNoteNpcLinks(noteId: string): Promise<NoteNpcLink[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("note_npc_links")
    .select("*")
    .eq("note_id", noteId);

  if (error) throw new Error(`Failed to fetch note-NPC links: ${error.message}`);
  return data ?? [];
}

/** Get all note IDs linked to a specific NPC. */
export async function getNpcNoteLinks(npcId: string): Promise<NoteNpcLink[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("note_npc_links")
    .select("*")
    .eq("npc_id", npcId);

  if (error) throw new Error(`Failed to fetch NPC-note links: ${error.message}`);
  return data ?? [];
}

/** Create a link between a note and an NPC. */
export async function linkNoteToNpc(noteId: string, npcId: string): Promise<NoteNpcLink> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("note_npc_links")
    .insert({ note_id: noteId, npc_id: npcId })
    .select()
    .single();

  if (error) throw new Error(`Failed to link note to NPC: ${error.message}`);
  return data;
}

/** Remove a link between a note and an NPC. */
export async function unlinkNoteFromNpc(noteId: string, npcId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("note_npc_links")
    .delete()
    .eq("note_id", noteId)
    .eq("npc_id", npcId);

  if (error) throw new Error(`Failed to unlink note from NPC: ${error.message}`);
}

/** Get all note-NPC links for a campaign (bulk load for efficiency). */
export async function getCampaignNoteNpcLinks(campaignId: string): Promise<NoteNpcLink[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("note_npc_links")
    .select("*, campaign_notes!inner(campaign_id)")
    .eq("campaign_notes.campaign_id", campaignId);

  if (error) throw new Error(`Failed to fetch campaign note-NPC links: ${error.message}`);
  // Strip the joined data and return only link fields
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    note_id: row.note_id as string,
    npc_id: row.npc_id as string,
  }));
}
