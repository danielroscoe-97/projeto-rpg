"use client";

/**
 * RibbonVivo — Wave 3a Story C1.
 *
 * Sticky 2-line "live status" strip that pins to the top of HeroiTab.
 * Composes the existing HpDisplay (variant="ribbon") + AC/Init/Speed/
 * Inspiration/Spell-Save-DC chips + SlotSummary on line 1, and the
 * condition strip + Temp HP +/- on line 2. On mobile only line 1 is
 * visible by default; a `⌄` toggle expands line 2 inline.
 *
 * Spec: `_bmad-output/party-mode-2026-04-22/03-wireframe-heroi.md` §4.3
 *       + §1 wireframe (modo leitura) + §2 wireframe (modo combate auto).
 *       Implementation plan §C1.
 *
 * Behavior contract:
 *   - `position: sticky; top: 0; z-index: 20` so it floats above the
 *     scrolling content but below modals (z-50 dialogs still cover it).
 *   - Height: 56px desktop, 48px mobile (compact); expanded mobile grows
 *     to ~120px when the condition row + slot summary unfurl.
 *   - HP bar pulses gold for 1.5s on every `current_hp` mutation —
 *     wired through `<HpDisplay pulseOnChange />`.
 *   - Combat-mode CTA ("Entrar no Combate →") slides in to the right
 *     when `combatActive` is true (Story C5 will mount the CombatBanner
 *     above; the in-ribbon CTA is the second affordance).
 *
 * The component is *purely visual*: every callback is forwarded through
 * — no state mutation lives here. HeroiTab keeps owning the
 * useCharacterStatus hook + its updaters.
 */

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Shield,
  Zap,
  Footprints,
  Sparkles,
  Target,
  Swords,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
} from "lucide-react";

import { HpDisplay } from "../HpDisplay";
import { ConditionBadges } from "../ConditionBadges";
import { SlotSummary } from "./SlotSummary";

export interface RibbonVivoProps {
  characterId: string;
  characterName: string;
  currentHp: number;
  maxHp: number;
  hpTemp: number;
  ac: number;
  initiativeBonus: number | null;
  speed: number | null;
  inspiration: boolean;
  spellSaveDc: number | null;
  conditions: string[];
  spellSlots: Record<string, { max: number; used: number }> | null;
  /** When true the in-ribbon "Enter combat" CTA + pulse hook activate. */
  combatActive?: boolean;
  /** Combat session/encounter ID — used to build the "Entrar no Combate" CTA href. */
  combatHref?: string | null;
  readOnly?: boolean;
  onHpChange: (newHp: number) => void;
  onTempHpChange: (newTemp: number) => void;
  onToggleCondition: (condition: string) => void;
  onSetConditions: (conditions: string[]) => void;
  onToggleInspiration?: () => void;
}

