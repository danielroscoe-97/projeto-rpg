"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { User, CheckCircle2 } from "lucide-react";
import { captureError } from "@/lib/errors/capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acceptInviteAction } from "@/app/invite/actions";

interface ExistingCharacter {
  id: string;
  name: string;
  race: string | null;
  class: string | null;
  level: number | null;
  max_hp: number;
  ac: number;
  token_url: string | null;
}

interface UnlinkedCharacter {
  id: string;
  name: string;
  max_hp: number;
  ac: number;
}

interface InviteAcceptClientProps {
  inviteId: string;
  campaignId: string;
  campaignName: string;
  dmName: string;
  userId: string;
  token: string;
  existingCharacters: ExistingCharacter[];
  /** DM-created characters in this campaign that have no user_id (available for claim) */
  unlinkedCharacters?: UnlinkedCharacter[];
}

export function InviteAcceptClient({
  inviteId,
  campaignId,
  campaignName,
  dmName,
  userId: _userId,
  token,
  existingCharacters,
  unlinkedCharacters = [],
}: InviteAcceptClientProps) {
  const t = useTranslations("campaign");
  const tc = useTranslations("player");
  const router = useRouter();

  // Priority: claim DM-created chars → pick existing standalone → create new
  const [mode, setMode] = useState<"claim" | "pick" | "create">(
    unlinkedCharacters.length > 0 ? "claim" :
    existingCharacters.length > 0 ? "pick" : "create"
  );
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [claimCharId, setClaimCharId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [hp, setHp] = useState("");
  const [ac, setAc] = useState("");
  const [spellSaveDc, setSpellSaveDc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "claim" && !claimCharId) return;
    if (mode === "pick" && !selectedCharId) return;
    if (mode === "create" && !name.trim()) return;

    setIsSubmitting(true);
    try {
      if (mode === "claim") {
        await acceptInviteAction({
          inviteId,
          campaignId,
          token,
          claimCharacterId: claimCharId!,
        });
      } else if (mode === "pick") {
        await acceptInviteAction({
          inviteId,
          campaignId,
          token,
          existingCharacterId: selectedCharId!,
        });
      } else {
        await acceptInviteAction({
          inviteId,
          campaignId,
          token,
          name: name.trim(),
          maxHp: parseInt(hp) || 10,
          currentHp: parseInt(hp) || 10,
          ac: parseInt(ac) || 10,
          spellSaveDc: spellSaveDc ? parseInt(spellSaveDc) : null,
        });
      }

      toast.success(t("invite_accepted"));
      router.push("/app/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("já foi escolhido") || msg.includes("already chosen")) {
        toast.error(t("invite_claim_already_taken"));
        // Refresh the page to get updated available characters
        window.location.reload();
      } else {
        toast.error(t("invite_error"));
      }
      captureError(err, { component: "InviteAcceptClient", action: "acceptInvite", category: "network" });
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, claimCharId, selectedCharId, name, hp, ac, spellSaveDc, campaignId, inviteId, token, t, router]);

  const inputClass =
    "bg-surface-tertiary border-white/[0.15] text-foreground placeholder:text-muted-foreground/40 min-h-[44px] rounded-lg";

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div className="text-center">
        <h2 className="font-display text-2xl text-foreground tracking-wide mb-2">
          {t("invite_welcome", { campaignName, dmName })}
        </h2>
        <p className="text-muted-foreground text-sm">
          {mode === "claim"
            ? t("invite_claim_subtitle")
            : mode === "pick"
            ? t("invite_pick_subtitle")
            : t("invite_create_subtitle")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        data-testid="invite.picker.form"
        data-mode={mode}
      >
        {/*
          Mode toggles — sr-only proxies for E2E & programmatic switching.
          The user-facing mode switches live below (inline "not listed" /
          "+ Criar personagem novo" links). These proxies always exist (when
          applicable) so specs can target them by a stable testid without
          needing to replicate the conditional chain.
        */}
        {unlinkedCharacters.length > 0 && (
          <button
            type="button"
            onClick={() => { setMode("claim"); setSelectedCharId(null); }}
            data-testid="invite.picker.mode-claim"
            data-active={mode === "claim" ? "true" : "false"}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          >
            claim mode
          </button>
        )}
        {existingCharacters.length > 0 && (
          <button
            type="button"
            onClick={() => { setMode("pick"); setClaimCharId(null); }}
            data-testid="invite.picker.mode-pick"
            data-active={mode === "pick" ? "true" : "false"}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          >
            pick mode
          </button>
        )}
        <button
          type="button"
          onClick={() => { setMode("create"); setClaimCharId(null); setSelectedCharId(null); }}
          data-testid="invite.picker.mode-create"
          data-active={mode === "create" ? "true" : "false"}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        >
          create mode
        </button>

        {/* Claim DM-created characters */}
        {unlinkedCharacters.length > 0 && mode === "claim" && (
          <div className="space-y-2" data-testid="invite.picker.claim-panel">
            <p className="text-xs text-muted-foreground">{t("invite_claim_hint")}</p>
            {unlinkedCharacters.map((char) => {
              const isSelected = claimCharId === char.id;
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => setClaimCharId(char.id)}
                  data-testid={`invite.picker.claim-card-${char.id}`}
                  data-selected={isSelected ? "true" : "false"}
                  className={[
                    "w-full p-3 rounded-lg border text-left transition-colors flex items-center gap-3",
                    isSelected
                      ? "border-gold/60 bg-gold/5"
                      : "border-white/[0.15] bg-surface-tertiary hover:border-white/30",
                  ].join(" ")}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-background border border-white/[0.04] flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">{char.name}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {char.max_hp > 0 && (
                      <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-white/[0.04]">
                        HP {char.max_hp}
                      </span>
                    )}
                    {char.ac > 0 && (
                      <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-white/[0.04]">
                        AC {char.ac}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-gold flex-shrink-0" />
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => { setMode("create"); setClaimCharId(null); }}
              data-testid="invite.picker.claim-not-listed"
              className="w-full p-3 rounded-lg border border-dashed border-white/20 text-muted-foreground text-sm hover:border-white/40 hover:text-foreground transition-colors"
            >
              {t("invite_claim_not_listed")}
            </button>
          </div>
        )}

        {/* Existing character picker */}
        {existingCharacters.length > 0 && mode === "pick" && (
          <div className="space-y-2" data-testid="invite.picker.pick-panel">
            {existingCharacters.map((char) => {
              const subtitle = [char.race, char.class].filter(Boolean).join(" ");
              const isSelected = selectedCharId === char.id;
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => setSelectedCharId(char.id)}
                  data-testid={`invite.picker.character-card-${char.id}`}
                  data-selected={isSelected ? "true" : "false"}
                  className={[
                    "w-full p-3 rounded-lg border text-left transition-colors flex items-center gap-3",
                    isSelected
                      ? "border-gold/60 bg-gold/5"
                      : "border-white/[0.15] bg-surface-tertiary hover:border-white/30",
                  ].join(" ")}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {char.token_url ? (
                      <img
                        src={char.token_url}
                        alt={char.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/40"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-background border border-white/[0.04] flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">{char.name}</p>
                    {(subtitle || char.level) && (
                      <p className="text-muted-foreground text-xs truncate">
                        {[subtitle, char.level ? `Nível ${char.level}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  {/* Stats */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    {char.max_hp > 0 && (
                      <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-white/[0.04]">
                        HP {char.max_hp}
                      </span>
                    )}
                    {char.ac > 0 && (
                      <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-white/[0.04]">
                        AC {char.ac}
                      </span>
                    )}
                  </div>
                  {/* Selected indicator */}
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-gold flex-shrink-0" />
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => { setMode("create"); setSelectedCharId(null); }}
              data-testid="invite.picker.pick-create-new"
              className="w-full p-3 rounded-lg border border-dashed border-white/20 text-muted-foreground text-sm hover:border-white/40 hover:text-foreground transition-colors"
            >
              + Criar personagem novo
            </button>
          </div>
        )}

        {/* New character form */}
        {mode === "create" && (
          <div data-testid="invite.picker.create-panel">
            {(unlinkedCharacters.length > 0 || existingCharacters.length > 0) && (
              <button
                type="button"
                onClick={() => setMode(unlinkedCharacters.length > 0 ? "claim" : "pick")}
                data-testid="invite.picker.back-to-selection"
                className="text-xs text-gold/70 hover:text-gold transition-colors"
              >
                {t("invite_back_to_selection")}
              </button>
            )}

            {/*
              create-wizard-step-1 — Identity (name).
              Today the "create" flow is a single step (not a wizard). We wrap
              in step-1 for forward-compat with Epic 02 Story 02-B, which
              refactors this into a multi-step flow via CharacterWizard.
            */}
            <div className="space-y-1.5" data-testid="invite.picker.create-wizard-step-1">
              <label htmlFor="char-name" className="text-xs text-gold/80 uppercase tracking-widest font-medium">
                {tc("lobby_name_label")}
              </label>
              <Input
                id="char-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tc("lobby_name_placeholder")}
                required
                className={inputClass}
                data-testid="invite.picker.name-input"
              />
              {/*
                Legacy alias span — keeps `[data-testid="invite-char-name"]`
                queryable for existing specs during the migration to the
                namespaced `invite.picker.name-input`. Zero UX impact
                (sr-only, aria-hidden). Delete after all downstream specs
                migrate to the new testid.
              */}
              <span
                data-testid="invite-char-name"
                className="sr-only"
                aria-hidden="true"
              />
            </div>

            <div
              className="grid grid-cols-3 gap-3"
              data-testid="invite.picker.create-wizard-step-2"
            >
              <div className="space-y-1.5">
                <label htmlFor="char-hp" className="text-xs text-gold/80 uppercase tracking-widest font-medium">
                  HP
                </label>
                <Input
                  id="char-hp"
                  type="number"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  placeholder="45"
                  className={inputClass}
                  data-testid="invite.picker.hp-input"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="char-ac" className="text-xs text-gold/80 uppercase tracking-widest font-medium">
                  AC
                </label>
                <Input
                  id="char-ac"
                  type="number"
                  value={ac}
                  onChange={(e) => setAc(e.target.value)}
                  placeholder="16"
                  className={inputClass}
                  data-testid="invite.picker.ac-input"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="char-dc" className="text-xs text-gold/80 uppercase tracking-widest font-medium">
                  DC
                </label>
                <Input
                  id="char-dc"
                  type="number"
                  value={spellSaveDc}
                  onChange={(e) => setSpellSaveDc(e.target.value)}
                  placeholder="15"
                  className={inputClass}
                  data-testid="invite.picker.dc-input"
                />
              </div>
            </div>
          </div>
        )}

        <Button
          type="submit"
          variant="gold"
          className="w-full min-h-[44px]"
          data-testid="invite.picker.confirm-button"
          disabled={
            isSubmitting ||
            (mode === "claim" && !claimCharId) ||
            (mode === "pick" && !selectedCharId) ||
            (mode === "create" && !name.trim())
          }
        >
          {isSubmitting
            ? "..."
            : mode === "claim"
            ? t("invite_claim_submit")
            : mode === "pick"
            ? t("invite_pick_submit")
            : t("create_character_and_join")}
        </Button>
      </form>
    </div>
  );
}
