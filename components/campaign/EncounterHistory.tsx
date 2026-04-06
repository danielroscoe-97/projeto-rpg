"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, ChevronRight, Skull, Swords, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface CombatantSummary {
  id: string;
  name: string;
  is_player: boolean;
  is_defeated: boolean;
  current_hp: number;
  max_hp: number;
}

interface EncounterSession {
  name: string;
  campaign_id: string;
}

interface FinishedEncounter {
  id: string;
  name: string;
  round_number: number;
  created_at: string;
  is_active: boolean;
  sessions: EncounterSession;
  combatants: CombatantSummary[];
}

interface EncounterHistoryProps {
  campaignId: string;
}

const PAGE_SIZE = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDatePtBR(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getEncounterStats(combatants: CombatantSummary[]) {
  const pcs = combatants.filter((c) => c.is_player);
  const monsters = combatants.filter((c) => !c.is_player);
  const monstersDefeated = monsters.filter((c) => c.is_defeated).length;
  const pcsFallen = pcs.filter((c) => c.is_defeated).length;

  return { pcs, monsters, monstersDefeated, pcsFallen };
}

function getHpColor(current: number, max: number): string {
  if (max === 0) return "text-muted-foreground";
  const pct = (current / max) * 100;
  if (pct <= 0) return "text-red-500";
  if (pct <= 10) return "text-red-400";    // CRITICAL
  if (pct <= 40) return "text-orange-400"; // HEAVY
  if (pct <= 70) return "text-yellow-400"; // MODERATE
  return "text-emerald-400";               // LIGHT / healthy
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function EncounterCardSkeleton() {
  return (
    <div className="animate-pulse bg-card border border-border/30 rounded-lg p-4 space-y-3" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-48 bg-white/[0.06] rounded" />
          <div className="h-3 w-32 bg-white/[0.06] rounded" />
        </div>
        <div className="h-3 w-20 bg-white/[0.06] rounded" />
      </div>
      <div className="flex gap-4">
        <div className="h-3 w-24 bg-white/[0.06] rounded" />
        <div className="h-3 w-36 bg-white/[0.06] rounded" />
      </div>
    </div>
  );
}

// ── Combatant row in expanded detail ─────────────────────────────────────────

function CombatantRow({ combatant }: { combatant: CombatantSummary }) {
  const hpColor = getHpColor(combatant.current_hp, combatant.max_hp);

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded text-sm">
      <div className="flex items-center gap-2 min-w-0">
        {combatant.is_player ? (
          <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" aria-hidden="true" />
        ) : (
          <Skull className="w-3.5 h-3.5 text-red-400 shrink-0" aria-hidden="true" />
        )}
        <span className={cn(
          "truncate",
          combatant.is_defeated ? "text-muted-foreground line-through" : "text-foreground"
        )}>
          {combatant.name}
        </span>
      </div>
      <span className={cn("font-mono text-xs shrink-0 ml-2", hpColor)}>
        {combatant.current_hp}/{combatant.max_hp} HP
      </span>
    </div>
  );
}

// ── Encounter card ───────────────────────────────────────────────────────────

function EncounterCard({ encounter }: { encounter: FinishedEncounter }) {
  const [expanded, setExpanded] = useState(false);
  const stats = getEncounterStats(encounter.combatants);

  const resultParts: string[] = [];
  if (stats.monstersDefeated > 0) {
    resultParts.push(
      `${stats.monstersDefeated} monstro${stats.monstersDefeated !== 1 ? "s" : ""} derrotado${stats.monstersDefeated !== 1 ? "s" : ""}`
    );
  }
  if (stats.pcsFallen > 0) {
    resultParts.push(
      `${stats.pcsFallen} PC${stats.pcsFallen !== 1 ? "s" : ""} ${stats.pcsFallen !== 1 ? "cairam" : "caiu"}`
    );
  }

  // Sort combatants: PCs first, then monsters; defeated last within each group
  const sortedCombatants = [...encounter.combatants].sort((a, b) => {
    if (a.is_player !== b.is_player) return a.is_player ? -1 : 1;
    if (a.is_defeated !== b.is_defeated) return a.is_defeated ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div
      className="bg-card border border-border/30 rounded-lg transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-gold/30"
      data-testid={`encounter-history-card-${encounter.id}`}
    >
      {/* Header — clickable to expand */}
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
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Row 1: encounter name + session name */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-gold font-medium text-sm truncate">
              {encounter.name}
            </span>
            <span className="text-muted-foreground text-xs truncate">
              {encounter.sessions.name}
            </span>
          </div>

          {/* Row 2: date, rounds, combatant summary */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDatePtBR(encounter.created_at)}</span>
            <span className="font-mono">{encounter.round_number} rodada{encounter.round_number !== 1 ? "s" : ""}</span>
            <span className="flex items-center gap-1">
              <Swords className="w-3 h-3" aria-hidden="true" />
              {stats.pcs.length} PC{stats.pcs.length !== 1 ? "s" : ""} vs {stats.monsters.length} monstro{stats.monsters.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Row 3: result */}
          {resultParts.length > 0 && (
            <p className="text-xs text-muted-foreground/80">
              {resultParts.join(", ")}
            </p>
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border/30 px-4 pb-4 pt-3 space-y-1">
          <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">
            Combatentes
          </p>
          {sortedCombatants.map((c) => (
            <CombatantRow key={c.id} combatant={c} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function EncounterHistory({ campaignId }: EncounterHistoryProps) {
  const t = useTranslations("dashboard");
  const [encounters, setEncounters] = useState<FinishedEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchEncounters = useCallback(
    async (offset: number) => {
      const { data, error: dbError } = await supabase
        .from("encounters")
        .select(
          `
          id, name, round_number, created_at, is_active,
          sessions!inner(name, campaign_id),
          combatants(id, name, is_player, is_defeated, current_hp, max_hp)
        `
        )
        .eq("sessions.campaign_id", campaignId)
        .eq("is_active", false)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (dbError) {
        throw new Error(dbError.message);
      }

      // Supabase !inner join returns single object for many-to-one, normalize safely
      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        name: row.name as string,
        round_number: row.round_number as number,
        created_at: row.created_at as string,
        is_active: row.is_active as boolean,
        sessions: Array.isArray(row.sessions)
          ? (row.sessions[0] as EncounterSession)
          : (row.sessions as EncounterSession),
        combatants: (row.combatants ?? []) as CombatantSummary[],
      }));
    },
    // supabase client is stable per render, campaignId is the real dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [campaignId]
  );

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchEncounters(0);
        if (!cancelled) {
          setEncounters(data);
          setHasMore(data.length === PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar encontros");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [fetchEncounters]);

  // Load more
  const handleLoadMore = async () => {
    setLoadingMore(true);
    setError(null);
    try {
      const data = await fetchEncounters(encounters.length);
      setEncounters((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar mais encontros");
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3" data-testid="encounter-history-loading">
        <h2 className="text-lg font-semibold text-foreground">{t("encounter_history_title")}</h2>
        {[1, 2, 3].map((i) => (
          <EncounterCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="space-y-3" data-testid="encounter-history-error">
        <h2 className="text-lg font-semibold text-foreground">{t("encounter_history_title")}</h2>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (encounters.length === 0) {
    return (
      <div className="space-y-3" data-testid="encounter-history-empty">
        <h2 className="text-lg font-semibold text-foreground">{t("encounter_history_title")}</h2>
        <div className="rounded-lg border border-border/30 bg-card p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center mb-3">
            <Swords className="w-6 h-6 text-amber-400/60" aria-hidden="true" />
          </div>
          <p className="text-muted-foreground text-sm">
            {t("encounter_history_empty")}
          </p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            {t("encounter_history_empty_desc")}
          </p>
        </div>
      </div>
    );
  }

  // ── List ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3" data-testid="encounter-history">
      <h2 className="text-lg font-semibold text-foreground">{t("encounter_history_title")}</h2>

      <div className="space-y-2">
        {encounters.map((enc) => (
          <EncounterCard key={enc.id} encounter={enc} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="goldOutline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
            data-testid="encounter-history-load-more"
          >
            {loadingMore ? t("encounter_history_loading") : t("encounter_history_load_more")}
          </Button>
        </div>
      )}
    </div>
  );
}
