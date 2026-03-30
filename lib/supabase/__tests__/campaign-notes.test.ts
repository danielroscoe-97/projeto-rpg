import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  moveNoteToFolder,
  toggleNoteShared,
} from "../campaign-notes";

// Mock the client
const mockSelect = jest.fn().mockReturnThis();
const mockInsert = jest.fn().mockReturnThis();
const mockUpdate = jest.fn().mockReturnThis();
const mockDelete = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
const mockSingle = jest.fn().mockResolvedValue({
  data: { id: "f1", campaign_id: "c1", name: "Test", parent_id: null, sort_order: 0, created_at: new Date().toISOString() },
  error: null,
});

const mockFrom = jest.fn().mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  order: mockOrder,
  single: mockSingle,
});

jest.mock("../client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

describe("campaign-notes helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset chain returns
    mockSelect.mockReturnThis();
    mockInsert.mockReturnThis();
    mockUpdate.mockReturnThis();
    mockDelete.mockReturnThis();
    mockEq.mockReturnThis();
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockSingle.mockResolvedValue({
      data: { id: "f1", campaign_id: "c1", name: "Test", parent_id: null, sort_order: 0, created_at: new Date().toISOString() },
      error: null,
    });
  });

  describe("getFolders", () => {
    it("calls supabase with correct campaign_id", async () => {
      await getFolders("c1");
      expect(mockFrom).toHaveBeenCalledWith("campaign_note_folders");
      expect(mockEq).toHaveBeenCalledWith("campaign_id", "c1");
    });

    it("returns empty array when no data", async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });
      const result = await getFolders("c1");
      expect(result).toEqual([]);
    });

    it("throws on error", async () => {
      mockOrder.mockResolvedValue({ data: null, error: new Error("fail") });
      await expect(getFolders("c1")).rejects.toThrow("fail");
    });
  });

  describe("createFolder", () => {
    it("calls insert with correct data", async () => {
      // Chain: from -> insert -> select -> single
      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      await createFolder("c1", "My Folder", null);
      expect(mockFrom).toHaveBeenCalledWith("campaign_note_folders");
      expect(mockInsert).toHaveBeenCalledWith({
        campaign_id: "c1",
        name: "My Folder",
        parent_id: null,
      });
    });
  });

  describe("updateFolder", () => {
    it("calls update with name", async () => {
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: null });

      await updateFolder("f1", "Renamed");
      expect(mockFrom).toHaveBeenCalledWith("campaign_note_folders");
      expect(mockUpdate).toHaveBeenCalledWith({ name: "Renamed" });
    });
  });

  describe("deleteFolder", () => {
    it("calls delete with folderId", async () => {
      mockDelete.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: null });

      await deleteFolder("f1");
      expect(mockFrom).toHaveBeenCalledWith("campaign_note_folders");
    });
  });

  describe("moveNoteToFolder", () => {
    it("updates note folder_id", async () => {
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: null });

      await moveNoteToFolder("n1", "f1");
      expect(mockFrom).toHaveBeenCalledWith("campaign_notes");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ folder_id: "f1" }),
      );
    });
  });

  describe("toggleNoteShared", () => {
    it("updates is_shared to true", async () => {
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: null });

      await toggleNoteShared("n1", true);
      expect(mockFrom).toHaveBeenCalledWith("campaign_notes");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ is_shared: true }),
      );
    });
  });
});
