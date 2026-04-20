"use client";

/**
 * MyCharactersGrid — Story 02-F full (Epic 02, Area 4, Section 2).
 *
 * Client grid for the "My characters" section of the player dashboard.
 * Pure presentational: all data (and the `defaultCharacterId` marker) is
 * resolved server-side and passed through as props so the swap from
 * skeleton → loaded is a no-op layout-wise (no re-flow, no CLS).
 *
 * Each card links to:
 *   - `/app/campaigns/{campaign_id}/sheet`   if character belongs to a campaign
 *   - `/app/characters/{id}`                 if character is standalone
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Shield, Star, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { getHpBarColor } from "@/lib/utils/hp-status";

export interface MyCharacterCardData {
  id: string;
  name: string;
  race: string | null;
  characterClass: string | null;
  level: number | null;
  currentHp: number;
  maxHp: number;
  ac: number;
  tokenUrl: string | null;
  campaignId: string | null;
  campaignName: string | null;
  /** ISO of the most recent session this character appeared in. */
  lastSessionAt: string | null;
}

interface MyCharactersGridProps {
  characters: MyCharacterCardData[];
  /** `users.default_character_id` — the card matching this id gets a badge. */
  defaultCharacterId: string | null;
}

function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export function MyCharactersGrid({
  characters,
  defaultCharacterId,
}: MyCharactersGridProps) {
  const t = useTranslations("dashboard.myCharacters");

  if (characters.length === 0) {
    return (
      <section
        aria-labelledby="my-characters-title"
        className="mb-8"
        data-testid="my-characters-empty"
      >
        <h2
          id="my-characters-title"
          className="mb-3 text-sm font-heading uppercase tracking-wider text-muted-foreground"
        >
          {t("title")}
        </h2>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <UserPlus aria-hidden="true" className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
          <Link
            href="/app/dashboard/characters"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold/15 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            data-testid="my-characters-empty-cta"
          >
            {t("cta")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      aria-labelledby="my-characters-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mb-8"
      data-testid="my-characters-grid"
    >
      <h2
        id="my-characters-title"
        className="mb-3 text-sm font-heading uppercase tracking-wider text-muted-foreground"
      >
        {t("title")}
      </h2>

      <ul
        role="list"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {characters.map((char) => {
          const isStandalone = !char.campaignId;
          const href = isStandalone
            ? `/app/characters/${char.id}`
            : `/app/campaigns/${char.campaignId}/sheet`;
          const isDefault = defaultCharacterId === char.id;
          const hasHp = char.maxHp > 0;

          const raceClassLine = [char.race, char.characterClass]
            .filter(Boolean)
            .join(" ");

          return (
            <li key={char.id}>
              <Link
                href={href}
                className="group relative block overflow-hidden rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-[250ms] hover:border-white/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                data-testid={`my-characters-card-${char.id}`}
              >
                {/* Default badge */}
                {isDefault && (
                  <span
                    aria-label={t("defaultBadge")}
                    className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold"
                    data-testid="my-characters-default-badge"
                  >
                    <Star aria-hidden="true" className="h-2.5 w-2.5" />
                    {t("defaultBadge")}
                  </span>
                )}

                <div className="flex items-start gap-3">
                  {/* Token */}
                  <div
                    aria-hidden="true"
                    className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-amber-900/40 via-amber-800/20 to-background"
                  >
                    {char.tokenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={char.tokenUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="font-display text-xl font-semibold text-gold">
                        {initialOf(char.name)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {char.name}
                    </p>
                    {raceClassLine && (
                      <p className="truncate text-xs text-muted-foreground">
                        {raceClassLine}
                        {char.level ? ` · Lv ${char.level}` : ""}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-3 flex items-center gap-3 text-xs">
                  {hasHp && (
                    <div className="flex flex-1 items-center gap-1.5">
                      <Heart
                        aria-hidden="true"
                        className="h-3 w-3 flex-shrink-0 text-red-400"
                      />
                      <div className="flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-1 rounded-full transition-all ${getHpBarColor(
                            char.currentHp,
                            char.maxHp,
                          )}`}
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(
                                100,
                                (char.currentHp / char.maxHp) * 100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="flex-shrink-0 tabular-nums text-muted-foreground">
                        {char.currentHp}/{char.maxHp}
                      </span>
                    </div>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-1.5 py-0.5 text-muted-foreground">
                    <Shield aria-hidden="true" className="h-3 w-3" />
                    {char.ac}
                  </span>
                </div>

                {/* Campaign / standalone tag */}
                <p className="mt-2 truncate text-[11px] text-muted-foreground/80">
                  {isStandalone
                    ? t("standaloneBadge")
                    : (char.campaignName ?? t("standaloneBadge"))}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
