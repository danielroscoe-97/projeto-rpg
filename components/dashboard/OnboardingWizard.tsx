"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, CheckCircle, Swords, Shield, Users, Copy, Check, ChevronDown, Mail, Link2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { captureError } from "@/lib/errors/capture";
import { requestXpGrant } from "@/lib/xp/request-xp";
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
import QRCode from "qrcode";
import type { OnboardingSource } from "@/lib/types/database";

const SESSION_STORAGE_KEY = "onboarding-wizard-state";
const PERSIST_DEBOUNCE_MS = 1000;

type UserRole = "player" | "dm" | "both";
type WizardStep = "role" | "welcome" | "choose" | "express" | "player_entry" | "player_waiting" | 1 | 2 | "done";

interface WizardState {
  step: WizardStep;
  campaignName: string;
  /** Set after campaign creation (step 1 → 2 transition) */
  campaignId: string | null;
  joinCode: string | null;
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
  /** Current role from DB — null means role was never set (show role step even with a savedStep) */
  userRole?: string | null;
}

function readSessionStorage(): Partial<WizardState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Restore Set from array
    if (parsed.fieldErrors) parsed.fieldErrors = new Set(parsed.fieldErrors);
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
      campaignId: state.campaignId,
      joinCode: state.joinCode,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // storage unavailable
  }
}

