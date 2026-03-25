"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ConditionBadge } from "@/components/oracle/ConditionBadge";
import type { RulesetVersion } from "@/lib/types/database";
import { Swords } from "lucide-react";

interface PlayerCombatant {
  id: string;
  name: string;
  current_hp: number;
  max_hp: number;
  temp_hp: number;
  ac: number;
  initiative_order: number | null;
  conditions: string[];
  is_defeated: boolean;
  is_player: boolean;
  monster_id: string | null;
  ruleset_version: string | null;
}

/** Inline note input for players to signal the DM (e.g. "concentrating on Bless") */
function PlayerNoteInput({ combatantId, onSubmit }: { combatantId: string; onSubmit: (id: string, note: string) => void }) {
  const t = useTranslations("player");
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const handleSubmit = useCallback(() => {
    if (!value.trim()) return;
    onSubmit(combatantId, value.trim());
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      savedTimerRef.current = null;
      setSaved(false);
    }, 2000);
  }, [combatantId, onSubmit, value]);

  return (
    <div className="mt-2 flex items-center gap-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
        placeholder={t("note_placeholder")}
        className="flex-1 bg-transparent border border-border rounded px-2 py-1.5 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-gold min-h-[36px]"
        maxLength={100}
        data-testid={`player-note-input-${combatantId}`}
      />
      <button
        type="button"
        onClick={handleSubmit}
        className="px-2 py-1.5 text-xs font-medium rounded bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[36px]"
        data-testid={`player-note-send-${combatantId}`}
      >
        {saved ? t("note_sent") : t("note_send")}
      </button>
    </div>
  );
}

function getHpBarColor(current: number, max: number): string {
  if (max === 0) return "bg-gray-500";
  const pct = current / max;
  if (pct > 0.5) return "bg-green-500";
  if (pct > 0.25) return "bg-amber-400";
  return "bg-red-500";
}

function getHpThresholdKey(current: number, max: number): string | null {
  if (max === 0) return null;
  const pct = current / max;
  if (pct > 0.5) return "hp_ok";
  if (pct > 0.25) return "hp_low";
  return "hp_crit";
}

interface PlayerInitiativeBoardProps {
  combatants: PlayerCombatant[];
  currentTurnIndex: number;
  rulesetVersion: RulesetVersion;
  /** Callback when a player edits their own character's note */
  onPlayerNote?: (combatantId: string, note: string) => void;
}

