"use client";

/**
 * DmUpsellFunnelClient — Epic 04 Story 04-I focused admin route.
 *
 * Single-surface renderer for the `dm_upsell:*` funnel rows from
 * `/api/admin/metrics` (same shared endpoint as the main dashboard).
 * Labels and bar-style are copy-pasted from MetricsDashboard's section
 * for visual consistency — no need to extract a shared component until
 * we grow a third consumer.
 */

import { useEffect, useState } from "react";
import { DM_UPSELL_LABELS } from "@/lib/upsell/dm-upsell-labels";

interface DmUpsellFunnelEntry {
  event_name: string;
  event_count: number;
  unique_users: number;
  funnel_order: number;
}

export function DmUpsellFunnelClient() {
  const [rows, setRows] = useState<DmUpsellFunnelEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/metrics")
      .then((r) => r.json())
      .then((res) => {
        if (!active) return;
        if (res.error) {
          setError(res.error);
          return;
        }
        setRows(res.data?.dm_upsell_funnel ?? []);
      })
      .catch(() => {
        if (active) setError("Failed to load metrics");
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <p
        className="text-red-400 text-sm"
        data-testid="admin.dm-upsell-funnel.error"
      >
        {error}
      </p>
    );
  }

  if (rows === null) {
    return (
      <p
        className="text-muted-foreground text-sm"
        data-testid="admin.dm-upsell-funnel.loading"
      >
        Loading funnel...
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p
        className="text-muted-foreground text-sm"
        data-testid="admin.dm-upsell-funnel.empty"
      >
        No dm_upsell:* events in the last 30 days. Surface is live; check back once the CTA has shipped to users.
      </p>
    );
  }

  const maxUniq = Math.max(...rows.map((r) => r.unique_users), 1);

  return (
    <div
      className="bg-card border border-border rounded-md p-4 space-y-2"
      data-testid="admin.dm-upsell-funnel.bars"
    >
      {rows.map((r) => (
        <div
          key={r.event_name}
          className="flex items-center gap-3"
          data-testid={`admin.dm-upsell-funnel.row.${r.event_name}`}
        >
          <span
            className="text-xs text-muted-foreground w-52 shrink-0 truncate"
            title={r.event_name}
          >
            {DM_UPSELL_LABELS[r.event_name] ?? r.event_name}
          </span>
          <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden">
            <div
              data-testid={`admin.dm-upsell-funnel.row.${r.event_name}.bar`}
              className="h-full bg-amber-400/30 rounded"
              style={{ width: `${(r.unique_users / maxUniq) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-foreground w-10 text-right">
            {r.unique_users}
          </span>
          <span className="text-xs font-mono text-muted-foreground w-16 text-right">
            {r.event_count.toLocaleString()}
          </span>
        </div>
      ))}
      <p className="pt-2 text-[11px] text-muted-foreground">
        Bars = unique users per stage. Right column = raw event count (includes repeat actions).
      </p>
    </div>
  );
}
