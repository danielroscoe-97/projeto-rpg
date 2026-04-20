/**
 * Entity Graph — shared types.
 *
 * See docs/PRD-entity-graph.md §6.2.
 * Backed by the SQL table `campaign_mind_map_edges` (mig 080 + 147 + 148).
 *
 * Foundation (Fase 3a) exports the generic API types. UI helpers live under
 * `lib/supabase/entity-links.ts` and `lib/hooks/useEntityLinks.ts`.
 */

/**
 * All entity types that may participate in the graph as source or target.
 * Must match the CHECK constraints on campaign_mind_map_edges.source_type /
 * target_type (mig 080). Keep this union in sync with the SQL CHECK.
 */
export type EntityType =
  | "npc"
  | "location"
  | "faction"
  | "note"
  | "quest"
  | "session"
  | "encounter"
  | "player"
  | "bag_item";

/**
 * Subset of EntityType the Entity Graph feature exposes through its UI flows
 * (PRD §7). Other types (`session`, `encounter`, `player`, `bag_item`) exist
 * as legitimate edge endpoints but are not first-class nodes in the user-
 * facing graph editor yet. Use EntityType for storage, PrimaryEntityType
 * for UI selectors.
 */
export type PrimaryEntityType = "npc" | "location" | "faction" | "note" | "quest";

export const PRIMARY_ENTITY_TYPES: PrimaryEntityType[] = [
  "npc",
  "location",
  "faction",
  "note",
  "quest",
];

/**
 * All relationship strings accepted by the CHECK constraint
 * `mind_map_edges_relationship_check` after mig 148.
 * Keep in sync with supabase/migrations/148_entity_graph_relationships.sql.
 */
export type EdgeRelationship =
  // Original (mig 080)
  | "linked_to"
  | "lives_in"
  | "participated_in"
  | "requires"
  | "leads_to"
  | "allied_with"
  | "enemy_of"
  | "gave_quest"
  | "dropped_item"
  | "member_of"
  | "happened_at"
  | "guards"
  | "owns"
  | "custom"
  // Entity Graph additions (mig 148)
  | "headquarters_of"
  | "rival_of"
  | "family_of"
  | "mentions";

export const EDGE_RELATIONSHIPS: EdgeRelationship[] = [
  "linked_to",
  "lives_in",
  "participated_in",
  "requires",
  "leads_to",
  "allied_with",
  "enemy_of",
  "gave_quest",
  "dropped_item",
  "member_of",
  "happened_at",
  "guards",
  "owns",
  "custom",
  "headquarters_of",
  "rival_of",
  "family_of",
  "mentions",
];

/**
 * A single edge row loaded from `campaign_mind_map_edges`. Mirrors the
 * existing `MindMapEdge` in lib/types/mind-map.ts but extends the type
 * unions with post-148 relationships. The two types are interop-compatible;
 * Entity Graph code should prefer this one.
 */
export interface EntityLink {
  id: string;
  campaign_id: string;
  source_type: EntityType;
  source_id: string;
  target_type: EntityType;
  target_id: string;
  relationship: EdgeRelationship;
  custom_label: string | null;
  created_by: string;
  created_at: string;
}

/** Reference to a single entity. */
export interface EntityRef {
  type: EntityType;
  id: string;
}

/** Direction of an edge relative to a focus entity. */
export type EdgeDirection = "outgoing" | "incoming" | "any";

/**
 * Pure selector: find every counterparty id in `edges` where the focus
 * entity participates as the given direction, and the edge matches
 * `counterpartyType` + optional `relationship`.
 *
 * Example: list locations where NPC X lives in:
 *   selectCounterpartyIds(edges, { type: 'npc', id: 'uuid-x' },
 *     { direction: 'outgoing', counterpartyType: 'location',
 *       relationship: 'lives_in' })
 */
export function selectCounterpartyIds(
  edges: readonly EntityLink[],
  focus: EntityRef,
  filter: {
    direction: EdgeDirection;
    counterpartyType?: EntityType;
    relationship?: EdgeRelationship;
  },
): string[] {
  const ids = new Set<string>();
  for (const edge of edges) {
    const isSource = edge.source_type === focus.type && edge.source_id === focus.id;
    const isTarget = edge.target_type === focus.type && edge.target_id === focus.id;

    if (filter.direction === "outgoing" && !isSource) continue;
    if (filter.direction === "incoming" && !isTarget) continue;
    if (filter.direction === "any" && !isSource && !isTarget) continue;

    if (filter.relationship && edge.relationship !== filter.relationship) continue;

    const counterpartyType = isSource ? edge.target_type : edge.source_type;
    const counterpartyId = isSource ? edge.target_id : edge.source_id;

    if (filter.counterpartyType && counterpartyType !== filter.counterpartyType) {
      continue;
    }
    ids.add(counterpartyId);
  }
  return Array.from(ids);
}

/**
 * Pure selector: find the single edge id linking focus → counterparty with
 * the given relationship. Returns null if not found.
 */
export function findEdgeId(
  edges: readonly EntityLink[],
  focus: EntityRef,
  counterparty: EntityRef,
  relationship: EdgeRelationship,
): string | null {
  const match = edges.find(
    (e) =>
      e.source_type === focus.type &&
      e.source_id === focus.id &&
      e.target_type === counterparty.type &&
      e.target_id === counterparty.id &&
      e.relationship === relationship,
  );
  return match?.id ?? null;
}
