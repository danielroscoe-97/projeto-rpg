"use client";

import { useEffect, useState } from "react";

interface Metrics {
  total_users: number;
  registrations_last_7d: number;
  registrations_last_30d: number;
  day1_activation_pct: number;
  week2_retention_pct: number;
  avg_players_per_dm: number;
}

function MetricCard({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="bg-card border border-border rounded-md p-4" data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="text-foreground text-2xl font-mono font-bold">
        {value}{suffix}
      </p>
    </div>
  );
}

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

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="metrics-dashboard">
      <MetricCard label="Total Users" value={metrics.total_users} />
      <MetricCard label="Last 7 Days" value={metrics.registrations_last_7d} />
      <MetricCard label="Last 30 Days" value={metrics.registrations_last_30d} />
      <MetricCard label="Day-1 Activation" value={metrics.day1_activation_pct} suffix="%" />
      <MetricCard label="Week-2 Retention" value={metrics.week2_retention_pct} suffix="%" />
      <MetricCard label="Avg Players/DM" value={metrics.avg_players_per_dm} />
    </div>
  );
}