export function OnboardingWizard({ userId, source = "fresh", savedStep, userRole }: OnboardingWizardProps) {
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

  const initialCampaignName = effectiveSource === "guest_combat" ? t("campaign_name_guest_default") : "";

  // Determine initial step: sessionStorage → savedStep → role (new first step)
  const [initialStep] = useState<WizardStep>(() => {
    const ss = readSessionStorage();
    if (ss?.step && ss.step !== "done") {
      if (!userRole && ss.step !== "role") return "role";
      // Legacy steps 3/4 no longer exist → redirect to step 1
      const legacyStep = ss.step as number;
      if (legacyStep === 3 || legacyStep === 4) return 1;
      return ss.step as WizardStep;
    }
    if (savedStep) {
      const num = Number(savedStep);
      const parsed: WizardStep = !isNaN(num) && num >= 1 && num <= 2 ? (num as WizardStep) : (savedStep as WizardStep);
      if (["welcome", "choose", "role", 1, 2].includes(parsed as number | string)) {
        if (!userRole && parsed !== "role") return "role";
        return parsed;
      }
    }
    return "role";
  });

  const [state, setState] = useState<WizardState>(() => {
    const ss = readSessionStorage();
    return {
      step: initialStep,
      campaignName: (ss?.campaignName as string) ?? initialCampaignName,
      campaignId: (ss?.campaignId as string) ?? null,
      joinCode: (ss?.joinCode as string) ?? null,
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
      if (newState.step === "done" || newState.step === "welcome" || newState.step === "role" || newState.step === "player_entry" || newState.step === "player_waiting") return;
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

  async function handleStep1Next() {
    const trimmed = state.campaignName.trim();
    if (!trimmed) {
      setState((s) => ({ ...s, error: t("campaign_name_required"), fieldErrors: new Set(["campaign-name"]) }));
      return;
    }
    if (trimmed.length > 50) {
      setState((s) => ({ ...s, error: t("campaign_name_max"), fieldErrors: new Set(["campaign-name"]) }));
      return;
    }
    // Create campaign and move to step 2 (invite)
    setState((s) => ({ ...s, isSubmitting: true, error: null }));
    try {
      const result = await createCampaign(state.campaignName.trim());
      setState((s) => ({
        ...s,
        campaignId: result.campaignId,
        joinCode: result.joinCode,
        step: 2 as WizardStep,
        isSubmitting: false,
        error: null,
        fieldErrors: new Set<string>(),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("error_generic");
      setState((s) => ({ ...s, error: message, isSubmitting: false }));
    }
  }

  // ── Campaign creation (no session/encounter — campaign-oriented) ─
  async function createCampaign(campaignName: string): Promise<{ campaignId: string; joinCode: string }> {
    const supabase = createClient();

    // 1. Create Campaign (no destructive delete — DM may have existing campaigns)
    const joinCode = crypto.randomUUID().slice(0, 8);
    const { data: campaign, error: campaignErr } = await supabase
      .from("campaigns")
      .insert({ owner_id: userId, name: campaignName, join_code: joinCode, join_code_active: true })
      .select("id")
      .single();
    if (campaignErr || !campaign) {
      captureError(campaignErr, { component: "OnboardingWizard", action: "createCampaign", category: "database" });
      throw new Error(t("error_campaign"));
    }

    // 2. Add DM as campaign member
    const { error: memberErr } = await supabase.from("campaign_members").insert({
      campaign_id: campaign.id,
      user_id: userId,
      role: "dm",
      status: "active",
    });
    if (memberErr) {
      captureError(memberErr, { component: "OnboardingWizard", action: "addDmMember", category: "database" });
      // Non-fatal — campaign exists, DM membership can be added later
    }

    // 3. Mark wizard_completed
    await supabase
      .from("user_onboarding")
      .upsert({ user_id: userId, wizard_completed: true, wizard_step: null }, { onConflict: "user_id" });

    // XP: DM created campaign + completed onboarding
    requestXpGrant("dm_campaign_created", "dm", { campaign_id: campaign.id });
    requestXpGrant("onboarding_completed", "dm");

    return { campaignId: campaign.id, joinCode };
  }

  function handleFinishWizard() {
    try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* ignore */ }
    setState((s) => ({ ...s, step: "done" as WizardStep, showCelebration: true }));
  }

  async function handleCopyJoinLink(): Promise<boolean> {
    if (!state.joinCode) return false;
    const link = `${window.location.origin}/join-campaign/${state.joinCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setState((s) => ({ ...s, copyError: null }));
      return true;
    } catch {
      setState((s) => ({ ...s, copyError: t("launch_copy_error") }));
      return false;
    }
  }

  // ── Role Step (JO-05) ──────────────────────────────────────────────
  // F-01: No pre-selection — force conscious choice. F-04: Pre-select from signup if available.
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(
    userRole === "player" || userRole === "dm" || userRole === "both" ? (userRole as UserRole) : null
  );
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  const ROLE_OPTIONS: { value: UserRole; icon: React.ReactNode; labelKey: string; descKey: string }[] = [
    { value: "player", icon: <Swords className="w-7 h-7" />, labelKey: "role_player", descKey: "role_player_desc" },
    { value: "dm", icon: <Shield className="w-7 h-7" />, labelKey: "role_dm", descKey: "role_dm_desc" },
    { value: "both", icon: <Users className="w-7 h-7" />, labelKey: "role_both", descKey: "role_both_desc" },
  ];

  async function handleRoleContinue() {
    if (!selectedRole) return;
    setRoleSubmitting(true);
    try {
      const supabase = createClient();

      // P2: Check error on role write — server-side ensures users row exists (see onboarding/page.tsx)
      const { error: roleErr } = await supabase
        .from("users")
        .update({ role: selectedRole })
        .eq("id", userId);
      if (roleErr) {
        captureError(roleErr, { component: "OnboardingWizard", action: "saveRole", category: "database" });
        toast.error(t("role_save_error"));
        return;
      }

      // XP: Profile completed (role set)
      const xpRole = selectedRole === "player" ? "player" : "dm";
      requestXpGrant("profile_completed", xpRole as "dm" | "player");

      if (selectedRole === "player") {
        // Check if there's a pending invite/code in localStorage — auto-process it
        try {
          const pendingInvite = localStorage.getItem("pendingInvite");
          const pendingCode = localStorage.getItem("pendingJoinCode");
          if (pendingInvite || pendingCode) {
            // Mark wizard completed and redirect — the dashboard will handle the pending token
            const { error: onboardingErr } = await supabase
              .from("user_onboarding")
              .upsert({ user_id: userId, wizard_completed: true, wizard_step: null }, { onConflict: "user_id" });
            if (onboardingErr) {
              captureError(onboardingErr, { component: "OnboardingWizard", action: "markWizardDone", category: "database" });
              toast.error(t("role_save_error"));
              return;
            }
            router.push("/app/dashboard");
            return;
          }
        } catch { /* localStorage unavailable */ }

        // No pending invite — show player entry step
        setState((s) => ({ ...s, step: "player_entry" }));
        return;
      }

      // DM or Both → skip welcome for fresh users (G-09), keep for guest_combat
      const nextStep = effectiveSource === "guest_combat" ? "welcome" : "choose";
      setState((s) => ({ ...s, step: nextStep }));
    } catch (err) {
      captureError(err, { component: "OnboardingWizard", action: "handleRoleContinue", category: "database" });
      toast.error(t("role_save_error"));
    } finally {
      setRoleSubmitting(false);
    }
  }

  if (state.step === "role") {
    return (
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/art/brand/logo-icon.svg"
            alt=""
            width={56}
            height={56}
            className="mx-auto mb-3 glow-pulse cursor-pointer hover:drop-shadow-[0_0_14px_rgba(212,168,83,0.5)] transition-all duration-300"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {t("role_title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("role_subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {ROLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedRole(option.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 min-h-[120px] ${
                selectedRole === option.value
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/[0.15]"
              }`}
            >
              <span className={selectedRole === option.value ? "text-gold" : "text-muted-foreground"}>
                {option.icon}
              </span>
              <span className="text-sm font-semibold">{t(option.labelKey)}</span>
              <span className="text-[11px] text-muted-foreground leading-tight text-center">
                {t(option.descKey)}
              </span>
            </button>
          ))}
        </div>

        <Button
          onClick={handleRoleContinue}
          disabled={roleSubmitting || !selectedRole}
          variant="gold"
          className="w-full"
        >
          {roleSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("role_continue")}
        </Button>
      </div>
    );
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

  // ── Player Entry Step ────────────────────────────────────────────
  if (state.step === "player_entry") {
    return <PlayerEntryStep userId={userId} router={router} t={t} setState={setState} />;
  }

  // ── Player Waiting Step ─────────────────────────────────────────
  if (state.step === "player_waiting") {
    return (
      <motion.div
        className="w-full max-w-md text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Logo + glow */}
        <motion.div
          className="mx-auto mb-6"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        >
          <img
            src="/art/brand/logo-icon.svg"
            alt="Pocket DM"
            width={64}
            height={64}
            className="mx-auto glow-pulse drop-shadow-[0_0_20px_rgba(212,168,83,0.4)]"
          />
        </motion.div>

        <motion.h1
          className="text-2xl font-bold text-foreground tracking-tight mb-2 font-[family-name:var(--font-cinzel)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {t("player_done_title")}
        </motion.h1>

        <motion.p
          className="text-muted-foreground text-sm mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {t("player_done_subtitle")}
        </motion.p>

        {/* XP reward animation */}
        <motion.div
          className="mb-6 rounded-xl border border-gold/15 bg-gold/[0.02] p-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <motion.p
            className="text-gold text-sm font-semibold mb-2"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.3 }}
          >
            {t("player_done_xp_earned")}
          </motion.p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base leading-none">🗡️</span>
            <span className="text-xs text-foreground/50">{t("player_done_rank")}</span>
          </div>
          {/* XP bar */}
          <div className="relative h-5 rounded-full bg-white/[0.06] border border-white/[0.08] overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light"
              initial={{ width: 0 }}
              animate={{ width: "20%" }}
              transition={{ delay: 1.0, duration: 1.2, ease: "easeOut" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent opacity-60 animate-[shimmer-sweep_2.5s_ease-in-out_infinite]" />
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tabular-nums">
                15 / 75 XP
              </span>
            </div>
          </div>
        </motion.div>

        {/* F-07: Engagement hooks — "While you wait" cards */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.4 }}
        >
          <p className="text-xs text-muted-foreground/70 uppercase tracking-wider text-center font-medium">
            {t("player_done_meanwhile")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/app/compendium"
              className="group flex flex-col items-center text-center p-4 rounded-xl border border-gold/20 bg-gold/[0.04] hover:bg-gold/[0.10] hover:border-gold/40 transition-all duration-200"
            >
              <Image
                src="/art/icons/carta.png"
                alt=""
                width={32}
                height={32}
                className="pixel-art mb-2 opacity-70 group-hover:opacity-100 transition-opacity"
                aria-hidden="true"
                unoptimized
              />
              <span className="text-sm font-semibold text-foreground">{t("player_done_explore_title")}</span>
              <span className="text-[11px] text-muted-foreground mt-1 leading-tight">{t("player_done_explore_desc")}</span>
            </Link>
            <Link
              href="/app/combat/new?quick=true"
              className="group flex flex-col items-center text-center p-4 rounded-xl border border-border bg-white/[0.02] hover:bg-white/[0.06] hover:border-gold/30 transition-all duration-200"
            >
              <Image
                src="/art/icons/potion.png"
                alt=""
                width={32}
                height={32}
                className="pixel-art mb-2 opacity-70 group-hover:opacity-100 transition-opacity"
                aria-hidden="true"
                unoptimized
              />
              <span className="text-sm font-semibold text-foreground">{t("player_done_try_title")}</span>
              <span className="text-[11px] text-muted-foreground mt-1 leading-tight">{t("player_done_try_desc")}</span>
            </Link>
          </div>
          <Button variant="gold" className="w-full" asChild>
            <Link href="/app/dashboard">{t("player_done_dashboard")}</Link>
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  // ── Choose Path (step 0) ─────────────────────────────────────────
  if (state.step === "choose") {
    return (
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <img
            src="/art/brand/logo-icon.svg"
            alt=""
            width={56}
            height={56}
            className="mx-auto mb-3 glow-pulse cursor-pointer hover:drop-shadow-[0_0_14px_rgba(212,168,83,0.5)] transition-all duration-300"
            aria-hidden="true"
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
                  .upsert({ user_id: userId, wizard_completed: true, dashboard_tour_completed: true }, { onConflict: "user_id" });
              } catch { /* best-effort */ }
              // Go straight to combat — skip dashboard tour for quick combat path
              router.push("/app/combat/new");
            }}
            className="group relative flex flex-col items-center text-center p-6 rounded-xl border-2 border-gold/40 bg-gold/[0.06] hover:bg-gold/[0.12] hover:border-gold/60 transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(212,168,83,0.08)] hover:shadow-[0_0_24px_rgba(212,168,83,0.15)]"
          >
            {/* F-05: Recommended badge */}
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider bg-gold text-surface-primary px-3 py-0.5 rounded-full whitespace-nowrap">
              {t("choose_combat_recommended")}
            </span>
            <Image
              src="/art/icons/potion.png"
              alt=""
              width={48}
              height={48}
              className="pixel-art mb-4 opacity-90 group-hover:opacity-100 transition-opacity"
              aria-hidden="true"
              unoptimized
            />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {t("choose_combat_title")}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("choose_combat_description")}
            </p>
            <span className="mt-3 text-xs font-medium text-gold opacity-0 group-hover:opacity-100 transition-opacity">
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

        {/* Player Path — "I received an invite" */}
        <button
          type="button"
          onClick={async () => {
            try {
              const supabase = createClient();
              await supabase
                .from("user_onboarding")
                .upsert({ user_id: userId, source: "fresh", wizard_completed: true, dashboard_tour_completed: true }, { onConflict: "user_id" });
            } catch { /* best-effort */ }
            router.push("/app/dashboard");
          }}
          className="mt-4 w-full text-center py-3 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-transparent hover:border-border"
        >
          {t("choose_player_path")}
        </button>
      </div>
    );
  }

  // ── Express Step (guest_combat → create campaign + go to combat) ─
  if (state.step === "express" && effectiveSource === "guest_combat") {
    async function handleExpressSubmit() {
      if (state.isSubmitting) return;
      const trimmedCampaign = state.campaignName.trim();
      if (!trimmedCampaign) {
        setState((s) => ({ ...s, error: t("campaign_name_required"), fieldErrors: new Set(["campaign-name"]) }));
        return;
      }
      setState((s) => ({ ...s, isSubmitting: true, error: null }));

      try {
        await createCampaign(trimmedCampaign);
        try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* ignore */ }
        router.push("/app/combat/new");
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

  // ── Render Campaign Wizard (steps 1-2 + done) ───────────────────
  const WIZARD_STEPS = [
    { label: t("step_campaign"), internalStep: 1 },
    { label: t("step_invite"), internalStep: 2 },
  ];

  const campaignNameLabel = t("campaign_name_label");
  const campaignNamePlaceholder = effectiveSource === "guest_combat"
    ? t("campaign_name_guest_default")
    : t("campaign_name_placeholder");

  return (
    <Card className="max-w-lg w-full" data-testid="onboarding-wizard">
      <CardHeader>
        {state.step !== "done" ? (
          <>
            <div className="flex gap-2 mb-2" aria-label="Onboarding progress" role="group">
              {WIZARD_STEPS.map(({ label, internalStep }, i) => {
                const isActive =
                  state.step === internalStep;
                const isDone =
                  typeof state.step === "number" && state.step > internalStep;
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
                      {i + 1}
                    </span>
                    <span
                      className={`text-xs ${
                        isActive ? "text-gold font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                    {i < WIZARD_STEPS.length - 1 && (
                      <span className="text-muted-foreground/60 mx-1">›</span>
                    )}
                  </div>
                );
              })}
            </div>
            {state.step === 2 && (
              <Users className="w-12 h-12 mx-auto mb-2 text-gold/60" aria-hidden="true" />
            )}
            <CardTitle className="text-foreground">
              {state.step === 1 && t("campaign_name_title")}
              {state.step === 2 && t("invite_title")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {state.step === 1 && t("campaign_name_description")}
              {state.step === 2 && t("invite_description")}
            </CardDescription>
          </>
        ) : (
          <div className="text-center">
            {/* ── Logo celebration ── */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.1 }}
              className="relative mx-auto mb-3 w-20 h-20"
            >
              <div className="absolute inset-0 rounded-full bg-gold/20 blur-xl animate-pulse pointer-events-none" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/art/brand/logo-icon.svg"
                alt="Pocket DM"
                width={80}
                height={80}
                className="relative drop-shadow-[0_0_24px_rgba(212,168,83,0.5)]"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <CardTitle className="text-foreground text-xl">
                {t("campaign_created_title")}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                {t("campaign_created_description")}
              </CardDescription>
            </motion.div>
          </div>
        )}
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

        {/* ── Step 2: Invite Players (join link + QR) ── */}
        {state.step === 2 && (
          state.joinCode ? (
            <InviteStep
              joinCode={state.joinCode}
              onCopy={handleCopyJoinLink}
              copyError={state.copyError}
              t={t}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("invite_loading")}
            </p>
          )
        )}

        {/* ── Done: XP reward bar ── */}
        {state.step === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            {/* XP reward item: Community */}
            <XpRewardRow
              label={t("xp_community_contribution")}
              points={25}
              delay={0.7}
            />
            {/* XP reward item: DM Rank */}
            <XpRewardRow
              label={t("xp_dm_rank")}
              points={50}
              delay={1.0}
            />
            {/* XP bar */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gold/80">
                  {t("xp_dm_level")}
                </span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4 }}
                  className="text-xs text-muted-foreground"
                >
                  75 / 200 XP
                </motion.span>
              </div>
              <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden relative">
                <motion.div
                  initial={{ width: "5%" }}
                  animate={{ width: "37.5%" }}
                  transition={{ delay: 1.2, duration: 1.2, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-gold/70 via-gold to-amber-400 relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-sweep" />
                </motion.div>
              </div>
            </div>
          </motion.div>
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
              disabled={!state.campaignName.trim() || state.isSubmitting}
              variant="gold"
            >
              {state.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("creating")}
                </>
              ) : (
                tc("next")
              )}
            </Button>
          </>
        )}
        {state.step === 2 && (
          <div className="flex gap-2 w-full flex-col sm:flex-row">
            <Button
              onClick={handleFinishWizard}
              variant="gold"
              className="flex-1"
            >
              {t("invite_done_cta")}
            </Button>
            <Button
              onClick={handleFinishWizard}
              variant="goldOutline"
              className="flex-1"
            >
              {t("invite_skip")}
            </Button>
          </div>
        )}
        {state.step === "done" && (
          <div className="flex flex-col gap-2 w-full">
            <Button
              asChild
              variant="gold"
              className="w-full"
            >
              <Link href="/app/combat/new">
                {t("first_combat_cta")}
              </Link>
            </Button>
            <div className="flex gap-2">
              <Button
                asChild
                variant="goldOutline"
                className="flex-1"
              >
                <Link href={state.campaignId ? `/app/campaigns/${state.campaignId}` : "/app/dashboard"}>
                  {t("configure_campaign_cta")}
                </Link>
              </Button>
              <Button
                asChild
                variant="goldOutline"
                className="flex-1"
              >
                <Link href="/app/dashboard?from=wizard">
                  {t("go_to_dashboard")}
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

// ── InviteStep — Step 2: Join link + QR code ────────────────────────
function InviteStep({
  joinCode,
  onCopy,
  copyError,
  t,
}: {
  joinCode: string;
  onCopy: () => Promise<boolean> | void;
  copyError: string | null;
  t: (key: string) => string;
}) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const joinLink = typeof window !== "undefined"
    ? `${window.location.origin}/join-campaign/${joinCode}`
    : `/join-campaign/${joinCode}`;

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Render QR code
  useEffect(() => {
    if (!joinLink || !qrCanvasRef.current) return;
    QRCode.toCanvas(qrCanvasRef.current, joinLink, {
      width: 180,
      margin: 2,
      color: { dark: "#D4A853", light: "#13131E" },
    }).catch(() => { /* silent fallback */ });
  }, [joinLink]);

  async function handleCopy() {
    const result = onCopy();
    const ok = result instanceof Promise ? await result : true;
    if (ok === false) return;
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Join link card — truncated on mobile, full on desktop */}
      <div className="p-3 rounded-lg bg-white/[0.04] border border-gold/20">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          {t("invite_link_label")}
        </p>
        <p className="text-sm font-mono text-gold break-all hidden sm:block">
          {joinLink}
        </p>
        <p className="text-sm font-mono text-gold sm:hidden select-none">
          .../join-campaign/{joinCode}
        </p>
      </div>

      {/* Copy button */}
      <Button
        type="button"
        variant={copied ? "gold" : "outline"}
        onClick={handleCopy}
        className={`w-full transition-all duration-300 ${
          copied
            ? "border-gold text-surface-primary"
            : "border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.1]"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span
              key="copied"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {t("invite_copied")}
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {t("invite_copy_link")}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      {copyError && (
        <p className="text-xs text-red-400" role="alert">{copyError}</p>
      )}

      {/* QR Code */}
      <div className="flex justify-center">
        <canvas ref={qrCanvasRef} className="rounded-md" />
      </div>

      <p className="text-[11px] text-muted-foreground/60 text-center">
        {t("invite_hint")}
      </p>
    </div>
  );
}

// ── XpRewardRow — Floating +XP animation row ────────────────────────
function XpRewardRow({
  label,
  points,
  delay,
}: {
  label: string;
  points: number;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.04] border border-gold/10"
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <motion.span
        initial={{ opacity: 0, y: 8, scale: 0.6 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: delay + 0.3, type: "spring", stiffness: 300, damping: 15 }}
        className="text-sm font-bold text-gold"
      >
        +{points} XP
      </motion.span>
    </motion.div>
  );
}

// ── Dead code removed: PlayerStep, CelebrationStep (wizard redesigned) ──

// ── PlayerStep — REMOVED (wizard no longer has players step) ────────
// Kept comment for git blame reference. Was at lines 929-1111.

// ── CelebrationStep — REMOVED (replaced by InviteStep) ─────────────
// Kept comment for git blame reference. Was at lines 1113-1296.

// ── PlayerStep + CelebrationStep REMOVED (wizard redesigned) ────────


// ── CelebrationStep — Enhanced "done" step (JO-08) ──────────────────
function CelebrationStep({
  inviteLink,
  showCelebration,
  onCopy,
  copyError,
  t,
}: {
  inviteLink: string;
  showCelebration: boolean;
  onCopy: () => Promise<boolean> | void;
  copyError: string | null;
  t: (key: string) => string;
}) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // P4: Clean up timeout on unmount to avoid state updates on unmounted component
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Render QR code for campaign invite link
  useEffect(() => {
    if (!inviteLink || !qrCanvasRef.current) return;
    QRCode.toCanvas(qrCanvasRef.current, inviteLink, {
      width: 180,
      margin: 2,
      color: { dark: "#D4A853", light: "#13131E" },
    }).catch(() => { /* silent fallback */ });
  }, [inviteLink]);

  async function handleCopy() {
    const result = onCopy();
    // Only show "Copied!" if clipboard succeeded (no copyError after onCopy)
    const ok = result instanceof Promise ? await result : true;
    if (ok === false) return;
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }

  // P1: Memoize particles so positions are stable across re-renders
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.5 + Math.random() * 1,
        size: 4 + Math.random() * 6,
      })),
    [] // computed once on mount
  );

  return (
    <div className="space-y-4 relative">
      {/* Sparkle particles */}
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden -top-8">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: -10, x: `${p.x}%`, scale: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: ["-10%", "120%"],
                scale: [0, 1, 0.8, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: "easeOut",
              }}
              className="absolute"
              style={{ left: `${p.x}%` }}
            >
              <div
                className="rounded-full bg-gold"
                style={{ width: p.size, height: p.size, opacity: 0.8 }}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Celebration title */}
      {showCelebration && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-center py-2"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/art/brand/logo-icon.svg"
              alt="Pocket DM"
              width={56}
              height={56}
              className="mx-auto mb-2 drop-shadow-[0_0_20px_rgba(212,168,83,0.3)]"
            />
          </motion.div>
          <h3 className="text-lg font-bold text-gold">{t("celebration_title")}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t("celebration_subtitle")}</p>
        </motion.div>
      )}

      {/* Campaign invite link card */}
      <div className="p-3 rounded-lg bg-white/[0.04] border border-gold/20">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          {t("launch_invite_link_label")}
        </p>
        <p className="text-sm font-mono text-gold break-all">
          {inviteLink}
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <canvas ref={qrCanvasRef} className="rounded-md" />
      </div>

      {/* Copy button with animated feedback */}
      <Button
        type="button"
        variant={copied ? "gold" : "outline"}
        onClick={handleCopy}
        className={`w-full transition-all duration-300 ${
          copied
            ? "border-gold text-surface-primary"
            : "border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.1]"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span
              key="copied"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {t("launch_copied")}
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {t("launch_copy_link")}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      {copyError && (
        <p className="text-xs text-red-400" role="alert">{copyError}</p>
      )}

      {/* Hint text */}
      <p className="text-[11px] text-muted-foreground/60 text-center">
        {t("launch_invite_hint")}
      </p>

      <p className="text-xs text-muted-foreground text-center">
        {t("launch_share_hint")}
      </p>
    </div>
  );
}

// ── Player Entry Step (extracted component to manage local state) ────
function PlayerEntryStep({
  userId,
  router,
  t,
  setState,
}: {
  userId: string;
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof useTranslations<"onboarding">>;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  const [mode, setMode] = useState<"choose" | "invite" | "code">("choose");
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function parseInviteInput(raw: string): { type: "invite" | "code"; value: string } | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Check for invite URL pattern: /invite/TOKEN or full URL
    const inviteMatch = trimmed.match(/\/invite\/([a-zA-Z0-9_-]+)/);
    if (inviteMatch) return { type: "invite", value: inviteMatch[1] };

    // Check for join-campaign URL pattern
    const joinMatch = trimmed.match(/\/join-campaign\/([a-zA-Z0-9_-]+)/);
    if (joinMatch) return { type: "code", value: joinMatch[1] };

    // Plain code (alphanumeric + hyphens, min 3 chars)
    const codeMatch = trimmed.match(/^[a-zA-Z0-9_-]{3,}$/);
    if (codeMatch) return { type: "code", value: trimmed };

    return null;
  }

  async function markWizardCompleted(): Promise<boolean> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("user_onboarding")
        .upsert({ user_id: userId, wizard_completed: true, wizard_step: null }, { onConflict: "user_id" });
      if (error) {
        captureError(error, { component: "PlayerEntryStep", action: "markWizardDone", category: "database" });
        toast.error(t("role_save_error"));
        return false;
      }
      return true;
    } catch (err) {
      captureError(err, { component: "PlayerEntryStep", action: "markWizardDone", category: "database" });
      toast.error(t("role_save_error"));
      return false;
    }
  }

  async function handleInviteSubmit() {
    const parsed = parseInviteInput(inputValue);
    if (!parsed) {
      setError(t("player_invalid_link"));
      return;
    }
    setSubmitting(true);
    try {
      const ok = await markWizardCompleted();
      if (!ok) return;
      if (parsed.type === "invite") {
        router.push(`/invite/${parsed.value}`);
      } else {
        router.push(`/join-campaign/${parsed.value}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCodeSubmit() {
    const code = inputValue.trim().replace(/[^a-zA-Z0-9_-]/g, "");
    if (!code || code.length < 3) {
      setError(t("player_invalid_link"));
      return;
    }
    setSubmitting(true);
    try {
      const ok = await markWizardCompleted();
      if (!ok) return;
      router.push(`/join-campaign/${encodeURIComponent(code)}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNoInvite() {
    setSubmitting(true);
    try {
      const ok = await markWizardCompleted();
      if (!ok) return;
      setState((s) => ({ ...s, step: "player_waiting" }));
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "invite") {
    return (
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Mail className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-foreground">{t("player_has_invite")}</h1>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); handleInviteSubmit(); }}
          className="space-y-4"
        >
          <Input
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setError(null); }}
            placeholder={t("player_invite_placeholder")}
            autoFocus
            className={error ? "border-red-500" : ""}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" variant="gold" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("player_submit")}
          </Button>
          <button
            type="button"
            onClick={() => { setMode("choose"); setInputValue(""); setError(null); }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {t("role_continue").toLowerCase() === "continuar" ? "Voltar" : "Back"}
          </button>
        </form>
      </div>
    );
  }

  if (mode === "code") {
    return (
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link2 className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-foreground">{t("player_has_code")}</h1>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); handleCodeSubmit(); }}
          className="space-y-4"
        >
          <Input
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setError(null); }}
            placeholder={t("player_code_placeholder")}
            autoFocus
            className={error ? "border-red-500" : ""}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" variant="gold" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("player_submit")}
          </Button>
          <button
            type="button"
            onClick={() => { setMode("choose"); setInputValue(""); setError(null); }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {t("role_continue").toLowerCase() === "continuar" ? "Voltar" : "Back"}
          </button>
        </form>
      </div>
    );
  }

  // mode === "choose" — main selection
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Image
          src="/art/icons/pet-cat.png"
          alt=""
          width={56}
          height={56}
          className="pixel-art mx-auto mb-3 opacity-80"
          aria-hidden="true"
          unoptimized
        />
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {t("player_entry_title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("player_entry_subtitle")}
        </p>
      </div>

      <div className="space-y-3">
        <Button
          variant="gold"
          className="w-full min-h-[48px] text-base"
          onClick={() => setMode("invite")}
        >
          <Mail className="mr-2 w-5 h-5" />
          {t("player_has_invite")}
        </Button>

        <Button
          variant="goldOutline"
          className="w-full min-h-[48px] text-base"
          onClick={() => setMode("code")}
        >
          <Link2 className="mr-2 w-5 h-5" />
          {t("player_has_code")}
        </Button>
      </div>

      <button
        type="button"
        onClick={handleNoInvite}
        disabled={submitting}
        className="mt-6 w-full text-center text-sm text-muted-foreground/70 hover:text-foreground transition-colors flex items-center justify-center gap-1"
      >
        {t("player_no_invite")}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
