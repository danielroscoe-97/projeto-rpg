"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronDown,
  ChevronRight,
  ScrollText,
  Swords,
  Calendar,
  Clock,
  Plus,
  Play,
  Pencil,
  X,
  Radio,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import {
  startSession,
  cancelSession,
} from "@/lib/supabase/campaign-sessions";
import {
  SessionPlanner,
  type SessionPlannerInitialData,
} from "./SessionPlanner";
import { SessionRecapDialog } from "./SessionRecapDialog";

// ── Types ────────────────────────────────────────────────────────────────────

interface SessionHistoryProps {
  campaignId: string;
  isOwner: boolean;
  /**
   * Current authenticated user id. Required to plan/create sessions from the header CTA.
   * Optional for backwards compat, but the planner CTA is only rendered when present.
   */
  userId?: string;
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
  onStart,
  onEdit,
  onCancel,
  onEnter,
  onEditRecap,
}: {
  session: SessionEntry;
  isOwner: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  onStart?: (id: string) => void;
  onEdit?: (session: SessionEntry) => void;
  onCancel?: (id: string) => void;
  onEnter?: (id: string) => void;
  onEditRecap?: (session: SessionEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = session.status as SessionStatus;
  const isCancelled = status === "cancelled";
  const isActive = status === "active";
  const isPlanned = status === "planned";
  const isCompleted = status === "completed";
  const stats = getEncounterStats(session.encounters);

  // Whether the action row should render at all.
  const hasActions =
    isOwner &&
    ((isPlanned && (onStart || onEdit || onCancel)) ||
      (isActive && (onEnter || onCancel)) ||
      (isCompleted && onEditRecap));

  // Stop propagation so clicking an action doesn't toggle the card expand state.
  const stop = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

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

        {/* Action row (DM-only, status-dependent) */}
        {hasActions && (
          <div
            className="flex flex-wrap items-center gap-2 px-4 pb-3 -mt-1"
            data-testid={`session-actions-${session.id}`}
            onClick={stop}
            onKeyDown={stop}
          >
            {isPlanned && onStart && (
              <Button
                type="button"
                size="sm"
                onClick={() => onStart(session.id)}
                className="min-h-[36px] bg-amber-600 hover:bg-amber-700 text-foreground gap-1.5"
                data-testid={`session-start-${session.id}`}
              >
                <Play className="w-3.5 h-3.5" />
                {t("action_start")}
              </Button>
            )}
            {isActive && onEnter && (
              <Button
                type="button"
                size="sm"
                onClick={() => onEnter(session.id)}
                className="min-h-[36px] bg-amber-600 hover:bg-amber-700 text-foreground gap-1.5"
                data-testid={`session-enter-${session.id}`}
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                {t("action_enter")}
              </Button>
            )}
            {isPlanned && onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEdit(session)}
                className="min-h-[36px] border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.06] gap-1.5"
                data-testid={`session-edit-${session.id}`}
              >
                <Pencil className="w-3.5 h-3.5" />
                {t("action_edit")}
              </Button>
            )}
            {isActive && onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onCancel(session.id)}
                className="min-h-[36px] border-border text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 gap-1.5"
                data-testid={`session-finish-${session.id}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t("action_finish")}
              </Button>
            )}
            {isPlanned && onCancel && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onCancel(session.id)}
                className="min-h-[36px] text-muted-foreground hover:text-red-400 hover:bg-red-500/10 gap-1.5"
                data-testid={`session-cancel-${session.id}`}
              >
                <X className="w-3.5 h-3.5" />
                {t("action_cancel")}
              </Button>
            )}
            {isCompleted && onEditRecap && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditRecap(session)}
                className="min-h-[36px] border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.06] gap-1.5"
                data-testid={`session-edit-recap-${session.id}`}
              >
                <FileText className="w-3.5 h-3.5" />
                {t("action_edit_recap")}
              </Button>
            )}
          </div>
        )}

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

export function SessionHistory({ campaignId, isOwner, userId }: SessionHistoryProps) {
  const t = useTranslations("sessionHistory");
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Planner / edit / confirm dialog state (DM-only).
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionEntry | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [recapSession, setRecapSession] = useState<SessionEntry | null>(null);

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
    const sessionIds = sessionsData.map((s: { id: string }) => s.id);
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
    return sessionsData.map((s: Record<string, unknown>) => ({
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

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [fetchSessions]);

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

  // ── Action handlers ────────────────────────────────────────────────────────

  const handleStart = useCallback(
    async (sessionId: string) => {
      const ok = await startSession(sessionId);
      if (!ok) {
        toast.error(t("action_error"));
        return;
      }
      router.push(`/app/combat/${sessionId}`);
    },
    [router, t],
  );

  const handleEnter = useCallback(
    (sessionId: string) => {
      router.push(`/app/combat/${sessionId}`);
    },
    [router],
  );

  const handleEditClick = useCallback((session: SessionEntry) => {
    setEditingSession(session);
  }, []);

  const handleCancelClick = useCallback((sessionId: string) => {
    setCancelTargetId(sessionId);
  }, []);

  const handleConfirmCancel = useCallback(async () => {
    if (!cancelTargetId) return;
    const ok = await cancelSession(cancelTargetId);
    setCancelTargetId(null);
    if (!ok) {
      toast.error(t("action_error"));
      return;
    }
    toast.success(t("action_cancelled"));
    await loadSessions();
  }, [cancelTargetId, loadSessions, t]);

  const handleEditRecapClick = useCallback((session: SessionEntry) => {
    setRecapSession(session);
  }, []);

  const plannerCanCreate = isOwner && !!userId;
  const plannerInitialData: SessionPlannerInitialData | null = editingSession
    ? {
        sessionId: editingSession.id,
        name: editingSession.name,
        description: editingSession.description,
        scheduled_for: editingSession.scheduled_for,
        prep_notes: editingSession.prep_notes,
      }
    : null;

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
      <>
        <div className="space-y-3" data-testid="session-history-empty">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
            {plannerCanCreate && (
              <Button
                variant="goldOutline"
                size="sm"
                onClick={() => setPlannerOpen(true)}
                className="gap-1.5"
                data-testid="session-add-button"
              >
                <Plus className="w-4 h-4" />
                {t("plan_session")}
              </Button>
            )}
          </div>
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
            {plannerCanCreate && (
              <Button
                variant="goldOutline"
                size="sm"
                onClick={() => setPlannerOpen(true)}
                className="mt-4 gap-1.5"
                data-testid="session-add-button-empty"
              >
                <Plus className="w-4 h-4" />
                {t("plan_session")}
              </Button>
            )}
          </div>
        </div>

        {plannerCanCreate && (
          <SessionPlanner
            campaignId={campaignId}
            userId={userId as string}
            open={plannerOpen}
            onOpenChange={setPlannerOpen}
            onSessionCreated={() => loadSessions()}
          />
        )}
      </>
    );
  }

  // ── Timeline ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-2" data-testid="session-history">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
          {plannerCanCreate && (
            <Button
              variant="goldOutline"
              size="sm"
              onClick={() => setPlannerOpen(true)}
              className="gap-1.5"
              data-testid="session-add-button"
            >
              <Plus className="w-4 h-4" />
              {t("plan_session")}
            </Button>
          )}
        </div>

        <div>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isOwner={isOwner}
              t={t}
              onStart={isOwner ? handleStart : undefined}
              onEdit={isOwner ? handleEditClick : undefined}
              onCancel={isOwner ? handleCancelClick : undefined}
              onEnter={handleEnter}
              onEditRecap={isOwner ? handleEditRecapClick : undefined}
            />
          ))}
        </div>
      </div>

      {/* Create planner dialog (DM only) */}
      {plannerCanCreate && (
        <SessionPlanner
          campaignId={campaignId}
          userId={userId as string}
          open={plannerOpen}
          onOpenChange={setPlannerOpen}
          onSessionCreated={() => loadSessions()}
        />
      )}

      {/* Edit planner dialog (DM only) */}
      {plannerCanCreate && editingSession && (
        <SessionPlanner
          key={editingSession.id}
          campaignId={campaignId}
          userId={userId as string}
          open={!!editingSession}
          onOpenChange={(next) => {
            if (!next) setEditingSession(null);
          }}
          initialData={plannerInitialData}
          onSessionUpdated={() => {
            setEditingSession(null);
            loadSessions();
          }}
        />
      )}

      {/* Recap dialog (completed sessions) */}
      {recapSession && (
        <SessionRecapDialog
          sessionId={recapSession.id}
          sessionName={recapSession.name}
          open={!!recapSession}
          onOpenChange={(next) => {
            if (!next) setRecapSession(null);
          }}
          onSaved={() => {
            setRecapSession(null);
            loadSessions();
          }}
        />
      )}

      {/* Cancel confirm */}
      <AlertDialog
        open={!!cancelTargetId}
        onOpenChange={(next) => {
          if (!next) setCancelTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancel_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cancel_confirm_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel_confirm_keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("cancel_confirm_yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
