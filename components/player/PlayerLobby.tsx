"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Swords, Users } from "lucide-react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

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
}

export function PlayerLobby({
  sessionName,
  joinedPlayers,
  onRegister,
  isRegistered,
  registeredName,
}: PlayerLobbyProps) {
  const t = useTranslations("player");
  const [name, setName] = useState("");
  const [initiative, setInitiative] = useState("");
  const [hp, setHp] = useState("");
  const [ac, setAc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const handleSubmit = useCallback(async () => {
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
      await onRegister({
        name: trimmedName,
        initiative: initVal,
        hp: hpVal && !isNaN(hpVal) && hpVal > 0 ? hpVal : null,
        ac: acVal && !isNaN(acVal) && acVal > 0 ? acVal : null,
      });
    } catch (error) {
      setIsSubmitting(false);
      toast.error(t('registerError'));
      Sentry.captureException(error, {
        tags: { component: 'PlayerLobby', flow: 'player-registration' },
        extra: { sessionName },
      });
    }
  }, [name, initiative, hp, ac, onRegister, t]);

  const inputClass =
    "w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground text-base placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50 min-h-[48px]";

  // Waiting state — player already registered
  if (isRegistered) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm mx-auto w-full space-y-6 text-center">
          <div>
            <h1 className="text-foreground text-xl font-semibold">{sessionName}</h1>
            <p className="text-gold text-sm mt-2 font-medium">
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

  // Registration form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm mx-auto w-full space-y-6">
        <div className="text-center">
          <Swords className="w-8 h-8 text-gold mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-foreground text-xl font-semibold">{t("lobby_title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("lobby_subtitle")}</p>
        </div>

        <div className="space-y-4">
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
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full px-4 py-3 bg-gold text-foreground font-semibold rounded-lg transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] disabled:opacity-50 min-h-[48px] text-base"
          data-testid="lobby-submit"
        >
          {isSubmitting ? "..." : t("lobby_submit")}
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
