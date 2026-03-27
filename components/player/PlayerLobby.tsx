"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Swords, Users } from "lucide-react";
import { toast } from "sonner";
import { captureError } from "@/lib/errors/capture";

interface PrefilledCharacter {
  id: string;
  name: string;
  max_hp: number;
  current_hp: number;
  ac: number;
  spell_save_dc: number | null;
}

interface PlayerLobbyProps {
  sessionName: string;
  /** Players who have already joined (updates via realtime) */
  joinedPlayers: Array<{ id: string; name: string }>;
  /** Called when this player submits their registration */
  onRegister: (data: {
    name: string;
    initiative: number;
    hp: number | null;
    ac: number | null;
  }) => Promise<void>;
  /** Whether this player has already registered */
  isRegistered: boolean;
  /** Name the player registered with */
  registeredName?: string;
  /** Whether combat is already active (late-join mode) */
  isCombatActive?: boolean;
  /** Called when player requests to join active combat (late-join). Returns true if accepted. */
  onLateJoinRequest?: (data: {
    name: string;
    initiative: number;
    hp: number | null;
    ac: number | null;
  }) => Promise<void>;
  /** Late-join state: "idle" | "waiting" | "accepted" | "rejected" */
  lateJoinStatus?: "idle" | "waiting" | "accepted" | "rejected";
  /** Characters the authenticated player has in this campaign (auto-join pre-fill) */
  prefilledCharacters?: PrefilledCharacter[];
}

