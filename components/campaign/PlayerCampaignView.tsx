"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Users,
  ScrollText,
  ChevronDown,
  Zap,
  Loader2,
  MapPin,
} from "lucide-react";
import { QuestBoard } from "@/components/campaign/QuestBoard";
import { InlineDifficultyVote } from "@/components/combat/InlineDifficultyVote";
import { getHpBarColor } from "@/lib/utils/hp-status";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface CharacterInfo {
  id: string;
  name: string;
  current_hp: number;
  max_hp: number;
  ac: number;
  race: string | null;
  characterClass: string | null;
  level: number | null;
}

interface CompanionInfo {
  id: string;
  name: string;
  current_hp: number;
  max_hp: number;
}

interface CampaignMemberInfo {
  user_id: string;
  display_name: string | null;
  character_name: string | null;
  character_id: string | null;
  role: "dm" | "player";
}

interface ActiveSessionInfo {
  id: string;
  name: string;
  round_number: number | null;
  current_turn_name: string | null;
}

interface CombatHistoryEntry {
  id: string;
  name: string;
  round_number: number;
  difficulty_rating?: number | null;
  updated_at?: string;
}

/** 7-day TTL for late voting eligibility */
const VOTE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface PlayerCampaignViewProps {
  campaignId: string;
  campaignName: string;
  dmName: string | null;
  myCharacter: CharacterInfo | null;
  companions: CompanionInfo[];
  /** Campaign members for the "See Other PCs" feature (F-27) */
  campaignMembers?: CampaignMemberInfo[];
  /** Current user ID to mark "You" badge */
  currentUserId?: string;
  activeSession: ActiveSessionInfo | null;
  combatHistory: CombatHistoryEntry[];
  /** Map of encounter_id → player's vote (1-5), for encounters already voted */
  myVotes?: Record<string, number>;
  translations: {
    back: string;
    myCharacter: string;
    companions: string;
    combatHistory: string;
    enterSession: string;
    noCharacter: string;
    noCharacterDesc: string;
    sessionActiveLabel: string;
    sessionRound: string;
    sessionCurrentTurn: string;
    combatRounds: string;
    noCompanions: string;
    companionsEmpty: string;
    youBadge: string;
    noCombatHistory: string;
    activeSession: string;
    noActiveSession: string;
    levelLabel: string;
    dmLabel: string;
    acLabel: string;
    loadMore: string;
    quests: string;
    playerHq: string;
    rateThis?: string;
    yourVote?: string;
    voteAvg?: string;
    voteError?: string;
  };
}

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const barColor = getHpBarColor(current, max);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {current}/{max}
      </span>
    </div>
  );
}

