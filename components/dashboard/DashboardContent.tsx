"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Swords, Package, Zap } from "lucide-react";

import { CampaignManager } from "@/components/dashboard/CampaignManager";
import { SavedEncounters } from "@/components/dashboard/SavedEncounters";
import { PendingInvites } from "@/components/dashboard/PendingInvites";
import { PlayerCampaignCard } from "@/components/dashboard/PlayerCampaignCard";
import dynamic from "next/dynamic";

const DmSoundboard = dynamic(() => import("@/components/audio/DmSoundboard").then(m => m.DmSoundboard), {
  ssr: false,
});
import { useRoleStore } from "@/lib/stores/role-store";
import { Button } from "@/components/ui/button";
import type { UserRole, ActiveView } from "@/lib/stores/role-store";
import type { SavedEncounterRow } from "@/components/dashboard/SavedEncounters";
import type {
  UserMembership,
  CampaignInviteWithDetails,
} from "@/lib/types/campaign-membership";

interface DashboardContentProps {
  campaigns: {
    id: string;
    name: string;
    created_at: string;
    player_count: number;
  }[];
  savedEncounters: SavedEncounterRow[];
  presetCount: number;
  userId: string;
  userRole: UserRole;
  memberships: UserMembership[];
  pendingInvites: CampaignInviteWithDetails[];
  translations: {
    title: string;
    description: string;
    new_session: string;
    presets_title: string;
    presets_count: string;
    presets_manage: string;
    player_welcome: string;
    player_join_hint: string;
    dm_tables_title: string;
    player_tables_title: string;
    pending_invites: string;
    quick_combat: string;
    create_first_campaign: string;
    create_first_campaign_desc: string;
    waiting_for_invite: string;
    waiting_for_invite_desc: string;
    try_quick_combat: string;
    active_session: string;
    no_active_session: string;
    tab_dm: string;
    tab_player: string;
    invited_by: string;
    accept_invite: string;
    decline_invite: string;
    invite_accept_error: string;
    invite_decline_error: string;
    invite_accepted_redirect: string;
    player_count_label: string;
    dm_label: string;
  };
}

