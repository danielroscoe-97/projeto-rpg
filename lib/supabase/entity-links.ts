"use client";

/**
 * Entity Graph — generic link API.
 *
 * Backed by `campaign_mind_map_edges` (see mig 080 + 147 + 148).
 * Additive to lib/supabase/note-npc-links.ts — that legacy helper remains
 * operational until Fase 3e migrates it away.
 *
 * See docs/PRD-entity-graph.md §6.2, §8 Fase 3a.
 */

import { createClient } from "./client";
import type {
  EntityLink,
  EntityRef,
  EdgeRelationship,
} from "@/lib/types/entity-links";

/**
 * Create an edge between two entities in a campaign.
 *
 * Idempotent: the unique constraint
 * `(campaign_id, source_type, source_id, target_type, target_id)` (mig 080)
 * means reruns with the same inputs surface as a duplicate-key error. Callers
 * that want upsert semantics should use `upsertEntityLink` instead.
 *
 * RLS: campaign owner can manage (mig 080 policy). Members cannot write.
 * Scope: rejected by trigger `campaign_mind_map_edges_scope` (mig 147) if
 * either endpoint is not in the campaign.
 */
export async function linkEntities(
  campaignId: string,
  source: EntityRef,
  target: EntityRef,
  relationship: EdgeRelationship,
  customLabel: string | null = null,
): Promise<EntityLink> {
  const supabase = createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    throw new Error(
      `linkEntities: no authenticated user — edges require Auth (RF-21)`,
    );
  }

  const payload = {
    campaign_id: campaignId,
    source_type: source.type,
    source_id: source.id,
    target_type: target.type,
    target_id: target.id,
    relationship,
    custom_label: customLabel,
    created_by: userData.user.id,
  };

  const { data, error } = await supabase
    .from("campaign_mind_map_edges")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to link entities: ${error.message}`);
  }
  return data as EntityLink;
}

/**
 * Upsert variant: if the (campaign_id, source, target) tuple already exists,
 * returns the existing row with relationship/custom_label updated. Useful
 * for inline-linking flows (§7.8) that re-save the same edge.
 */
export async function upsertEntityLink(
  campaignId: string,
  source: EntityRef,
  target: EntityRef,
  relationship: EdgeRelationship,
  customLabel: string | null = null,
): Promise<EntityLink> {
  const supabase = createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    throw new Error(
      `upsertEntityLink: no authenticated user — edges require Auth (RF-21)`,
    );
  }

  const payload = {
    campaign_id: campaignId,
    source_type: source.type,
    source_id: source.id,
    target_type: target.type,
    target_id: target.id,
    relationship,
    custom_label: customLabel,
    created_by: userData.user.id,
  };

  const { data, error } = await supabase
    .from("campaign_mind_map_edges")
    .upsert(payload, {
      onConflict: "campaign_id,source_type,source_id,target_type,target_id",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert entity link: ${error.message}`);
  }
  return data as EntityLink;
}

/**
 * Delete an edge by its primary key.
 * RLS policy blocks non-owner deletes automatically.
 */
export async function unlinkEntities(edgeId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("campaign_mind_map_edges")
    .delete()
    .eq("id", edgeId);

  if (error) {
    throw new Error(`Failed to unlink entities: ${error.message}`);
  }
}

/**
 * List every edge where the given entity is either source OR target inside
 * the campaign. Result is sorted by created_at asc (stable).
 */
export async function listEntityLinks(
  campaignId: string,
  entity: EntityRef,
): Promise<EntityLink[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaign_mind_map_edges")
    .select("*")
    .eq("campaign_id", campaignId)
    .or(
      [
        `and(source_type.eq.${entity.type},source_id.eq.${entity.id})`,
        `and(target_type.eq.${entity.type},target_id.eq.${entity.id})`,
      ].join(","),
    )
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list entity links: ${error.message}`);
  }
  return (data ?? []) as EntityLink[];
}

/**
 * List every edge in a campaign. Mainly for admin/debug views; the Mind Map
 * already has its own loader via `get_player_visible_nodes` RPC.
 */
export async function listCampaignEdges(
  campaignId: string,
): Promise<EntityLink[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaign_mind_map_edges")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list campaign edges: ${error.message}`);
  }
  return (data ?? []) as EntityLink[];
}
