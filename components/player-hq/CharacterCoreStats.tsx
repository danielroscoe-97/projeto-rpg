"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Shield, Zap, Footprints, Sparkles } from "lucide-react";
import { isPlayerHqV2Enabled } from "@/lib/flags/player-hq-v2";
import { profBonusForLevel } from "@/lib/constants/dnd-skills";
import { AbilityChip } from "@/components/player-hq/v2/AbilityChip";
import type { Ability } from "@/lib/utils/dice-roller";
import type { CharacterProficiencies } from "@/lib/types/database";

/**
 * Ability score row mapping. The `key` matches the field name on
 * `CharacterStatus` (note `int_score` / `cha_score` instead of `int` / `cha`
 * to avoid the JS reserved-word + readability collision); the `ability`
 * field is the canonical 3-letter code used by `AbilityChip` and the
 * proficiency map (which mirrors `lib/constants/dnd-skills.ts`).
 */
const ABILITY_SCORES = [
  { key: "str", label: "STR", ability: "str" },
  { key: "dex", label: "DEX", ability: "dex" },
  { key: "con", label: "CON", ability: "con" },
  { key: "int_score", label: "INT", ability: "int" },
  { key: "wis", label: "WIS", ability: "wis" },
  { key: "cha_score", label: "CHA", ability: "cha" },
] as const satisfies ReadonlyArray<{ key: string; label: string; ability: Ability }>;

type AbilityKey = (typeof ABILITY_SCORES)[number]["key"];

