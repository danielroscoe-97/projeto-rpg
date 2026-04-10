"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, Play, Pencil, X, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────────────────────────────────────

interface NextSessionCardProps {
  session: {
    id: string;
    name: string;
    scheduled_for: string | null;
    session_number: number | null;
    description: string | null;
    status: string;
  };
  onEdit?: () => void;
  onStart?: () => void;
  onCancel?: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getRelativeDate(dateStr: string): { label: string; key: string; value?: number } {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) return { label: "yesterday", key: "date_yesterday" };
    return { label: `${absDays} days ago`, key: "date_days_ago", value: absDays };
  }

  if (diffDays === 0) return { label: "today", key: "date_today" };
  if (diffDays === 1) return { label: "tomorrow", key: "date_tomorrow" };
  if (diffDays <= 7) return { label: `in ${diffDays} days`, key: "date_in_days", value: diffDays };

  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks <= 4) return { label: `in ${diffWeeks} weeks`, key: "date_in_weeks", value: diffWeeks };

  return { label: target.toLocaleDateString(), key: "date_absolute" };
}

type StatusVariant = {
  classes: string;
  dotClasses?: string;
};

function getStatusConfig(status: string): StatusVariant {
  switch (status) {
    case "active":
      return {
        classes: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        dotClasses: "bg-amber-400 animate-pulse",
      };
    case "completed":
      return { classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    case "cancelled":
      return { classes: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" };
    case "planned":
    default:
      return { classes: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function NextSessionCard({
  session,
  onEdit,
  onStart,
  onCancel,
}: NextSessionCardProps) {
  const t = useTranslations("sessionPlanner");
  const isActive = session.status === "active";
  const statusConfig = getStatusConfig(session.status);

  const relativeDate = useMemo(() => {
    if (!session.scheduled_for) return null;
    return getRelativeDate(session.scheduled_for);
  }, [session.scheduled_for]);

  const formattedDate = useMemo(() => {
    if (!session.scheduled_for) return null;
    try {
      return new Date(session.scheduled_for).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  }, [session.scheduled_for]);

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        isActive
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-amber-500/20 bg-amber-500/[0.03]"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Session number + name */}
          <div className="flex items-center gap-2 flex-wrap">
            {session.session_number !== null && (
              <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md shrink-0">
                #{session.session_number}
              </span>
            )}
            <h3 className="text-sm font-semibold text-foreground truncate">
              {session.name}
            </h3>
          </div>

          {/* Scheduled date */}
          {session.scheduled_for && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                {formattedDate}
              </span>
              {relativeDate && (
                <span className="text-xs text-amber-400 font-medium">
                  {relativeDate.key === "date_absolute"
                    ? t("date_absolute", { date: session.scheduled_for ? new Date(session.scheduled_for).toLocaleDateString() : "" })
                    : t(relativeDate.key, { count: relativeDate.value ?? 0 })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${statusConfig.classes}`}
        >
          {statusConfig.dotClasses && (
            <span
              className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClasses}`}
            />
          )}
          {t(`status_${session.status}`)}
        </span>
      </div>

      {/* Description preview */}
      {session.description && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
          {session.description}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {isActive ? (
          <Button
            size="sm"
            onClick={onStart}
            className="min-h-[44px] bg-amber-600 hover:bg-amber-700 text-foreground gap-1.5"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            {t("enter_session")}
          </Button>
        ) : session.status === "planned" ? (
          <Button
            size="sm"
            onClick={onStart}
            className="min-h-[44px] bg-amber-600 hover:bg-amber-700 text-foreground gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            {t("start_session")}
          </Button>
        ) : null}

        {onEdit && session.status === "planned" && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="min-h-[44px] border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.06] gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            {t("edit")}
          </Button>
        )}

        {onCancel && (session.status === "planned" || session.status === "active") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="min-h-[44px] text-muted-foreground hover:text-red-400 hover:bg-red-500/10 gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            {t("cancel_session")}
          </Button>
        )}
      </div>
    </div>
  );
}
