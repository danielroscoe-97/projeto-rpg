"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Flag, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useCampaignFactions } from "@/lib/hooks/use-campaign-factions";
import type { CampaignFaction, FactionAlignment } from "@/lib/types/mind-map";
import { FACTION_ALIGNMENTS } from "@/lib/types/mind-map";

const ALIGNMENT_STYLE: Record<FactionAlignment, string> = {
  ally: "border-emerald-400/30 bg-card",
  neutral: "border-border bg-card",
  hostile: "border-red-400/30 bg-card",
};

const ALIGNMENT_DOT: Record<FactionAlignment, string> = {
  ally: "bg-emerald-400",
  neutral: "bg-gray-400",
  hostile: "bg-red-400",
};

interface FactionCardProps {
  faction: CampaignFaction;
  onUpdate: (id: string, updates: Partial<Pick<CampaignFaction, "name" | "description" | "alignment" | "is_visible_to_players">>) => void;
  onDelete: (id: string) => void;
}

function FactionCard({ faction, onUpdate, onDelete }: FactionCardProps) {
  const t = useTranslations("factions");
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${ALIGNMENT_STYLE[faction.alignment]}`}>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`h-2 w-2 rounded-full ${ALIGNMENT_DOT[faction.alignment]}`} />
          <Flag className="h-4 w-4 text-rose-400 flex-shrink-0" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <Input
            defaultValue={faction.name}
            className="h-7 text-sm font-semibold bg-transparent border-none px-0 focus-visible:ring-0"
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val && val !== faction.name) onUpdate(faction.id, { name: val });
            }}
          />
          <Textarea
            defaultValue={faction.description}
            placeholder={t("description_placeholder")}
            className="min-h-[40px] text-xs bg-transparent border-none px-0 resize-none focus-visible:ring-0"
            onBlur={(e) => {
              if (e.target.value !== faction.description)
                onUpdate(faction.id, { description: e.target.value });
            }}
          />

          <div className="flex items-center gap-2">
            <Select
              defaultValue={faction.alignment}
              onValueChange={(v) => onUpdate(faction.id, { alignment: v as FactionAlignment })}
            >
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FACTION_ALIGNMENTS.map((a) => (
                  <SelectItem key={a} value={a} className="text-xs">
                    {t(`alignment_${a}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() =>
                onUpdate(faction.id, { is_visible_to_players: !faction.is_visible_to_players })
              }
              title={faction.is_visible_to_players ? t("hide_from_players") : t("show_to_players")}
            >
              {faction.is_visible_to_players ? (
                <Eye className="h-3.5 w-3.5 text-cyan-400" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 ml-auto text-destructive/60 hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_description", { name: faction.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete(faction.id)}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface FactionListProps {
  campaignId: string;
  isEditable?: boolean;
}

export function FactionList({ campaignId, isEditable = true }: FactionListProps) {
  const t = useTranslations("factions");
  const { factions, loading, addFaction, updateFaction, deleteFaction } =
    useCampaignFactions(campaignId);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    await addFaction(name);
    setNewName("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">{t("loading")}</div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Add form */}
      {isEditable && (
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("add_placeholder")}
            className="h-8 text-sm flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3"
            onClick={handleAdd}
            disabled={!newName.trim()}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("add")}
          </Button>
        </div>
      )}

      {/* Faction list */}
      {factions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">{t("empty")}</p>
      ) : (
        <div className="space-y-2">
          {factions.map((fac) => (
            <FactionCard
              key={fac.id}
              faction={fac}
              onUpdate={updateFaction}
              onDelete={deleteFaction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
