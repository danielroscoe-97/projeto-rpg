"use client";

import { useEffect, useState } from "react";
import { Search, Cog, Brain } from "lucide-react";

interface Milestone {
  value: number;
  label: string;
  icon: React.ReactNode;
}

interface MethodologyStats {
  valid_combats: number;
  combats_with_dm_rating: number;
  unique_dms: number;
  current_phase: string;
  phase_target: number;
}

const MILESTONES: Milestone[] = [
  { value: 500, label: "Fase 1", icon: <Search className="w-3.5 h-3.5" /> },
  { value: 2000, label: "Fase 2", icon: <Cog className="w-3.5 h-3.5" /> },
  { value: 5000, label: "Fase 3", icon: <Brain className="w-3.5 h-3.5" /> },
];

const DEFAULT_TARGET = 5000;

export function MethodologyProgressBar() {
  const [stats, setStats] = useState<MethodologyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/methodology/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() =>
        setStats({
          valid_combats: 0,
          combats_with_dm_rating: 0,
          unique_dms: 0,
          current_phase: "collecting",
          phase_target: 500,
        })
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full space-y-3 animate-pulse">
        <div className="h-8 bg-white/[0.05] rounded-lg w-48 mx-auto" />
        <div className="h-10 bg-white/[0.05] rounded-full" />
        <div className="h-4 bg-white/[0.05] rounded w-64 mx-auto" />
      </div>
    );
  }

  const current = stats?.valid_combats ?? 0;
  const maxValue = stats?.phase_target ?? DEFAULT_TARGET;
  const percentage = maxValue > 0 ? Math.min((current / maxValue) * 100, 100) : 0;

  return (
    <div className="w-full space-y-4">
      {/* Big number */}
      <div className="text-center">
        <span className="font-display text-4xl md:text-5xl text-gold tabular-nums">
          {current.toLocaleString()}
        </span>
        <span className="text-foreground/40 text-2xl md:text-3xl font-display">
          {" / "}
          {maxValue.toLocaleString()}
        </span>
      </div>

      {/* Bar container */}
      <div className="relative">
        {/* Track */}
        <div
          className="relative h-8 md:h-10 rounded-full bg-white/[0.06] border border-white/[0.08] overflow-hidden"
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={maxValue}
          aria-label="Combates analisados"
        >
          {/* Fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light transition-all duration-1000 ease-out"
            style={{ width: `${Math.max(percentage, 1)}%` }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent opacity-60 animate-[shimmer-sweep_2.5s_ease-in-out_infinite]" />
          </div>

          {/* Milestone markers on the bar */}
          {MILESTONES.map((m) => {
            const pos = (m.value / maxValue) * 100;
            const reached = current >= m.value;
            return (
              <div
                key={m.value}
                className="absolute top-0 bottom-0 flex items-center"
                style={{ left: `${pos}%` }}
              >
                <div
                  className={`w-px h-full ${reached ? "bg-gold-dark/40" : "bg-white/10"}`}
                />
              </div>
            );
          })}
        </div>

        {/* Milestone labels below bar */}
        <div className="relative h-8 mt-2 hidden md:block">
          {MILESTONES.map((m) => {
            const pos = (m.value / maxValue) * 100;
            const reached = current >= m.value;
            return (
              <div
                key={m.value}
                className="absolute flex flex-col items-center -translate-x-1/2"
                style={{ left: `${pos}%` }}
              >
                <div
                  className={`flex items-center gap-1.5 text-xs ${
                    reached
                      ? "text-gold"
                      : "text-foreground/30"
                  }`}
                >
                  <span
                    className={`p-1 rounded ${
                      reached
                        ? "bg-gold/15 shadow-[0_0_8px_rgba(212,168,83,0.3)]"
                        : "bg-white/[0.04]"
                    }`}
                  >
                    {m.icon}
                  </span>
                  <span className="font-medium whitespace-nowrap">
                    {m.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile milestone dots */}
        <div className="flex justify-between mt-3 md:hidden px-2">
          {MILESTONES.map((m) => {
            const reached = current >= m.value;
            return (
              <div
                key={m.value}
                className={`flex items-center gap-1 text-[10px] ${
                  reached ? "text-gold" : "text-foreground/30"
                }`}
              >
                <span
                  className={`p-0.5 rounded ${
                    reached ? "bg-gold/15" : "bg-white/[0.04]"
                  }`}
                >
                  {m.icon}
                </span>
                <span>{m.value.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secondary stats */}
      {stats && (
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-foreground/50">
          <span>
            <span className="text-gold font-medium">{stats.unique_dms}</span>{" "}
            DMs contribuindo
          </span>
          <span className="text-white/10">|</span>
          <span>
            <span className="text-gold font-medium">
              {stats.valid_combats > 0
                ? Math.round(
                    (stats.combats_with_dm_rating / stats.valid_combats) * 100
                  )
                : 0}
              %
            </span>{" "}
            com rating do DM
          </span>
        </div>
      )}
    </div>
  );
}
