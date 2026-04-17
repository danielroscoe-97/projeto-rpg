/**
 * S1.2 — Unit tests for the player-side `combat:combatant_add_reorder` handler.
 *
 * The handler logic lives inside `PlayerJoinClient.tsx` (closure over React
 * state setters), but its core reducer semantics are pure: given a previous
 * combatant list + payload, produce the next list. We replicate that reducer
 * here so we can assert the full transition table without mounting React.
 *
 * The shape mirrors the inline reducer in PlayerJoinClient exactly. If you
 * change one, change both — a Playwright e2e test is the safety net.
 */

import type { SanitizedCombatantAddReorder, SanitizedCombatant } from "@/lib/types/realtime";

/** Minimal shape matching `PlayerCombatant` in PlayerJoinClient.tsx. */
type PlayerCombatant = {
  id: string;
  name: string;
  initiative_order: number | null;
  conditions: string[];
  is_defeated: boolean;
  is_player: boolean;
  monster_id: string | null;
  ruleset_version: string | null;
  current_hp?: number;
  max_hp?: number;
  temp_hp?: number;
  ac?: number;
  hp_status?: string;
};

/**
 * Pure reducer — mirrors the inline logic in PlayerJoinClient.tsx at
 * `.on("broadcast", { event: "combat:combatant_add_reorder" }, ...)`.
 *
 * Returned `inconsistencyDetected` is set when `initiative_map` references
 * a non-hidden ID not in the local list (after insertion). Opaque
 * "hidden:<hash>" placeholders are ignored (B-2 contract).
 *
 * Note: the real handler computes `inconsistencyDetected` BEFORE calling
 * setState (B-1 fix). This pure reducer composes both pieces for test
 * ergonomics — assertion semantics are identical.
 */
export function reduceCombatantAddReorder(
  prev: PlayerCombatant[],
  payload: SanitizedCombatantAddReorder,
): { next: PlayerCombatant[]; inconsistencyDetected: boolean } {
  const incoming = payload.combatant as unknown as PlayerCombatant;

  // Inconsistency computed against PREV synchronously (B-1 contract).
  const prevIds = new Set(prev.map((c) => c.id));
  const inconsistencyDetected = payload.initiative_map.some((entry) => {
    if (entry.id === incoming.id) return false; // always present after insert
    if (entry.id.startsWith("hidden:")) return false; // opaque slot, not a miss
    return !prevIds.has(entry.id);
  });

  const existingIndex = prev.findIndex((c) => c.id === incoming.id);
  let next: PlayerCombatant[];
  if (existingIndex !== -1) {
    next = prev.map((c, i) => (i === existingIndex ? { ...c, ...incoming } : c));
  } else {
    next = [...prev, incoming];
  }

  const orderById = new Map<string, number>();
  for (const entry of payload.initiative_map) {
    if (entry.initiative_order !== null) {
      orderById.set(entry.id, entry.initiative_order);
    }
  }

  const reordered = [...next].sort((a, b) => {
    const ao = orderById.get(a.id);
    const bo = orderById.get(b.id);
    if (ao === undefined && bo === undefined) {
      return (a.initiative_order ?? 0) - (b.initiative_order ?? 0);
    }
    if (ao === undefined) return 1;
    if (bo === undefined) return -1;
    return ao - bo;
  });

  next = reordered.map((c) => {
    const o = orderById.get(c.id);
    return o !== undefined ? { ...c, initiative_order: o } : c;
  });

  return { next, inconsistencyDetected };
}

// ── Fixtures ─────────────────────────────────────────────────────────────

function makeCombatant(overrides: Partial<PlayerCombatant>): PlayerCombatant {
  return {
    id: overrides.id ?? "c1",
    name: overrides.name ?? "Fighter",
    initiative_order: overrides.initiative_order ?? 0,
    conditions: [],
    is_defeated: false,
    is_player: false,
    monster_id: null,
    ruleset_version: "2014",
    ...overrides,
  };
}

function makeSanitizedCombatant(overrides: Partial<SanitizedCombatant>): SanitizedCombatant {
  return {
    id: "new",
    name: "Velociraptor",
    initiative: 12,
    initiative_order: 1,
    conditions: [],
    is_defeated: false,
    is_hidden: false,
    is_player: false,
    monster_id: "velociraptor",
    token_url: null,
    creature_type: "beast",
    monster_group_id: null,
    group_order: null,
    player_notes: "",
    player_character_id: null,
    combatant_role: null,
    ruleset_version: "2014",
    ...overrides,
  } as unknown as SanitizedCombatant;
}

