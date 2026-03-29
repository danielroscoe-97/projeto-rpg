"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Swords, Package, Users } from "lucide-react";

import { CampaignManager } from "@/components/dashboard/CampaignManager";
import { SavedEncounters } from "@/components/dashboard/SavedEncounters";
import { useRoleStore } from "@/lib/stores/role-store";
import type { UserRole, ActiveView } from "@/lib/stores/role-store";
import type { SavedEncounterRow } from "@/components/dashboard/SavedEncounters";

interface DashboardContentProps {
  campaigns: { id: string; name: string; created_at: string; player_count: number }[];
  savedEncounters: SavedEncounterRow[];
  presetCount: number;
  userId: string;
  userRole: UserRole;
  translations: {
    title: string;
    description: string;
    new_session: string;
    presets_title: string;
    presets_count: string;
    presets_manage: string;
    player_welcome: string;
    player_join_hint: string;
  };
}

export function DashboardContent({
  campaigns,
  savedEncounters,
  presetCount,
  userId,
  userRole,
  translations: t,
}: DashboardContentProps) {
  const { activeView, initialized, loadRole } = useRoleStore();

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  // Use server-provided role as fallback until client store initializes
  // This prevents flash of wrong content before loadRole() completes
  const effectiveView: ActiveView = initialized
    ? activeView
    : userRole === "player"
      ? "player"
      : "dm";

  const isPlayerView = effectiveView === "player";

  return (
    <>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 relative">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">{t.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t.description}</p>
        </div>
        {!isPlayerView && (
          <div className="flex items-center sm:justify-end">
            <Link
              href="/app/session/new"
              className="inline-flex items-center justify-center gap-2 bg-gold text-surface-primary font-semibold px-6 py-1.5 rounded-lg text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[36px] w-full sm:w-auto sm:min-w-[240px] shrink-0"
            >
              <Swords className="inline-block w-4 h-4" aria-hidden="true" /> {t.new_session}
            </Link>
          </div>
        )}
      </div>

      {/* Player view: show welcome message and hint about joining sessions */}
      {isPlayerView && (
        <div className="mb-6 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{t.player_welcome}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.player_join_hint}</p>
            </div>
          </div>
        </div>
      )}

      <CampaignManager initialCampaigns={campaigns} userId={userId} />

      {/* DM tools: shown below campaigns in player view (deprioritized), prominently in DM view */}
      {!isPlayerView && <SavedEncounters encounters={savedEncounters} />}

      {!isPlayerView && (
        <div className="mb-6">
          <Link
            href="/app/presets"
            className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 hover:border-white/20 transition-colors group"
          >
            <Package className="w-5 h-5 text-muted-foreground group-hover:text-gold transition-colors" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground">{t.presets_title}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {presetCount} {t.presets_count}
              </span>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{t.presets_manage}</span>
          </Link>
        </div>
      )}
    </>
  );
}
