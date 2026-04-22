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
import { captureError } from "@/lib/errors/capture";
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

// Dual-table NPC edges — LEGACY MIRROR-WRITE.
//
// Context: `note_npc_links` is the older NPC-only table (predates the unified
// `campaign_mind_map_edges` graph). The NPC chip renderer in
// `components/campaign/CampaignNotes.tsx` still reads NPC edges from that
// legacy table via `linksByNote`, while Location/Faction/Quest chips already
// read from the unified edges via `mentionsByNote`. Without mirroring,
// typing `@[npc:uuid]` in a note body writes the edge but does NOT populate
// the legacy row, so the NPC chip never appears — a silent inconsistency
// that the 2026-04-22 handoff doc flags as the "NPC auto-link gap".
//
// The explicit dual-write lives in CampaignNotes.handleLinkNpc /
// handleUnlinkNpc; this helper mirrors the same behaviour for the
// @-mention-driven sync path so the two chip surfaces stay in lockstep
// regardless of which path created the edge.
//
// Scope: only fires when `source.type === "note"` and the counterparty is
// an NPC — the legacy table keys on `(note_id, npc_id)` and has no meaning
// for other source types. All writes are best-effort (wrapped in try/catch,
// failures go to captureError); the primary edge mutation outcome is never
// affected by a legacy mirror failure.
//
// Next sprint: deprecate `note_npc_links` and switch `linksByNote` to read
// from `campaign_mind_map_edges` (already the source of truth) — see
// docs/next-session-prompt-2026-04-22.md §3 and docs/PRD-entity-graph.md
// Fase 3e. At that point this mirror-write can be deleted.

/** True when edge endpoint represents a (note, npc) pair. */
function isNoteNpcPair(
  sourceType: string,
  targetType: string,
): boolean {
  return sourceType === "note" && targetType === "npc";
}

/** Best-effort mirror insert into legacy `note_npc_links`. Idempotent:
 * the `(note_id, npc_id)` unique constraint makes duplicates surface as
 * error code `23505`; we swallow those silently. Any other failure is
 * logged but never propagated — the primary edge upsert already succeeded. */
async function mirrorInsertLegacyNpcLink(
  client: ReturnType<typeof createClient>,
  noteId: string,
  npcId: string,
): Promise<void> {
  try {
    const { error } = await client
      .from("note_npc_links")
      .insert({ note_id: noteId, npc_id: npcId });
    if (!error) return;
    // PostgREST / PostgreSQL duplicate-key violation — expected on re-sync.
    // Code field shape: `error.code === "23505"` from supabase-js.
    const code = (error as { code?: string } | null)?.code;
    if (code === "23505") return;
    captureError(error, {
      component: "entity-links",
      action: "syncTextMentions.mirrorInsertLegacyNpcLink",
      category: "database",
      extra: { noteId, npcId },
    });
  } catch (err) {
    captureError(err, {
      component: "entity-links",
      action: "syncTextMentions.mirrorInsertLegacyNpcLink",
      category: "network",
      extra: { noteId, npcId },
    });
  }
}

/** Best-effort mirror delete from legacy `note_npc_links`. No-ops if the
 * row is already gone. Failures are logged but never propagated. */
async function mirrorDeleteLegacyNpcLink(
  client: ReturnType<typeof createClient>,
  noteId: string,
  npcId: string,
): Promise<void> {
  try {
    const { error } = await client
      .from("note_npc_links")
      .delete()
      .eq("note_id", noteId)
      .eq("npc_id", npcId);
    if (error) {
      captureError(error, {
        component: "entity-links",
        action: "syncTextMentions.mirrorDeleteLegacyNpcLink",
        category: "database",
        extra: { noteId, npcId },
      });
    }
  } catch (err) {
    captureError(err, {
      component: "entity-links",
      action: "syncTextMentions.mirrorDeleteLegacyNpcLink",
      category: "network",
      extra: { noteId, npcId },
    });
  }
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
 *
 * Dual-table mirror-write: note→npc edges are additionally mirrored into
 * `note_npc_links` (legacy). See the block comment above `isNoteNpcPair`
 * for rationale + deprecation plan.
 */
export async function syncTextMentions(
  campaignId: string,
  source: EntityRef,
  text: string,
  existingEdges: EntityLink[],
  /**
   * Additional refs that must be preserved even if absent from `text`. Use
   * this when the caller has a parallel source of truth (e.g. explicit chip
   * selectors in CampaignNotes) — those refs are already represented as
   * edges by some other code path, and syncTextMentions must not garbage-
   * collect them just because they aren't re-stated inline as `@[type:uuid]`.
   */
  preserveRefs: ReadonlyArray<{ type: MentionEntityType; id: string }> = [],
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
  // Keys to NEVER delete: union of text-parsed refs and caller-supplied
  // preserveRefs. The "desired final set" of edges is this union.
  const desiredKeys = new Set(parsedKeys);
  for (const r of preserveRefs) desiredKeys.add(`${r.type}:${r.id}`);
  const existingKeys = new Set(
    relevant.map((e) => `${e.target_type}:${e.target_id}`),
  );

  type SyncTask =
    | { kind: "added"; edge: EntityLink }
    | { kind: "removed"; edgeId: string };

  const tasks: Array<Promise<SyncTask>> = [];
  // Shared client for the legacy mirror-writes below, lazy-initialized so
  // we skip the auth/session setup entirely when a given sync call has no
  // NPC edges to mirror (e.g. user typed only location mentions).
  let _legacyClient: ReturnType<typeof createClient> | null = null;
  const getLegacyClient = () => (_legacyClient ??= createClient());

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
      ).then<SyncTask>(async (edge) => {
        // Legacy mirror-write: only meaningful for note → npc edges.
        // See the dual-table comment above for rationale.
        if (isNoteNpcPair(source.type, ref.type)) {
          await mirrorInsertLegacyNpcLink(getLegacyClient(), source.id, ref.id);
        }
        return { kind: "added", edge };
      }),
    );
  }

  // Removals: existing edges whose target no longer appears in the text
  // AND is not in the preservation set. This is the load-bearing merge
  // with explicit chip selectors — a chip-only ref stays alive even if
  // the user never inlined it with `@`.
  for (const edge of relevant) {
    const key = `${edge.target_type}:${edge.target_id}`;
    if (desiredKeys.has(key)) continue;
    const edgeId = edge.id;
    // Capture the (note_id, npc_id) pair off the edge BEFORE deletion so
    // we can mirror the remove into the legacy table. The edge carries
    // both endpoints (source_type/source_id + target_type/target_id) —
    // these are what we need; the `removed` branch has no parsed `ref`
    // (removal is driven by iterating existing edges, not parsed text).
    const legacyNoteId = edge.source_id;
    const legacyNpcId = edge.target_id;
    // `relevant` (lines 330-336) already guarantees `source_type === source.type`
    // — in practice the call site always passes `source.type === "note"`, so
    // only the `target_type === "npc"` half of this predicate discriminates.
    // Kept as a full pair check for defense-in-depth against future callers
    // that might sync a non-note source.
    const shouldMirror = isNoteNpcPair(edge.source_type, edge.target_type);
    tasks.push(
      unlinkEntities(edgeId).then<SyncTask>(async () => {
        if (shouldMirror) {
          await mirrorDeleteLegacyNpcLink(
            getLegacyClient(),
            legacyNoteId,
            legacyNpcId,
          );
        }
        return { kind: "removed", edgeId };
      }),
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
