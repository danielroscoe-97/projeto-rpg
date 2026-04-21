/**
 * Mention parser — unit tests.
 *
 * NOTE: The project uses Jest (jest.config.ts at repo root), not vitest.
 * The prompt asked for vitest; that was inapplicable in this repo. Tests
 * are still 100% pure assertions with no framework-specific surface, so
 * porting between runners would be trivial.
 */

import {
  parseMentions,
  extractMentionRefs,
  diffMentionRefs,
  formatMentionToken,
  MENTION_REGEX,
  type MentionEntityType,
  type ParsedToken,
} from "./mention-parser";

const UUID_A = "0ab12345-6789-4abc-def0-1234567890ab";
const UUID_B = "11111111-2222-4333-8444-555555555555";
const UUID_C = "22222222-3333-4444-8555-666666666666";
const UUID_UPPER = "0AB12345-6789-4ABC-DEF0-1234567890AB";

const ref = (type: MentionEntityType, id: string) => ({ type, id });

describe("parseMentions", () => {
  it("returns an empty array for an empty string", () => {
    expect(parseMentions("")).toEqual([]);
  });

  it("returns a single text token when there are no mentions", () => {
    expect(parseMentions("plain text with no mentions")).toEqual([
      { kind: "text", text: "plain text with no mentions" },
    ]);
  });

  it("parses a single mention in the middle of text", () => {
    const input = `hello @[npc:${UUID_A}] world`;
    const tokens = parseMentions(input);
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({ kind: "text", text: "hello " });
    expect(tokens[1]).toMatchObject({
      kind: "mention",
      entityType: "npc",
      id: UUID_A,
      raw: `@[npc:${UUID_A}]`,
    });
    expect(tokens[2]).toEqual({ kind: "text", text: " world" });
  });

  it("preserves start/end indexes that match raw.length", () => {
    const input = `@[location:${UUID_B}]`;
    const tokens = parseMentions(input);
    expect(tokens).toHaveLength(1);
    const [mention] = tokens;
    if (mention.kind !== "mention") throw new Error("expected mention");
    expect(mention.start).toBe(0);
    expect(mention.end).toBe(input.length);
    expect(input.slice(mention.start, mention.end)).toBe(mention.raw);
  });

  it("parses multiple mentions of different types in order", () => {
    const input = `A @[npc:${UUID_A}] B @[faction:${UUID_B}] C @[quest:${UUID_C}] D`;
    const mentions = parseMentions(input).filter(
      (t): t is Extract<ParsedToken, { kind: "mention" }> => t.kind === "mention",
    );
    expect(mentions.map((m) => m.entityType)).toEqual([
      "npc",
      "faction",
      "quest",
    ]);
    expect(mentions.map((m) => m.id)).toEqual([UUID_A, UUID_B, UUID_C]);
  });

  it("ignores invalid UUIDs (too short)", () => {
    const input = "@[npc:not-a-uuid]";
    expect(parseMentions(input)).toEqual([{ kind: "text", text: input }]);
  });

  it("ignores unknown entity types", () => {
    const input = `@[player:${UUID_A}]`;
    expect(parseMentions(input)).toEqual([{ kind: "text", text: input }]);
  });

  it("handles adjacent mentions with no whitespace between", () => {
    const input = `@[npc:${UUID_A}]@[location:${UUID_B}]`;
    const tokens = parseMentions(input);
    const mentions = tokens.filter((t) => t.kind === "mention");
    expect(mentions).toHaveLength(2);
    // No zero-length text token emitted between them.
    expect(tokens.every((t) => t.kind !== "text" || t.text.length > 0)).toBe(
      true,
    );
  });

  it("treats malformed `@[` as literal text", () => {
    const input = "see @[foo and @ at start";
    expect(parseMentions(input)).toEqual([{ kind: "text", text: input }]);
  });

  it("accepts uppercase UUIDs and normalizes to lowercase", () => {
    // Regex tolerates case; token id is lowercased so downstream diffs
    // against Postgres-lowercased edge rows compare cleanly (no spurious
    // add+remove churn when re-saving a note with mixed-case pasted tokens).
    const input = `@[npc:${UUID_UPPER}]`;
    const tokens = parseMentions(input);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      kind: "mention",
      id: UUID_UPPER.toLowerCase(),
    });
    expect(tokens[0]).toMatchObject({ raw: input });
  });

  it("diff treats uppercase + lowercase UUIDs as the same ref", () => {
    // Regression guard for the "every save churns every edge" bug: a note
    // with uppercase inline tokens must diff-equal its lowercase neighbor.
    const upper = extractMentionRefs(`@[npc:${UUID_UPPER}]`);
    const lower = extractMentionRefs(`@[npc:${UUID_UPPER.toLowerCase()}]`);
    expect(diffMentionRefs(upper, lower)).toEqual({ added: [], removed: [] });
  });

  it("is lossless: concatenated tokens reproduce the source", () => {
    const input = `prefix @[npc:${UUID_A}] mid @[quest:${UUID_B}] suffix`;
    const joined = parseMentions(input)
      .map((t) => (t.kind === "text" ? t.text : t.raw))
      .join("");
    expect(joined).toBe(input);
  });

  it("does not retain regex lastIndex state between calls (no global leakage)", () => {
    // If a caller accidentally used the shared regex with .exec they would
    // trip lastIndex. parseMentions uses matchAll which is safe; this test
    // documents the contract.
    const input = `@[npc:${UUID_A}]`;
    for (let i = 0; i < 3; i++) {
      expect(parseMentions(input).filter((t) => t.kind === "mention")).toHaveLength(1);
    }
    // Exported regex lastIndex should remain 0 after matchAll usage.
    expect(MENTION_REGEX.lastIndex).toBe(0);
  });
});