function makePayload(overrides: Partial<SanitizedCombatantAddReorder> = {}): SanitizedCombatantAddReorder {
  return {
    type: "combat:combatant_add_reorder",
    combatant: makeSanitizedCombatant({ id: "new" }),
    initiative_map: [
      { id: "a", initiative_order: 0 },
      { id: "new", initiative_order: 1 },
      { id: "b", initiative_order: 2 },
    ],
    current_turn_index: 0,
    round_number: 1,
    encounter_id: "enc-1",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("combat:combatant_add_reorder — reducer", () => {
  test("inserts a new combatant into the correct initiative slot", () => {
    const prev = [
      makeCombatant({ id: "a", name: "Fighter", initiative_order: 0 }),
      makeCombatant({ id: "b", name: "Goblin", initiative_order: 1 }),
    ];
    const payload = makePayload(); // new becomes middle slot (order=1), b moves to 2

    const { next, inconsistencyDetected } = reduceCombatantAddReorder(prev, payload);

    expect(inconsistencyDetected).toBe(false);
    expect(next.map((c) => c.id)).toEqual(["a", "new", "b"]);
    expect(next.find((c) => c.id === "new")?.initiative_order).toBe(1);
    expect(next.find((c) => c.id === "b")?.initiative_order).toBe(2);
  });

  test("applies atomic reorder when the new combatant slots first", () => {
    const prev = [
      makeCombatant({ id: "a", name: "Fighter", initiative_order: 0 }),
      makeCombatant({ id: "b", name: "Goblin", initiative_order: 1 }),
    ];
    const payload = makePayload({
      combatant: makeSanitizedCombatant({ id: "fastraptor", initiative: 25 }),
      initiative_map: [
        { id: "fastraptor", initiative_order: 0 },
        { id: "a", initiative_order: 1 },
        { id: "b", initiative_order: 2 },
      ],
    });

    const { next } = reduceCombatantAddReorder(prev, payload);
    expect(next.map((c) => c.id)).toEqual(["fastraptor", "a", "b"]);
  });

  test("dedups: incoming combatant with existing ID is merged, not doubled", () => {
    const prev = [
      makeCombatant({ id: "a", name: "Fighter", initiative_order: 0 }),
      makeCombatant({ id: "new", name: "Old Name", initiative_order: 1 }),
    ];
    const payload = makePayload({
      combatant: makeSanitizedCombatant({ id: "new", name: "Velociraptor" }),
    });

    const { next } = reduceCombatantAddReorder(prev, payload);
    expect(next.filter((c) => c.id === "new")).toHaveLength(1);
    expect(next.find((c) => c.id === "new")?.name).toBe("Velociraptor");
  });

  test("flags inconsistency when initiative_map references unknown IDs", () => {
    const prev = [makeCombatant({ id: "a", initiative_order: 0 })];
    // Map mentions "ghost" which player doesn't have (simulate hidden combatant
    // that player shouldn't know about — or a real miss that needs recovery).
    const payload = makePayload({
      combatant: makeSanitizedCombatant({ id: "new" }),
      initiative_map: [
        { id: "a", initiative_order: 0 },
        { id: "ghost", initiative_order: 1 },
        { id: "new", initiative_order: 2 },
      ],
    });

    const { inconsistencyDetected } = reduceCombatantAddReorder(prev, payload);
    expect(inconsistencyDetected).toBe(true);
  });

  test("does NOT flag inconsistency for the incoming combatant (it's always present after insertion)", () => {
    const prev = [makeCombatant({ id: "a", initiative_order: 0 })];
    const payload = makePayload({
      combatant: makeSanitizedCombatant({ id: "new" }),
      initiative_map: [
        { id: "a", initiative_order: 0 },
        { id: "new", initiative_order: 1 },
      ],
    });

    const { inconsistencyDetected } = reduceCombatantAddReorder(prev, payload);
    expect(inconsistencyDetected).toBe(false);
  });

  test("combatants missing from the map keep their relative order after known ones", () => {
    const prev = [
      makeCombatant({ id: "a", initiative_order: 0 }),
      makeCombatant({ id: "b", initiative_order: 1 }),
      makeCombatant({ id: "stranger", initiative_order: 99 }),
    ];
    const payload = makePayload({
      combatant: makeSanitizedCombatant({ id: "new" }),
      initiative_map: [
        { id: "a", initiative_order: 0 },
        { id: "new", initiative_order: 1 },
        { id: "b", initiative_order: 2 },
        // "stranger" is NOT in the map — keeps its old order.
      ],
    });

    const { next } = reduceCombatantAddReorder(prev, payload);
    // Known-ordered IDs come first; unknown (stranger) falls to the end.
    const ids = next.map((c) => c.id);
    expect(ids.indexOf("stranger")).toBeGreaterThan(ids.indexOf("b"));
  });

  test("null initiative_order entries are ignored (treated as unknown)", () => {
    const prev = [makeCombatant({ id: "a", initiative_order: 0 })];
    const payload = makePayload({
      combatant: makeSanitizedCombatant({ id: "new" }),
      initiative_map: [
        { id: "a", initiative_order: 0 },
        { id: "new", initiative_order: null },
      ],
    });

    const { next } = reduceCombatantAddReorder(prev, payload);
    // Both present — `new` without a known order sorts after known ones.
    expect(next.map((c) => c.id)).toEqual(["a", "new"]);
  });

  test("three rapid adds produce correct final order (regression — Velociraptor scenario)", () => {
    // Simulate Lucas's 02:34:20-26 timeline: 3 adds in <6s.
    let state: PlayerCombatant[] = [
      makeCombatant({ id: "hero", name: "Hero", initiative_order: 0 }),
    ];

    // Add 1: velociraptor-1 at initiative 14
    state = reduceCombatantAddReorder(state, {
      type: "combat:combatant_add_reorder",
      combatant: makeSanitizedCombatant({ id: "v1", name: "Velociraptor 1", initiative: 14 }),
      initiative_map: [
        { id: "v1", initiative_order: 0 },
        { id: "hero", initiative_order: 1 },
      ],
      current_turn_index: 1,
      round_number: 1,
      encounter_id: "enc",
    }).next;

    // Add 2: velociraptor-2 at initiative 20 (goes first)
    state = reduceCombatantAddReorder(state, {
      type: "combat:combatant_add_reorder",
      combatant: makeSanitizedCombatant({ id: "v2", name: "Velociraptor 2", initiative: 20 }),
      initiative_map: [
        { id: "v2", initiative_order: 0 },
        { id: "v1", initiative_order: 1 },
        { id: "hero", initiative_order: 2 },
      ],
      current_turn_index: 2,
      round_number: 1,
      encounter_id: "enc",
    }).next;

    // Add 3: velociraptor-3 at initiative 5 (goes last)
    state = reduceCombatantAddReorder(state, {
      type: "combat:combatant_add_reorder",
      combatant: makeSanitizedCombatant({ id: "v3", name: "Velociraptor 3", initiative: 5 }),
      initiative_map: [
        { id: "v2", initiative_order: 0 },
        { id: "v1", initiative_order: 1 },
        { id: "hero", initiative_order: 2 },
        { id: "v3", initiative_order: 3 },
      ],
      current_turn_index: 2,
      round_number: 1,
      encounter_id: "enc",
    }).next;

    expect(state.map((c) => c.id)).toEqual(["v2", "v1", "hero", "v3"]);
  });

  // ── B-2: Hidden combatants represented by opaque placeholders ───────────
  test("opaque 'hidden:*' placeholders in initiative_map do NOT trigger inconsistency (B-2)", () => {
    // Simulate a sanitized payload where the DM has 2 hidden monsters.
    // They appear in the map as `hidden:<hash>` placeholders — the player
    // MUST treat them as opaque slots and NEVER mark them as desync.
    const prev = [
      makeCombatant({ id: "hero", initiative_order: 0 }),
    ];
    const payload = makePayload({
      combatant: makeSanitizedCombatant({ id: "new" }),
      initiative_map: [
        { id: "hidden:abc123", initiative_order: 0, is_hidden: true },
        { id: "new", initiative_order: 1 },
        { id: "hero", initiative_order: 2 },
        { id: "hidden:def456", initiative_order: 3, is_hidden: true },
      ],
    });

    const { inconsistencyDetected, next } = reduceCombatantAddReorder(prev, payload);
    // CRITICAL: no fetchFullState trigger despite unknown IDs in map.
    expect(inconsistencyDetected).toBe(false);
    // Player list contains only visible combatants; placeholders don't become entries.
    expect(next.map((c) => c.id).sort()).toEqual(["hero", "new"]);
    // Reorder still places `new` before `hero` because new.order=1 < hero.order=2.
    expect(next[0].id).toBe("new");
    expect(next[1].id).toBe("hero");
  });

  test("real unknown IDs still flag inconsistency (hidden placeholders don't mask real desync)", () => {
    const prev = [makeCombatant({ id: "hero", initiative_order: 0 })];
    const payload = makePayload({
      combatant: makeSanitizedCombatant({ id: "new" }),
      initiative_map: [
        { id: "hidden:abc", initiative_order: 0, is_hidden: true }, // ok
        { id: "real-missing", initiative_order: 1 }, // real desync
        { id: "new", initiative_order: 2 },
      ],
    });
    const { inconsistencyDetected } = reduceCombatantAddReorder(prev, payload);
    expect(inconsistencyDetected).toBe(true);
  });

  test("handles events arriving in reverse order (defense-in-depth regression test)", () => {
    // Even if events arrive out of sequence from DM side, each individual event
    // is self-contained: it carries the FULL post-add initiative_map, so the final
    // state after any single event is correct relative to that event's snapshot.
    let state: PlayerCombatant[] = [makeCombatant({ id: "hero", initiative_order: 0 })];

    // Arrive: add of v2 with full map (state BEFORE: hero+v1; AFTER: v2+v1+hero)
    const payloadAddV2: SanitizedCombatantAddReorder = {
      type: "combat:combatant_add_reorder",
      combatant: makeSanitizedCombatant({ id: "v2" }),
      initiative_map: [
        { id: "v2", initiative_order: 0 },
        { id: "v1", initiative_order: 1 },
        { id: "hero", initiative_order: 2 },
      ],
      current_turn_index: 2,
      round_number: 1,
      encounter_id: "enc",
    };

    const r1 = reduceCombatantAddReorder(state, payloadAddV2);
    // Inconsistency: v1 is in the map but not in state — trigger recovery.
    expect(r1.inconsistencyDetected).toBe(true);
    state = r1.next;
    // v2 inserted, v1 not present locally yet → not in list.
    expect(state.map((c) => c.id).sort()).toEqual(["hero", "v2"]);
  });
});
