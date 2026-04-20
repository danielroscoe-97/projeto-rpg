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
