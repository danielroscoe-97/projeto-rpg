"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { PlayerCharacter } from "@/lib/types/database";

// ── Props ───────────────────────────────────────────────────────────────────

interface CampaignHeroCompactProps {
  campaignId: string;
  campaignName: string;
  characters: PlayerCharacter[];
  activeSessionName: string | null;
  sessionCount: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ── Component ───────────────────────────────────────────────────────────────

export function CampaignHeroCompact({
  campaignId,
  campaignName,
  characters,
  activeSessionName,
  sessionCount,
}: CampaignHeroCompactProps) {
  const t = useTranslations("campaign");

  const sessionLabel = activeSessionName ?? (sessionCount > 0 ? `S${sessionCount}` : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-card border-b border-border/30 px-4 py-3 flex items-center gap-3 flex-wrap"
    >
      {/* Back to campaign overview */}
      <Link
        href={`/app/campaigns/${campaignId}`}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] inline-flex items-center"
      >
        {t("hub_back_to_campaign", { name: campaignName })}
      </Link>

      {/* Mini avatars */}
      {characters.length > 0 && (
        <div className="flex items-center -space-x-1.5">
          {characters.slice(0, 6).map((char) => (
            <div
              key={char.id}
              className="w-6 h-6 rounded-full bg-amber-500/20 ring-1 ring-border flex items-center justify-center overflow-hidden"
              title={char.name}
            >
              {char.token_url ? (
                <img
                  src={char.token_url}
                  alt={char.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <span className="text-[9px] font-medium text-amber-400 leading-none">
                  {getInitials(char.name)}
                </span>
              )}
            </div>
          ))}
          {characters.length > 6 && (
            <div className="w-6 h-6 rounded-full bg-muted ring-1 ring-border flex items-center justify-center">
              <span className="text-[9px] font-medium text-muted-foreground leading-none">
                +{characters.length - 6}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Session badge */}
      {sessionLabel && (
        <span className="text-xs text-muted-foreground">{sessionLabel}</span>
      )}
    </motion.div>
  );
}
