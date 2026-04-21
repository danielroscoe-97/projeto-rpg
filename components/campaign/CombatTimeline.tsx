import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import type {
  CombatResult,
  CreatureSnapshot,
  PartyMemberSnapshot,
} from "@/lib/supabase/encounter-snapshot";
import { Sword, Skull, Flag, History, ChevronRight } from "lucide-react";

/**
 * Epic 12, Story 12.6a — Combat Timeline on the campaign workspace.
 *
 * Reads finished encounters for the campaign (via its sessions) and renders
 * them as a narrative list: result + duration + round count + party/creature
 * counts. Addresses the user's complaint that combat history had no surface
 * on the campaign detail page despite all the snapshot data being captured
 * since migration 092.
 *
 * Wave 2 ships the display only. The "Revisitar" action is a Wave 3 feature
 * (Story 12.10) — the button is rendered but disabled with a tooltip.
 */
interface CombatTimelineProps {
  campaignId: string;
  /** Max rows to render. Default 10 matches the Campaign Overview briefing density. */
  limit?: number;
}

interface TimelineEntry {
  id: string;
  name: string;
  ended_at: string;
  started_at: string | null;
  duration_seconds: number | null;
  round_number: number;
  combat_result: CombatResult | null;
  party_size: number;
  creature_count: number;
  was_modified_from_preset: boolean | null;
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function RelativeDate({ iso, label }: { iso: string; label: string }) {
  // Server component — we render both absolute (title) + friendly (text) without
  // triggering client-side formatters. `label` already carries the translated
  // relative string ("hoje", "há 2 dias", etc).
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()}>
      {label}
    </time>
  );
}

/**
 * Precompute the "how long ago" bucket for an ISO timestamp. Runs on the server
 * at render time, so the value is snapshot-accurate when the page is cached by
 * Next; if you need minute-level accuracy on long-lived pages, swap to a client
 * component with `Intl.RelativeTimeFormat`.
 */
function relativeKey(iso: string): { key: string; vars?: { count: number } } {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffHours = (now - then) / 3_600_000;
  const diffDays = diffHours / 24;

  if (diffHours < 1) return { key: "timeline_relative_just_now" };
  if (diffHours < 24) return { key: "timeline_relative_today" };
  if (diffDays < 2) return { key: "timeline_relative_yesterday" };
  if (diffDays < 30) return { key: "timeline_relative_days_ago", vars: { count: Math.floor(diffDays) } };
  if (diffDays < 60) return { key: "timeline_relative_month_ago" };
  return { key: "timeline_relative_months_ago", vars: { count: Math.floor(diffDays / 30) } };
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
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${pick.cls}`}
      data-testid={`timeline-result-${result ?? "unknown"}`}
    >
      <Icon className="size-3" />
      {pick.label}
    </span>
  );
}

export async function CombatTimeline({ campaignId, limit = 10 }: CombatTimelineProps) {
  const t = await getTranslations("campaignTimeline");
  const supabase = await createClient();

  // Fetch finished encounters joined with the owning sessions. We filter the
  // session side so Postgres uses the `idx_sessions_campaign_id` index and
  // stops scanning encounters from other campaigns early.
  const { data } = await supabase
    .from("encounters")
    .select(`
      id,
      name,
      started_at,
      ended_at,
      duration_seconds,
      round_number,
      combat_result,
      party_snapshot,
      creatures_snapshot,
      was_modified_from_preset,
      sessions!inner (
        campaign_id
      )
    `)
    .eq("sessions.campaign_id", campaignId)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as Array<{
    id: string;
    name: string | null;
    started_at: string | null;
    ended_at: string;
    duration_seconds: number | null;
    round_number: number;
    combat_result: CombatResult | null;
    party_snapshot: PartyMemberSnapshot[] | null;
    creatures_snapshot: CreatureSnapshot[] | null;
    was_modified_from_preset: boolean | null;
  }>;

  const entries: TimelineEntry[] = rows.map((r) => ({
    id: r.id,
    name: r.name ?? t("unnamed_encounter"),
    ended_at: r.ended_at,
    started_at: r.started_at,
    duration_seconds: r.duration_seconds,
    round_number: r.round_number,
    combat_result: r.combat_result,
    party_size: (r.party_snapshot ?? []).length,
    creature_count: (r.creatures_snapshot ?? []).reduce(
      (sum, c) => sum + (c.quantity ?? 1),
      0,
    ),
    was_modified_from_preset: r.was_modified_from_preset,
  }));

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
        <header className="flex items-center gap-2 mb-2">
          <History className="size-5 text-muted-foreground" />
          <h2 id="combat-timeline-heading" className="text-lg font-semibold text-foreground">
            {t("heading")}
          </h2>
        </header>
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
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="size-5 text-gold" />
          <h2 id="combat-timeline-heading" className="text-lg font-semibold text-foreground">
            {t("heading")}
          </h2>
        </div>
        <span className="text-xs text-muted-foreground" aria-hidden="true">
          {t("count_label", { count: entries.length })}
        </span>
      </header>

      <ol className="relative space-y-4 border-l border-border/60 pl-4">
        {entries.map((e) => {
          const duration = formatDuration(e.duration_seconds);
          const rel = relativeKey(e.ended_at);
          const relText = rel.vars ? t(rel.key, rel.vars) : t(rel.key);
          return (
            <li
              key={e.id}
              className="relative"
              data-testid={`timeline-entry-${e.id}`}
            >
              <span
                aria-hidden="true"
                className="absolute -left-[21px] top-1.5 size-3 rounded-full border-2 border-gold bg-background"
              />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{e.name}</span>
                    <ResultBadge result={e.combat_result} labels={resultLabels} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                    <RelativeDate iso={e.ended_at} label={relText} />
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

                {/* Wave 3 (Story 12.10) — Revisitar modal. Disabled for Wave 2,
                    kept in the DOM so the affordance is visible and screen
                    reader users know it exists. */}
                <button
                  type="button"
                  disabled
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs text-muted-foreground/70 cursor-not-allowed"
                  aria-label={t("revisit_coming_soon")}
                  title={t("revisit_coming_soon")}
                  data-testid="timeline-revisit-btn"
                >
                  {t("revisit")}
                  <ChevronRight className="size-3" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
