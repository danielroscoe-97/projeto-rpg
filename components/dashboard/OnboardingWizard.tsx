"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { captureError } from "@/lib/errors/capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WelcomeScreen } from "@/components/dashboard/WelcomeScreen";
import { getGuestEncounterData, getGuestCombatSnapshot } from "@/lib/stores/guest-combat-store";
import type { OnboardingSource } from "@/lib/types/database";

const MAX_PLAYERS = 8;
const SESSION_STORAGE_KEY = "onboarding-wizard-state";
const PERSIST_DEBOUNCE_MS = 1000;

const STEP_ICONS: Record<number, string> = {
  1: "/art/icons/carta.png",
  2: "/art/icons/team-chibi-1.png",
  3: "/art/icons/potion.png",
  4: "/art/icons/mvp-crown.png",
};

let _playerIdCounter = 0;
function newPlayer(name = "", max_hp = 10, ac = 10): PlayerInput {
  return { _id: ++_playerIdCounter, name, max_hp, ac, spell_save_dc: null };
}

interface PlayerInput {
  _id: number;
  name: string;
  max_hp: number;
  ac: number;
  spell_save_dc: number | null;
}

type WizardStep = "welcome" | "choose" | "express" | 1 | 2 | 3 | 4 | "done";

interface WizardState {
  step: WizardStep;
  campaignName: string;
  players: PlayerInput[];
  encounterName: string;
  sessionLink: string | null;
  isSubmitting: boolean;
  error: string | null;
  copyError: string | null;
  fieldErrors: Set<string>;
  showCelebration: boolean;
}

interface OnboardingWizardProps {
  userId: string;
  source?: OnboardingSource;
  savedStep?: string | null;
}