describe("extractMentionRefs", () => {
  it("returns an empty array for text with no mentions", () => {
    expect(extractMentionRefs("just some prose here")).toEqual([]);
  });

  it("dedupes repeated refs, preserving first-occurrence order", () => {
    const input = `@[npc:${UUID_A}] ... @[quest:${UUID_B}] ... @[npc:${UUID_A}]`;
    expect(extractMentionRefs(input)).toEqual([
      ref("npc", UUID_A),
      ref("quest", UUID_B),
    ]);
  });

  it("returns every unique ref across types", () => {
    const input = `@[npc:${UUID_A}]@[location:${UUID_B}]@[faction:${UUID_C}]`;
    expect(extractMentionRefs(input)).toEqual([
      ref("npc", UUID_A),
      ref("location", UUID_B),
      ref("faction", UUID_C),
    ]);
  });
});

describe("diffMentionRefs", () => {
  it("reports no changes when refs match exactly", () => {
    const refs = [ref("npc", UUID_A), ref("quest", UUID_B)];
    expect(diffMentionRefs(refs, refs)).toEqual({ added: [], removed: [] });
  });

  it("detects only additions", () => {
    const before = [ref("npc", UUID_A)];
    const after = [ref("npc", UUID_A), ref("location", UUID_B)];
    expect(diffMentionRefs(before, after)).toEqual({
      added: [ref("location", UUID_B)],
      removed: [],
    });
  });

  it("detects only removals", () => {
    const before = [ref("npc", UUID_A), ref("location", UUID_B)];
    const after = [ref("npc", UUID_A)];
    expect(diffMentionRefs(before, after)).toEqual({
      added: [],
      removed: [ref("location", UUID_B)],
    });
  });

  it("detects a full swap as add + remove", () => {
    const before = [ref("npc", UUID_A)];
    const after = [ref("faction", UUID_B)];
    expect(diffMentionRefs(before, after)).toEqual({
      added: [ref("faction", UUID_B)],
      removed: [ref("npc", UUID_A)],
    });
  });

  it("ignores duplicate refs inside each input", () => {
    const before = [ref("npc", UUID_A), ref("npc", UUID_A)];
    const after = [ref("location", UUID_B), ref("location", UUID_B)];
    expect(diffMentionRefs(before, after)).toEqual({
      added: [ref("location", UUID_B)],
      removed: [ref("npc", UUID_A)],
    });
  });

  it("treats the same id under different types as distinct refs", () => {
    const before = [ref("npc", UUID_A)];
    const after = [ref("location", UUID_A)];
    expect(diffMentionRefs(before, after)).toEqual({
      added: [ref("location", UUID_A)],
      removed: [ref("npc", UUID_A)],
    });
  });
});

describe("formatMentionToken", () => {
  it("produces the canonical shape for each entity type", () => {
    expect(formatMentionToken("npc", UUID_A)).toBe(`@[npc:${UUID_A}]`);
    expect(formatMentionToken("location", UUID_B)).toBe(
      `@[location:${UUID_B}]`,
    );
  });

  it("round-trips through parseMentions", () => {
    const token = formatMentionToken("quest", UUID_C);
    const tokens = parseMentions(token);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      kind: "mention",
      entityType: "quest",
      id: UUID_C,
    });
  });
});
