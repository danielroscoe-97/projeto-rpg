"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

interface PlayerInput {
  name: string;
  max_hp: number;
  ac: number;
  spell_save_dc: number | null;
}

type WizardStep = 1 | 2 | 3 | "done";

interface WizardState {
  step: WizardStep;
  campaignName: string;
  players: PlayerInput[];
  sessionLink: string | null;
  isSubmitting: boolean;
  error: string | null;
}

const EMPTY_PLAYER: PlayerInput = {
  name: "",
  max_hp: 20,
  ac: 10,
  spell_save_dc: null,
};

interface OnboardingWizardProps {
  userId: string;
}

export function OnboardingWizard({ userId }: OnboardingWizardProps) {
  const router = useRouter();
  const [state, setState] = useState<WizardState>({
    step: 1,
    campaignName: "",
    players: [{ ...EMPTY_PLAYER }],
    sessionLink: null,
    isSubmitting: false,
    error: null,
  });

  // ── Step 1 handlers ──────────────────────────────────────────────
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
      setState((s) => ({
        ...s,
        error: "Campaign name must be 50 characters or fewer.",
      }));
      return;
    }
    setState((s) => ({ ...s, step: 2, error: null }));
  }

  // ── Step 2 handlers ──────────────────────────────────────────────
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
          return { ...p, spell_save_dc: value === "" ? null : Number(value) };
        return { ...p, [field]: Number(value) };
      });
      return { ...s, players: updated, error: null };
    });
  }

  function handleAddPlayer() {
    setState((s) => ({
      ...s,
      players: [...s.players, { ...EMPTY_PLAYER }],
    }));
  }

  function handleRemovePlayer(index: number) {
    setState((s) => ({
      ...s,
      players: s.players.filter((_, i) => i !== index),
    }));
  }

  function handleStep2Next() {
    const valid = state.players.every(
      (p) => p.name.trim() && p.max_hp > 0 && p.ac > 0
    );
    if (!valid) {
      setState((s) => ({
        ...s,
        error: "All players need a name, HP, and AC.",
      }));
      return;
    }
    setState((s) => ({ ...s, step: 3, error: null }));
  }

  // ── Step 3 submit ─────────────────────────────────────────────────
  async function handleSubmit() {
    setState((s) => ({ ...s, isSubmitting: true, error: null }));
    const supabase = createClient();
    const campaignName = state.campaignName.trim();

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
      if (pcErr) throw new Error("Failed to save player characters. Please try again.");

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

      // 4. Create Encounter
      const { error: encErr } = await supabase.from("encounters").insert({
        session_id: session.id,
        name: "First Encounter",
        is_active: true,
      });
      if (encErr) throw new Error("Failed to create encounter. Please try again.");

      // 5. Generate Session Token
      const token = crypto.randomUUID();
      const { error: tokenErr } = await supabase
        .from("session_tokens")
        .insert({ session_id: session.id, token, is_active: true });
      if (tokenErr)
        throw new Error("Failed to generate session link. Please try again.");

      const link = `/join/${token}`;
      setState((s) => ({
        ...s,
        sessionLink: link,
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
    const url = `${window.location.origin}${state.sessionLink}`;
    await navigator.clipboard.writeText(url);
  }

  // ── Render ────────────────────────────────────────────────────────
  const stepLabels = ["Campaign", "Players", "Launch"];

  return (
    <Card className="max-w-lg w-full bg-[#16213e] border-white/10 text-white">
      <CardHeader>
        {/* Step indicator */}
        <div className="flex gap-2 mb-2" aria-label="Onboarding progress">
          {stepLabels.map((label, i) => {
            const num = i + 1;
            const isActive =
              state.step === num || (state.step === "done" && num === 3);
            const isDone =
              (typeof state.step === "number" && state.step > num) ||
              state.step === "done";
            return (
              <div key={label} className="flex items-center gap-1">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isDone
                      ? "bg-green-700 text-white"
                      : isActive
                        ? "bg-[#e94560] text-white"
                        : "bg-white/10 text-white/50"
                  }`}
                >
                  {num}
                </span>
                <span
                  className={`text-xs ${
                    isActive
                      ? "text-[#e94560] font-medium"
                      : "text-white/50"
                  }`}
                >
                  {label}
                </span>
                {i < stepLabels.length - 1 && (
                  <span className="text-white/20 mx-1">›</span>
                )}
              </div>
            );
          })}
        </div>
        <CardTitle className="text-white">
          {state.step === 1 && "Name your campaign"}
          {state.step === 2 && "Add your players"}
          {state.step === 3 && "Ready to launch"}
          {state.step === "done" && "You're all set!"}
        </CardTitle>
        <CardDescription className="text-white/60">
          {state.step === 1 &&
            "Give your group a name — you can change it later."}
          {state.step === 2 &&
            "Add your players. HP and AC are required; spell save DC is optional."}
          {state.step === 3 && "Review your setup and create your first session."}
          {state.step === "done" && "Share the link below with your players."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Step 1: Campaign Name ── */}
        {state.step === 1 && (
          <div className="space-y-2">
            <Label htmlFor="campaign-name" className="text-white">
              Campaign name
            </Label>
            <Input
              id="campaign-name"
              placeholder="e.g. Curse of Strahd"
              value={state.campaignName}
              onChange={(e) => handleCampaignNameChange(e.target.value)}
              maxLength={50}
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
              onKeyDown={(e) => e.key === "Enter" && handleStep1Next()}
            />
            <p className="text-xs text-white/40 text-right">
              {state.campaignName.length}/50
            </p>
          </div>
        )}

        {/* ── Step 2: Players ── */}
        {state.step === 2 && (
          <div className="space-y-4">
            {state.players.map((player, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white/70">
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
                      htmlFor={`player-name-${index}`}
                      className="text-white text-xs"
                    >
                      Character name *
                    </Label>
                    <Input
                      id={`player-name-${index}`}
                      placeholder="e.g. Thorin"
                      value={player.name}
                      onChange={(e) =>
                        handlePlayerChange(index, "name", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`player-hp-${index}`}
                      className="text-white text-xs"
                    >
                      Max HP *
                    </Label>
                    <Input
                      id={`player-hp-${index}`}
                      type="number"
                      min={1}
                      value={player.max_hp}
                      onChange={(e) =>
                        handlePlayerChange(index, "max_hp", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`player-ac-${index}`}
                      className="text-white text-xs"
                    >
                      AC *
                    </Label>
                    <Input
                      id={`player-ac-${index}`}
                      type="number"
                      min={1}
                      value={player.ac}
                      onChange={(e) =>
                        handlePlayerChange(index, "ac", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label
                      htmlFor={`player-dc-${index}`}
                      className="text-white text-xs"
                    >
                      Spell save DC{" "}
                      <span className="text-white/40">(optional)</span>
                    </Label>
                    <Input
                      id={`player-dc-${index}`}
                      type="number"
                      min={1}
                      placeholder="—"
                      value={player.spell_save_dc ?? ""}
                      onChange={(e) =>
                        handlePlayerChange(
                          index,
                          "spell_save_dc",
                          e.target.value
                        )
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPlayer}
              className="w-full border-white/20 text-white/70 hover:text-white hover:bg-white/10"
            >
              + Add another player
            </Button>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {state.step === 3 && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">
                Campaign
              </p>
              <p className="text-white font-medium">{state.campaignName}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/50 uppercase tracking-wide mb-2">
                Players ({state.players.length})
              </p>
              <ul className="space-y-1">
                {state.players.map((p, i) => (
                  <li key={i} className="text-sm text-white/80">
                    {p.name} — HP {p.max_hp} · AC {p.ac}
                    {p.spell_save_dc ? ` · DC ${p.spell_save_dc}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── Done: Session Link ── */}
        {state.step === "done" && state.sessionLink && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/50 uppercase tracking-wide mb-2">
                Session link
              </p>
              <p className="text-sm font-mono text-[#e94560] break-all">
                {typeof window !== "undefined"
                  ? `${window.location.origin}${state.sessionLink}`
                  : state.sessionLink}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="w-full border-white/20 text-white/70 hover:text-white hover:bg-white/10"
            >
              Copy link
            </Button>
            <p className="text-xs text-white/40 text-center">
              Share this link with players — the player view will be available
              in a future update.
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
            className="bg-[#e94560] hover:bg-[#c73652] text-white"
          >
            Next
          </Button>
        )}
        {state.step === 2 && (
          <>
            <Button
              variant="outline"
              onClick={() => setState((s) => ({ ...s, step: 1, error: null }))}
              className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
            >
              Back
            </Button>
            <Button
              onClick={handleStep2Next}
              disabled={state.players.length === 0}
              className="bg-[#e94560] hover:bg-[#c73652] text-white"
            >
              Next
            </Button>
          </>
        )}
        {state.step === 3 && (
          <>
            <Button
              variant="outline"
              onClick={() => setState((s) => ({ ...s, step: 2, error: null }))}
              className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={state.isSubmitting}
              className="bg-[#e94560] hover:bg-[#c73652] text-white"
            >
              {state.isSubmitting ? "Creating…" : "Create & Get Session Link"}
            </Button>
          </>
        )}
        {state.step === "done" && (
          <Button
            onClick={() => router.push("/app/dashboard")}
            className="bg-[#e94560] hover:bg-[#c73652] text-white"
          >
            Go to Dashboard
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
