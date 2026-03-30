import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotesFolderTree } from "../NotesFolderTree";
import type { CampaignNoteFolder } from "@/lib/types/database";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      folders: "Folders",
      create_folder: "New Folder",
      rename_folder: "Rename",
      delete_folder: "Delete Folder",
      delete_folder_confirm: "Are you sure?",
      unfiled: "Unfiled",
      cancel: "Cancel",
    };
    return map[key] ?? key;
  },
}));

const makeFolders = (overrides: Partial<CampaignNoteFolder>[] = []): CampaignNoteFolder[] =>
  overrides.map((o, i) => ({
    id: `folder-${i}`,
    campaign_id: "c1",
    name: `Folder ${i}`,
    parent_id: null,
    sort_order: i,
    created_at: new Date().toISOString(),
    ...o,
  }));

describe("NotesFolderTree", () => {
  const defaultProps = {
    folders: [] as CampaignNoteFolder[],
    selectedFolderId: null,
    noteCounts: {} as Record<string, number>,
    onSelectFolder: jest.fn(),
    onCreateFolder: jest.fn().mockResolvedValue(undefined),
    onRenameFolder: jest.fn().mockResolvedValue(undefined),
    onDeleteFolder: jest.fn().mockResolvedValue(undefined),
    isOwner: true,
  };

  it("renders the unfiled option", () => {
    render(<NotesFolderTree {...defaultProps} />);
    expect(screen.getByText("Unfiled")).toBeInTheDocument();
  });

  it("renders folders", () => {
    const folders = makeFolders([
      { id: "f1", name: "Session Logs" },
      { id: "f2", name: "NPCs" },
    ]);
    render(<NotesFolderTree {...defaultProps} folders={folders} />);
    expect(screen.getByText("Session Logs")).toBeInTheDocument();
    expect(screen.getByText("NPCs")).toBeInTheDocument();
  });

  it("shows create folder button for owner", () => {
    render(<NotesFolderTree {...defaultProps} />);
    expect(screen.getByTestId("create-folder-btn")).toBeInTheDocument();
  });

  it("hides create folder button for non-owner", () => {
    render(<NotesFolderTree {...defaultProps} isOwner={false} />);
    expect(screen.queryByTestId("create-folder-btn")).not.toBeInTheDocument();
  });

  it("shows input when create folder button is clicked", async () => {
    render(<NotesFolderTree {...defaultProps} />);
    await userEvent.click(screen.getByTestId("create-folder-btn"));
    expect(screen.getByTestId("new-folder-input")).toBeInTheDocument();
  });

  it("calls onSelectFolder(null) when unfiled is clicked", async () => {
    const onSelectFolder = jest.fn();
    render(<NotesFolderTree {...defaultProps} onSelectFolder={onSelectFolder} />);
    await userEvent.click(screen.getByText("Unfiled"));
    expect(onSelectFolder).toHaveBeenCalledWith(null);
  });

  it("shows note counts", () => {
    const folders = makeFolders([{ id: "f1", name: "Logs" }]);
    render(
      <NotesFolderTree
        {...defaultProps}
        folders={folders}
        noteCounts={{ f1: 5, unfiled: 3 }}
      />,
    );
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
