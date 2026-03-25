"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
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

const MAX_PLAYERS = 8;

const STEP_ICONS: Record<number, string> = {
  1: "/art/icons/carta.png",          // Create campaign = unfurling a scroll
  2: "/art/icons/team-chibi-1.png",   // Add players = the party assembles
  3: "/art/icons/potion.png",         // Build encounter = prepare for battle
  4: "/art/icons/mvp-crown.png",      // Share link = you're the MVP
};

let _playerIdCounter = 0;
function newPlayer(): PlayerInput {
  return { _id: ++_playerIdCounter, name: "", max_hp: 20, ac: 10, spell_save_dc: null };
}

interface PlayerInput {
  _id: number;
  name: string;
  max_hp: number;
  ac: number;
  spell_save_dc: number | null;
}

type WizardStep = 1 | 2 | 3 | 4 | "done";

interface WizardState {
  step: WizardStep;
  campaignName: string;
  players: PlayerInput[];
  encounterName: string;
  sessionLink: string | null;
  isSubmitting: boolean;
  error: string | null;
  copyError: string | null;
}

interface OnboardingWizardProps {
  userId: string;
}

export function OnboardingWizard({ userId }: OnboardingWizardProps) {
  const router = useRouter();
  const [state, setState] = useState<WizardState>({
    step: 1,
    campaignName: "",
    players: [newPlayer()],
    encounterName: "First Encounter",
    sessionLink: null,
    isSubmitting: false,
    error: null,
    copyError: null,
  });

  // ── Step 1 ────────────────────────────────────────────────────────
  function handleCampaignNameChange(value: string) {
    setState((s) => ({ ...s, campaignName: value, error: null }));
  }

  function handleStep1Next() {
    const trimmed = state.campaignName.trim();
    if (!trimmed) {
      setState((s) => ({ ...s, error: "Campaign name is required." }));
      return;
    }
    if (trimmed.length > 50) {
      setState((s) => ({ ...s, error: "Campaign name must be 50 characters or fewer." }));
      return;
    }
    setState((s) => ({ ...s, step: 2, error: null }));
  }

  // ── Step 2 ────────────────────────────────────────────────────────
  function handlePlayerChange(
    index: number,
    field: keyof PlayerInput,
    value: string
  ) {
    setState((s) => {
      const updated = s.players.map((p, i) => {
        if (i !== index) return p;
        if (field === "name") return { ...p, name: value };
        if (field === "spell_save_dc")
          return { ...p, spell_save_dc: value === "" ? null : parseInt(value, 10) };
        return { ...p, [field]: parseInt(value, 10) };
      });
      return { ...s, players: updated, error: null };
    });
  }

  function handleAddPlayer() {
    if (state.players.length >= MAX_PLAYERS) return;
    setState((s) => ({ ...s, players: [...s.players, newPlayer()] }));
  }

  function handleRemovePlayer(index: number) {
    setState((s) => ({
      ...s,
      players: s.players.filter((_, i) => i !== index),
    }));
  }

  function handleStep2Next() {
    for (const p of state.players) {
      if (!p.name.trim()) {
        setState((s) => ({ ...s, error: "All players need a name, HP, and AC." }));
        return;
      }
      if (!p.max_hp || isNaN(p.max_hp) || p.max_hp <= 0 || p.max_hp > 9999) {
        setState((s) => ({ ...s, error: "All players need a name, HP, and AC." }));
        return;
      }
      if (!p.ac || isNaN(p.ac) || p.ac <= 0 || p.ac > 99) {
        setState((s) => ({ ...s, error: "All players need a name, HP, and AC." }));
        return;
      }
      if (
        p.spell_save_dc !== null &&
        (isNaN(p.spell_save_dc) || p.spell_save_dc <= 0 || p.spell_save_dc > 99)
      ) {
        setState((s) => ({
          ...s,
          error: "Spell save DC must be between 1 and 99 if provided.",
        }));
        return;
      }
    }
    setState((s) => ({ ...s, step: 3, error: null }));
  }

  // ── Step 3 ────────────────────────────────────────────────────────
  function handleEncounterNameChange(value: string) {
    setState((s) => ({ ...s, encounterName: value, error: null }));
  }

  function handleStep3Next() {
    const trimmed = state.encounterName.trim();
    if (!trimmed) {
      setState((s) => ({ ...s, error: "Encounter name is required." }));
      return;
    }
    if (trimmed.length > 50) {
      setState((s) => ({ ...s, error: "Encounter name must be 50 characters or fewer." }));
      return;
    }
    setState((s) => ({ ...s, step: 4, error: null }));
  }

  // ── Step 4 submit ─────────────────────────────────────────────────
  async function handleSubmit() {
    if (state.isSubmitting) return;
    setState((s) => ({ ...s, isSubmitting: true, error: null }));
    const supabase = createClient();
    const campaignName = state.campaignName.trim();
    const encounterName = state.encounterName.trim();

    try {
      // 1. Create Campaign
      const { data: campaign, error: campaignErr } = await supabase
        .from("campaigns")
        .insert({ owner_id: userId, name: campaignName })
        .select("id")
        .single();
      if (campaignErr || !campaign)
        throw new Error("Failed to create campaign. Please try again.");

      // 2. Insert PlayerCharacters
      const characters = state.players.map((p) => ({
        campaign_id: campaign.id,
        name: p.name.trim(),
        max_hp: p.max_hp,
        current_hp: p.max_hp,
        ac: p.ac,
        spell_save_dc: p.spell_save_dc ?? null,
      }));
      const { error: pcErr } = await supabase
        .from("player_characters")
        .insert(characters);
      if (pcErr)
        throw new Error("Failed to save player characters. Please try again.");

      // 3. Create Session
      const { data: session, error: sessionErr } = await supabase
        .from("sessions")
        .insert({
          campaign_id: campaign.id,
          owner_id: userId,
          name: `${campaignName} - Session 1`,
          ruleset_version: "2014" as const,
          is_active: true,
        })
        .select("id")
        .single();
      if (sessionErr || !session)
        throw new Error("Failed to create session. Please try again.");

      // 4. Create Encounter (named by DM in Step 3)
      const { error: encErr } = await supabase.from("encounters").insert({
        session_id: session.id,
        name: encounterName,
        is_active: true,
      });
      if (encErr)
        throw new Error("Failed to create encounter. Please try again.");

      // 5. Generate Session Token
      const token = crypto.randomUUID();
      const { error: tokenErr } = await supabase
        .from("session_tokens")
        .insert({ session_id: session.id, token, is_active: true });
      if (tokenErr)
        throw new Error("Failed to generate session link. Please try again.");

      setState((s) => ({
        ...s,
        sessionLink: `/join/${token}`,
        step: "done",
        isSubmitting: false,
      }));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setState((s) => ({ ...s, error: message, isSubmitting: false }));
    }
  }

  async function handleCopyLink() {
    if (!state.sessionLink) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${state.sessionLink}`
      );
      setState((s) => ({ ...s, copyError: null }));
    } catch {
      setState((s) => ({
        ...s,
        copyError: "Could not copy — please copy the link manually.",
      }));
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  const stepLabels = ["Campaign", "Players", "Encounter", "Launch"];

  return (
    <Card className="max-w-lg w-full">
      <CardHeader>
        <div className="flex gap-2 mb-2" aria-label="Onboarding progress">
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
          {state.step === 1 && "Name your campaign"}
          {state.step === 2 && "Add your players"}
          {state.step === 3 && "Set up your first encounter"}
          {state.step === 4 && "Ready to launch"}
          {state.step === "done" && "You're all set!"}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {state.step === 1 &&
            "Give your group a name — you can change it later."}
          {state.step === 2 &&
            "Add your players. HP and AC are required; spell save DC is optional."}
          {state.step === 3 && "Name the first encounter your group will face."}
          {state.step === 4 && "Review your setup and create your first session."}
          {state.step === "done" && "Share the link below with your players."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Step 1: Campaign Name ── */}
        {state.step === 1 && (
          <div className="space-y-2">
            <Label htmlFor="campaign-name" className="text-foreground">
              Campaign name
            </Label>
            <Input
              id="campaign-name"
              placeholder="e.g. Curse of Strahd"
              value={state.campaignName}
              onChange={(e) => handleCampaignNameChange(e.target.value)}
              maxLength={50}
              className="bg-white/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
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
                    Player {index + 1}
                  </span>
                  {state.players.length > 1 && (
                    <button
                      onClick={() => handleRemovePlayer(index)}
                      className="text-xs text-red-400 hover:text-red-300"
                      type="button"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label
                      htmlFor={`player-name-${player._id}`}
                      className="text-foreground text-xs"
                    >
                      Character name *
                    </Label>
                    <Input
                      id={`player-name-${player._id}`}
                      placeholder="e.g. Thorin"
                      value={player.name}
                      maxLength={50}
                      onChange={(e) =>
                        handlePlayerChange(index, "name", e.target.value)
                      }
                      className="bg-white/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`player-hp-${player._id}`}
                      className="text-foreground text-xs"
                    >
                      Max HP *
                    </Label>
                    <Input
                      id={`player-hp-${player._id}`}
                      type="number"
                      min={1}
                      max={9999}
                      value={player.max_hp}
                      onChange={(e) =>
                        handlePlayerChange(index, "max_hp", e.target.value)
                      }
                      className="bg-white/[0.04] border-border text-foreground h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`player-ac-${player._id}`}
                      className="text-foreground text-xs"
                    >
                      AC *
                    </Label>
                    <Input
                      id={`player-ac-${player._id}`}
                      type="number"
                      min={1}
                      max={99}
                      value={player.ac}
                      onChange={(e) =>
                        handlePlayerChange(index, "ac", e.target.value)
                      }
                      className="bg-white/[0.04] border-border text-foreground h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label
                      htmlFor={`player-dc-${player._id}`}
                      className="text-foreground text-xs"
                    >
                      Spell save DC{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id={`player-dc-${player._id}`}
                      type="number"
                      min={1}
                      max={99}
                      placeholder="—"
                      value={player.spell_save_dc ?? ""}
                      onChange={(e) =>
                        handlePlayerChange(
                          index,
                          "spell_save_dc",
                          e.target.value
                        )
                      }
                      className="bg-white/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
            {state.players.length < MAX_PLAYERS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPlayer}
                className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.1]"
              >
                + Add another player
              </Button>
            )}
          </div>
        )}

        {/* ── Step 3: Encounter Name ── */}
        {state.step === 3 && (
          <div className="space-y-2">
            <Label htmlFor="encounter-name" className="text-foreground">
              Encounter name
            </Label>
            <Input
              id="encounter-name"
              placeholder="e.g. Goblin Ambush"
              value={state.encounterName}
              onChange={(e) => handleEncounterNameChange(e.target.value)}
              maxLength={50}
              className="bg-white/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
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
                Campaign
              </p>
              <p className="text-foreground font-medium">{state.campaignName}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.04] border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Players ({state.players.length})
              </p>
              <ul className="space-y-1">
                {state.players.map((p) => (
                  <li key={p._id} className="text-sm text-foreground/80">
                    {p.name} — HP {p.max_hp} · AC {p.ac}
                    {p.spell_save_dc !== null ? ` · DC ${p.spell_save_dc}` : ""}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.04] border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                First Encounter
              </p>
              <p className="text-foreground font-medium">{state.encounterName}</p>
            </div>
          </div>
        )}

        {/* ── Done: Session Link ── */}
        {state.step === "done" && state.sessionLink && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-white/[0.04] border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Session link
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
              Copy link
            </Button>
            {state.copyError && (
              <p className="text-xs text-red-400">{state.copyError}</p>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Share this link with players — they&apos;ll be able to join once
              the player view is ready.
            </p>
          </div>
        )}

        {/* Error message */}
        {state.error && (
          <p className="text-sm text-red-400" role="alert">
            {state.error}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex gap-3 justify-end">
        {state.step === 1 && (
          <Button
            onClick={handleStep1Next}
            disabled={!state.campaignName.trim()}
            variant="gold"
          >
            Next
          </Button>
        )}
        {state.step === 2 && (
          <>
            <Button
              variant="goldOutline"
              onClick={() => setState((s) => ({ ...s, step: 1, error: null }))}
            >
              Back
            </Button>
            <Button
              onClick={handleStep2Next}
              disabled={state.players.length === 0}
              variant="gold"
            >
              Next
            </Button>
          </>
        )}
        {state.step === 3 && (
          <>
            <Button
              variant="goldOutline"
              onClick={() => setState((s) => ({ ...s, step: 2, error: null }))}
            >
              Back
            </Button>
            <Button
              onClick={handleStep3Next}
              disabled={!state.encounterName.trim()}
              variant="gold"
            >
              Next
            </Button>
          </>
        )}
        {state.step === 4 && (
          <>
            <Button
              variant="goldOutline"
              onClick={() => setState((s) => ({ ...s, step: 3, error: null }))}
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={state.isSubmitting}
              variant="gold"
            >
              {state.isSubmitting ? "Creating…" : "Create & Get Session Link"}
            </Button>
          </>
        )}
        {state.step === "done" && (
          <Button
            onClick={() => router.push("/app/dashboard")}
            variant="gold"
          >
            Go to Dashboard
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
