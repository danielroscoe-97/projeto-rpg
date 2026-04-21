"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { CombatSessionClient } from "@/components/combat-session/CombatSessionClient";
import { ShareSessionButton } from "@/components/combat-session/ShareSessionButton";
import type { PlayerCharacter, RulesetVersion } from "@/lib/types/database";
import { fetchEncounterPreset } from "@/lib/supabase/encounter-presets";
import { createSessionOnly } from "@/lib/supabase/encounter";
import type { EncounterPreset } from "@/lib/types/encounter-preset";
import type { Combatant } from "@/lib/types/combat";

/** Stable empty array — avoids referential changes that retrigger CombatSessionClient hydration effect */
const EMPTY_COMBATANTS: Combatant[] = [];

/** Story 12.2 — default ruleset for draft sessions. The DM can switch rulesets
 *  mid-setup via CombatSessionClient; this is only the seed value. Centralised
 *  so the 2024 cutover flips a single constant. */
const DEFAULT_DRAFT_RULESET: RulesetVersion = "2014";

/** sessionStorage key for draft-session reuse across page refreshes within
 *  the same tab. Keyed by "campaign:{id}" or "quick" to avoid cross-context bleed. */
const DRAFT_STORAGE_PREFIX = "pocketdm.draft-session:";

interface CampaignOption {
  id: string;
  name: string;
  player_count: number;
}

/** BUG-006: Wrap in Suspense to avoid hydration mismatch from useSearchParams.
 *  Next.js requires a Suspense boundary around client components that read searchParams. */
export default function NewEncounterPage() {
  return (
    <Suspense>
      <NewEncounterPageInner />
    </Suspense>
  );
}

