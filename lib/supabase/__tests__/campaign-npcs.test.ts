import type { CampaignNpcInsert } from "@/lib/types/campaign-npcs";

// Mock the supabase client with a self-referencing chain
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockMaybeSingle = jest.fn();
const mockSingle = jest.fn();

function chainMock(): Record<string, jest.Mock> {
  return {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    order: mockOrder,
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
  };
}

function setupChain() {
  const chain = chainMock();
  mockSelect.mockReturnValue(chain);
  mockInsert.mockReturnValue(chain);
  mockUpdate.mockReturnValue(chain);
  mockDelete.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);
  mockOrder.mockReturnValue(chain);
}

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => chainMock(),
  }),
}));

// Import after mocking
import {
  getNpcs,
  getNpc,
  createNpc,
  updateNpc,
  deleteNpc,
  toggleNpcVisibility,
} from "../campaign-npcs";

beforeEach(() => {
  jest.clearAllMocks();
  setupChain();
});

describe("campaign-npcs queries", () => {
  describe("getNpcs", () => {
    it("calls supabase with correct campaign_id filter", async () => {
      mockOrder.mockResolvedValue({
        data: [
          {
            id: "npc-1",
            campaign_id: "c1",
            name: "Test NPC",
            description: null,
            stats: {},
            avatar_url: null,
            is_visible_to_players: false,
            created_at: "2025-01-01",
            updated_at: "2025-01-01",
          },
        ],
        error: null,
      });

      const result = await getNpcs("c1");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Test NPC");
    });

    it("throws on error", async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });

      await expect(getNpcs("c1")).rejects.toThrow("Failed to fetch NPCs");
    });
  });

  describe("getNpc", () => {
    it("returns single NPC", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: {
          id: "npc-1",
          campaign_id: "c1",
          name: "Solo NPC",
          description: null,
          stats: { hp: 20 },
          avatar_url: null,
          is_visible_to_players: true,
          created_at: "2025-01-01",
          updated_at: "2025-01-01",
        },
        error: null,
      });

      const result = await getNpc("npc-1");
      expect(result?.name).toBe("Solo NPC");
      expect(result?.stats.hp).toBe(20);
    });

    it("returns null when not found", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      const result = await getNpc("npc-missing");
      expect(result).toBeNull();
    });
  });

  describe("createNpc", () => {
    it("creates and returns new NPC", async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: "npc-new",
          campaign_id: "c1",
          name: "New NPC",
          description: "desc",
          stats: { hp: 10 },
          avatar_url: null,
          is_visible_to_players: false,
          created_at: "2025-01-01",
          updated_at: "2025-01-01",
        },
        error: null,
      });

      const input: CampaignNpcInsert = {
        campaign_id: "c1",
        name: "New NPC",
        description: "desc",
        stats: { hp: 10 },
        avatar_url: null,
        is_visible_to_players: false,
      };

      const result = await createNpc(input);
      expect(result.name).toBe("New NPC");
    });
  });

  describe("updateNpc", () => {
    it("updates and returns NPC", async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: "npc-1",
          campaign_id: "c1",
          name: "Updated",
          description: null,
          stats: {},
          avatar_url: null,
          is_visible_to_players: true,
          created_at: "2025-01-01",
          updated_at: "2025-01-02",
        },
        error: null,
      });

      const result = await updateNpc("npc-1", { name: "Updated" });
      expect(result.name).toBe("Updated");
    });
  });

  describe("deleteNpc", () => {
    it("deletes without error", async () => {
      mockEq.mockResolvedValue({ error: null });
      await expect(deleteNpc("npc-1")).resolves.toBeUndefined();
    });

    it("throws on error", async () => {
      mockEq.mockResolvedValue({ error: { message: "Not found" } });
      await expect(deleteNpc("npc-1")).rejects.toThrow("Failed to delete NPC");
    });
  });

  describe("toggleNpcVisibility", () => {
    it("toggles visibility and returns updated NPC", async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: "npc-1",
          campaign_id: "c1",
          name: "NPC",
          description: null,
          stats: {},
          avatar_url: null,
          is_visible_to_players: true,
          created_at: "2025-01-01",
          updated_at: "2025-01-02",
        },
        error: null,
      });

      const result = await toggleNpcVisibility("npc-1", true);
      expect(result.is_visible_to_players).toBe(true);
    });
  });
});
