"use client";

import { useTranslations } from "next-intl";
import { Check, AlertTriangle } from "lucide-react";
import type { PlayerCharacter } from "@/lib/types/database";
import type { CampaignMemberWithUser } from "@/lib/types/campaign-membership";

interface Props {
  members: CampaignMemberWithUser[];
  characters: PlayerCharacter[];
  selectedMemberIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

function getCharacterForMember(
  member: CampaignMemberWithUser,
  characters: PlayerCharacter[]
): PlayerCharacter | undefined {
  return characters.find((c) => c.user_id === member.user_id);
}

export function EncounterPlayerSelector({
  members,
  characters,
  selectedMemberIds,
  onSelectionChange,
}: Props) {
  const t = useTranslations("encounter_builder");
  const players = members.filter((m) => m.role === "player");

  const allSelected = players.length > 0 && players.every((p) => selectedMemberIds.includes(p.id));

  function toggleAll() {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(players.map((p) => p.id));
    }
  }

  function toggleMember(memberId: string) {
    if (selectedMemberIds.includes(memberId)) {
      onSelectionChange(selectedMemberIds.filter((id) => id !== memberId));
    } else {
      onSelectionChange([...selectedMemberIds, memberId]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-amber-400">{t("player_selector_title")}</h3>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {allSelected ? t("deselect_all") : t("select_all")}
        </button>
      </div>

      {players.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">{t("no_players")}</p>
      ) : (
        <div className="space-y-1">
          {players.map((member) => {
            const char = getCharacterForMember(member, characters);
            const isSelected = selectedMemberIds.includes(member.id);
            const hasLevel = char?.level != null;

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleMember(member.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors text-left ${
                  isSelected
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border bg-card/50 opacity-50"
                }`}
              >
                {/* Checkbox */}
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? "bg-amber-500 border-amber-500"
                      : "border-gray-600 bg-transparent"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-black" />}
                </div>

                {/* Avatar placeholder */}
                <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-gray-400 font-bold">
                    {(char?.name ?? member.display_name ?? "?").charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {char?.name ?? member.character_name ?? member.display_name ?? member.email}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {char?.class && <span>{char.class}</span>}
                    {char?.level != null && (
                      <span>
                        {t("level_abbr")} {char.level}
                      </span>
                    )}
                    {char?.race && <span className="opacity-70">{char.race}</span>}
                  </div>
                </div>

                {/* Warning if no level */}
                {!hasLevel && isSelected && (
                  <span title={t("missing_level")}>
                    <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
        <span>
          {selectedMemberIds.length} {t("selected_count")}
        </span>
      </div>
    </div>
  );
}
