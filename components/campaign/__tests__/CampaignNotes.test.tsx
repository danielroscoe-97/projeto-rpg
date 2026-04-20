import React from "react";
import { render, screen } from "@testing-library/react";
import { CampaignNotes } from "../CampaignNotes";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      title: "Campaign Notes",
      folders: "Folders",
      create_folder: "New Folder",
      unfiled: "Unfiled",
      no_notes: "No notes yet",
      create_first: "Create your first note",
      new_note: "New note",
      "private": "Private",
      shared: "Shared",
      private_hint: "Only you can see",
      shared_hint: "Players can see",
      saving: "Saving...",
      saved: "Saved",
      delete_note: "Delete",
      delete_note_confirm: "Are you sure?",
      cancel: "Cancel",
      untitled: "Untitled",
      title_placeholder: "Note title...",
      content_placeholder: "Write your note here...",
      rename_folder: "Rename",
      delete_folder: "Delete Folder",
      delete_folder_confirm: "Are you sure?",
    };
    return map[key] ?? key;
  },
}));

// Mock supabase client — chainable stub that resolves to an empty list for
// any combination of select/eq/order/in/limit/upsert/insert/update/delete.
const terminalPromise = () => Promise.resolve({ data: [], error: null });
type Chain = Record<string, unknown> & PromiseLike<{ data: unknown[]; error: null }>;
const createChain = (): Chain => {
  const chain: Record<string, unknown> = {};
  const methods = [
    "from",
    "select",
    "eq",
    "in",
    "order",
    "match",
    "limit",
    "single",
    "insert",
    "update",
    "delete",
    "upsert",
    "or",
    "neq",
    "ilike",
    "is",
  ];
  for (const m of methods) {
    chain[m] = jest.fn(() => chain);
  }
  const p = terminalPromise();
  chain.then = p.then.bind(p);
  chain.catch = p.catch.bind(p);
  return chain as Chain;
};
const mockFrom = jest.fn(() => createChain());
// Kept for tests that still reference these symbols (empty-state assertions).
const mockSelect = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
    },
  }),
}));

// Mock campaign-notes helpers
jest.mock("@/lib/supabase/campaign-notes", () => ({
  getFolders: jest.fn().mockResolvedValue([]),
  createFolder: jest.fn().mockResolvedValue({ id: "nf1", name: "New", campaign_id: "c1", parent_id: null, sort_order: 0, created_at: new Date().toISOString() }),
  updateFolder: jest.fn().mockResolvedValue(undefined),
  deleteFolder: jest.fn().mockResolvedValue(undefined),
  moveNoteToFolder: jest.fn().mockResolvedValue(undefined),
  toggleNoteShared: jest.fn().mockResolvedValue(undefined),
}));

// Mock captureError
jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
}));

describe("CampaignNotes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrder.mockResolvedValue({ data: [], error: null });
  });

  it("renders title and empty state", async () => {
    render(<CampaignNotes campaignId="c1" />);

    expect(await screen.findByText("Campaign Notes")).toBeInTheDocument();
    expect(await screen.findByText("No notes yet")).toBeInTheDocument();
  });

  it("renders new note button for owner", async () => {
    render(<CampaignNotes campaignId="c1" isOwner={true} />);
    // Wait for loading to complete (title appears after loading)
    expect(await screen.findByText("Campaign Notes")).toBeInTheDocument();
    // "New note" appears in header and/or empty state CTA
    expect(screen.getAllByText("New note").length).toBeGreaterThanOrEqual(1);
  });

  it("hides new note button for non-owner", async () => {
    render(<CampaignNotes campaignId="c1" isOwner={false} />);
    // Wait for loading to finish
    await screen.findByText("No notes yet");
    expect(screen.queryByText("New note")).not.toBeInTheDocument();
  });

  it("renders folder sidebar", async () => {
    render(<CampaignNotes campaignId="c1" />);
    expect(await screen.findByText("Folders")).toBeInTheDocument();
    expect(screen.getByText("Unfiled")).toBeInTheDocument();
  });
});
