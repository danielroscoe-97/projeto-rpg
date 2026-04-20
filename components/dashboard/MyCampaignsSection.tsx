"use client";

/**
 * MyCampaignsSection — Story 02-F full (Epic 02, Area 4, Section 3).
 *
 * Player-view campaign list: every campaign the logged-in user is joined as
 * `role = 'player'` with `status = 'active'`. Pure client component; all
 * data is resolved server-side (MyCampaignsServer) and passed via props so
 * there is no CLS when the skeleton swaps out.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Users, Swords } from "lucide-react";
import { useTranslations } from "next-intl";

export interface MyCampaignCardData {
  id: string;
  name: string;
  coverImageUrl: string | null;
  dmName: string | null;
  /** @deprecated C5 — never populated by MyCampaignsServer (email leak).
   *  Kept in the interface for backward compat; do not render this value. */
  dmEmail: string;
  sessionCount: number;
  lastSessionAt: string | null;
}

interface MyCampaignsSectionProps {
  campaigns: MyCampaignCardData[];
  locale: string;
}

function formatShortDate(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function MyCampaignsSection({
  campaigns,
  locale,
}: MyCampaignsSectionProps) {
  const t = useTranslations("dashboard.myCampaigns");

  if (campaigns.length === 0) {
    return (
      <section
        aria-labelledby="my-campaigns-title"
        className="mb-8"
        data-testid="my-campaigns-empty"
      >
        <h2
          id="my-campaigns-title"
          className="mb-3 text-sm font-heading uppercase tracking-wider text-muted-foreground"
        >
          {t("title")}
        </h2>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <Swords aria-hidden="true" className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      aria-labelledby="my-campaigns-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mb-8"
      data-testid="my-campaigns-section"
    >
      <h2
        id="my-campaigns-title"
        className="mb-3 text-sm font-heading uppercase tracking-wider text-muted-foreground"
      >
        {t("title")}
      </h2>

      <ul role="list" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {campaigns.map((c) => {
          const lastSession = formatShortDate(c.lastSessionAt, locale);
          return (
            <li key={c.id}>
              <Link
                href={`/app/campaigns/${c.id}`}
                className="group relative block overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-[250ms] hover:border-white/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                data-testid={`my-campaigns-card-${c.id}`}
              >
                {/* Cover */}
                <div className="relative h-24 w-full overflow-hidden">
                  {c.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-amber-900/30 via-amber-800/15 to-background" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <p className="absolute bottom-2 left-3 right-3 truncate text-sm font-semibold text-white drop-shadow-sm">
                    {c.name}
                  </p>
                </div>

                {/* Meta */}
                <div className="space-y-1.5 p-3">
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <Users aria-hidden="true" className="h-3 w-3" />
                    {/* C5: never display foreign user's email. Use display_name
                        only; fall back to a generic placeholder. */}
                    {t("dmLabel", { dm: c.dmName || "—" })}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground/80">
                    <span className="inline-flex items-center gap-1">
                      <Swords aria-hidden="true" className="h-3 w-3" />
                      {t("sessionCount", { count: c.sessionCount })}
                    </span>
                    {lastSession && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar aria-hidden="true" className="h-3 w-3" />
                        {lastSession}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