export function DashboardContent({
  campaigns,
  savedEncounters,
  presetCount,
  userId,
  userRole,
  memberships,
  pendingInvites,
  translations: t,
}: DashboardContentProps) {
  const { activeView, initialized, loadRole } = useRoleStore();

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  // Derive DM and Player memberships
  const dmMemberships = memberships.filter((m) => m.role === "dm");
  const playerMemberships = memberships.filter((m) => m.role === "player");
  const hasDmCampaigns = dmMemberships.length > 0 || campaigns.length > 0;
  const hasPlayerCampaigns = playerMemberships.length > 0;

  // Mobile tabs — only show when user has both roles
  const showTabs = hasDmCampaigns && hasPlayerCampaigns;
  const [mobileTab, setMobileTab] = useState<"dm" | "player">(
    userRole === "player" ? "player" : "dm"
  );

  // Use server-provided role as fallback until client store initializes
  const effectiveView: ActiveView = initialized
    ? activeView
    : userRole === "player"
      ? "player"
      : "dm";

  const isDmFirst = effectiveView === "dm";

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 relative">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">{t.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t.description}</p>
        </div>
        {hasDmCampaigns && (
          <div className="flex items-center sm:justify-end">
            <Link
              href="/app/session/new"
              className="inline-flex items-center justify-center gap-2 bg-gold text-surface-primary font-semibold px-6 py-1.5 rounded-lg text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[36px] w-full sm:w-auto sm:min-w-[240px] shrink-0"
            >
              <Swords
                className="inline-block w-4 h-4"
                aria-hidden="true"
              />{" "}
              {t.new_session}
            </Link>
          </div>
        )}
      </div>

      {/* Pending Invites — always on top (most urgent on mobile) */}
      {pendingInvites.length > 0 && (
        <div className="mb-6">
          <PendingInvites
            initialInvites={pendingInvites}
            translations={{
              title: t.pending_invites,
              invitedBy: t.invited_by,
              accept: t.accept_invite,
              decline: t.decline_invite,
              acceptError: t.invite_accept_error,
              declineError: t.invite_decline_error,
              acceptedRedirect: t.invite_accepted_redirect,
            }}
          />
        </div>
      )}

      {/* Mobile Tabs (only when both DM and Player campaigns exist) */}
      {showTabs && (
        <div className="lg:hidden mb-6">
          <div className="flex bg-card rounded-lg border border-border p-1">
            <button
              type="button"
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-all duration-200 min-h-[36px] ${
                mobileTab === "dm"
                  ? "bg-amber-400/10 text-amber-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMobileTab("dm")}
            >
              {t.tab_dm}
            </button>
            <button
              type="button"
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-all duration-200 min-h-[36px] ${
                mobileTab === "player"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMobileTab("player")}
            >
              {t.tab_player}
            </button>
          </div>
        </div>
      )}

      {/* ── Desktop: Both sections visible ── */}
      <div className="hidden lg:block space-y-8">
        {/* DM Section (first or second based on role preference) */}
        {isDmFirst ? (
          <>
            <DmSection
              campaigns={campaigns}
              savedEncounters={savedEncounters}
              presetCount={presetCount}
              userId={userId}

              t={t}
            />
            {hasPlayerCampaigns && (
              <PlayerSection playerMemberships={playerMemberships} t={t} />
            )}
          </>
        ) : (
          <>
            {hasPlayerCampaigns && (
              <PlayerSection playerMemberships={playerMemberships} t={t} />
            )}
            <DmSection
              campaigns={campaigns}
              savedEncounters={savedEncounters}
              presetCount={presetCount}
              userId={userId}

              t={t}
            />
          </>
        )}
      </div>

      {/* ── Mobile: Tab-based view ── */}
      <div className="lg:hidden">
        {/* Show based on mobile tab when tabs exist, otherwise show what's available */}
        {showTabs ? (
          mobileTab === "dm" ? (
            <DmSection
              campaigns={campaigns}
              savedEncounters={savedEncounters}
              presetCount={presetCount}
              userId={userId}

              t={t}
            />
          ) : (
            <PlayerSection playerMemberships={playerMemberships} t={t} />
          )
        ) : hasDmCampaigns && hasPlayerCampaigns ? (
          isDmFirst ? (
            <>
              <DmSection campaigns={campaigns} savedEncounters={savedEncounters} presetCount={presetCount} userId={userId} t={t} />
              <div className="mt-8">
                <PlayerSection playerMemberships={playerMemberships} t={t} />
              </div>
            </>
          ) : (
            <>
              <PlayerSection playerMemberships={playerMemberships} t={t} />
              <div className="mt-8">
                <DmSection campaigns={campaigns} savedEncounters={savedEncounters} presetCount={presetCount} userId={userId} t={t} />
              </div>
            </>
          )
        ) : hasDmCampaigns ? (
          <DmSection campaigns={campaigns} savedEncounters={savedEncounters} presetCount={presetCount} userId={userId} t={t} />
        ) : hasPlayerCampaigns ? (
          <PlayerSection playerMemberships={playerMemberships} t={t} />
        ) : (
          <PlayerEmptyState t={t} />
        )}
      </div>

      {/* Quick Combat — sticky on mobile */}
      <div className="mt-8">
        <Link
          href="/app/session/new"
          className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 hover:border-white/20 transition-colors group"
        >
          <Zap className="w-5 h-5 text-amber-400 group-hover:text-gold transition-colors" />
          <span className="text-sm font-medium text-foreground flex-1">
            {t.quick_combat}
          </span>
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            →
          </span>
        </Link>
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function DmSection({
  campaigns,
  savedEncounters,
  presetCount,
  userId,
  t,
}: {
  campaigns: DashboardContentProps["campaigns"];
  savedEncounters: SavedEncounterRow[];
  presetCount: number;
  userId: string;
  t: DashboardContentProps["translations"];
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
        {t.dm_tables_title}
      </h2>

      <CampaignManager initialCampaigns={campaigns} userId={userId} />

      <SavedEncounters encounters={savedEncounters} />

      <Link
        href="/app/presets"
        className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 hover:border-white/20 transition-colors group"
      >
        <Package className="w-5 h-5 text-muted-foreground group-hover:text-gold transition-colors" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground">
            {t.presets_title}
          </span>
          <span className="text-xs text-muted-foreground ml-2">
            {presetCount} {t.presets_count}
          </span>
        </div>
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          {t.presets_manage}
        </span>
      </Link>

      <DmSoundboard ambientOnly />
    </div>
  );
}

function PlayerSection({
  playerMemberships,
  t,
}: {
  playerMemberships: UserMembership[];
  t: DashboardContentProps["translations"];
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
        {t.player_tables_title}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {playerMemberships.map((m) => (
          <PlayerCampaignCard
            key={m.campaign_id}
            membership={m}
            translations={{
              activeSession: t.active_session,
              noActiveSession: t.no_active_session,
              playerCount: t.player_count_label,
              dmLabel: t.dm_label,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PlayerEmptyState({
  t,
}: {
  t: DashboardContentProps["translations"];
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Image
        src="/art/icons/pet-cat.png"
        alt=""
        width={64}
        height={64}
        className="pixel-art opacity-40 float-gentle"
        aria-hidden="true"
        unoptimized
      />
      <p className="text-muted-foreground text-sm font-medium">
        {t.waiting_for_invite}
      </p>
      <p className="text-muted-foreground/60 text-xs">{t.waiting_for_invite_desc}</p>
      <Button variant="gold" className="mt-2 min-h-[44px]" asChild>
        <Link href="/app/session/new">{t.try_quick_combat}</Link>
      </Button>
    </div>
  );
}
