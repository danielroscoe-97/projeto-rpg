"use client";

import { useEffect, useState } from "react";

interface FunnelEntry { event_name: string; unique_users: number }
interface EventCount { event_name: string; event_count: number }
interface CombatStats { total_encounters: number; avg_rounds: number; avg_duration_seconds: number; total_players_joined: number }
/** Epic 04 Story 04-I — one row per `dm_upsell:*` event, sorted by the
 *  canonical funnel stage order declared in migration 181. */
interface DmUpsellFunnelEntry {
  event_name: string;
  event_count: number;
  unique_users: number;
  funnel_order: number;
}

interface Metrics {
  total_users: number;
  registrations_last_7d: number;
  registrations_last_30d: number;
  day1_activation_pct: number;
  week2_retention_pct: number;
  avg_players_per_dm: number;
  funnel: FunnelEntry[];
  top_events: EventCount[];
  guest_funnel: EventCount[];
  combat_stats: CombatStats | null;
  dm_upsell_funnel: DmUpsellFunnelEntry[];
}

function MetricCard({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="text-foreground text-2xl font-mono font-bold">
        {value}{suffix}
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mt-8 mb-3">{children}</h2>;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const FUNNEL_LABELS: Record<string, string> = {
  "auth:signup_start": "Signup Started",
  "auth:login": "Login",
  "combat:started": "Combat Started",
  "combat:ended": "Combat Ended",
  "player:joined": "Player Joined",
  "oracle:search": "Oracle Search",
  "compendium:visited": "Compendium Visited",
  "preset:loaded": "Preset Loaded",
};

const GUEST_LABELS: Record<string, string> = {
  "guest:combat_started": "Guest Combat Started",
  "guest:combat_ended": "Guest Combat Ended",
  "guest:upsell_shown": "Upsell Shown",
  "guest:recap_save_signup": "Recap → Signup",
  "guest:session_expired": "Session Expired",
  "guest:expired_cta_signup": "Expired → Signup",
};

/** Epic 04 Story 04-I — friendly labels for the dm_upsell funnel bars.
 *  Keys match the event_names declared in migration 181. Unknown events
 *  (new emits shipped after this list is written) fall back to the raw
 *  event_name so nothing disappears silently. */
const DM_UPSELL_LABELS: Record<string, string> = {
  "dm_upsell:cta_shown": "CTA Shown",
  "dm_upsell:cta_clicked": "CTA Clicked",
  "dm_upsell:cta_dismissed": "CTA Dismissed",
  "dm_upsell:wizard_started": "Wizard Started",
  "dm_upsell:wizard_failed": "Wizard Failed",
  "dm_upsell:role_upgraded_to_dm": "Role → DM",
  "dm_upsell:first_campaign_created": "First Campaign Created",
  "dm_upsell:tour_start_clicked": "Tour: Start",
  "dm_upsell:tour_start_skipped": "Tour: Skipped at Start",
  "dm_upsell:tour_completed": "Tour Completed",
  "dm_upsell:tour_skipped": "Tour Skipped Mid-way",
  "dm_upsell:past_companions_loaded": "Past Companions Loaded",
  "dm_upsell:past_companion_link_copied": "Past-companion Link Copied",
};

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/metrics")
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error);
        else setMetrics(res.data);
      })
      .catch(() => setError("Failed to load metrics"));
  }, []);

  if (error) {
    return <p className="text-red-400 text-sm">{error}</p>;
  }

  if (!metrics) {
    return <p className="text-muted-foreground text-sm">Loading metrics...</p>;
  }

  const maxFunnel = Math.max(...(metrics.funnel ?? []).map((f) => f.unique_users), 1);
  const maxTopEvent = Math.max(...(metrics.top_events ?? []).map((e) => e.event_count), 1);
  const maxGuest = Math.max(...(metrics.guest_funnel ?? []).map((f) => f.event_count), 1);
  const dmUpsellRows = metrics.dm_upsell_funnel ?? [];
  const maxDmUpsell = Math.max(...dmUpsellRows.map((f) => f.unique_users), 1);

  return (
    <div data-testid="metrics-dashboard">
      {/* Core metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Total Users" value={metrics.total_users} />
        <MetricCard label="Last 7 Days" value={metrics.registrations_last_7d} />
        <MetricCard label="Last 30 Days" value={metrics.registrations_last_30d} />
        <MetricCard label="Day-1 Activation" value={metrics.day1_activation_pct} suffix="%" />
        <MetricCard label="Week-2 Retention" value={metrics.week2_retention_pct} suffix="%" />
        <MetricCard label="Avg Players/DM" value={metrics.avg_players_per_dm} />
      </div>

      {/* Combat stats */}
      {metrics.combat_stats && (
        <>
          <SectionTitle>Combat Stats (30d)</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total Encounters" value={metrics.combat_stats.total_encounters} />
            <MetricCard label="Avg Rounds" value={metrics.combat_stats.avg_rounds ?? "—"} />
            <MetricCard label="Avg Duration" value={formatDuration(metrics.combat_stats.avg_duration_seconds)} />
            <MetricCard label="Players Joined" value={metrics.combat_stats.total_players_joined} />
          </div>
        </>
      )}

      {/* Event funnel */}
      {metrics.funnel.length > 0 && (
        <>
          <SectionTitle>Event Funnel (30d — unique users)</SectionTitle>
          <div className="bg-card border border-border rounded-md p-4 space-y-2">
            {metrics.funnel.map((f) => (
              <div key={f.event_name} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-36 shrink-0 truncate" title={f.event_name}>
                  {FUNNEL_LABELS[f.event_name] ?? f.event_name}
                </span>
                <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden">
                  <div
                    className="h-full bg-gold/30 rounded"
                    style={{ width: `${(f.unique_users / maxFunnel) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-foreground w-10 text-right">{f.unique_users}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Guest conversion funnel */}
      {metrics.guest_funnel.length > 0 && (
        <>
          <SectionTitle>Guest Conversion Funnel (30d)</SectionTitle>
          <div className="bg-card border border-border rounded-md p-4 space-y-2">
            {metrics.guest_funnel.map((f) => (
              <div key={f.event_name} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-40 shrink-0 truncate" title={f.event_name}>
                  {GUEST_LABELS[f.event_name] ?? f.event_name}
                </span>
                <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden">
                  <div
                    className="h-full bg-emerald-400/30 rounded"
                    style={{ width: `${(f.event_count / maxGuest) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-foreground w-10 text-right">{f.event_count}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Epic 04 Story 04-I — DM upsell funnel. F7 choice (b): SECTION
          inside MetricsDashboard, not a tab. Same visual pattern as the
          existing funnels (horizontal bars, canonical order from RPC). */}
      {dmUpsellRows.length > 0 && (
        <>
          <SectionTitle>DM Upsell Funnel (30d)</SectionTitle>
          <div
            className="bg-card border border-border rounded-md p-4 space-y-2"
            data-testid="metrics.dm-upsell-funnel"
          >
            {dmUpsellRows.map((f) => (
              <div
                key={f.event_name}
                className="flex items-center gap-3"
                data-testid={`metrics.dm-upsell-row.${f.event_name}`}
              >
                <span
                  className="text-xs text-muted-foreground w-44 shrink-0 truncate"
                  title={f.event_name}
                >
                  {DM_UPSELL_LABELS[f.event_name] ?? f.event_name}
                </span>
                <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden">
                  <div
                    className="h-full bg-amber-400/30 rounded"
                    style={{
                      width: `${(f.unique_users / maxDmUpsell) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-foreground w-10 text-right">
                  {f.unique_users}
                </span>
                <span className="text-xs font-mono text-muted-foreground w-14 text-right">
                  {f.event_count.toLocaleString()}
                </span>
              </div>
            ))}
            <p className="pt-2 text-[10px] text-muted-foreground">
              Bars = unique users. Right column = raw event count.
            </p>
          </div>
        </>
      )}

      {/* Top events */}
      {metrics.top_events.length > 0 && (
        <>
          <SectionTitle>Top Events (30d — raw count)</SectionTitle>
          <div className="bg-card border border-border rounded-md p-4 space-y-1.5">
            {metrics.top_events.map((e) => (
              <div key={e.event_name} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-44 shrink-0 truncate font-mono" title={e.event_name}>
                  {e.event_name}
                </span>
                <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-400/20 rounded"
                    style={{ width: `${(e.event_count / maxTopEvent) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-foreground w-12 text-right">{e.event_count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