function getModifier(score: number | null): string {
  if (score == null) return "—";
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

interface CharacterCoreStatsProps {
  ac: number;
  initiativeBonus: number | null;
  speed: number | null;
  inspiration: boolean;
  spellSaveDc: number | null;
  str: number | null;
  dex: number | null;
  con: number | null;
  intScore: number | null;
  wis: number | null;
  chaScore: number | null;
  onToggleInspiration: () => void;
  /**
   * V2-only optional context. When `isPlayerHqV2Enabled()` AND these are
   * provided, the 6 ability cells render as interactive `AbilityChip`
   * components with CHK + SAVE roll buttons. When omitted (or V1), the
   * legacy static cells render — preserving backward compatibility for
   * any caller that hasn't been updated yet.
   *
   * `proficiencies` drives the save proficiency dot; `level` drives the
   * proficiency bonus; the remaining fields drive the broadcast payload.
   */
  proficiencies?: CharacterProficiencies | null;
  level?: number | null;
  /** Campaign id for the broadcast topic (Auth-only context). */
  campaignId?: string | null;
  /** Character id for sessionStorage history + broadcast payload. */
  characterId?: string | null;
  /** Character display name for the broadcast payload. */
  characterName?: string | null;
}

export function CharacterCoreStats({
  ac,
  initiativeBonus,
  speed,
  inspiration,
  spellSaveDc,
  str,
  dex,
  con,
  intScore,
  wis,
  chaScore,
  onToggleInspiration,
  proficiencies = null,
  level = null,
  campaignId = null,
  characterId = null,
  characterName = null,
}: CharacterCoreStatsProps) {
  const t = useTranslations("player_hq.sheet");
  // Localized strings for the AbilityChip toast + aria-label + menu. Pulled
  // from `player_hq.ability_chip` so PT-BR users see proper translations
  // instead of the EN defaults baked into AbilityChip.tsx.
  const tChip = useTranslations("player_hq.ability_chip");
  // Memo so AbilityChip's prop identity is stable across re-renders — useful
  // when the chip's effects depend on label identity (none today, but cheap
  // to keep tidy + it avoids spurious downstream re-renders).
  const toastLabels = useMemo(
    () => ({
      checkLabel: tChip("check_verb"),
      saveLabel: tChip("save_verb"),
      advantageLabel: tChip("with_advantage"),
      disadvantageLabel: tChip("with_disadvantage"),
    }),
    [tChip],
  );
  const chipLabels = useMemo(
    () => ({
      rollVerb: tChip("roll_verb"),
      checkAriaSuffix: tChip("check_aria_suffix"),
      saveAriaSuffix: tChip("save_aria_suffix"),
      withProficiency: tChip("with_proficiency"),
      modifierLabel: tChip("modifier_label"),
      advantage: tChip("menu_advantage"),
      disadvantage: tChip("menu_disadvantage"),
      normal: tChip("menu_normal"),
      manualModifierMenu: tChip("manual_modifier_menu"),
      manualModifierLabel: tChip("manual_modifier_label"),
      manualModifierApply: tChip("manual_modifier_apply"),
      manualModifierCancel: tChip("manual_modifier_cancel"),
      manualModifierInputAria: tChip("manual_modifier_input_aria"),
      saveProficientAria: tChip("save_proficient_aria"),
    }),
    [tChip],
  );

  const abilityValues: Record<AbilityKey, number | null> = {
    str,
    dex,
    con,
    int_score: intScore,
    wis,
    cha_score: chaScore,
  };

  const hasAnyAbility = Object.values(abilityValues).some((v) => v != null);

  // V2 chip render depends on the flag being live AT mount time (we never
  // need to re-evaluate per-render — `isPlayerHqV2Enabled` reads a build-
  // time env var). Stored as a const so jest tests can `jest.mock` the
  // flag module to flip behavior without touching runtime conditionals.
  const v2Enabled = isPlayerHqV2Enabled();
  const profBonus = profBonusForLevel(level ?? null);
  // Save proficiency lookup — saving_throws is an array of ability codes
  // ("str", "dex", ...). Build a Set for O(1) lookup per chip render.
  const profSaves = new Set(proficiencies?.saving_throws ?? []);
  // The roll surface is Auth-only. We light it up only when ALL the
  // broadcast context is available (campaign + character + name). Anonymous
  // contexts and missing-context renders fall through to clickable=false
  // which preserves the legacy visual without action zones.
  const rollClickable = v2Enabled && Boolean(campaignId && characterId && characterName);

  return (
    <div className="space-y-3">
      {/* Core stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* AC */}
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <Shield className="w-4 h-4 text-amber-400 mx-auto mb-1" aria-hidden="true" />
          <p className="text-lg font-bold text-foreground tabular-nums">{ac}</p>
          <p className="text-[10px] text-muted-foreground uppercase">{t("ac_label")}</p>
        </div>

        {/* Initiative */}
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" aria-hidden="true" />
          <p className="text-lg font-bold text-foreground tabular-nums">
            {initiativeBonus != null ? (initiativeBonus >= 0 ? `+${initiativeBonus}` : initiativeBonus) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">{t("init_label")}</p>
        </div>

        {/* Speed */}
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <Footprints className="w-4 h-4 text-amber-400 mx-auto mb-1" aria-hidden="true" />
          <p className="text-lg font-bold text-foreground tabular-nums">
            {speed != null ? `${speed}ft` : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">{t("speed_label")}</p>
        </div>

        {/* Inspiration */}
        <button
          type="button"
          onClick={onToggleInspiration}
          className={`bg-card border rounded-lg p-3 text-center transition-all ${
            inspiration
              ? "border-amber-400/50 bg-amber-400/10"
              : "border-border"
          }`}
          aria-pressed={inspiration}
          aria-label={t("inspiration_label")}
        >
          <Sparkles
            className={`w-4 h-4 mx-auto mb-1 transition-colors ${
              inspiration ? "text-amber-400" : "text-muted-foreground"
            }`}
            aria-hidden="true"
          />
          <p className={`text-lg font-bold ${inspiration ? "text-amber-400" : "text-muted-foreground"}`}>
            {inspiration ? "!" : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">{t("inspiration_label")}</p>
        </button>
      </div>

      {/* Spell Save DC (if set) */}
      {spellSaveDc != null && (
        <div className="flex items-center gap-2 px-3 py-2 bg-purple-950/20 border border-purple-500/20 rounded-md">
          <span className="text-xs text-purple-300 font-medium">{t("spell_save_dc")}</span>
          <span className="text-sm font-bold tabular-nums text-purple-200 ml-auto">
            {spellSaveDc}
          </span>
        </div>
      )}

      {/* Ability Scores — always visible (EP-1 A2: accordion killed per 09-implementation-plan.md §A2).
          V2 (Wave 3b) renders interactive AbilityChip with CHK + SAVE roll
          zones (PRD #44 + #46). V1 renders the legacy static cells unchanged. */}
      {hasAnyAbility && (
        <div
          className="bg-card border border-border rounded-xl px-4 py-3"
          role="group"
          aria-label={t("attributes_label")}
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            {t("attributes_label")}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {ABILITY_SCORES.map(({ key, label, ability }) => {
              const score = abilityValues[key];

              if (v2Enabled) {
                return (
                  <AbilityChip
                    key={key}
                    ability={ability}
                    label={label}
                    score={score}
                    proficient={profSaves.has(ability)}
                    clickable={rollClickable}
                    rollContext={{
                      campaignId,
                      characterId,
                      characterName,
                      profBonus,
                    }}
                    toastLabels={toastLabels}
                    chipLabels={chipLabels}
                  />
                );
              }

              // ── Legacy V1 cell (preserved for flag-OFF environments) ──
              // Use the canonical 3-letter ability code (str/dex/con/int/wis/cha)
              // for the testid so V1 + V2 stay aligned. The internal `key`
              // still uses `int_score`/`cha_score` to avoid the JS reserved-word
              // collision noted in the ABILITY_SCORES comment.
              return (
                <div
                  key={key}
                  className="bg-background/50 border border-border rounded-lg p-2 text-center"
                  data-testid={`ability-chip-${ability}`}
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {label}
                  </p>
                  <p className="text-xl font-bold text-foreground tabular-nums">
                    {getModifier(score)}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {score ?? "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
