/**
 * Entity Graph foundation tests.
 *
 * Two layers:
 *   (A) Unit tests for the TS lib `lib/supabase/entity-links.ts` — validated
 *       against a mocked Supabase client. Covers payload construction, error
 *       surfacing, and ON CONFLICT (upsert) idempotency.
 *   (B) Documentation of the SQL-level behaviors (cycle prevention + scope
 *       guard) as describe.skip blocks. Those rules are enforced by the
 *       database triggers (mig 146, 147) and exercised by Supabase integration
 *       tests / e2e — not reachable from the mocked client layer.
 */

import type { EntityLink, EntityRef } from "@/lib/types/entity-links";

// ---------- Mock setup (chainable Supabase query builder) ----------
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpsert = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockOr = jest.fn();
const mockOrder = jest.fn();
const mockSingle = jest.fn();

function chainMock(): Record<string, jest.Mock> {
  return {
    select: mockSelect,
    insert: mockInsert,
    upsert: mockUpsert,
    delete: mockDelete,
    eq: mockEq,
    or: mockOr,
    order: mockOrder,
    single: mockSingle,
  };
}

function setupChain() {
  const chain = chainMock();
  mockSelect.mockReturnValue(chain);
  mockInsert.mockReturnValue(chain);
  mockUpsert.mockReturnValue(chain);
  mockDelete.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);
  mockOr.mockReturnValue(chain);
  mockOrder.mockReturnValue(chain);
}

const mockGetUser = jest.fn();
const mockFrom = jest.fn(() => chainMock());

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

// Import after mocks
import {
  linkEntities,
  upsertEntityLink,
  unlinkEntities,
  listEntityLinks,
  listCampaignEdges,
} from "../entity-links";

// ---------- Helpers ----------
const CAMP = "c-1";
const USER = "u-1";
const NPC: EntityRef = { type: "npc", id: "npc-1" };
const LOC: EntityRef = { type: "location", id: "loc-1" };

const baseEdge: EntityLink = {
  id: "edge-1",
  campaign_id: CAMP,
  source_type: "npc",
  source_id: "npc-1",
  target_type: "location",
  target_id: "loc-1",
  relationship: "lives_in",
  custom_label: null,
  created_by: USER,
  created_at: "2026-04-19T00:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  setupChain();
  mockGetUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
});

// ---------- (A) TS lib unit tests ----------
describe("entity-links lib — linkEntities", () => {
  it("creates an edge with the correct payload", async () => {
    mockSingle.mockResolvedValueOnce({ data: baseEdge, error: null });

    const result = await linkEntities(CAMP, NPC, LOC, "lives_in");

    expect(mockFrom).toHaveBeenCalledWith("campaign_mind_map_edges");
    expect(mockInsert).toHaveBeenCalledWith({
      campaign_id: CAMP,
      source_type: "npc",
      source_id: "npc-1",
      target_type: "location",
      target_id: "loc-1",
      relationship: "lives_in",
      custom_label: null,
      created_by: USER,
    });
    expect(result).toEqual(baseEdge);
  });

  it("propagates the created_by from the authenticated user", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u-other" } },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { ...baseEdge, created_by: "u-other" },
      error: null,
    });

    const result = await linkEntities(CAMP, NPC, LOC, "lives_in");
    expect(result.created_by).toBe("u-other");
  });

  it("rejects when no user is authenticated (Auth-only rule RF-21)", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    await expect(linkEntities(CAMP, NPC, LOC, "lives_in")).rejects.toThrow(
      /no authenticated user/,
    );
  });

  it("throws on db errors (e.g. duplicate, trigger violation)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "duplicate key value violates unique constraint" },
    });
    await expect(linkEntities(CAMP, NPC, LOC, "lives_in")).rejects.toThrow(
      /Failed to link entities: duplicate key/,
    );
  });

  it("passes custom_label when provided", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { ...baseEdge, custom_label: "best friends forever" },
      error: null,
    });

    await linkEntities(CAMP, NPC, LOC, "custom", "best friends forever");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ custom_label: "best friends forever" }),
    );
  });
});

describe("entity-links lib — upsertEntityLink (idempotency via ON CONFLICT)", () => {
  it("uses onConflict with the full UNIQUE tuple from mig 080", async () => {
    mockSingle.mockResolvedValueOnce({ data: baseEdge, error: null });

    await upsertEntityLink(CAMP, NPC, LOC, "lives_in");

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        campaign_id: CAMP,
        source_type: "npc",
        source_id: "npc-1",
        target_type: "location",
        target_id: "loc-1",
        relationship: "lives_in",
      }),
      { onConflict: "campaign_id,source_type,source_id,target_type,target_id" },
    );
  });

  it("returns the existing row when the unique tuple already exists", async () => {
    // Simulate a second call returning the same row (idempotent).
    mockSingle.mockResolvedValueOnce({ data: baseEdge, error: null });
    mockSingle.mockResolvedValueOnce({ data: baseEdge, error: null });

    const a = await upsertEntityLink(CAMP, NPC, LOC, "lives_in");
    const b = await upsertEntityLink(CAMP, NPC, LOC, "lives_in");

    expect(a.id).toBe(b.id);
    expect(mockUpsert).toHaveBeenCalledTimes(2);
  });

  it("throws when not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    await expect(upsertEntityLink(CAMP, NPC, LOC, "lives_in")).rejects.toThrow(
      /no authenticated user/,
    );
  });
});

