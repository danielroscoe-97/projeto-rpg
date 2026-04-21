import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import { captureError } from "@/lib/errors/capture";
import type {
  CombatResult,
  CreatureSnapshot,
  PartyMemberSnapshot,
} from "@/lib/supabase/encounter-snapshot";
import { Sword, Skull, Flag, History } from "lucide-react";

/**
 * Epic 12, Story 12.6a — Combat Timeline on the campaign workspace.
 *
 * Reads finished encounters for the campaign (via its sessions) and renders
 * them as a narrative list: result + duration + round count + party/creature
 * counts. Surfaces the snapshot data persisted since migration 092 — until
 * Wave 2 it had no UI.
 *
 * Wave 2 ships the display only. The Wave-3 "revisit" modal (Story 12.10) is
 * NOT wired here — the affordance is absent by design; adding a disabled
 * button just announces broken interaction to keyboard/screen-reader users.
 */
interface CombatTimelineProps {
  campaignId: string;
  /** Max rows to render. Clamped to [1, 50]. Default 10 matches the briefing density. */
  limit?: number;
}

interface TimelineEntry {
  id: string;
  name: string;
  ended_at: string;
  duration_seconds: number | null;
  round_number: number;
  combat_result: CombatResult | null;
  party_size: number;
  creature_count: number;
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

/**
 * Map an ISO timestamp to a translation key + count variable.
 * Runs on the server at render time; for minute-level accuracy on long-lived
 * pages wrap in a client component using `Intl.RelativeTimeFormat`.
 * Server-rendered + `force-dynamic` on the host page keeps cache staleness to
 * the duration between requests, which is fine for the timeline's resolution.
 * Exported for unit tests — keep the bucketing logic pinned against regressions.
 */
export function relativeKey(iso: string): { key: string; vars?: { count: number } } {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  // Future-dated rows (clock drift) — treat as "just now" rather than reporting
  // negative months, which is both ugly and confusing.
  if (diffMs < 0) return { key: "timeline_relative_just_now" };
  const diffHours = diffMs / 3_600_000;
  const diffDays = diffHours / 24;

  if (diffHours < 1) return { key: "timeline_relative_just_now" };
  if (diffHours < 24) return { key: "timeline_relative_today" };
  if (diffDays < 2) return { key: "timeline_relative_yesterday" };
  if (diffDays < 30) return { key: "timeline_relative_days_ago", vars: { count: Math.floor(diffDays) } };
  // 30..60 days: "1 month ago". 60+: floor(days / 30) months.
  const months = Math.floor(diffDays / 30);
  if (months <= 1) return { key: "timeline_relative_month_ago" };
  return { key: "timeline_relative_months_ago", vars: { count: months } };
}

type ResultLabels = Record<
  "victory" | "tpk" | "fled" | "dm_ended",
  string
>;

function ResultBadge({ result, labels }: { result: CombatResult | null; labels: ResultLabels }) {
  const config = {
    victory: { icon: Sword, label: labels.victory, cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    tpk: { icon: Skull, label: labels.tpk, cls: "bg-rose-500/10 text-rose-400 border-rose-500/30" },
    fled: { icon: Flag, label: labels.fled, cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    dm_ended: { icon: History, label: labels.dm_ended, cls: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
  } as const;

  const pick = result && result in config ? config[result as keyof typeof config] : config.dm_ended;
  const Icon = pick.icon;
  const testid = result && result in config ? `timeline-result-${result}` : "timeline-result-unknown";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${pick.cls}`}
      data-testid={testid}
    >
      <Icon className="size-3" aria-hidden="true" />
      {pick.label}
    </span>
  );
}

function TimelineHeader({ t, count }: { t: Awaited<ReturnType<typeof getTranslations<"campaignTimeline">>>; count: number | null }) {
  return (
    <header className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <History className={count ? "size-5 text-gold" : "size-5 text-muted-foreground"} aria-hidden="true" />
        <h2 id="combat-timeline-heading" className="text-lg font-semibold text-foreground">
          {t("heading")}
        </h2>
      </div>
      {count != null && count > 0 && (
        <span className="text-xs text-muted-foreground" aria-hidden="true">
          {t("count_label", { count })}
        </span>
      )}
    </header>
  );
}

/** Skeleton fallback for Suspense boundary — matches the real component's
 *  outer card shape so the page doesn't reflow when the timeline streams in. */
export function CombatTimelineSkeleton() {
  return (
    <section
      className="rounded-xl border border-border bg-card/60 p-6 animate-pulse"
      aria-busy="true"
      aria-label="Loading combat history"
      data-testid="combat-timeline-skeleton"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="size-5 rounded bg-muted/40" />
        <div className="h-5 w-40 rounded bg-muted/40" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-3 rounded-full bg-muted/40" />
            <div className="h-4 flex-1 rounded bg-muted/30" />
          </div>
        ))}
      </div>
    </section>
  );
}

export async function CombatTimeline({ campaignId, limit = 10 }: CombatTimelineProps) {
  const clamped = Math.min(50, Math.max(1, Math.floor(limit)));
  const [t, locale] = await Promise.all([
    getTranslations("campaignTimeline"),
    getLocale(),
  ]);
  const supabase = await createClient();

  // Fetch finished encounters joined with the owning sessions. We filter the
  // session side so Postgres uses the campaign_id index and stops scanning
  // encounters from other campaigns early. `sessions!inner` also means RLS
  // on `sessions` (DM-ownership) effectively gates this query.
  const { data, error } = await supabase
    .from("encounters")
    .select(`
      id,
      name,
      ended_at,
      duration_seconds,
      round_number,
      combat_result,
      party_snapshot,
      creatures_snapshot,
      sessions!inner (
        campaign_id
      )
    `)
    .eq("sessions.campaign_id", campaignId)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(clamped);

  // Distinguish a real DB error from a legitimately empty campaign. Silent
  // fallback to empty-state was a Wave-2 review finding (#CRITICAL2).
  if (error) {
    captureError(error, {
      component: "CombatTimeline",
      action: "fetch-encounters",
      category: "database",
      extra: { campaignId },
    });
    return (
      <section
        className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6"
        data-testid="combat-timeline-error"
        aria-labelledby="combat-timeline-heading"
      >
        <TimelineHeader t={t} count={null} />
        <p className="text-sm text-rose-300">{t("fetch_error")}</p>
      </section>
    );
  }

  const rows = (data ?? []) as Array<{
    id: string;
    name: string | null;
    ended_at: string;
    duration_seconds: number | null;
    round_number: number;
    combat_result: CombatResult | null;
    party_snapshot: PartyMemberSnapshot[] | null;
    creatures_snapshot: CreatureSnapshot[] | null;
  }>;

  // Defensive mapping — JSONB columns can surprise us if an old/corrupted row
  // has a non-array value (migration slip, manual SQL fix). Array.isArray()
  // guards keep one bad row from crashing the whole server component.
  const entries: TimelineEntry[] = rows.map((r) => {
    const party = Array.isArray(r.party_snapshot) ? r.party_snapshot : [];
    const creatures = Array.isArray(r.creatures_snapshot) ? r.creatures_snapshot : [];

    // party_size is "living PCs that participated" — filter out any entries
    // missing core fields (placeholders) so the label doesn't over-count.
    const realParty = party.filter((p) => p && typeof p.name === "string");

    // Telemetry for unexpected combat_result values — quiet in the UI, loud
    // in logs so product can decide whether to expand the enum (e.g. "fled",
    // which is in the type but has no producing code path today).
    if (r.combat_result && !["victory", "tpk", "fled", "dm_ended"].includes(r.combat_result)) {
      captureError(new Error(`Unknown combat_result: ${r.combat_result}`), {
        component: "CombatTimeline",
        action: "unknown-result-enum",
        category: "validation",
        extra: { encounterId: r.id, combatResult: r.combat_result },
      });
    }

    return {
      id: r.id,
      name: r.name ?? t("unnamed_encounter"),
      ended_at: r.ended_at,
      duration_seconds: r.duration_seconds,
      round_number: r.round_number,
      combat_result: r.combat_result,
      party_size: realParty.length,
      creature_count: creatures.reduce(
        (sum, c) => sum + (c && typeof c.quantity === "number" ? c.quantity : 1),
        0,
      ),
    };
  });

  const resultLabels: ResultLabels = {
    victory: t("result_victory"),
    tpk: t("result_tpk"),
    fled: t("result_fled"),
    dm_ended: t("result_dm_ended"),
  };

  if (entries.length === 0) {
    return (
      <section
        className="rounded-xl border border-border bg-card/60 p-6"
        data-testid="combat-timeline-empty"
        aria-labelledby="combat-timeline-heading"
      >
        <TimelineHeader t={t} count={0} />
        <p className="text-sm text-muted-foreground">{t("empty_state")}</p>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border border-border bg-card/60 p-6"
      data-testid="combat-timeline"
      aria-labelledby="combat-timeline-heading"
    >
      <TimelineHeader t={t} count={entries.length} />

      <ol className="relative space-y-4 border-l border-border/60 pl-4">
        {entries.map((e) => {
          const duration = formatDuration(e.duration_seconds);
          const rel = relativeKey(e.ended_at);
          const relText = rel.vars ? t(rel.key, rel.vars) : t(rel.key);
          const absoluteTitle = new Date(e.ended_at).toLocaleString(locale);
          return (
            <li key={e.id} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[21px] top-1.5 size-3 rounded-full border-2 border-gold bg-background"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{e.name}</span>
                  <ResultBadge result={e.combat_result} labels={resultLabels} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                  <time dateTime={e.ended_at} title={absoluteTitle}>{relText}</time>
                  <span aria-hidden="true">•</span>
                  <span>{t("rounds_label", { count: e.round_number })}</span>
                  {duration && (
                    <>
                      <span aria-hidden="true">•</span>
                      <span>{duration}</span>
                    </>
                  )}
                  <span aria-hidden="true">•</span>
                  <span>
                    {t("party_vs_creatures", {
                      party: e.party_size,
                      creatures: e.creature_count,
                    })}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