function CollapsibleSection({
  icon: Icon,
  title,
  defaultOpen,
  children,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/[0.04] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-4 py-3 min-h-[44px] bg-card hover:bg-card/80 transition-colors text-left"
      >
        <Icon className="h-4 w-4 text-emerald-400 flex-shrink-0" />
        <span className="text-emerald-400 font-semibold text-sm flex-1">
          {title}
        </span>
        {badge}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-4 py-4 border-t border-white/[0.04]">{children}</div>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

export function PlayerCampaignView({
  campaignId,
  campaignName,
  dmName,
  myCharacter,
  companions: initialCompanions,
  campaignMembers = [],
  currentUserId,
  activeSession,
  combatHistory: initialHistory,
  myVotes = {},
  translations: t,
}: PlayerCampaignViewProps) {
  // ── Realtime companion HP ─────────────────────────────────────────────────
  const [companions, setCompanions] = useState<CompanionInfo[]>(initialCompanions);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`campaign-companions:${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "player_characters",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; name: string; current_hp: number; max_hp: number };
          setCompanions((prev) =>
            prev.map((c) =>
              c.id === updated.id
                ? { ...c, current_hp: updated.current_hp, max_hp: updated.max_hp, name: updated.name }
                : c
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  // ── Combat history pagination ─────────────────────────────────────────────
  const [combatHistory, setCombatHistory] = useState<CombatHistoryEntry[]>(initialHistory);
  const [votes, setVotes] = useState<Record<string, number>>(myVotes);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialHistory.length >= PAGE_SIZE);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const supabase = createClient();
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id")
        .eq("campaign_id", campaignId);
      if (!sessions || sessions.length === 0) {
        setHasMore(false);
        return;
      }
      const sessionIds = sessions.map((s) => s.id);
      const { data: encounters } = await supabase
        .from("encounters")
        .select("id, name, round_number, difficulty_rating, updated_at")
        .in("session_id", sessionIds)
        .eq("is_active", false)
        .order("updated_at", { ascending: false })
        .range(combatHistory.length, combatHistory.length + PAGE_SIZE - 1);

      const newEntries = (encounters ?? []).map((e) => ({
        id: e.id,
        name: e.name ?? "Encounter",
        round_number: e.round_number ?? 0,
        difficulty_rating: e.difficulty_rating ?? null,
        updated_at: e.updated_at,
      }));

      // F-42: Fetch player's votes for the new encounters
      if (newEntries.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: voteRows } = await supabase
            .from("encounter_votes")
            .select("encounter_id, vote")
            .in("encounter_id", newEntries.map((e) => e.id))
            .eq("user_id", user.id);
          if (voteRows) {
            const newVotes: Record<string, number> = {};
            for (const row of voteRows) newVotes[row.encounter_id] = row.vote;
            setVotes((prev) => ({ ...prev, ...newVotes }));
          }
        }
      }

      setCombatHistory((prev) => [...prev, ...newEntries]);
      setHasMore(newEntries.length >= PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [campaignId, combatHistory.length]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/app/dashboard"
            className="text-muted-foreground text-sm hover:text-foreground transition-all duration-[250ms]"
          >
            {t.back}
          </Link>
          <h1 className="text-2xl font-semibold text-foreground mt-2 truncate">
            {campaignName}
          </h1>
          {dmName && (
            <p className="text-muted-foreground text-xs mt-0.5">
              {t.dmLabel}: {dmName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-6">
          {activeSession ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t.activeSession}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {t.noActiveSession}
            </span>
          )}
        </div>
      </div>

      {/* Active Session CTA — most prominent when active */}
      {activeSession && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">
              {t.sessionActiveLabel}
            </span>
          </div>
          <p className="text-sm text-foreground mb-1">{activeSession.name}</p>
          {activeSession.round_number != null && (
            <p className="text-xs text-muted-foreground mb-3">
              {t.sessionRound.replace("{round}", String(activeSession.round_number))}
              {activeSession.current_turn_name &&
                ` · ${t.sessionCurrentTurn.replace("{name}", activeSession.current_turn_name)}`}
            </p>
          )}
          <Button variant="gold" className="w-full sm:w-auto" asChild>
            <Link href={`/app/session/${activeSession.id}`}>
              {t.enterSession}
            </Link>
          </Button>
        </div>
      )}

      {/* My Character */}
      <CollapsibleSection
        icon={Shield}
        title={t.myCharacter}
        defaultOpen={true}
      >
        {myCharacter ? (
          <div className="space-y-3">
            <div>
              <p className="text-foreground font-medium text-lg">
                {myCharacter.name}
              </p>
              {(myCharacter.race || myCharacter.characterClass) && (
                <p className="text-muted-foreground text-sm">
                  {[myCharacter.race, myCharacter.characterClass]
                    .filter(Boolean)
                    .join(" · ")}
                  {myCharacter.level && ` · ${t.levelLabel.replace("{level}", String(myCharacter.level))}`}
                </p>
              )}
            </div>
            <HpBar current={myCharacter.current_hp} max={myCharacter.max_hp} />
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                {t.acLabel}:{" "}
                <span className="text-foreground font-medium">
                  {myCharacter.ac}
                </span>
              </span>
            </div>
            <Link
              href={`/app/campaigns/${campaignId}/sheet`}
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs font-medium rounded-md bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              {t.playerHq}
            </Link>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm font-medium">
              {t.noCharacter}
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              {t.noCharacterDesc}
            </p>
          </div>
        )}
      </CollapsibleSection>

      {/* Companions — F-27: See Other PCs */}
      <CollapsibleSection
        icon={Users}
        title={t.companions}
        defaultOpen={companions.length > 0 || campaignMembers.length > 0}
        badge={
          (companions.length > 0 || campaignMembers.length > 0) ? (
            <span className="text-xs text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
              {Math.max(companions.length, campaignMembers.filter((m) => m.role === "player").length)}
            </span>
          ) : undefined
        }
      >
        {campaignMembers.length > 0 ? (
          <div className="space-y-3">
            {campaignMembers
              .filter((m) => m.role !== "dm")
              .map((member) => {
                const isMe = member.user_id === currentUserId;
                // D4: Match by character_id (stable) instead of name (can collide)
                const companionHp = member.character_id
                  ? companions.find((c) => c.id === member.character_id)
                  : companions.find((c) => c.name === member.character_name);
                const displayName =
                  member.display_name ?? member.character_name ?? "???";

                return (
                  <div
                    key={member.user_id}
                    className="bg-white/[0.03] rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      {/* Avatar circle */}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white/10 text-foreground text-xs font-medium">
                        {(displayName[0] ?? "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground truncate">
                            {displayName}
                          </span>
                          {isMe && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-400/10 text-amber-400">
                              {t.youBadge}
                            </span>
                          )}
                        </div>
                        {member.character_name &&
                          member.character_name !== displayName && (
                            <p className="text-xs text-muted-foreground truncate">
                              {member.character_name}
                            </p>
                          )}
                      </div>
                    </div>
                    {companionHp && !isMe && (
                      <HpBar
                        current={companionHp.current_hp}
                        max={companionHp.max_hp}
                      />
                    )}
                  </div>
                );
              })}
          </div>
        ) : companions.length > 0 ? (
          /* Fallback to legacy companions display if no member data */
          <div className="space-y-3">
            {companions.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="text-sm text-foreground font-medium min-w-[80px] truncate">
                  {c.name}
                </span>
                <div className="flex-1">
                  <HpBar current={c.current_hp} max={c.max_hp} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-4">
            {t.companionsEmpty}
          </p>
        )}
      </CollapsibleSection>

      {/* Combat History */}
      <CollapsibleSection
        icon={ScrollText}
        title={t.combatHistory}
        defaultOpen={false}
        badge={
          combatHistory.length > 0 ? (
            <span className="text-xs text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
              {combatHistory.length}
            </span>
          ) : undefined
        }
      >
        {combatHistory.length > 0 ? (
          <div className="space-y-2">
            {combatHistory.map((enc) => {
              const existingVote = votes[enc.id] ?? null;
              const withinTtl = enc.updated_at
                ? Date.now() - new Date(enc.updated_at).getTime() < VOTE_TTL_MS
                : false;
              const canVote = !existingVote && withinTtl;

              return (
                <div
                  key={enc.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 bg-white/[0.03] rounded-lg"
                >
                  <span className="text-sm text-foreground truncate min-w-0">{enc.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(canVote || existingVote) && t.rateThis ? (
                      <InlineDifficultyVote
                        encounterId={enc.id}
                        existingVote={existingVote}
                        currentAvg={enc.difficulty_rating}
                        onVoted={(vote, newAvg) => {
                          setVotes((prev) => ({ ...prev, [enc.id]: vote }));
                          setCombatHistory((prev) =>
                            prev.map((e) => e.id === enc.id ? { ...e, difficulty_rating: newAvg } : e)
                          );
                        }}
                        translations={{
                          rateThis: t.rateThis!,
                          yourVote: t.yourVote ?? "",
                          avg: t.voteAvg ?? "",
                          error: t.voteError ?? "Erro",
                        }}
                      />
                    ) : null}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {t.combatRounds.replace("{count}", String(enc.round_number))}
                    </span>
                  </div>
                </div>
              );
            })}
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground"
                disabled={loadingMore}
                onClick={loadMore}
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {loadingMore ? "..." : t.loadMore}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-4">
            {t.noCombatHistory}
          </p>
        )}
      </CollapsibleSection>

      {/* Quests — F-39 */}
      <CollapsibleSection
        icon={MapPin}
        title={t.quests}
        defaultOpen={true}
      >
        <QuestBoard campaignId={campaignId} isEditable={false} />
      </CollapsibleSection>
    </div>
  );
}
