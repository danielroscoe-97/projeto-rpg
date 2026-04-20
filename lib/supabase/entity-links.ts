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
import {
  extractMentionRefs,
  type MentionEntityType,
} from "@/lib/utils/mention-parser";

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

/**
 * Reconcile `mentions` edges from a source entity to whatever is referenced
 * in a free-form text field (note body, NPC description, faction lore, …).
 *
 * Diff-based: parses `@[type:uuid]` tokens out of `text`, compares against
 * the subset of `existingEdges` whose `relationship === 'mentions'` and
 * `(source_type, source_id)` match the given `source`, and emits the
 * minimum set of upserts + deletes to converge.
 *
 * Partial failures are surfaced via the returned result, not thrown — this
 * mirrors CampaignNotes.syncNoteMentions semantics so rapid edits never
 * leave the UI wedged. Callers should log rejected tasks via `captureError`.
 *
 * Scope: this helper does NOT touch edges that point at entity types outside
 * the `MentionEntityType` union (npc / location / faction / quest). Legacy
 * `mentions` edges linking to other types (if any exist) are left alone —
 * they were not created via the `@` syntax and should not be garbage-
 * collected by it.
 */
export async function syncTextMentions(
  campaignId: string,
  source: EntityRef,
  text: string,
  existingEdges: EntityLink[],
): Promise<{ added: EntityLink[]; removedEdgeIds: string[] }> {
  const MENTION_TYPES: readonly MentionEntityType[] = [
    "npc",
    "location",
    "faction",
    "quest",
  ];

  // Narrow `existingEdges` to the source's outgoing `mentions` edges that
  // target a mention-eligible entity type. Any other edge (e.g. `lives_in`,
  // or a `mentions` edge to a `session`) is out of scope.
  const relevant = existingEdges.filter(
    (e) =>
      e.relationship === "mentions" &&
      e.source_type === source.type &&
      e.source_id === source.id &&
      (MENTION_TYPES as readonly string[]).includes(e.target_type),
  );

  const parsedRefs = extractMentionRefs(text);
  const parsedKeys = new Set(parsedRefs.map((r) => `${r.type}:${r.id}`));
  const existingKeys = new Set(
    relevant.map((e) => `${e.target_type}:${e.target_id}`),
  );

  type SyncTask =
    | { kind: "added"; edge: EntityLink }
    | { kind: "removed"; edgeId: string };

  const tasks: Array<Promise<SyncTask>> = [];

  // Additions: parsed refs not present in the existing edge set.
  for (const ref of parsedRefs) {
    const key = `${ref.type}:${ref.id}`;
    if (existingKeys.has(key)) continue;
    tasks.push(
      upsertEntityLink(
        campaignId,
        source,
        { type: ref.type, id: ref.id },
        "mentions",
      ).then<SyncTask>((edge) => ({ kind: "added", edge })),
    );
  }

  // Removals: existing edges whose target no longer appears in the text.
  for (const edge of relevant) {
    const key = `${edge.target_type}:${edge.target_id}`;
    if (parsedKeys.has(key)) continue;
    const edgeId = edge.id;
    tasks.push(
      unlinkEntities(edgeId).then<SyncTask>(() => ({
        kind: "removed",
        edgeId,
      })),
    );
  }

  const results = await Promise.allSettled(tasks);
  const added: EntityLink[] = [];
  const removedEdgeIds: string[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    if (r.value.kind === "added") added.push(r.value.edge);
    else removedEdgeIds.push(r.value.edgeId);
  }

  return { added, removedEdgeIds };
}