export function PlayerLobby({
  sessionName,
  joinedPlayers,
  onRegister,
  isRegistered,
  registeredName,
  isCombatActive = false,
  onLateJoinRequest,
  lateJoinStatus = "idle",
  prefilledCharacters,
}: PlayerLobbyProps) {
  const t = useTranslations("player");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    prefilledCharacters?.length === 1 ? prefilledCharacters[0].id : null
  );
  const selectedChar = prefilledCharacters?.find((c) => c.id === selectedCharacterId);

  const [name, setName] = useState(selectedChar?.name ?? "");
  const [initiative, setInitiative] = useState("");
  const [hp, setHp] = useState(selectedChar ? String(selectedChar.max_hp) : "");
  const [ac, setAc] = useState(selectedChar ? String(selectedChar.ac) : "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Set<string>>(new Set());

  // Pre-fill form when character selected
  const handleSelectCharacter = (charId: string) => {
    const char = prefilledCharacters?.find((c) => c.id === charId);
    if (!char) return;
    setSelectedCharacterId(charId);
    setName(char.name);
    setHp(String(char.max_hp));
    setAc(String(char.ac));
  };

  // Original handleSubmit is replaced by handleFormSubmit in the render body

  const inputClass =
    "w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground text-base placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50 min-h-[48px]";

  // Waiting state — player already registered
  if (isRegistered) {
    return (
      <div className="min-h-screen bg-black lg:bg-background flex items-center justify-center p-4">
        <div className="max-w-sm mx-auto w-full space-y-6 text-center">
          <div>
            <h1 className="text-foreground text-2xl lg:text-xl font-semibold">{sessionName}</h1>
            <p className="text-gold text-base lg:text-sm mt-2 font-medium">
              {t("lobby_you_joined", { name: registeredName ?? "" })}
            </p>
          </div>

          {/* Waiting animation */}
          <div className="py-8">
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gold animate-bounce [animation-delay:0ms]" />
              <div className="w-2 h-2 rounded-full bg-gold animate-bounce [animation-delay:150ms]" />
              <div className="w-2 h-2 rounded-full bg-gold animate-bounce [animation-delay:300ms]" />
            </div>
            <p className="text-muted-foreground text-sm mt-4">
              {t("lobby_waiting")}
            </p>
            <p className="text-muted-foreground/50 text-xs mt-1">
              {t("lobby_auto_update")}
            </p>
          </div>

          {/* Players at the table */}
          {joinedPlayers.length > 0 && (
            <div className="bg-card border border-border rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-gold" aria-hidden="true" />
                <span className="text-muted-foreground text-xs">
                  {t("lobby_players_joined", { count: joinedPlayers.length })}
                </span>
              </div>
              <ul className="space-y-1">
                {joinedPlayers.map((p) => (
                  <li key={p.id} className="text-foreground text-sm flex items-center gap-2">
                    <Swords className="w-3 h-3 text-gold/60" aria-hidden="true" />
                    {p.name}
                    {p.name === registeredName && (
                      <span className="text-gold/60 text-xs">({t("you_label")})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Late-join waiting state
  if (lateJoinStatus === "waiting") {
    return (
      <div className="min-h-screen bg-black lg:bg-background flex items-center justify-center p-4">
        <div className="max-w-sm mx-auto w-full space-y-6 text-center">
          <Swords className="w-10 h-10 lg:w-8 lg:h-8 text-gold mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-foreground text-2xl lg:text-xl font-semibold">{sessionName}</h1>
          <div className="py-8">
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gold animate-bounce [animation-delay:0ms]" />
              <div className="w-2 h-2 rounded-full bg-gold animate-bounce [animation-delay:150ms]" />
              <div className="w-2 h-2 rounded-full bg-gold animate-bounce [animation-delay:300ms]" />
            </div>
            <p className="text-muted-foreground text-base lg:text-sm mt-4">
              {t("late_join_waiting")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Late-join rejected state
  if (lateJoinStatus === "rejected") {
    return (
      <div className="min-h-screen bg-black lg:bg-background flex items-center justify-center p-4">
        <div className="max-w-sm mx-auto w-full space-y-6 text-center">
          <Swords className="w-10 h-10 lg:w-8 lg:h-8 text-red-400 mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-foreground text-2xl lg:text-xl font-semibold">{sessionName}</h1>
          <p className="text-red-400 text-base lg:text-sm">{t("late_join_rejected")}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-3 lg:py-2 bg-card border border-border rounded-lg text-foreground text-base lg:text-sm active:bg-white/[0.06] lg:hover:bg-white/[0.06] transition-colors min-h-[48px]"
          >
            {t("late_join_retry")}
          </button>
        </div>
      </div>
    );
  }

  // Registration form (handles both normal and late-join)
  const handleFormSubmit = async () => {
    const trimmedName = name.trim();
    const initVal = parseInt(initiative, 10);
    const newErrors = new Set<string>();

    if (!trimmedName) newErrors.add("name");
    if (!initiative.trim() || isNaN(initVal) || initVal < 1 || initVal > 30) newErrors.add("initiative");

    if (newErrors.size > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors(new Set());
    setIsSubmitting(true);

    try {
      const hpVal = hp.trim() ? parseInt(hp, 10) : null;
      const acVal = ac.trim() ? parseInt(ac, 10) : null;
      const data = {
        name: trimmedName,
        initiative: initVal,
        hp: hpVal && !isNaN(hpVal) && hpVal > 0 ? hpVal : null,
        ac: acVal && !isNaN(acVal) && acVal > 0 ? acVal : null,
      };

      if (isCombatActive && onLateJoinRequest) {
        await onLateJoinRequest(data);
      } else {
        await onRegister(data);
      }
    } catch (error) {
      setIsSubmitting(false);
      toast.error(t('registerError'));
      captureError(error, {
        component: "PlayerLobby",
        action: isCombatActive ? "lateJoinRequest" : "playerRegistration",
        category: "realtime",
        extra: { sessionName },
      });
    }
  };

  return (
    <div className="min-h-screen bg-black lg:bg-background flex items-center justify-center p-4">
      <div className="max-w-sm mx-auto w-full space-y-6">
        <div className="text-center">
          <Swords className="w-10 h-10 lg:w-8 lg:h-8 text-gold mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-foreground text-2xl lg:text-xl font-semibold">
            {isCombatActive ? t("late_join_title") : t("lobby_title")}
          </h1>
          <p className="text-muted-foreground text-base lg:text-sm mt-1">
            {isCombatActive ? t("late_join_info") : t("lobby_subtitle")}
          </p>
          {isCombatActive && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-amber-900/40 text-amber-400 rounded">
              {t("combat_in_progress")}
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* Character selector — shown when player has characters in this campaign */}
          {prefilledCharacters && prefilledCharacters.length > 1 && (
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                {t("auto_join_select_character")}
              </label>
              <div className="grid gap-2">
                {prefilledCharacters.map((char) => (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => handleSelectCharacter(char.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      selectedCharacterId === char.id
                        ? "border-gold bg-gold/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-gold/40"
                    }`}
                    data-testid={`character-select-${char.id}`}
                  >
                    <span className="font-medium text-sm">{char.name}</span>
                    <span className="text-xs text-muted-foreground/60 ml-2">
                      HP {char.max_hp} · CA {char.ac}
                      {char.spell_save_dc ? ` · CD ${char.spell_save_dc}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Auto-join notice when single character pre-filled */}
          {prefilledCharacters && prefilledCharacters.length === 1 && (
            <div className="bg-gold/10 border border-gold/30 rounded-lg px-3 py-2 text-xs text-gold">
              {t("auto_join_prefilled")}
            </div>
          )}

          {/* Name (required) */}
          <div>
            <label htmlFor="lobby-name" className="text-sm font-medium text-foreground block mb-1">
              {t("lobby_name_label")} <span className="text-red-400">*</span>
            </label>
            <input
              id="lobby-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.has("name")) setErrors((prev) => { const n = new Set(prev); n.delete("name"); return n; });
              }}
              placeholder={t("lobby_name_placeholder")}
              maxLength={50}
              className={`${inputClass}${errors.has("name") ? " border-red-400 ring-1 ring-red-400/50" : ""}`}
              aria-invalid={errors.has("name") || undefined}
              autoFocus
              data-testid="lobby-name"
            />
            {errors.has("name") && (
              <p className="text-red-400 text-xs mt-1">{t("lobby_error_name")}</p>
            )}
          </div>

          {/* Initiative (required) */}
          <div>
            <label htmlFor="lobby-init" className="text-sm font-medium text-foreground block mb-1">
              {t("lobby_initiative_label")} <span className="text-red-400">*</span>
            </label>
            <input
              id="lobby-init"
              type="number"
              value={initiative}
              onChange={(e) => {
                setInitiative(e.target.value);
                if (errors.has("initiative")) setErrors((prev) => { const n = new Set(prev); n.delete("initiative"); return n; });
              }}
              placeholder={t("lobby_initiative_placeholder")}
              min={1}
              max={30}
              className={`${inputClass} font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none${errors.has("initiative") ? " border-red-400 ring-1 ring-red-400/50" : ""}`}
              aria-invalid={errors.has("initiative") || undefined}
              data-testid="lobby-initiative"
            />
            {errors.has("initiative") && (
              <p className="text-red-400 text-xs mt-1">{t("lobby_error_initiative")}</p>
            )}
          </div>

          {/* HP (optional) */}
          <div>
            <label htmlFor="lobby-hp" className="text-sm font-medium text-muted-foreground block mb-1">
              {t("lobby_hp_label")}
            </label>
            <input
              id="lobby-hp"
              type="number"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              placeholder={t("lobby_hp_placeholder")}
              min={1}
              className={`${inputClass} font-mono opacity-80 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              data-testid="lobby-hp"
            />
          </div>

          {/* AC (optional) */}
          <div>
            <label htmlFor="lobby-ac" className="text-sm font-medium text-muted-foreground block mb-1">
              {t("lobby_ac_label")}
            </label>
            <input
              id="lobby-ac"
              type="number"
              value={ac}
              onChange={(e) => setAc(e.target.value)}
              placeholder={t("lobby_ac_placeholder")}
              min={1}
              max={30}
              className={`${inputClass} font-mono opacity-80 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              data-testid="lobby-ac"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleFormSubmit}
          disabled={isSubmitting}
          className="w-full px-4 py-4 lg:py-3 bg-gold text-foreground font-semibold rounded-lg transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] disabled:opacity-50 min-h-[48px] text-lg lg:text-base active:scale-[0.98]"
          data-testid="lobby-submit"
        >
          {isSubmitting
            ? "..."
            : isCombatActive
            ? t("late_join_submit")
            : selectedChar
            ? t("auto_join_confirm")
            : t("lobby_submit")}
        </button>

        {/* Players already at the table */}
        {joinedPlayers.length > 0 && (
          <div className="bg-card border border-border rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-gold" aria-hidden="true" />
              <span className="text-muted-foreground text-xs">
                {t("lobby_players_joined", { count: joinedPlayers.length })}
              </span>
            </div>
            <ul className="space-y-1">
              {joinedPlayers.map((p) => (
                <li key={p.id} className="text-foreground text-sm flex items-center gap-2">
                  <Swords className="w-3 h-3 text-gold/60" aria-hidden="true" />
                  {p.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
