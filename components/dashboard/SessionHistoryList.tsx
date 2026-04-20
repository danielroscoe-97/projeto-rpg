"use client";

/**
 * SessionHistoryList — Story 02-F full (Epic 02, Area 4, Section 4).
 *
 * Player view of their last 10 session/encounter pairings. Each row links
 * either to the session or to the encounter recap when one exists.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";

export interface SessionHistoryRowData {
  sessionId: string;
  campaignId: string;
  campaignName: string;
  encounterId: string;
  encounterName: string;
  createdAt: string;
  /** True if a recap snapshot is available (links to recap view). */
  hasRecap: boolean;
}

interface SessionHistoryListProps {
  rows: SessionHistoryRowData[];
  locale: string;
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
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

export function SessionHistoryList({
  rows,
  locale,
}: SessionHistoryListProps) {
  const t = useTranslations("dashboard.sessionHistory");

  if (rows.length === 0) {
    return (
      <section
        aria-labelledby="session-history-title"
        className="mb-8"
        data-testid="session-history-empty"
      >
        <h2
          id="session-history-title"
          className="mb-3 text-sm font-heading uppercase tracking-wider text-muted-foreground"
        >
          {t("title")}
        </h2>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <ScrollText aria-hidden="true" className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      aria-labelledby="session-history-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="mb-8"
      data-testid="session-history-list"
    >
      <h2
        id="session-history-title"
        className="mb-3 text-sm font-heading uppercase tracking-wider text-muted-foreground"
      >
        {t("title")}
      </h2>

      <ul
        role="list"
        className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card"
      >
        {rows.map((row) => {
          const href = row.hasRecap
            ? `/app/campaigns/${row.campaignId}/encounters/${row.encounterId}/recap`
            : `/app/campaigns/${row.campaignId}`;
          return (
            <li key={`${row.sessionId}-${row.encounterId}`}>
              <Link
                href={href}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none"
                data-testid={`session-history-row-${row.encounterId}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.encounterName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.campaignName}
                    <span className="mx-1.5">·</span>
                    {formatDate(row.createdAt, locale)}
                  </p>
                </div>
                {row.hasRecap && (
                  <span
                    className="flex-shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold"
                    data-testid="session-history-recap-badge"
                  >
                    {t("recapBadge")}
                  </span>
                )}
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 flex-shrink-0 text-muted-foreground/60"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
