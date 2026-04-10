"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { InvitePlayerDialog } from "@/components/campaign/InvitePlayerDialog";
import { UserPlus, Shield } from "lucide-react";
import type { PlayerCharacter } from "@/lib/types/database";

interface CampaignPlayerAvatarsProps {
  characters: PlayerCharacter[];
  campaignId: string;
  onInvite?: () => void;
  /** User IDs that recently joined — shows "new" badge on their avatar */
  newMemberIds?: Set<string>;
}

function getHpColor(current: number, max: number): string {
  if (max <= 0) return "bg-muted";
  const pct = (current / max) * 100;
  if (pct > 70) return "bg-emerald-500";
  if (pct > 40) return "bg-amber-500";
  if (pct > 10) return "bg-orange-500";
  return "bg-red-500";
}

function getHpPercent(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function CampaignPlayerAvatars({
  characters,
  campaignId,
  onInvite,
  newMemberIds,
}: CampaignPlayerAvatarsProps) {
  const t = useTranslations("campaign");
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const handleInvite = onInvite ?? (() => setInviteOpen(true));

  return (
    <div className="flex flex-wrap gap-3 items-start">
      {characters.map((char) => {
        const isNew = char.user_id && newMemberIds?.has(char.user_id);
        return (
        <Popover key={char.id}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex flex-col items-center gap-1 hover:scale-105 transition-transform min-h-[44px] relative"
            >
              <div className={`w-10 h-10 rounded-full bg-amber-500/20 ring-2 flex items-center justify-center overflow-hidden ${isNew ? "ring-amber-400 animate-pulse" : "ring-border"}`}>
                {char.token_url ? (
                  <img
                    src={char.token_url}
                    alt={char.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-sm text-amber-400">
                    {getInitials(char.name)}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground max-w-[60px] truncate text-center">
                {char.name}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3 space-y-2">
            <p className="font-bold text-sm text-foreground">{char.name}</p>

            {/* HP Bar */}
            <div className="space-y-1">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getHpColor(char.current_hp, char.max_hp)}`}
                  style={{
                    width: `${getHpPercent(char.current_hp, char.max_hp)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {char.current_hp}/{char.max_hp} HP
              </p>
            </div>

            {/* AC Badge */}
            {char.ac > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="w-3 h-3" />
                <span>AC {char.ac}</span>
              </div>
            )}

            {/* Class + Level */}
            {(char.class || char.level) && (
              <p className="text-xs text-muted-foreground">
                {[char.class, char.level ? `Lv ${char.level}` : null]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            )}

            {/* Edit link */}
            <button
              type="button"
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium min-h-[44px] flex items-center"
              onClick={() =>
                router.push(`?section=players`, { scroll: false })
              }
            >
              {t("hub_avatar_edit")} &rarr;
            </button>
          </PopoverContent>
        </Popover>
        );
      })}

      {/* Add player button */}
      <button
        type="button"
        className="flex flex-col items-center gap-1 hover:scale-105 transition-transform min-h-[44px]"
        onClick={handleInvite}
      >
        <div className="w-10 h-10 rounded-full bg-emerald-400/10 border-2 border-dashed border-emerald-400/20 flex items-center justify-center">
          <UserPlus className="w-4 h-4 text-emerald-400" />
        </div>
        <span className="text-[10px] text-emerald-400/60">+</span>
      </button>

      {/* Only render internal dialog if parent doesn't control it */}
      {!onInvite && (
        <InvitePlayerDialog
          campaignId={campaignId}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
        />
      )}
    </div>
  );
}
