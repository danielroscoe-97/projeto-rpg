"use client";

/**
 * ContinueFromLastSession — Story 02-F parte 1 (Epic 02, Area 4).
 *
 * Renders a "Continue where you left off" card at the top of the player
 * dashboard. Shown when `users.last_session_at` is non-null.
 *
 * NOTE: This component currently consumes MOCK data via props with sensible
 *       fallbacks. Story 02-F-full will replace the parent server query with
 *       a real JOIN: campaigns × player_characters × users.last_session_at,
 *       and wire the `campaignId`, `characterId`, `campaignName`,
 *       `characterName`, `avatarUrl`, and `lastSessionAt` props through.
 *       The visual contract (layout, sizing, a11y) is frozen here so the
 *       full-data swap in 02-F-full is a no-op UI-wise.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

export interface ContinueFromLastSessionData {
  /** Campaign the player last interacted with. If null, links to character HQ. */
  campaignId: string | null;
  /** Character used in the last session. */
  characterId: string | null;
  /** Campaign display name — falls back to i18n `defaultCampaignName`. */
  campaignName: string | null;
  /** Character display name — falls back to i18n `defaultCharacterName`. */
  characterName: string | null;
  /** URL of a stored avatar/token image; when null, we render the initial. */
  avatarUrl: string | null;
  /** ISO timestamp of the last session. */
  lastSessionAt: string;
}

interface ContinueFromLastSessionProps {
  data: ContinueFromLastSessionData;
}

function getInitial(name: string | null): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

/**
 * Light-weight, locale-aware "time ago" formatter.
 *
 * We intentionally avoid pulling in `date-fns` (not a dependency) — Intl's
 * RelativeTimeFormat is available in every supported browser and produces
 * localized strings for the two supported locales (pt-BR, en).
 */
function formatRelative(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((then - Date.now()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diffSec);

  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 365)
    return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
  return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
}

export function ContinueFromLastSession({
  data,
}: ContinueFromLastSessionProps) {
  const t = useTranslations("dashboard.continueFromLastSession");

  const campaignName = data.campaignName ?? t("defaultCampaignName");
  const characterName = data.characterName ?? t("defaultCharacterName");
  const initial = getInitial(data.characterName);

  // Use the user's locale for the relative-time string. We default to pt-BR
  // because 83% of traffic is BR (see docs/seo-architecture.md — decision 2).
  const locale =
    typeof navigator !== "undefined" && navigator.language
      ? navigator.language
      : "pt-BR";
  const agoText = formatRelative(data.lastSessionAt, locale);

  // Destination: campaign sheet if we know the campaign, else character HQ.
  const href = data.campaignId
    ? `/app/campaigns/${data.campaignId}/sheet`
    : data.characterId
      ? `/app/characters/${data.characterId}`
      : "/app/dashboard";

  return (
    <motion.section
      aria-labelledby="continue-from-last-session-title"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mb-6"
    >
      <Link
        href={href}
        className="group relative flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-[250ms] hover:border-white/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-5"
        data-testid="continue-from-last-session"
      >
        {/* Avatar */}
        <div
          aria-hidden="true"
          className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-amber-900/40 via-amber-800/20 to-background sm:h-16 sm:w-16"
        >
          {data.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="font-display text-xl font-semibold text-gold sm:text-2xl">
              {initial}
            </span>
          )}
        </div>

        {/* Copy */}
        <div className="min-w-0 flex-1">
          <p
            id="continue-from-last-session-title"
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t("title")}
          </p>
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">
            {characterName}
            <span className="mx-1.5 text-muted-foreground">·</span>
            <span className="text-foreground/80">{campaignName}</span>
          </p>
          {agoText && (
            <p className="text-xs text-muted-foreground">
              {t("ago", { when: agoText })}
            </p>
          )}
        </div>

        {/* CTA */}
        <span className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-gold/15 px-3 py-1.5 text-xs font-bold text-gold transition-all group-hover:bg-gold/25 group-hover:shadow-gold-glow sm:text-sm">
          {t("cta")}
          <ArrowRight
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </Link>
    </motion.section>
  );
}
