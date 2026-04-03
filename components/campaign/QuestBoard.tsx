"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Circle, Target, CheckCircle2, Trash2, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCampaignQuests } from "@/lib/hooks/use-campaign-quests";
import type { CampaignQuest, QuestStatus } from "@/lib/types/quest";

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_ICON: Record<QuestStatus, React.ComponentType<{ className?: string }>> = {
  available: Circle,
  active: Target,
  completed: CheckCircle2,
};

const STATUS_BORDER: Record<QuestStatus, string> = {
  available: "border-muted-foreground/30",
  active: "border-[#D4A853]/50 shadow-[0_0_8px_rgba(212,168,83,0.15)]",
  completed: "border-green-600/30 opacity-70",
};

const STATUS_ICON_CLASS: Record<QuestStatus, string> = {
  available: "text-muted-foreground",
  active: "text-[#D4A853]",
  completed: "text-green-500",
};

// ── QuestCard ─────────────────────────────────────────────────────────────────

interface QuestCardProps {
  quest: CampaignQuest;
  isEditable: boolean;
  onUpdate: (id: string, data: Partial<{ title: string; description: string; status: QuestStatus }>) => void;
  onDelete: (id: string) => void;
}

function QuestCard({ quest, isEditable, onUpdate, onDelete }: QuestCardProps) {
  const t = useTranslations("campaign.quests");
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(quest.title);
  const [description, setDescription] = useState(quest.description);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Keep local state in sync with prop changes
  useEffect(() => {
    setTitle(quest.title);
  }, [quest.title]);

  useEffect(() => {
    setDescription(quest.description);
  }, [quest.description]);

  const titleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (titleDebounce.current) clearTimeout(titleDebounce.current);
    titleDebounce.current = setTimeout(() => {
      if (val.trim() && val.trim() !== quest.title) {
        onUpdate(quest.id, { title: val.trim() });
      }
    }, 600);
  };

  const handleDescChange = (val: string) => {
    setDescription(val);
    if (descDebounce.current) clearTimeout(descDebounce.current);
    descDebounce.current = setTimeout(() => {
      if (val !== quest.description) {
        onUpdate(quest.id, { description: val });
      }
    }, 600);
  };

  const handleStatusChange = (val: string) => {
    onUpdate(quest.id, { status: val as QuestStatus });
  };

  const Icon = STATUS_ICON[quest.status];

  return (
    <>
      <div
        className={`border rounded-lg p-3 transition-colors cursor-pointer ${STATUS_BORDER[quest.status]}`}
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded((v) => !v); } }}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 flex-shrink-0 ${STATUS_ICON_CLASS[quest.status]}`} />
          <span className="font-medium text-sm flex-1 truncate">{quest.title}</span>
          {isEditable && expanded && (
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="none"
            >
              <Select value={quest.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 w-32 text-xs border-border/50 bg-card/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">{t("available")}</SelectItem>
                  <SelectItem value="active">{t("active")}</SelectItem>
                  <SelectItem value="completed">{t("completed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {expanded && (
          <div
            className="mt-2 space-y-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="none"
          >
            {isEditable ? (
              <>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full bg-card border border-border rounded px-2 py-1.5 text-foreground text-sm placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder={quest.title}
                  onClick={(e) => e.stopPropagation()}
                />
                <Textarea
                  value={description}
                  onChange={(e) => handleDescChange(e.target.value)}
                  placeholder={t("description_placeholder")}
                  className="text-sm min-h-[60px] bg-card border-border/50"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2"
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    <span className="text-xs">{t("delete_confirm")}</span>
                  </Button>
                </div>
              </>
            ) : (
              quest.description && (
                <p className="text-sm text-muted-foreground">{quest.description}</p>
              )
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_confirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{quest.title}&rdquo;
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { setConfirmDelete(false); onDelete(quest.id); }}
            >
              {t("delete_button")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── QuickCreateInput ─────────────────────────────────────────────────────────

interface QuickCreateInputProps {
  placeholder: string;
  onSubmit: (title: string) => void;
}

function QuickCreateInput({ placeholder, onSubmit }: QuickCreateInputProps) {
  const [value, setValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      onSubmit(value.trim());
      setValue("");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-card border border-border rounded px-3 py-2 text-foreground text-sm placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring min-h-[36px]"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground hover:text-foreground"
        onClick={() => { if (value.trim()) { onSubmit(value.trim()); setValue(""); } }}
        aria-label="Add quest"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ── QuestBoard ───────────────────────────────────────────────────────────────

interface QuestBoardProps {
  campaignId: string;
  /** DM can create/edit/delete; Player is read-only */
  isEditable: boolean;
}

export function QuestBoard({ campaignId, isEditable }: QuestBoardProps) {
  const t = useTranslations("campaign.quests");
  const { quests, loading, createQuest, updateQuest, deleteQuest } = useCampaignQuests(campaignId);
  const [completedOpen, setCompletedOpen] = useState(false);

  const activeQuests = quests.filter((q) => q.status === "active");
  const availableQuests = quests.filter((q) => q.status === "available");
  const completedQuests = quests.filter((q) => q.status === "completed");

  const handleUpdate = useCallback(
    (id: string, data: Partial<{ title: string; description: string; status: QuestStatus }>) => {
      updateQuest(id, data);
    },
    [updateQuest]
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 bg-card/50 rounded-lg border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  const isEmpty = quests.length === 0;

  return (
    <div className="space-y-3">
      {/* Quick create (DM only) */}
      {isEditable && (
        <QuickCreateInput
          placeholder={t("quick_create_placeholder")}
          onSubmit={createQuest}
        />
      )}

      {/* Empty state */}
      {isEmpty && (
        <p className="text-muted-foreground text-sm text-center py-4">{t("empty")}</p>
      )}

      {/* Active quests */}
      {activeQuests.map((q) => (
        <QuestCard
          key={q.id}
          quest={q}
          isEditable={isEditable}
          onUpdate={handleUpdate}
          onDelete={deleteQuest}
        />
      ))}

      {/* Available quests */}
      {availableQuests.map((q) => (
        <QuestCard
          key={q.id}
          quest={q}
          isEditable={isEditable}
          onUpdate={handleUpdate}
          onDelete={deleteQuest}
        />
      ))}

      {/* Completed (collapsible, closed by default) */}
      {completedQuests.length > 0 && (
        <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border/40 bg-card/30 hover:bg-card/50 transition-colors text-left min-h-[40px]"
            >
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-muted-foreground flex-1">
                {t("completed_section")} ({completedQuests.length})
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                  completedOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 mt-2">
              {completedQuests.map((q) => (
                <QuestCard
                  key={q.id}
                  quest={q}
                  isEditable={isEditable}
                  onUpdate={handleUpdate}
                  onDelete={deleteQuest}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
