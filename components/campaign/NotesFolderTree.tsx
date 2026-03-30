"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  FolderOpen,
  FolderClosed,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CampaignNoteFolder } from "@/lib/types/database";

interface NotesFolderTreeProps {
  folders: CampaignNoteFolder[];
  selectedFolderId: string | null;
  noteCounts: Record<string, number>;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId?: string | null) => Promise<void>;
  onRenameFolder: (folderId: string, name: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  isOwner: boolean;
}

interface FolderNode {
  folder: CampaignNoteFolder;
  children: FolderNode[];
}

function buildTree(folders: CampaignNoteFolder[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  for (const f of folders) {
    map.set(f.id, { folder: f, children: [] });
  }

  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function NotesFolderTree({
  folders,
  selectedFolderId,
  noteCounts,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  isOwner,
}: NotesFolderTreeProps) {
  const t = useTranslations("notes");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [creatingIn, setCreatingIn] = useState<string | null | undefined>(
    undefined,
  );
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    await onCreateFolder(trimmed, creatingIn ?? null);
    setNewFolderName("");
    setCreatingIn(undefined);
  }, [newFolderName, creatingIn, onCreateFolder]);

  const handleRename = useCallback(
    async (id: string) => {
      const trimmed = renameValue.trim();
      if (!trimmed) return;
      await onRenameFolder(id, trimmed);
      setRenamingId(null);
      setRenameValue("");
    },
    [renameValue, onRenameFolder],
  );

  const tree = buildTree(folders);
  const unfiledCount = noteCounts["unfiled"] ?? 0;

  const renderNode = (node: FolderNode, depth: number) => {
    const isExpanded = expandedIds.has(node.folder.id);
    const isSelected = selectedFolderId === node.folder.id;
    const count = noteCounts[node.folder.id] ?? 0;

    return (
      <div key={node.folder.id}>
        <div
          className={`flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer text-sm transition-colors ${
            isSelected
              ? "bg-amber-500/15 text-amber-400"
              : "hover:bg-accent/10 text-muted-foreground"
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {/* Expand/collapse toggle */}
          {node.children.length > 0 ? (
            <button
              type="button"
              onClick={() => toggleExpanded(node.folder.id)}
              className="shrink-0 p-0.5"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          {/* Folder icon + name */}
          <button
            type="button"
            onClick={() => onSelectFolder(node.folder.id)}
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
          >
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <FolderClosed className="w-4 h-4 text-amber-400/70 shrink-0" />
            )}

            {renamingId === node.folder.id ? (
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRename(node.folder.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(node.folder.id);
                  if (e.key === "Escape") {
                    setRenamingId(null);
                    setRenameValue("");
                  }
                }}
                className="h-6 text-xs py-0 px-1"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate">{node.folder.name}</span>
            )}

            {count > 0 && (
              <span className="ml-auto text-xs text-muted-foreground/60 shrink-0">
                {count}
              </span>
            )}
          </button>

          {/* Context actions for owner */}
          {isOwner && renamingId !== node.folder.id && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRenamingId(node.folder.id);
                  setRenameValue(node.folder.name);
                }}
                className="p-0.5 hover:text-amber-400 transition-colors"
                title={t("rename_folder")}
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(node.folder.id);
                }}
                className="p-0.5 hover:text-red-400 transition-colors"
                title={t("delete_folder")}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Children */}
        {isExpanded &&
          node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-1" data-testid="notes-folder-tree">
      {/* "All notes" / Unfiled option */}
      <button
        type="button"
        onClick={() => onSelectFolder(null)}
        className={`flex items-center gap-1.5 w-full py-1 px-2 rounded-md text-sm transition-colors ${
          selectedFolderId === null
            ? "bg-amber-500/15 text-amber-400"
            : "hover:bg-accent/10 text-muted-foreground"
        }`}
      >
        <FileText className="w-4 h-4 shrink-0" />
        <span>{t("unfiled")}</span>
        {unfiledCount > 0 && (
          <span className="ml-auto text-xs text-muted-foreground/60">
            {unfiledCount}
          </span>
        )}
      </button>

      {/* Folder tree */}
      {tree.map((node) => (
        <div key={node.folder.id} className="group">
          {renderNode(node, 0)}
        </div>
      ))}

      {/* Create folder form */}
      {creatingIn !== undefined && (
        <div className="flex items-center gap-1 px-2 py-1">
          <Input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setCreatingIn(undefined);
                setNewFolderName("");
              }
            }}
            placeholder={t("create_folder")}
            className="h-7 text-xs"
            data-testid="new-folder-input"
          />
        </div>
      )}

      {/* Create folder button */}
      {isOwner && creatingIn === undefined && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCreatingIn(null)}
          className="w-full justify-start gap-1.5 text-xs text-muted-foreground hover:text-amber-400"
          data-testid="create-folder-btn"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("create_folder")}
        </Button>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_folder")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_folder_confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  onDeleteFolder(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete_folder")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