export function PlayerInitiativeBoard({
  combatants,
  currentTurnIndex,
  rulesetVersion,
  onPlayerNote,
}: PlayerInitiativeBoardProps) {
  const t = useTranslations("player");
  const turnRef = useRef<HTMLLIElement | null>(null);

  // Auto-scroll to current turn combatant when turn changes
  useEffect(() => {
    turnRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentTurnIndex]);

  // Separate player characters from others for "own character" highlight
  const playerChars = combatants.filter((c) => c.is_player);
  const hasOwnChar = playerChars.length > 0;

  return (
    <div className="space-y-3">
      {/* Own Character Card(s) — prominent display */}
      {hasOwnChar && (
        <div className="space-y-2">
          {playerChars.map((pc) => {
            const hpPct = pc.max_hp > 0 ? Math.max(0, Math.min(1, pc.current_hp / pc.max_hp)) : 0;
            const hpBarColor = getHpBarColor(pc.current_hp, pc.max_hp);
            const hpThresholdKey = getHpThresholdKey(pc.current_hp, pc.max_hp);
            const hasTempHp = pc.temp_hp > 0;

            return (
              <div
                key={pc.id}
                className="bg-card border-2 border-gold rounded-lg px-4 py-4"
                data-testid={`own-character-${pc.id}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Swords className="w-4 h-4 text-gold select-none" aria-hidden="true" />
                  <span className="text-foreground text-lg font-semibold truncate flex-1">
                    {pc.name}
                  </span>
                  {pc.is_defeated && (
                    <span className="text-xs text-red-400 font-medium">{t("defeated")}</span>
                  )}
                </div>
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground text-xs">{t("hp_label")}</span>
                    <span className="text-foreground text-2xl font-mono font-bold">
                      {pc.current_hp}<span className="text-muted-foreground text-base font-normal"> / {pc.max_hp}</span>
                      {hpThresholdKey && (
                        <span className="text-xs font-mono ml-2 text-muted-foreground">
                          {t(hpThresholdKey)}
                        </span>
                      )}
                    </span>
                  </div>
                  {hasTempHp && (
                    <div className="text-sm text-[#9f7aea] font-mono mb-1">
                      {t("temp_hp", { value: pc.temp_hp })}
                    </div>
                  )}
                  <div
                    className="h-3 bg-white/[0.06] rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={pc.current_hp}
                    aria-valuemin={0}
                    aria-valuemax={pc.max_hp}
                    aria-label={t("hp_aria", { name: pc.name }) + (hpThresholdKey ? ` — ${t(hpThresholdKey)}` : "")}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${hpBarColor}`}
                      style={{ width: `${hpPct * 100}%` }}
                    />
                  </div>
                </div>
                {pc.conditions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2" role="list" aria-label={`${pc.name} conditions`}>
                    {pc.conditions.map((condition) => (
                      <ConditionBadge
                        key={condition}
                        condition={condition}
                        rulesetVersion={(pc.ruleset_version as RulesetVersion) ?? rulesetVersion}
                      />
                    ))}
                  </div>
                )}
                {/* Player note input — players can signal the DM */}
                {onPlayerNote && (
                  <PlayerNoteInput
                    combatantId={pc.id}
                    onSubmit={onPlayerNote}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Initiative Order */}
      <ul
        className="space-y-2"
        role="list"
        aria-label={t("initiative_order")}
        data-testid="player-initiative-board"
      >
        {combatants.map((combatant, index) => {
          const isCurrentTurn = index === currentTurnIndex;
          const hpPct =
            combatant.max_hp > 0
              ? Math.max(0, Math.min(1, combatant.current_hp / combatant.max_hp))
              : 0;
          const hpBarColor = getHpBarColor(combatant.current_hp, combatant.max_hp);
          const hpThresholdKey = getHpThresholdKey(
            combatant.current_hp,
            combatant.max_hp,
          );
          const hasTempHp = combatant.temp_hp > 0;

          return (
            <li
              key={combatant.id}
              ref={isCurrentTurn ? turnRef : undefined}
              className={`bg-card border rounded-lg px-4 py-3 min-h-[64px] transition-colors ${
                isCurrentTurn ? "border-gold bg-gold/5" : "border-border"
              } ${combatant.is_defeated ? "opacity-50" : ""} ${
                combatant.is_player ? "border-gold/40" : ""
              }`}
              role="listitem"
              aria-current={isCurrentTurn ? true : undefined}
              data-testid={`player-combatant-${combatant.id}`}
            >
              {/* Name row */}
              <div className="flex items-center gap-2 mb-2">
                {isCurrentTurn && (
                  <span
                    className="text-gold shrink-0 text-sm leading-none select-none"
                    aria-label={t("current_turn")}
                  >
                    ▶
                  </span>
                )}
                <span className="text-foreground text-sm font-medium flex-1 truncate">
                  {combatant.name}
                  {combatant.is_player && (
                    <span className="text-gold/60 text-xs ml-1">({t("you_label")})</span>
                  )}
                </span>
                {combatant.is_defeated && (
                  <span className="text-xs text-red-400 font-medium shrink-0">
                    {t("defeated")}
                  </span>
                )}
              </div>

              {/* HP bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground text-xs">{t("hp_label")}</span>
                  <span className="text-muted-foreground text-sm font-mono">
                    {combatant.current_hp} / {combatant.max_hp}
                    {hpThresholdKey && (
                      <span className="text-xs font-mono ml-1 text-muted-foreground">
                        {t(hpThresholdKey)}
                      </span>
                    )}
                    {hasTempHp && (
                      <span className="text-[#9f7aea] ml-1 text-xs">
                        {t("temp_hp", { value: combatant.temp_hp })}
                      </span>
                    )}
                  </span>
                </div>
                <div
                  className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={combatant.current_hp}
                  aria-valuemin={0}
                  aria-valuemax={combatant.max_hp}
                  aria-label={t("hp_aria", { name: combatant.name }) + (hpThresholdKey ? ` — ${t(hpThresholdKey)}` : "")}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${hpBarColor}`}
                    style={{ width: `${hpPct * 100}%` }}
                  />
                </div>
              </div>

              {/* Condition badges — min-height for touch targets */}
              {combatant.conditions.length > 0 && (
                <div className="flex flex-wrap gap-1.5" role="list" aria-label={`${combatant.name} conditions`}>
                  {combatant.conditions.map((condition) => (
                    <ConditionBadge
                      key={condition}
                      condition={condition}
                      rulesetVersion={(combatant.ruleset_version as RulesetVersion) ?? rulesetVersion}
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
