"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronDown,
  ChevronRight,
  ScrollText,
  Swords,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface SessionHistoryProps {
  campaignId: string;
  isOwner: boolean;
}

interface EncounterSummary {
  id: string;
  name: string;
  round_number: number;
  is_active: boolean;
}

interface SessionEntry {
  id: string;
  name: string;
  description: string | null;
  session_number: number | null;
  status: string;
  recap: string | null;
  scheduled_for: string | null;
  prep_notes: string | null;
  created_at: string;
  updated_at: string;
  encounters: EncounterSummary[];
}

type SessionStatus = "planned" | "active" | "completed" | "cancelled";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatSessionDate(dateStr: string, t: (key: string, values?: Record<string, string | number>) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t("date_today");
  if (diffDays === 1) return t("date_yesterday");
  if (diffDays < 7) return t("date_days_ago", { count: diffDays });
  if (diffDays < 30) return t("date_weeks_ago", { count: Math.floor(diffDays / 7) });

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function getEncounterStats(encounters: EncounterSummary[]) {
  const totalEncounters = encounters.length;
  const totalRounds = encounters.reduce((sum, e) => sum + (e.round_number ?? 0), 0);
  return { totalEncounters, totalRounds };
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SessionStatus, { color: string; dotColor?: string; pulse?: boolean }> = {
  planned: { color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  active: { color: "bg-amber-500/15 text-amber-400 border-amber-500/30", dotColor: "bg-amber-400", pulse: true },
  completed: { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  cancelled: { color: "bg-white/5 text-muted-foreground border-white/10" },
};

function StatusBadge({ status, t }: { status: SessionStatus; t: (key: string) => string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.planned;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        config.color
      )}
    >
      {config.dotColor && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full", config.dotColor, config.pulse && "animate-pulse")}
          aria-hidden="true"
        />
      )}
      {t(`status_${status}`)}
    </span>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SessionCardSkeleton() {
  return (
    <div className="flex gap-4" aria-hidden="true">
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-white/[0.06] animate-pulse" />
        <div className="flex-1 w-px bg-white/[0.06]" />
      </div>
      {/* Card */}
      <div className="flex-1 animate-pulse bg-card border border-white/[0.04] rounded-xl p-4 mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-48 bg-white/[0.06] rounded" />
            <div className="h-3 w-32 bg-white/[0.06] rounded" />
          </div>
          <div className="h-5 w-20 bg-white/[0.06] rounded-full" />
        </div>
        <div className="h-3 w-64 bg-white/[0.06] rounded" />
        <div className="flex gap-4">
          <div className="h-3 w-24 bg-white/[0.06] rounded" />
          <div className="h-3 w-28 bg-white/[0.06] rounded" />
        </div>
      </div>
    </div>
  );
}

// ── Session card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  isOwner,
  t,
}: {
  session: SessionEntry;
  isOwner: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = session.status as SessionStatus;
  const isCancelled = status === "cancelled";
  const isActive = status === "active";
  const stats = getEncounterStats(session.encounters);

  return (
    <div className="flex gap-4">
      {/* Timeline node */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border",
            isActive
              ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
              : isCancelled
                ? "bg-white/[0.03] border-white/[0.08] text-muted-foreground"
                : status === "completed"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-blue-500/15 border-blue-500/30 text-blue-400"
          )}
        >
          {session.session_number ?? "#"}
        </div>
        <div className="flex-1 w-px border-l-2 border-white/[0.06]" />
      </div>

      {/* Card */}
      <div
        className={cn(
          "flex-1 bg-card border rounded-xl transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] mb-4",
          isActive
            ? "border-amber-500/30 hover:border-amber-500/50"
            : "border-white/[0.04] hover:border-gold/30",
          isCancelled && "opacity-50"
        )}
        data-testid={`session-history-card-${session.id}`}
      >
        {/* Header - clickable */}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full text-left p-4 flex items-start gap-3 cursor-pointer"
          aria-expanded={expanded}
        >
          {/* Chevron */}
          <span className="mt-0.5 shrink-0 text-muted-foreground">
            {expanded ? (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            )}
          </span>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Row 1: title + status */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3
                className={cn(
                  "text-sm font-medium",
                  isCancelled ? "text-muted-foreground line-through" : "text-gold"
                )}
              >
                {session.session_number != null
                  ? t("session_title", { number: session.session_number, name: session.name })
                  : session.name}
              </h3>
              <StatusBadge status={status} t={t} />
            </div>

            {/* Row 2: date + stats */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" aria-hidden="true" />
                {formatSessionDate(session.scheduled_for ?? session.created_at, t)}
              </span>
              {stats.totalEncounters > 0 && (
                <span className="flex items-center gap-1">
                  <Swords className="w-3 h-3" aria-hidden="true" />
                  {t("session_stats", {
                    encounters: stats.totalEncounters,
                    rounds: stats.totalRounds,
                  })}
                </span>
              )}
            </div>

            {/* Row 3: recap preview */}
            {status === "completed" && session.recap && (
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                {truncateText(session.recap, 200)}
              </p>
            )}
          </div>
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t border-white/[0.04] px-4 pb-4 pt-3 space-y-4">
            {/* Full recap */}
            {session.recap && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t("recap_label")}
                </p>
                <div className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                  {session.recap}
                </div>
              </div>
            )}

            {/* Encounters list */}
            {session.encounters.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t("encounters_label")}
                </p>
                <div className="space-y-1">
                  {session.encounters.map((enc) => (
                    <div
                      key={enc.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Swords className="w-3.5 h-3.5 text-amber-400/60 shrink-0" aria-hidden="true" />
                        <span className="truncate text-foreground">{enc.name}</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground shrink-0 ml-2">
                        {t("encounter_rounds", { count: enc.round_number })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prep notes (DM only) */}
            {isOwner && session.prep_notes && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  {t("prep_notes_label")}
                </p>
                <div className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                  {session.prep_notes}
                </div>
              </div>
            )}

            {/* Collapse button */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                {t("collapse")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function SessionHistory({ campaignId, isOwner }: SessionHistoryProps) {
  const t = useTranslations("sessionHistory");
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    const supabase = createClient();

    // 1. Fetch sessions
    const { data: sessionsData, error: sessionsError } = await supabase
      .from("sessions")
      .select(
        "id, name, description, session_number, status, recap, scheduled_for, prep_notes, created_at, updated_at"
      )
      .eq("campaign_id", campaignId)
      .order("session_number", { ascending: false });

    if (sessionsError) {
      throw new Error(sessionsError.message);
    }

    if (!sessionsData || sessionsData.length === 0) {
      return [];
    }

    // 2. Fetch encounters for all sessions in a single query
    const sessionIds = sessionsData.map((s) => s.id);
    const { data: encountersData, error: encountersError } = await supabase
      .from("encounters")
      .select("id, session_id, name, round_number, is_active")
      .in("session_id", sessionIds);

    if (encountersError) {
      throw new Error(encountersError.message);
    }

    // Group encounters by session_id
    const encountersBySession = new Map<string, EncounterSummary[]>();
    for (const enc of encountersData ?? []) {
      const existing = encountersBySession.get(enc.session_id) ?? [];
      existing.push({
        id: enc.id,
        name: enc.name,
        round_number: enc.round_number,
        is_active: enc.is_active,
      });
      encountersBySession.set(enc.session_id, existing);
    }

    // 3. Merge
    return sessionsData.map((s) => ({
      id: s.id as string,
      name: s.name as string,
      description: s.description as string | null,
      session_number: s.session_number as number | null,
      status: s.status as string,
      recap: s.recap as string | null,
      scheduled_for: s.scheduled_for as string | null,
      prep_notes: s.prep_notes as string | null,
      created_at: s.created_at as string,
      updated_at: s.updated_at as string,
      encounters: encountersBySession.get(s.id as string) ?? [],
    }));
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSessions();
        if (!cancelled) {
          setSessions(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load sessions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [fetchSessions]);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-2" data-testid="session-history-loading">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        {[1, 2, 3].map((i) => (
          <SessionCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="space-y-3" data-testid="session-history-error">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (sessions.length === 0) {
    return (
      <div className="space-y-3" data-testid="session-history-empty">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        <div className="rounded-xl border border-white/[0.04] bg-card p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center mb-3">
            <ScrollText className="w-6 h-6 text-amber-400/60" aria-hidden="true" />
          </div>
          <p className="text-muted-foreground text-sm">
            {t("empty")}
          </p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            {t("empty_desc")}
          </p>
        </div>
      </div>
    );
  }

  // ── Timeline ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2" data-testid="session-history">
      <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>

      <div>
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            isOwner={isOwner}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
