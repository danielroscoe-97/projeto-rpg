import {
  getNoteNpcLinks,
  getNpcNoteLinks,
  linkNoteToNpc,
  unlinkNoteFromNpc,
  getCampaignNoteNpcLinks,
} from "../note-npc-links";

// Mock the client
const mockSelect = jest.fn().mockReturnThis();
const mockInsert = jest.fn().mockReturnThis();
const mockDelete = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockIn = jest.fn().mockReturnThis();
const mockSingle = jest.fn().mockResolvedValue({
  data: { id: "link1", note_id: "n1", npc_id: "npc1" },
  error: null,
});

const mockFrom = jest.fn().mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
  delete: mockDelete,
  eq: mockEq,
  in: mockIn,
  single: mockSingle,
});

jest.mock("../client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

describe("note-npc-links helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset chain returns
    mockSelect.mockReturnThis();
    mockInsert.mockReturnThis();
    mockDelete.mockReturnThis();
    mockEq.mockReturnValue({ data: [], error: null });
    mockSingle.mockResolvedValue({
      data: { id: "link1", note_id: "n1", npc_id: "npc1" },
      error: null,
    });
  });

  describe("getNoteNpcLinks", () => {
    it("queries links by note_id", async () => {
      mockEq.mockResolvedValueOnce({ data: [{ id: "l1", note_id: "n1", npc_id: "npc1" }], error: null });
      const result = await getNoteNpcLinks("n1");
      expect(mockFrom).toHaveBeenCalledWith("note_npc_links");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("note_id", "n1");
      expect(result).toHaveLength(1);
    });

    it("throws on error", async () => {
      mockEq.mockResolvedValueOnce({ data: null, error: { message: "fail" } });
      await expect(getNoteNpcLinks("n1")).rejects.toThrow("Failed to fetch note-NPC links: fail");
    });
  });

  describe("getNpcNoteLinks", () => {
    it("queries links by npc_id", async () => {
      mockEq.mockResolvedValueOnce({ data: [{ id: "l1", note_id: "n1", npc_id: "npc1" }], error: null });
      const result = await getNpcNoteLinks("npc1");
      expect(mockFrom).toHaveBeenCalledWith("note_npc_links");
      expect(mockEq).toHaveBeenCalledWith("npc_id", "npc1");
      expect(result).toHaveLength(1);
    });
  });

  describe("linkNoteToNpc", () => {
    it("inserts a link and returns it", async () => {
      const result = await linkNoteToNpc("n1", "npc1");
      expect(mockFrom).toHaveBeenCalledWith("note_npc_links");
      expect(mockInsert).toHaveBeenCalledWith({ note_id: "n1", npc_id: "npc1" });
      expect(result).toEqual({ id: "link1", note_id: "n1", npc_id: "npc1" });
    });

    it("throws on error", async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: "duplicate" } });
      await expect(linkNoteToNpc("n1", "npc1")).rejects.toThrow("Failed to link note to NPC: duplicate");
    });
  });

  describe("unlinkNoteFromNpc", () => {
    it("deletes a link by note_id and npc_id", async () => {
      mockEq.mockReturnThis();
      // Final eq in chain resolves
      mockEq.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({ error: null }),
      });
      await unlinkNoteFromNpc("n1", "npc1");
      expect(mockFrom).toHaveBeenCalledWith("note_npc_links");
    });
  });

  describe("getCampaignNoteNpcLinks", () => {
    it("queries links with campaign join", async () => {
      mockEq.mockResolvedValueOnce({
        data: [{ id: "l1", note_id: "n1", npc_id: "npc1", campaign_notes: { campaign_id: "c1" } }],
        error: null,
      });
      const result = await getCampaignNoteNpcLinks("c1");
      expect(mockFrom).toHaveBeenCalledWith("note_npc_links");
      expect(mockSelect).toHaveBeenCalledWith("*, campaign_notes!inner(campaign_id)");
      expect(result).toEqual([{ id: "l1", note_id: "n1", npc_id: "npc1" }]);
    });

    it("throws on error", async () => {
      mockEq.mockResolvedValueOnce({ data: null, error: { message: "fail" } });
      await expect(getCampaignNoteNpcLinks("c1")).rejects.toThrow(
        "Failed to fetch campaign note-NPC links: fail"
      );
    });
  });
});