function readSessionStorage(): Partial<WizardState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Restore Set from array
    if (parsed.fieldErrors) parsed.fieldErrors = new Set(parsed.fieldErrors);
    // Sync _playerIdCounter to avoid collisions with restored player _ids
    if (Array.isArray(parsed.players)) {
      const maxId = parsed.players.reduce((m: number, p: { _id?: number }) => Math.max(m, p._id ?? 0), 0);
      if (maxId >= _playerIdCounter) _playerIdCounter = maxId;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionStorage(state: Partial<WizardState>) {
  if (typeof window === "undefined") return;
  try {
    const toSave = {
      step: state.step,
      campaignName: state.campaignName,
      players: state.players,
      encounterName: state.encounterName,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // storage unavailable
  }
}

export function OnboardingWizard({ userId, source = "fresh", savedStep }: OnboardingWizardProps) {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read guest data (client-side only)
  const [guestData] = useState(() => {
    if (typeof window === "undefined") return null;
    const enc = getGuestEncounterData();
    if (enc && enc.combatants.length > 0) return enc;
    const snap = getGuestCombatSnapshot();
    if (snap && snap.combatants.length > 0) return {
      combatants: snap.combatants,
      roundNumber: snap.roundNumber,
      currentTurnIndex: snap.currentTurnIndex,
      phase: "combat" as const,
    };
    return null;
  });

  const guestPreview = guestData && guestData.combatants.length > 0
    ? { combatantCount: guestData.combatants.length, roundNumber: guestData.roundNumber ?? 1 }
    : null;

  const effectiveSource: OnboardingSource =
    (source === "fresh" && guestPreview) ? "guest_combat" : source;

  // Build initial players from guest data (PCs only — no monster_id)
  const [initialPlayers] = useState<PlayerInput[]>(() => {
    if (effectiveSource === "guest_combat" && guestData) {
      const pcs = guestData.combatants.filter(
        (c: { monster_id?: string | null; name: string; max_hp?: number; ac?: number }) => !c.monster_id
      );
      if (pcs.length > 0) {
        return pcs.slice(0, MAX_PLAYERS).map((pc: { name: string; max_hp?: number; ac?: number }) =>
          newPlayer(pc.name ?? "", pc.max_hp ?? 10, pc.ac ?? 10)
        );
      }
    }
    return [newPlayer()];
  });

  const initialCampaignName = effectiveSource === "guest_combat" ? t("campaign_name_guest_default") : "";

  // Determine initial step: sessionStorage → savedStep → welcome
  const [initialStep] = useState<WizardStep>(() => {
    const ss = readSessionStorage();
    if (ss?.step && ss.step !== "done") return ss.step as WizardStep;
    if (savedStep) {
      // savedStep comes from DB as string — convert numeric strings to numbers
      const num = Number(savedStep);
      const parsed: WizardStep = !isNaN(num) && num >= 1 && num <= 4 ? (num as WizardStep) : (savedStep as WizardStep);
      if (["welcome", "choose", 1, 2, 3, 4].includes(parsed as number | string)) return parsed;
    }
    return "welcome";
  });

  const [state, setState] = useState<WizardState>(() => {
    const ss = readSessionStorage();
    return {
      step: initialStep,
      campaignName: (ss?.campaignName as string) ?? initialCampaignName,
      players: (ss?.players as PlayerInput[]) ?? initialPlayers,
      encounterName: (ss?.encounterName as string) ?? "First Encounter",
      sessionLink: null,
      isSubmitting: false,
      error: null,
      copyError: null,
      fieldErrors: new Set<string>(),
      showCelebration: false,
    };
  });

  // Persist state to sessionStorage (debounced) and DB
  const persistProgress = useCallback((newState: WizardState) => {
    writeSessionStorage(newState);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (newState.step === "done" || newState.step === "welcome") return;
      try {
        const supabase = createClient();
        await supabase
          .from("user_onboarding")
          .update({ wizard_step: String(newState.step) })
          .eq("user_id", userId);
      } catch {
        // best-effort
      }
    }, PERSIST_DEBOUNCE_MS);
  }, [userId]);

  // Clear session storage on unmount if done
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Step 1 ────────────────────────────────────────────────────────
  function handleCampaignNameChange(value: string) {
    setState((s) => {
      const fe = new Set(s.fieldErrors);
      fe.delete("campaign-name");
      const next = { ...s, campaignName: value, error: null, fieldErrors: fe };
      persistProgress(next);
      return next;
    });
  }

  function handleStep1Next() {
    const trimmed = state.campaignName.trim();
    if (!trimmed) {
      setState((s) => ({ ...s, error: t("campaign_name_required"), fieldErrors: new Set(["campaign-name"]) }));
      return;
    }
    if (trimmed.length > 50) {
      setState((s) => ({ ...s, error: t("campaign_name_max"), fieldErrors: new Set(["campaign-name"]) }));
      return;
    }
    setState((s) => {
      const next = { ...s, step: 2 as WizardStep, error: null, fieldErrors: new Set<string>() };
      persistProgress(next);
      return next;
    });
  }

  // ── Step 2 ────────────────────────────────────────────────────────
  function handlePlayerChange(index: number, field: keyof PlayerInput, value: string) {
    setState((s) => {
      const updated = s.players.map((p, i) => {
        if (i !== index) return p;
        if (field === "name") return { ...p, name: value };
        if (field === "spell_save_dc")
          return { ...p, spell_save_dc: value === "" ? null : parseInt(value, 10) };
        return { ...p, [field]: parseInt(value, 10) };
      });
      const fe = new Set(s.fieldErrors);
      const player = s.players[index];
      fe.delete(`player-${field}-${player._id}`);
      const next = { ...s, players: updated, error: null, fieldErrors: fe };
      persistProgress(next);
      return next;
    });
  }

  function handleAddPlayer() {
    if (state.players.length >= MAX_PLAYERS) return;
    setState((s) => {
      const next = { ...s, players: [...s.players, newPlayer()] };
      persistProgress(next);
      return next;
    });
  }

  function handleRemovePlayer(index: number) {
    setState((s) => {
      const next = { ...s, players: s.players.filter((_, i) => i !== index) };
      persistProgress(next);
      return next;
    });
  }

  function handleStep2Next() {
    const errors = new Set<string>();
    for (const p of state.players) {
      if (!p.name.trim()) errors.add(`player-name-${p._id}`);
      // HP/AC are optional — but if provided they must be valid numbers
      if (p.max_hp && (isNaN(p.max_hp) || p.max_hp <= 0 || p.max_hp > 9999)) errors.add(`player-hp-${p._id}`);
      if (p.ac && (isNaN(p.ac) || p.ac <= 0 || p.ac > 99)) errors.add(`player-ac-${p._id}`);
      if (
        p.spell_save_dc !== null &&
        (isNaN(p.spell_save_dc) || p.spell_save_dc <= 0 || p.spell_save_dc > 99)
      ) errors.add(`player-dc-${p._id}`);
    }
    if (errors.size > 0) {
      const hasDcError = [...errors].some((e) => e.startsWith("player-dc-"));
      setState((s) => ({
        ...s,
        error: hasDcError ? t("players_spell_dc_validation") : t("players_validation"),
        fieldErrors: errors,
      }));
      return;
    }
    // Apply defaults for empty HP/AC
    const playersWithDefaults = state.players.map((p) => ({
      ...p,
      max_hp: p.max_hp || 10,
      ac: p.ac || 10,
    }));
    setState((s) => {
      const next = { ...s, players: playersWithDefaults, step: 3 as WizardStep, error: null, fieldErrors: new Set<string>() };
      persistProgress(next);
      return next;
    });
  }

  // ── Step 3 ────────────────────────────────────────────────────────
  function handleEncounterNameChange(value: string) {
    setState((s) => {
      const fe = new Set(s.fieldErrors);
      fe.delete("encounter-name");
      const next = { ...s, encounterName: value, error: null, fieldErrors: fe };
      persistProgress(next);
      return next;
    });
  }

  function handleStep3Next() {
    const trimmed = state.encounterName.trim();
    if (!trimmed) {
      setState((s) => ({ ...s, error: t("encounter_name_required"), fieldErrors: new Set(["encounter-name"]) }));
      return;
    }
    if (trimmed.length > 50) {
      setState((s) => ({ ...s, error: t("encounter_name_max"), fieldErrors: new Set(["encounter-name"]) }));
      return;
    }
    setState((s) => {
      const next = { ...s, step: 4 as WizardStep, error: null, fieldErrors: new Set<string>() };
      persistProgress(next);
      return next;
    });
  }

  // ── Shared campaign+session creation ────────────────────────────
  async function createCampaignWithSession(opts: {
    campaignName: string;
    encounterName: string;
    players: PlayerInput[];
  }): Promise<string> {
    const supabase = createClient();
    const { campaignName, encounterName, players } = opts;

    // 1. Create Campaign — delete any orphaned campaign first (retry-safe)
    await supabase.from("campaigns").delete().eq("owner_id", userId);
    const { data: campaign, error: campaignErr } = await supabase
      .from("campaigns")
      .insert({ owner_id: userId, name: campaignName })
      .select("id")
      .single();
    if (campaignErr || !campaign) {
      captureError(campaignErr, { component: "OnboardingWizard", action: "createCampaign", category: "database" });
      throw new Error(t("error_campaign"));
    }

    // 2. Insert PlayerCharacters
    const validPlayers = players.filter((p) => p.name.trim());
    if (validPlayers.length > 0) {
      const characters = validPlayers.map((p) => ({
        campaign_id: campaign.id,
        name: p.name.trim(),
        max_hp: p.max_hp || 10,
        current_hp: p.max_hp || 10,
        ac: p.ac || 10,
        spell_save_dc: p.spell_save_dc ?? null,
      }));
      const { error: pcErr } = await supabase.from("player_characters").insert(characters);
      if (pcErr) {
        captureError(pcErr, { component: "OnboardingWizard", action: "insertPlayers", category: "database" });
        throw new Error(t("error_players"));
      }
    }

    // 3. Create Session
    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .insert({
        campaign_id: campaign.id,
        owner_id: userId,
        name: `${campaignName} - Session 1`,
        ruleset_version: "2014" as const,
      })
      .select("id")
      .single();
    if (sessionErr || !session) {
      captureError(sessionErr, { component: "OnboardingWizard", action: "createSession", category: "database" });
      throw new Error(t("error_session"));
    }

    // 4. Create Encounter
    const { error: encErr } = await supabase.from("encounters").insert({
      session_id: session.id,
      name: encounterName,
      is_active: true,
    });
    if (encErr) {
      captureError(encErr, { component: "OnboardingWizard", action: "createEncounter", category: "database" });
      throw new Error(t("error_encounter"));
    }

    // 5. Generate Session Token
    const token = crypto.randomUUID();
    const { error: tokenErr } = await supabase
      .from("session_tokens")
      .insert({ session_id: session.id, token, is_active: true });
    if (tokenErr) {
      captureError(tokenErr, { component: "OnboardingWizard", action: "createToken", category: "database" });
      throw new Error(t("error_link"));
    }

    // 6. Mark wizard_completed
    await supabase
      .from("user_onboarding")
      .upsert({ user_id: userId, wizard_completed: true, wizard_step: null }, { onConflict: "user_id" });

    return token;
  }

  // ── Step 4 submit ─────────────────────────────────────────────────
  async function handleSubmit() {
    if (state.isSubmitting) return;
    setState((s) => ({ ...s, isSubmitting: true, error: null }));

    try {
      const token = await createCampaignWithSession({
        campaignName: state.campaignName.trim(),
        encounterName: state.encounterName.trim(),
        players: state.players,
      });

      try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* ignore */ }

      setState((s) => ({
        ...s,
        sessionLink: `${window.location.origin}/join/${token}`,
        step: "done",
        isSubmitting: false,
        showCelebration: true,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("error_generic");
      setState((s) => ({ ...s, error: message, isSubmitting: false }));
    }
  }

  async function handleCopyLink() {
    if (!state.sessionLink) return;
    try {
      await navigator.clipboard.writeText(state.sessionLink ?? "");
      setState((s) => ({ ...s, copyError: null }));
    } catch {
      setState((s) => ({ ...s, copyError: t("launch_copy_error") }));
    }
  }

  // ── Welcome Step ──────────────────────────────────────────────────
  if (state.step === "welcome") {
    return (
      <WelcomeScreen
        source={effectiveSource}
        guestPreview={guestPreview}
        onContinue={() => {
          if (effectiveSource === "guest_combat") {
            setState((s) => ({ ...s, step: "express" }));
          } else {
            setState((s) => ({ ...s, step: "choose" }));
          }
        }}
      />
    );
  }

  // ── Choose Path (step 0) ─────────────────────────────────────────
  if (state.step === "choose") {
    return (
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Image
            src="/art/icons/edenhat.png"
            alt=""
            width={56}
            height={56}
            className="pixel-art mx-auto mb-3 opacity-80"
            aria-hidden="true"
            unoptimized
          />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {t("choose_title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("choose_description")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Quick Combat Path — Primary */}
          <button
            type="button"
            onClick={async () => {
              try {
                const supabase = createClient();
                await supabase
                  .from("user_onboarding")
                  .upsert({ user_id: userId, wizard_completed: true }, { onConflict: "user_id" });
              } catch { /* best-effort */ }
              // Redirect to dashboard so the tour runs first, then session/new
              router.push("/app/dashboard?from=wizard&next=session");
            }}
            className="group relative flex flex-col items-center text-center p-6 rounded-xl border border-gold/30 bg-gold/[0.06] hover:bg-gold/[0.12] hover:border-gold/50 transition-all duration-200 cursor-pointer"
          >
            <Image
              src="/art/icons/potion.png"
              alt=""
              width={48}
              height={48}
              className="pixel-art mb-4 opacity-80 group-hover:opacity-100 transition-opacity"
              aria-hidden="true"
              unoptimized
            />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {t("choose_combat_title")}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("choose_combat_description")}
            </p>
            <span className="mt-2 text-[11px] font-medium text-gold/80">
              {t("choose_combat_recommended")}
            </span>
            <span className="mt-2 text-xs font-medium text-gold opacity-0 group-hover:opacity-100 transition-opacity">
              {t("choose_combat_cta")}
            </span>
          </button>

          {/* Campaign Path — Secondary */}
          <button
            type="button"
            onClick={() => setState((s) => ({ ...s, step: 1 }))}
            className="group relative flex flex-col items-center text-center p-6 rounded-xl border border-border bg-white/[0.03] hover:bg-white/[0.07] hover:border-gold/40 transition-all duration-200 cursor-pointer"
          >
            <Image
              src="/art/icons/carta.png"
              alt=""
              width={48}
              height={48}
              className="pixel-art mb-4 opacity-70 group-hover:opacity-100 transition-opacity"
              aria-hidden="true"
              unoptimized
            />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {t("choose_campaign_title")}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("choose_campaign_description")}
            </p>
            <span className="mt-4 text-xs font-medium text-gold opacity-0 group-hover:opacity-100 transition-opacity">
              {t("choose_campaign_cta")}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ── Express Step (1-screen onboarding for guest_combat) ─────────
  if (state.step === "express" && effectiveSource === "guest_combat") {
    const pcCount = state.players.filter((p) => p.name.trim()).length;
    const defaultEncounterName = t("express_encounter_default");

    async function handleExpressSubmit() {
      if (state.isSubmitting) return;
      const trimmedCampaign = state.campaignName.trim();
      if (!trimmedCampaign) {
        setState((s) => ({ ...s, error: t("campaign_name_required"), fieldErrors: new Set(["campaign-name"]) }));
        return;
      }
      const encName = state.encounterName.trim() || defaultEncounterName;
      setState((s) => ({ ...s, encounterName: encName, isSubmitting: true, error: null }));

      try {
        const token = await createCampaignWithSession({
          campaignName: trimmedCampaign,
          encounterName: encName,
          players: state.players,
        });

        try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* ignore */ }

        setState((s) => ({
          ...s,
          sessionLink: `${window.location.origin}/join/${token}`,
          step: "done",
          isSubmitting: false,
          showCelebration: true,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : t("error_generic");
        setState((s) => ({ ...s, error: message, isSubmitting: false }));
      }
    }

    return (
      <Card className="max-w-lg w-full" data-testid="onboarding-express">
        <CardHeader>
          <Image
            src="/art/icons/carta.png"
            alt=""
            width={48}
            height={48}
            className="pixel-art mx-auto mb-2 opacity-70"
            aria-hidden="true"
            unoptimized
          />
          <CardTitle className="text-center">{t("express_title")}</CardTitle>
          <CardDescription className="text-center">{t("express_description")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Campaign name */}
          <div className="space-y-2">
            <Label htmlFor="express-campaign">{t("campaign_name_label")}</Label>
            <Input
              id="express-campaign"
              value={state.campaignName}
              onChange={(e) => handleCampaignNameChange(e.target.value)}
              placeholder={t("campaign_name_guest_default")}
              maxLength={50}
              autoFocus
              className={state.fieldErrors.has("campaign-name") ? "border-red-500" : ""}
            />
          </div>

          {/* Players preview (read-only) */}
          {pcCount > 0 && (
            <div className="space-y-2">
              <Label>{t("express_players_label", { count: pcCount })}</Label>
              <div className="flex flex-wrap gap-2">
                {state.players.filter((p) => p.name.trim()).map((p) => (
                  <span
                    key={p._id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-3 py-1 text-sm text-foreground"
                  >
                    {p.name}
                    {p.max_hp > 0 && (
                      <span className="text-xs text-muted-foreground">HP {p.max_hp}</span>
                    )}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setState((s) => ({ ...s, step: 2 as WizardStep }))}
                className="text-xs text-gold hover:underline"
              >
                {t("express_edit_players")}
              </button>
            </div>
          )}

          {state.error && (
            <p className="text-sm text-red-400">{state.error}</p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button
            onClick={handleExpressSubmit}
            disabled={state.isSubmitting}
            className="w-full"
            data-testid="express-submit-btn"
          >
            {state.isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
            {t("express_submit")}
          </Button>
          <button
            type="button"
            onClick={() => setState((s) => ({ ...s, step: 1 as WizardStep }))}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("express_customize")}
          </button>
        </CardFooter>
      </Card>
    );
  }

  // ── Render Campaign Wizard (steps 1-4 + done) ───────────────────
  const stepLabels = [t("step_campaign"), t("step_players"), t("step_encounter"), t("step_launch")];

  // Campaign name label/placeholder vary by source
  const campaignNameLabel = t("campaign_name_label");
  const campaignNamePlaceholder = effectiveSource === "guest_combat"
    ? t("campaign_name_guest_default")
    : t("campaign_name_placeholder");

  return (
    <Card className="max-w-lg w-full" data-testid="onboarding-wizard">
      <CardHeader>
        <div className="flex gap-2 mb-2" aria-label="Onboarding progress" role="group">
          {stepLabels.map((label, i) => {
            const num = i + 1;
            const isActive =
              state.step === num || (state.step === "done" && num === 4);
            const isDone =
              (typeof state.step === "number" && state.step > num) ||
              state.step === "done";
            return (
              <div key={label} className="flex items-center gap-1">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isDone
                      ? "bg-green-700 text-foreground"
                      : isActive
                        ? "bg-gold text-foreground"
                        : "bg-white/[0.06] text-muted-foreground"
                  }`}
                >
                  {num}
                </span>
                <span
                  className={`text-xs ${
                    isActive ? "text-gold font-medium" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
                {i < stepLabels.length - 1 && (
                  <span className="text-muted-foreground/60 mx-1">›</span>
                )}
              </div>
            );
          })}
        </div>
        {typeof state.step === "number" && STEP_ICONS[state.step] && (
          <Image
            src={STEP_ICONS[state.step]}
            alt=""
            width={48}
            height={48}
            className="pixel-art mx-auto mb-2 opacity-60"
            aria-hidden="true"
            unoptimized
          />
        )}
        <CardTitle className="text-foreground">
          {state.step === 1 && t("campaign_name_title")}
          {state.step === 2 && t("players_title")}
          {state.step === 3 && t("encounter_title")}
          {state.step === 4 && t("launch_title")}
          {state.step === "done" && t("launch_ready")}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {state.step === 1 && t("campaign_name_description")}
          {state.step === 2 && t("players_description")}
          {state.step === 3 && t("encounter_description")}
          {state.step === 4 && t("launch_description")}
          {state.step === "done" && t("launch_share_description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Step 1: Campaign Name ── */}
        {state.step === 1 && (
          <div className="space-y-2">
            <Label htmlFor="campaign-name" className="text-foreground">
              {campaignNameLabel}
            </Label>
            <Input
              id="campaign-name"
              placeholder={campaignNamePlaceholder}
              value={state.campaignName}
              onChange={(e) => handleCampaignNameChange(e.target.value)}
              maxLength={50}
              className={`bg-white/[0.04] border-border text-foreground placeholder:text-muted-foreground/60${state.fieldErrors.has("campaign-name") ? " field-error" : ""}`}
              aria-invalid={state.fieldErrors.has("campaign-name") || undefined}
              aria-describedby={state.fieldErrors.has("campaign-name") ? "campaign-name-error" : undefined}
              onKeyDown={(e) => e.key === "Enter" && handleStep1Next()}
            />
            <p className="text-xs text-muted-foreground text-right">
              {state.campaignName.length}/50
            </p>
          </div>
        )}

        {/* ── Step 2: Players ── */}
        {state.step === 2 && (
          <div className="space-y-4">
            {state.players.map((player, index) => (
              <div
                key={player._id}
                className="p-3 rounded-lg bg-white/[0.04] border border-border space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t("players_label")} {index + 1}
                  </span>
                  {state.players.length > 1 && (
                    <button
                      onClick={() => handleRemovePlayer(index)}
                      className="text-xs text-red-400 hover:text-red-300"
                      type="button"
                    >
                      {tc("remove")}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label
                      htmlFor={`player-name-${player._id}`}
                      className="text-foreground text-xs"
                    >
                      {t("players_name_label")}
                    </Label>
                    <Input
                      id={`player-name-${player._id}`}
                      placeholder={t("players_name_placeholder")}
                      value={player.name}
                      maxLength={50}
                      onChange={(e) => handlePlayerChange(index, "name", e.target.value)}
                      className={`bg-white/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 h-8 text-sm${state.fieldErrors.has(`player-name-${player._id}`) ? " field-error" : ""}`}
                      aria-invalid={state.fieldErrors.has(`player-name-${player._id}`) || undefined}
                      aria-describedby={state.fieldErrors.has(`player-name-${player._id}`) ? "players-error" : undefined}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`player-hp-${player._id}`}
                      className="text-foreground text-xs"
                    >
                      {t("players_hp_label")}{" "}
                      <span className="text-muted-foreground">{tc("optional")}</span>
                    </Label>
                    <Input
                      id={`player-hp-${player._id}`}
                      type="number"
                      min={1}
                      max={9999}
                      placeholder="10"
                      value={player.max_hp || ""}
                      onChange={(e) => handlePlayerChange(index, "max_hp", e.target.value)}
                      className={`bg-white/[0.04] border-border text-foreground placeholder:text-muted-foreground/40 h-8 text-sm${state.fieldErrors.has(`player-hp-${player._id}`) ? " field-error" : ""}`}
                      aria-invalid={state.fieldErrors.has(`player-hp-${player._id}`) || undefined}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`player-ac-${player._id}`}
                      className="text-foreground text-xs"
                    >
                      {t("players_ac_label")}{" "}
                      <span className="text-muted-foreground">{tc("optional")}</span>
                    </Label>
                    <Input
                      id={`player-ac-${player._id}`}
                      type="number"
                      min={1}
                      max={99}
                      placeholder="10"
                      value={player.ac || ""}
                      onChange={(e) => handlePlayerChange(index, "ac", e.target.value)}
                      className={`bg-white/[0.04] border-border text-foreground placeholder:text-muted-foreground/40 h-8 text-sm${state.fieldErrors.has(`player-ac-${player._id}`) ? " field-error" : ""}`}
                      aria-invalid={state.fieldErrors.has(`player-ac-${player._id}`) || undefined}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label
                      htmlFor={`player-dc-${player._id}`}
                      className="text-foreground text-xs"
                    >
                      {t("players_spell_dc_label")}{" "}
                      <span className="text-muted-foreground">{tc("optional")}</span>
                    </Label>
                    <Input
                      id={`player-dc-${player._id}`}
                      type="number"
                      min={1}
                      max={99}
                      placeholder={tc("dash")}
                      value={player.spell_save_dc ?? ""}
                      onChange={(e) => handlePlayerChange(index, "spell_save_dc", e.target.value)}
                      className={`bg-white/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 h-8 text-sm${state.fieldErrors.has(`player-dc-${player._id}`) ? " field-error" : ""}`}
                      aria-invalid={state.fieldErrors.has(`player-dc-${player._id}`) || undefined}
                    />
                  </div>
                </div>
              </div>
            ))}
            {/* Hint text */}
            <p className="text-xs text-muted-foreground/70 text-center">
              {t("players_hint")}
            </p>
            {state.players.length < MAX_PLAYERS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPlayer}
                className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.1]"
              >
                {t("players_add_another")}
              </Button>
            )}
          </div>
        )}

        {/* ── Step 3: Encounter Name ── */}
        {state.step === 3 && (
          <div className="space-y-2">
            <Label htmlFor="encounter-name" className="text-foreground">
              {t("encounter_name_label")}
            </Label>
            <Input
              id="encounter-name"
              placeholder={t("encounter_name_placeholder")}
              value={state.encounterName}
              onChange={(e) => handleEncounterNameChange(e.target.value)}
              maxLength={50}
              className={`bg-white/[0.04] border-border text-foreground placeholder:text-muted-foreground/60${state.fieldErrors.has("encounter-name") ? " field-error" : ""}`}
              aria-invalid={state.fieldErrors.has("encounter-name") || undefined}
              aria-describedby={state.fieldErrors.has("encounter-name") ? "encounter-name-error" : undefined}
              onKeyDown={(e) => e.key === "Enter" && handleStep3Next()}
            />
            <p className="text-xs text-muted-foreground text-right">
              {state.encounterName.length}/50
            </p>
          </div>
        )}

        {/* ── Step 4: Confirm ── */}
        {state.step === 4 && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-white/[0.04] border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                {t("launch_campaign_label")}
              </p>
              <p className="text-foreground font-medium">{state.campaignName}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.04] border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                {t("launch_players_label")} ({state.players.length})
              </p>
              <ul className="space-y-1">
                {state.players.map((p) => (
                  <li key={p._id} className="text-sm text-foreground/80">
                    {p.name} — HP {p.max_hp || 10} · AC {p.ac || 10}
                    {p.spell_save_dc !== null ? ` · DC ${p.spell_save_dc}` : ""}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.04] border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                {t("launch_encounter_label")}
              </p>
              <p className="text-foreground font-medium">{state.encounterName}</p>
            </div>
          </div>
        )}

        {/* ── Done: Session Link + Celebration ── */}
        {state.step === "done" && state.sessionLink && (
          <div className="space-y-3">
            {/* Gold flash celebration */}
            {state.showCelebration && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-gold/10 border border-gold/30"
                role="status"
                aria-live="polite"
              >
                <CheckCircle className="w-5 h-5 text-gold shrink-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gold">{t("campaign_created")}</p>
              </motion.div>
            )}
            <div className="p-3 rounded-lg bg-white/[0.04] border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                {t("launch_session_link_label")}
              </p>
              <p className="text-sm font-mono text-gold break-all">
                {state.sessionLink}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.1]"
            >
              {t("launch_copy_link")}
            </Button>
            {state.copyError && (
              <p className="text-xs text-red-400" role="alert">{state.copyError}</p>
            )}
            <p className="text-xs text-muted-foreground text-center">
              {t("launch_share_hint")}
            </p>
          </div>
        )}

        {/* Error message */}
        {state.error && (
          <p
            id="form-error"
            className="text-sm text-red-400"
            role="alert"
            aria-live="polite"
          >
            {state.error}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex gap-3 justify-end flex-wrap">
        {state.step === 1 && (
          <>
            <Button
              variant="goldOutline"
              onClick={() => setState((s) => ({ ...s, step: effectiveSource === "guest_combat" ? "welcome" : "choose", error: null }))}
            >
              {tc("back")}
            </Button>
            <Button
              onClick={handleStep1Next}
              disabled={!state.campaignName.trim()}
              variant="gold"
            >
              {tc("next")}
            </Button>
          </>
        )}
        {state.step === 2 && (
          <>
            <Button
              variant="goldOutline"
              onClick={() => setState((s) => ({ ...s, step: 1, error: null }))}
            >
              {tc("back")}
            </Button>
            <Button
              onClick={handleStep2Next}
              disabled={state.players.length === 0}
              variant="gold"
            >
              {tc("next")}
            </Button>
          </>
        )}
        {state.step === 3 && (
          <>
            <Button
              variant="goldOutline"
              onClick={() => setState((s) => ({ ...s, step: 2, error: null }))}
            >
              {tc("back")}
            </Button>
            <Button
              onClick={handleStep3Next}
              disabled={!state.encounterName.trim()}
              variant="gold"
            >
              {tc("next")}
            </Button>
          </>
        )}
        {state.step === 4 && (
          <>
            <Button
              variant="goldOutline"
              onClick={() => setState((s) => ({ ...s, step: 3, error: null }))}
            >
              {tc("back")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={state.isSubmitting}
              variant="gold"
            >
              {state.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("creating")}
                </>
              ) : (
                t("create_button")
              )}
            </Button>
          </>
        )}
        {state.step === "done" && (
          <div className="flex gap-2 w-full flex-col sm:flex-row">
            {effectiveSource === "guest_combat" && (
              <Button
                variant="goldOutline"
                onClick={() => {
                  const imported = typeof window !== "undefined"
                    ? sessionStorage.getItem("imported-encounter-id")
                    : null;
                  if (imported) {
                    router.push(`/app/session/${imported}`);
                  } else {
                    router.push("/app/session/new");
                  }
                }}
              >
                {t("go_back_to_combat")}
              </Button>
            )}
            <Button
              onClick={() => router.push("/app/dashboard?from=wizard")}
              variant="gold"
              className="flex-1 sm:flex-none"
            >
              {t("go_to_dashboard")}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