function NewEncounterPageInner() {
  const t = useTranslations("session");
  const searchParams = useSearchParams();

  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Once a choice is made, store it here
  const [chosen, setChosen] = useState<{
    campaignId: string | null;
    preloadedPlayers: PlayerCharacter[];
    preloadedPreset?: EncounterPreset | null;
  } | null>(null);

  // Story 12.2 — Draft session persisted as soon as campaign/quick-mode is resolved,
  // so refreshing or closing the tab before Start Combat no longer loses the work.
  // Falls back to null (legacy lazy-create at Start) if the DB call fails.
  const [draftSessionId, setDraftSessionId] = useState<string | null>(null);
  // Guards against React StrictMode dev double-invocation and any future dep
  // churn from creating two orphan `sessions` rows per DM visit.
  const draftCreateStartedRef = useRef(false);

  const isQuick = searchParams.get("quick") === "true";
  const presetParam = searchParams.get("preset");

  useEffect(() => {
    // Skip campaign picker entirely for quick combat
    if (isQuick) {
      setChosen({ campaignId: null, preloadedPlayers: [] });
      setIsLoading(false);
      return;
    }

    const load = async () => {
      const supabase = createClient();
      const campaignParam = searchParams.get("campaign");

      // If preset param is provided, fetch preset + campaign players directly (skip picker)
      if (presetParam && campaignParam) {
        try {
          const [preset, { data: players }, { data: members }] = await Promise.all([
            fetchEncounterPreset(presetParam),
            supabase
              .from("player_characters")
              .select("*")
              .eq("campaign_id", campaignParam)
              .order("created_at", { ascending: true }),
            supabase
              .from("campaign_members")
              .select("id, user_id")
              .eq("campaign_id", campaignParam),
          ]);

          // Filter players by preset's selected_members (member_id → user_id mapping)
          let filteredPlayers = (players as PlayerCharacter[]) ?? [];
          if (preset?.selected_members && preset.selected_members.length > 0 && members) {
            const selectedUserIds = new Set(
              preset.selected_members
                .map((memberId) => members.find((m: { id: string; user_id: string }) => m.id === memberId)?.user_id)
                .filter(Boolean)
            );
            if (selectedUserIds.size > 0) {
              filteredPlayers = filteredPlayers.filter((p) => selectedUserIds.has(p.user_id));
            }
          }

          setChosen({
            campaignId: campaignParam,
            preloadedPlayers: filteredPlayers,
            preloadedPreset: preset,
          });
          setIsLoading(false);
          return;
        } catch {
          // Fallback to normal picker on error
        }
      }

      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, player_characters(count)")
        .order("created_at", { ascending: false });

      if (error) {
        setFetchError(t("pick_error"));
        // If fetch fails, skip picker and go straight to quick combat
        setChosen({ campaignId: null, preloadedPlayers: [] });
      } else {
        const mapped = (data ?? []).map((c: { id: string; name: string; player_characters: { count: number }[] }) => ({
          id: c.id,
          name: c.name,
          player_count: c.player_characters[0]?.count ?? 0,
        }));
        // If no campaigns, skip picker
        if (mapped.length === 0) {
          setChosen({ campaignId: null, preloadedPlayers: [] });
        } else {
          setCampaigns(mapped);
        }
      }
      setIsLoading(false);
    };
    load();
  }, [t, isQuick, searchParams, presetParam]);

  const handlePickCampaign = async (campaignId: string) => {
    setIsLoading(true);
    const supabase = createClient();

    // Fetch existing character sheets for this campaign
    const { data: sheets } = await supabase
      .from("player_characters")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });

    const characterSheets = (sheets as PlayerCharacter[]) ?? [];
    const sheetUserIds = new Set(characterSheets.map((pc) => pc.user_id).filter(Boolean));

    // Fetch active player members who DON'T have a character sheet yet
    const { data: memberRows } = await supabase
      .from("campaign_members")
      .select("user_id")
      .eq("campaign_id", campaignId)
      .eq("role", "player")
      .eq("status", "active");

    const unmatched = (memberRows ?? []).filter((m: { user_id: string }) => !sheetUserIds.has(m.user_id));

    let placeholders: PlayerCharacter[] = [];
    if (unmatched.length > 0) {
      const { data: userRows } = await supabase
        .from("users")
        .select("id, display_name")
        .in("id", unmatched.map((m: { user_id: string }) => m.user_id));

      const userMap = new Map((userRows ?? []).map((u: { id: string; display_name: string | null }) => [u.id, u.display_name]));

      placeholders = unmatched.map((m: { user_id: string }) => ({
        id: `__placeholder__${m.user_id}`,
        campaign_id: campaignId,
        user_id: m.user_id,
        claimed_by_session_token: null,
        name: (userMap.get(m.user_id) ?? "Jogador") as string,
        max_hp: 0,
        current_hp: 0,
        ac: 0,
        hp_temp: 0,
        speed: null,
        initiative_bonus: null,
        inspiration: false,
        conditions: [],
        spell_save_dc: null,
        dm_notes: "",
        race: null,
        class: null,
        level: null,
        subrace: null,
        subclass: null,
        background: null,
        alignment: null,
        notes: null,
        token_url: null,
        spell_slots: null,
        str: null,
        dex: null,
        con: null,
        int_score: null,
        wis: null,
        cha_score: null,
        traits: null,
        proficiencies: {},
        currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as PlayerCharacter));
    }

    setChosen({
      campaignId,
      preloadedPlayers: [...characterSheets, ...placeholders],
    });
    setIsLoading(false);
  };

  const handlePickQuickCombat = () => {
    setChosen({ campaignId: null, preloadedPlayers: [] });
  };

  // Story 12.2 — Best-effort eager session persistence. Runs once `chosen` is set.
  // AC5 — Also recovers the previously-created draft from sessionStorage on
  //       refresh, so closing+reopening the tab (or hitting F5 during setup)
  //       reuses the same row instead of orphaning one per visit.
  // If DB call fails (network, unauthenticated, etc.), CombatSessionClient
  // still works with sessionId=null and falls back to creating the session
  // at Start Combat.
  useEffect(() => {
    if (!chosen || draftSessionId || draftCreateStartedRef.current) return;
    draftCreateStartedRef.current = true;

    const storageKey = DRAFT_STORAGE_PREFIX + (chosen.campaignId ?? "quick");

    // AC5 — reuse any existing draft session stored during this tab's lifetime.
    // sessionStorage is scoped to the tab, so a different tab gets a fresh row
    // (intentional — we don't want cross-tab draft collisions).
    try {
      const stored = typeof window !== "undefined"
        ? window.sessionStorage.getItem(storageKey)
        : null;
      if (stored) {
        setDraftSessionId(stored);
        return;
      }
    } catch {
      // sessionStorage may throw in private-mode / quota edge — fall through to create.
    }

    let cancelled = false;
    (async () => {
      try {
        const newId = await createSessionOnly(DEFAULT_DRAFT_RULESET, chosen.campaignId);
        if (!cancelled) {
          setDraftSessionId(newId);
          try {
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem(storageKey, newId);
            }
          } catch {
            // Storage write failure is non-fatal — worst case the next refresh
            // creates a new draft, which the 72h sweeper reaps.
          }
        }
      } catch {
        // Swallow — legacy lazy-create path remains intact.
        // Unset the ref so a retry (e.g. user changes `chosen` by re-picking) can try again.
        draftCreateStartedRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chosen, draftSessionId]);

  // Once chosen, render the combat client.
  // Share button lives at the page level (mirrors /app/combat/[id]/page.tsx)
  // so EncounterSetup stays focused on combatant setup — no ambiguous guard
  // coupling share rendering to the presence of `sessionId`.
  if (chosen) {
    return (
      <div className="space-y-3">
        {draftSessionId && (
          <div className="flex justify-end px-2">
            <ShareSessionButton sessionId={draftSessionId} />
          </div>
        )}
        <CombatSessionClient
          sessionId={draftSessionId}
          encounterId={null}
          initialCombatants={EMPTY_COMBATANTS}
          isActive={false}
          roundNumber={1}
          currentTurnIndex={0}
          campaignId={chosen.campaignId}
          preloadedPlayers={chosen.preloadedPlayers}
          preloadedPreset={chosen.preloadedPreset ?? null}
        />
      </div>
    );
  }

  // Campaign picker
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {t("pick_campaign_title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("pick_campaign_description")}
        </p>
      </div>

      {fetchError && (
        <p className="text-red-400 text-sm" role="alert">
          {fetchError}
        </p>
      )}

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t("pick_loading")}</p>
      ) : (
        <div className="space-y-3">
          {/* Quick Combat option */}
          <button
            type="button"
            onClick={handlePickQuickCombat}
            className="w-full text-left p-4 bg-card border border-dashed border-border rounded-lg hover:border-gold/50 hover:bg-gold/5 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-foreground font-medium group-hover:text-gold transition-colors">
                  {t("pick_quick_combat")}
                </span>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {t("pick_quick_combat_description")}
                </p>
              </div>
              <span className="text-muted-foreground/40 text-xl group-hover:text-gold transition-colors">
                &rarr;
              </span>
            </div>
          </button>

          {/* Campaign options */}
          {campaigns.map((campaign) => (
            <button
              key={campaign.id}
              type="button"
              onClick={() => handlePickCampaign(campaign.id)}
              className="w-full text-left p-4 bg-card border border-border rounded-lg hover:border-gold/50 hover:bg-gold/5 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-foreground font-medium group-hover:text-gold transition-colors">
                    {campaign.name}
                  </span>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    {campaign.player_count === 1
                      ? t("pick_campaign_players_one")
                      : t("pick_campaign_players", {
                          count: campaign.player_count,
                        })}
                  </p>
                </div>
                <span className="text-muted-foreground/40 text-xl group-hover:text-gold transition-colors">
                  &rarr;
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
