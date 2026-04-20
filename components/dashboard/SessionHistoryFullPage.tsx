"use client";

/**
 * SessionHistoryFullPage — Story 02-G.
 *
 * Client renderer for /app/dashboard/sessions. Pure presentational: it
 * receives the server-resolved page of entries + the pre-built `nextCursor`
 * string (already URL-safe base64) and emits a server-rendered "Carregar
 * mais" Link. There is NO client state here — pagination is driven by
 * round-tripping through the URL, so browser back/forward and deep links
 * Just Work without us hydrating state from the URL on mount.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";

import type { SessionHistoryRowData } from "@/components/dashboard/SessionHistoryList";

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

interface SessionHistoryFullPageProps {
  entries: SessionHistoryRowData[];
  /** Encoded cursor for the NEXT page, or null if this is the last page. */
  nextCursor: string | null;
  locale: string;
}

export function SessionHistoryFullPage({
  entries,
  nextCursor,
  locale,
}: SessionHistoryFullPageProps) {
  const t = useTranslations("dashboard.sessionsPage");
  const tHist = useTranslations("dashboard.sessionHistory");

  if (entries.length === 0) {
    return (
      <section
        aria-labelledby="sessions-page-title"
        data-testid="dashboard.sessions.empty-state"
      >
        <header className="mb-6">
          <nav aria-label={t("breadcrumb")} className="mb-3 text-xs text-muted-foreground">
            <Link href="/app/dashboard" className="hover:text-foreground">
              {t("breadcrumb")}
            </Link>
          </nav>
          <h1
            id="sessions-page-title"
            className="font-heading text-2xl text-foreground"
          >
            {t("title")}
          </h1>
        </header>

        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <ScrollText aria-hidden="true" className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      aria-labelledby="sessions-page-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      data-testid="dashboard.sessions.list"
    >
      <header className="mb-6">
        <nav
          aria-label={t("breadcrumb")}
          className="mb-3 text-xs text-muted-foreground"
        >
          <Link href="/app/dashboard" className="hover:text-foreground">
            {t("breadcrumb")}
          </Link>
        </nav>
        <h1
          id="sessions-page-title"
          className="font-heading text-2xl text-foreground"
        >
          {t("title")}
        </h1>
      </header>

      <ul
        role="list"
        className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card"
      >
        {entries.map((row) => {
          const href = row.hasRecap
            ? `/app/campaigns/${row.campaignId}/encounters/${row.encounterId}/recap`
            : `/app/campaigns/${row.campaignId}`;
          return (
            <li key={`${row.sessionId}-${row.encounterId}`}>
              <Link
                href={href}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none"
                data-testid={`dashboard.sessions.row-${row.encounterId}`}
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
                  <span className="flex-shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                    {tHist("recapBadge")}
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

      {nextCursor && (
        <div className="mt-6 flex justify-center">
          <Link
            href={`/app/dashboard/sessions?cursor=${encodeURIComponent(nextCursor)}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            data-testid="dashboard.sessions.load-more-link"
          >
            {t("loadMore")}
          </Link>
        </div>
      )}
    </motion.section>
  );
}
