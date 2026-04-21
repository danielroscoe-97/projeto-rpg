/**
 * Mention parser — `@[type:uuid]` inline tokens.
 *
 * Pure module (no React, no DOM, no Supabase) so it can be unit-tested in
 * isolation and reused on the server if needed. The canonical token shape is:
 *
 *   @[npc:0ab12345-6789-4abc-def0-1234567890ab]
 *
 * Types accepted are the subset of `EntityType` that participate in the
 * user-facing mention flow (§7.8 of PRD entity-graph). Sessions, encounters,
 * players and bag_items are out of scope for mentions.
 *
 * The regex requires a strict 36-character UUID (RFC 4122 layout) so that
 * legitimate text like `@[npc:short]` or `@[foo:bar]` can never be mistaken
 * for a mention.
 */

export type MentionEntityType = "npc" | "location" | "faction" | "quest";

export interface MentionToken {
  kind: "mention";
  entityType: MentionEntityType;
  id: string;
  /** Inclusive start char index of the raw token in the source string. */
  start: number;
  /** Exclusive end char index (start + raw.length). */
  end: number;
  /** Literal matched substring, e.g. `@[npc:uuid]`. */
  raw: string;
}

export interface TextToken {
  kind: "text";
  text: string;
}

export type ParsedToken = MentionToken | TextToken;

const MENTION_TYPES = ["npc", "location", "faction", "quest"] as const;

/**
 * Strict UUID match to avoid false positives on free-form text. We allow
 * lowercase and uppercase hex; Supabase `gen_random_uuid()` emits lowercase,
 * but accepting either protects against manual copy-paste.
 *
 * Group 1: entity type (one of `npc|location|faction|quest`).
 * Group 2: UUID.
 *
 * IMPORTANT: Every consumer that wants to iterate all matches MUST clone the
 * regex (or use `.matchAll` — which is safe because matchAll creates an
 * internal copy). Do not call `.exec` directly on this exported constant.
 */
export const MENTION_REGEX =
  /@\[(npc|location|faction|quest):([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\]/g;

function isMentionEntityType(value: string): value is MentionEntityType {
  return (MENTION_TYPES as readonly string[]).includes(value);
}

/**
 * Split the source string into an ordered array of text + mention tokens.
 * The concatenation of every token's text/raw is guaranteed to equal the
 * original input (lossless round-trip).
 *
 * Adjacent mentions produce zero-length text tokens between them — those are
 * filtered out so consumers can map tokens 1:1 to React nodes without
 * emitting empty spans.
 */
export function parseMentions(text: string): ParsedToken[] {
  if (text.length === 0) return [];

  const tokens: ParsedToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MENTION_REGEX)) {
    const [raw, rawType, id] = match;
    if (match.index === undefined) continue;

    // Defense in depth: the regex alternation already restricts the type,
    // but if someone ever widens it, this keeps the MentionToken type sound.
    if (!isMentionEntityType(rawType)) continue;

    if (match.index > lastIndex) {
      tokens.push({
        kind: "text",
        text: text.slice(lastIndex, match.index),
      });
    }

    // Normalize UUIDs to lowercase. Postgres uuid columns always store
    // lowercase regardless of input case; a raw `@[npc:0AB12345-...]` would
    // otherwise appear as "different" from the stored edge target_id when
    // diffed, causing spurious add+remove churn on every save.
    const normalizedId = id.toLowerCase();
    tokens.push({
      kind: "mention",
      entityType: rawType,
      id: normalizedId,
      start: match.index,
      end: match.index + raw.length,
      raw,
    });

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    tokens.push({
      kind: "text",
      text: text.slice(lastIndex),
    });
  }

  return tokens;
}

/**
 * Flat list of entity refs mentioned in the string, de-duplicated on
 * `${type}:${id}`. Order of first appearance is preserved — callers relying
 * on stable ordering for UI / diffs can count on it.
 */
export function extractMentionRefs(
  text: string,
): Array<{ type: MentionEntityType; id: string }> {
  const seen = new Set<string>();
  const refs: Array<{ type: MentionEntityType; id: string }> = [];
  for (const token of parseMentions(text)) {
    if (token.kind !== "mention") continue;
    const key = `${token.entityType}:${token.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ type: token.entityType, id: token.id });
  }
  return refs;
}

/**
 * Diff two ref lists — what was added, what was removed. Both inputs are
 * treated as sets on `${type}:${id}`; duplicates within an input are
 * ignored. Output order follows first-appearance in the respective input
 * side, matching the behavior of `extractMentionRefs`.
 */
export function diffMentionRefs(
  before: Array<{ type: MentionEntityType; id: string }>,
  after: Array<{ type: MentionEntityType; id: string }>,
): {
  added: Array<{ type: MentionEntityType; id: string }>;
  removed: Array<{ type: MentionEntityType; id: string }>;
} {
  const beforeSet = new Set(before.map((r) => `${r.type}:${r.id}`));
  const afterSet = new Set(after.map((r) => `${r.type}:${r.id}`));

  const seenAdded = new Set<string>();
  const added: Array<{ type: MentionEntityType; id: string }> = [];
  for (const ref of after) {
    const key = `${ref.type}:${ref.id}`;
    if (beforeSet.has(key)) continue;
    if (seenAdded.has(key)) continue;
    seenAdded.add(key);
    added.push(ref);
  }

  const seenRemoved = new Set<string>();
  const removed: Array<{ type: MentionEntityType; id: string }> = [];
  for (const ref of before) {
    const key = `${ref.type}:${ref.id}`;
    if (afterSet.has(key)) continue;
    if (seenRemoved.has(key)) continue;
    seenRemoved.add(key);
    removed.push(ref);
  }

  return { added, removed };
}

/**
 * Build the canonical token string for a (type, id) pair. Use this when
 * inserting a mention into a textarea — never hand-concatenate, so future
 * syntax changes happen in exactly one place.
 */
export function formatMentionToken(type: MentionEntityType, id: string): string {
  return `@[${type}:${id}]`;
}

/**
 * Collapse `@[type:uuid]` tokens into a flat string suitable for single-line
 * previews, search indexing, or wherever a full chip render is unwanted.
 * Each token becomes `@name` if the entity is resolvable in `lookup`,
 * otherwise an empty string (so truncated previews don't leak UUIDs).
 *
 * Callers that want to render chips in rich surfaces should use
 * `MentionChipRenderer` instead.
 */
export function stripMentionsToPlainText(
  text: string,
  lookup: ReadonlyMap<string, { name: string }>,
): string {
  let out = "";
  for (const token of parseMentions(text)) {
    if (token.kind === "text") {
      out += token.text;
    } else {
      const entity = lookup.get(`${token.entityType}:${token.id}`);
      out += entity ? `@${entity.name}` : "";
    }
  }
  return out;
}