export function RibbonVivo({
  characterId,
  characterName,
  currentHp,
  maxHp,
  hpTemp,
  ac,
  initiativeBonus,
  speed,
  inspiration,
  spellSaveDc,
  conditions,
  spellSlots,
  combatActive = false,
  combatHref,
  readOnly = false,
  onHpChange,
  onTempHpChange,
  onToggleCondition,
  onSetConditions,
  onToggleInspiration,
}: RibbonVivoProps) {
  const t = useTranslations("player_hq.sheet");
  const tCombatAuto = useTranslations("player_hq.combat_auto");

  const [expandedMobile, setExpandedMobile] = useState(false);

  const initLabel = useMemo(() => {
    if (initiativeBonus == null) return "—";
    return initiativeBonus >= 0 ? `+${initiativeBonus}` : String(initiativeBonus);
  }, [initiativeBonus]);

  // Surface exhaustion as a plain badge in the ribbon — `ConditionBadges`
  // strips out `exhaustion:N` from its visible chip row, so we lift it here
  // for the mobile-collapsed view to expose the condition without expanding.
  const filteredConditions = useMemo(
    () => conditions.filter((c) => !c.startsWith("exhaustion:")),
    [conditions],
  );
  const exhaustionMatch = conditions.find((c) => c.startsWith("exhaustion:"));
  const exhaustionLevel = exhaustionMatch
    ? parseInt(exhaustionMatch.split(":")[1] ?? "0", 10)
    : 0;

  const handleExhaustionChange = useCallback(
    (level: number) => {
      const cleaned = conditions.filter((c) => !c.startsWith("exhaustion:"));
      if (level > 0) cleaned.push(`exhaustion:${level}`);
      onSetConditions(cleaned);
    },
    [conditions, onSetConditions],
  );

  const adjustTemp = useCallback(
    (delta: number) => {
      if (readOnly) return;
      const next = Math.max(0, hpTemp + delta);
      onTempHpChange(next);
    },
    [readOnly, hpTemp, onTempHpChange],
  );

  return (
    <div
      data-testid="ribbon-vivo"
      data-combat-active={combatActive ? "true" : "false"}
      role="complementary"
      aria-label={t("hp_label") + " · " + characterName}
      className="sticky top-0 z-20 -mx-2 px-2 py-1.5 sm:px-3 bg-card/95 supports-[backdrop-filter]:bg-card/70 backdrop-blur-md border-b border-amber-400/25 rounded-b-md"
    >
      {/* ── Line 1 — HP bar + chip strip + (combat CTA) ──────────────────── */}
      <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
        {/* HP block grows to fill — bar is full-width with the label inline. */}
        <div className="flex-1 min-w-0">
          <HpDisplay
            currentHp={currentHp}
            maxHp={maxHp}
            hpTemp={hpTemp}
            readOnly={readOnly}
            variant="ribbon"
            pulseOnChange={combatActive}
            characterId={characterId}
            characterName={characterName}
            onHpChange={onHpChange}
            onTempHpChange={onTempHpChange}
          />
        </div>

        {/* Chip strip — hidden on mobile until expanded. AC stays visible
            because it's the single most asked-for stat at the table. */}
        <div className="hidden sm:flex items-center gap-2 lg:gap-3 text-xs text-foreground tabular-nums">
          <Chip
            icon={<Shield className="w-3.5 h-3.5 text-amber-400" aria-hidden />}
            label={t("ac_label")}
            value={String(ac)}
            testId="ribbon-ac"
          />
          <Chip
            icon={<Zap className="w-3.5 h-3.5 text-amber-400" aria-hidden />}
            label={t("init_label")}
            value={initLabel}
            testId="ribbon-init"
          />
          <Chip
            icon={<Footprints className="w-3.5 h-3.5 text-amber-400" aria-hidden />}
            label={t("speed_label")}
            value={speed != null ? `${speed}ft` : "—"}
            testId="ribbon-speed"
          />
          <button
            type="button"
            onClick={onToggleInspiration}
            disabled={!onToggleInspiration || readOnly}
            aria-pressed={inspiration}
            data-testid="ribbon-inspiration"
            className={`group inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors ${
              onToggleInspiration && !readOnly ? "hover:bg-white/5" : "cursor-default"
            }`}
            title={t("inspiration_label")}
          >
            <Sparkles
              className={`w-3.5 h-3.5 ${inspiration ? "text-amber-400" : "text-muted-foreground"}`}
              aria-hidden
            />
            <span className={inspiration ? "text-amber-400 font-bold" : "text-muted-foreground"}>
              {inspiration ? "!" : "—"}
            </span>
          </button>
          {spellSaveDc != null && (
            <Chip
              icon={<Target className="w-3.5 h-3.5 text-amber-400" aria-hidden />}
              label={t("spell_save_dc")}
              value={String(spellSaveDc)}
              testId="ribbon-dc"
            />
          )}
          {/* AC chip (Compact) for HP Temp shows only when value > 0 — desktop strip. */}
          {hpTemp > 0 && (
            <Chip
              icon={<Shield className="w-3.5 h-3.5 text-blue-400" aria-hidden />}
              label={t("temp_hp")}
              value={String(hpTemp)}
              testId="ribbon-temp-hp"
              tone="info"
            />
          )}
        </div>

        {/* Combat CTA — slides in only when combat is active. Same anchor
            on desktop + mobile so the player always knows where to tap to
            enter the round-by-round cockpit. */}
        {combatActive && combatHref && (
          <Link
            href={combatHref}
            data-testid="ribbon-enter-combat"
            className="inline-flex items-center gap-1 rounded-md border border-amber-400/60 bg-amber-400/10 px-2 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-400/20 transition-colors animate-in slide-in-from-right duration-300"
            aria-label={tCombatAuto("enter_combat_aria")}
          >
            <Swords className="w-3.5 h-3.5" aria-hidden />
            <span className="hidden md:inline">{tCombatAuto("enter_combat")}</span>
            <span className="md:hidden">→</span>
          </Link>
        )}

        {/* Mobile-only expand toggle — surfaces line 2 + chip strip + slots
            in a single re-render. Desktop hides this since everything is
            already visible. */}
        <button
          type="button"
          onClick={() => setExpandedMobile((v) => !v)}
          aria-expanded={expandedMobile}
          aria-controls="ribbon-vivo-line-2"
          data-testid="ribbon-expand-toggle"
          className="sm:hidden ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
          aria-label={expandedMobile ? tCombatAuto("ribbon_collapse") : tCombatAuto("ribbon_expand")}
        >
          {expandedMobile ? (
            <ChevronUp className="w-4 h-4" aria-hidden />
          ) : (
            <ChevronDown className="w-4 h-4" aria-hidden />
          )}
        </button>
      </div>

      {/* ── Line 2 — conditions + slots + Temp HP controls ──────────────── */}
      <div
        id="ribbon-vivo-line-2"
        data-testid="ribbon-vivo-line-2"
        data-expanded={expandedMobile ? "true" : "false"}
        className={`mt-1.5 ${expandedMobile ? "block" : "hidden"} sm:block`}
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Mobile-only chip strip — desktop already has these on line 1. */}
          <div className="flex sm:hidden items-center gap-2 text-[11px] text-foreground tabular-nums w-full">
            <Chip
              icon={<Shield className="w-3 h-3 text-amber-400" aria-hidden />}
              label={t("ac_label")}
              value={String(ac)}
              testId="ribbon-ac-mobile"
              compact
            />
            <Chip
              icon={<Zap className="w-3 h-3 text-amber-400" aria-hidden />}
              label={t("init_label")}
              value={initLabel}
              testId="ribbon-init-mobile"
              compact
            />
            <Chip
              icon={<Footprints className="w-3 h-3 text-amber-400" aria-hidden />}
              label={t("speed_label")}
              value={speed != null ? `${speed}ft` : "—"}
              testId="ribbon-speed-mobile"
              compact
            />
            {spellSaveDc != null && (
              <Chip
                icon={<Target className="w-3 h-3 text-amber-400" aria-hidden />}
                label={t("spell_save_dc")}
                value={String(spellSaveDc)}
                testId="ribbon-dc-mobile"
                compact
              />
            )}
          </div>

          {/* Slot summary — both viewports. */}
          <SlotSummary spellSlots={spellSlots} />

          {/* Temp HP +/- inline — additive only per HpDisplay's contract. */}
          {!readOnly && (
            <div
              className="flex items-center gap-1 ml-auto"
              data-testid="ribbon-temp-hp-controls"
            >
              <span className="text-[10px] uppercase tracking-wide text-blue-300/80 font-semibold">
                {t("temp_hp")}
              </span>
              <span
                className="text-[11px] font-bold tabular-nums text-blue-200"
                data-testid="ribbon-temp-hp-value"
              >
                {hpTemp}
              </span>
              <button
                type="button"
                onClick={() => adjustTemp(-1)}
                disabled={hpTemp <= 0}
                className="min-w-[28px] min-h-[28px] rounded bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 border border-blue-500/20 transition-colors disabled:opacity-40 inline-flex items-center justify-center"
                aria-label={tCombatAuto("temp_hp_dec_aria")}
              >
                <Minus className="w-3 h-3" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => adjustTemp(1)}
                className="min-w-[28px] min-h-[28px] rounded bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 border border-blue-500/20 transition-colors inline-flex items-center justify-center"
                aria-label={tCombatAuto("temp_hp_inc_aria")}
              >
                <Plus className="w-3 h-3" aria-hidden />
              </button>
            </div>
          )}
        </div>

        {/* Condition strip — kept compact, but uses the canonical
            `ConditionBadges` so toggle semantics + exhaustion drop-down stay
            in lock-step with CharacterStatusPanel. */}
        <div className="mt-1.5" data-testid="ribbon-conditions">
          <ConditionBadges
            conditions={filteredConditions}
            exhaustionLevel={exhaustionLevel}
            readOnly={readOnly}
            onToggleCondition={onToggleCondition}
            onExhaustionChange={handleExhaustionChange}
          />
        </div>
      </div>
    </div>
  );
}

interface ChipProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  testId: string;
  tone?: "default" | "info";
  compact?: boolean;
}

function Chip({ icon, label, value, testId, tone = "default", compact = false }: ChipProps) {
  const valueClass = tone === "info" ? "text-blue-200" : "text-foreground";
  const labelClass = tone === "info" ? "text-blue-300/80" : "text-muted-foreground";
  const sizeClass = compact ? "text-[10px]" : "text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeClass}`}
      data-testid={testId}
    >
      {icon}
      <span className={`uppercase tracking-wide ${labelClass}`}>{label}</span>
      <span className={`font-bold tabular-nums ${valueClass}`}>{value}</span>
    </span>
  );
}