describe("entity-links lib — unlinkEntities", () => {
  it("deletes by id", async () => {
    mockEq.mockResolvedValueOnce({ error: null });
    await unlinkEntities("edge-1");
    expect(mockFrom).toHaveBeenCalledWith("campaign_mind_map_edges");
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("id", "edge-1");
  });

  it("throws on delete error (e.g. RLS denial)", async () => {
    mockEq.mockResolvedValueOnce({
      error: { message: "permission denied" },
    });
    await expect(unlinkEntities("edge-1")).rejects.toThrow(
      /Failed to unlink entities: permission denied/,
    );
  });
});

describe("entity-links lib — listEntityLinks", () => {
  it("queries edges where the entity is source OR target", async () => {
    mockOrder.mockResolvedValueOnce({ data: [baseEdge], error: null });

    const result = await listEntityLinks(CAMP, NPC);

    expect(mockFrom).toHaveBeenCalledWith("campaign_mind_map_edges");
    expect(mockEq).toHaveBeenCalledWith("campaign_id", CAMP);
    // OR builder clause should include both endpoint checks
    expect(mockOr).toHaveBeenCalledTimes(1);
    const orArg = mockOr.mock.calls[0][0] as string;
    expect(orArg).toContain("source_type.eq.npc");
    expect(orArg).toContain("source_id.eq.npc-1");
    expect(orArg).toContain("target_type.eq.npc");
    expect(orArg).toContain("target_id.eq.npc-1");
    expect(result).toEqual([baseEdge]);
  });

  it("returns empty array when no edges exist", async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: null });
    const result = await listEntityLinks(CAMP, NPC);
    expect(result).toEqual([]);
  });

  it("throws on list error", async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: "boom" },
    });
    await expect(listEntityLinks(CAMP, NPC)).rejects.toThrow(
      /Failed to list entity links: boom/,
    );
  });
});

describe("entity-links lib — listCampaignEdges", () => {
  it("returns all edges of a campaign", async () => {
    const other: EntityLink = { ...baseEdge, id: "edge-2", source_id: "npc-2" };
    mockOrder.mockResolvedValueOnce({
      data: [baseEdge, other],
      error: null,
    });
    const result = await listCampaignEdges(CAMP);
    expect(result).toHaveLength(2);
    expect(mockEq).toHaveBeenCalledWith("campaign_id", CAMP);
  });
});

// ---------- (B) SQL-level contracts (documentation + skipped runners) ----------
//
// The following rules are enforced by the database triggers created in
// migrations 146 (cycle prevention) and 147 (scope guard). They cannot be
// exercised through the mocked Supabase client. When Supabase local is set
// up in the test environment, remove the `.skip` and wire a real client.
//
// Each test describes the canonical positive / negative case.

describe.skip("[SQL contract] mig 146 — location hierarchy anti-cycle trigger", () => {
  it("rejects self-parent on INSERT (parent_location_id = id)", async () => {
    // INSERT INTO campaign_locations (id, parent_location_id, ...)
    //   VALUES ('a', 'a', ...);
    // Expected: RAISE EXCEPTION 'Location cannot be its own parent'
  });

  it("rejects a 2-cycle on UPDATE (A parent of B, then B becomes parent of A)", async () => {
    // INSERT A (parent=null), INSERT B (parent=A).
    // UPDATE A SET parent_location_id = B.id.
    // Expected: RAISE EXCEPTION 'Cycle detected in location hierarchy'
  });

  it("rejects hierarchies deeper than 20 levels", async () => {
    // Build a chain A1 → A2 → … → A22; the final UPDATE exceeding depth 20
    // must RAISE EXCEPTION 'Location hierarchy exceeds max depth (20)'.
  });

  it("accepts a valid 3-level chain (region > city > building)", async () => {
    // Succeeds; the partial index is hit for descendant listing.
  });
});

describe.skip("[SQL contract] mig 147 — entity graph scope guard trigger", () => {
  it("rejects an edge where source entity belongs to a different campaign", async () => {
    // INSERT INTO campaign_mind_map_edges (campaign_id=A, source=NPC_of_B, ...)
    // Expected: RAISE EXCEPTION 'Edge source (type=npc, id=…) does not belong to campaign A'
  });

  it("rejects an edge where target entity belongs to a different campaign", async () => {
    // Same as above, mirrored on target side.
  });

  it("allows edges with global NPCs (campaign_id IS NULL) on either endpoint", async () => {
    // NPC with campaign_id NULL is accepted as source or target for any campaign.
  });

  it("allows edges where both endpoints share the campaign", async () => {
    // Baseline positive case.
  });

  it("allows unknown/future entity types (default TRUE) without breaking", async () => {
    // source_type='session' with any id — passes until a future migration
    // wires that case; documented in mig 147 comment.
  });
});

describe.skip("[SQL contract] mig 148 — relationship expansion", () => {
  it("accepts 'headquarters_of' / 'rival_of' / 'family_of' / 'mentions'", async () => {
    // These 4 new relationships must pass the CHECK constraint.
  });

  it("still accepts every original relationship from mig 080", async () => {
    // Non-regression: linked_to, lives_in, participated_in, requires,
    // leads_to, allied_with, enemy_of, gave_quest, dropped_item, member_of,
    // happened_at, guards, owns, custom.
  });

  it("rejects unknown relationships", async () => {
    // e.g. 'bffs_forever' -> check_violation.
  });
});
