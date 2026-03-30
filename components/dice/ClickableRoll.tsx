"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { roll, parseNotation, type RollResult, type RollMode } from "@/lib/dice/roll";

// ---------------------------------------------------------------------------
// ClickableRoll — an inline button that rolls dice on click and shows a
// popover with the result breakdown. Designed to sit inside stat block text
// exactly like 5e.tools' clickable dice notations.
//
// Shift+click: Advantage (d20) / Critical (damage)
// Ctrl/Cmd+click: Disadvantage (d20) / Resistance (damage)
// ---------------------------------------------------------------------------

// Global event to dismiss all other popovers when a new roll occurs
const DISMISS_EVENT = "dice-roll-dismiss";
// Event dispatched after each roll for the history store
const ROLL_RESULT_EVENT = "dice-roll-result";

export interface ClickableRollProps {
  /** Dice notation, e.g. "1d20+7", "2d6+5" */
  notation: string;
  /** Contextual label shown in the popover, e.g. "Tentacle (attack)" */
  label?: string;
  /** Source creature/combatant name, e.g. "Goblin 2" */
  source?: string;
  /** Override the visible text (defaults to notation) */
  children?: React.ReactNode;
}

export function ClickableRoll({ notation, label = "", source, children }: ClickableRollProps) {
  const [result, setResult] = useState<RollResult | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instanceId = useRef(Math.random().toString(36).slice(2));

  // Determine if this is a d20 roll for contextual tooltips
  const parsed = useMemo(() => parseNotation(notation), [notation]);
  const isD20 = parsed.count === 1 && parsed.sides === 20;

  const tooltip = isD20
    ? `Roll ${notation} — Shift: Vantagem, Ctrl: Desvantagem`
    : `Roll ${notation} — Shift: Crítico (2x dados), Ctrl: Resistência (÷2)`;

  // Listen for global dismiss events from other ClickableRoll instances
  useEffect(() => {
    function handleGlobalDismiss(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail !== instanceId.current) {
        setResult(null);
        setPopoverPos(null);
      }
    }
    window.addEventListener(DISMISS_EVENT, handleGlobalDismiss);
    return () => window.removeEventListener(DISMISS_EVENT, handleGlobalDismiss);
  }, []);

  // Auto-dismiss popover after 4s
  useEffect(() => {
    if (!result) return;
    timerRef.current = setTimeout(() => {
      setResult(null);
      setPopoverPos(null);
    }, 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [result]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      // Determine mode from modifier keys + context
      let mode: RollMode = "normal";
      if (e.shiftKey) {
        mode = isD20 ? "advantage" : "critical";
      } else if (e.ctrlKey || e.metaKey) {
        mode = isD20 ? "disadvantage" : "resistance";
      }

      const r = roll(notation, label, mode);
      if (source) r.source = source;

      // Guard: don't show popover for invalid/empty results
      if (r.dice.length === 0 && r.modifier === 0) return;

      // Dismiss all other popovers
      window.dispatchEvent(
        new CustomEvent(DISMISS_EVENT, { detail: instanceId.current }),
      );

      // Dispatch roll result for the history store (structuredClone avoids shared mutable ref)
      window.dispatchEvent(
        new CustomEvent(ROLL_RESULT_EVENT, { detail: structuredClone(r) }),
      );

      setResult(r);

      // Position popover near the click
      const rect = e.currentTarget.getBoundingClientRect();
      setPopoverPos({ x: rect.left, y: rect.bottom + 6 });
    },
    [notation, label, source, isD20],
  );

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setResult(null);
    setPopoverPos(null);
  }, []);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="dice-roll-btn"
        onClick={handleClick}
        title={tooltip}
      >
        {children ?? notation}
      </button>

      {result && popoverPos && (
        <DicePopover
          result={result}
          position={popoverPos}
          onDismiss={dismiss}
          triggerRef={btnRef}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// DicePopover — fixed-positioned tooltip showing roll breakdown
// ---------------------------------------------------------------------------

function DicePopover({
  result,
  position,
  onDismiss,
  triggerRef,
}: {
  result: RollResult;
  position: { x: number; y: number };
  onDismiss: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click — exclude the trigger button to prevent flash on re-roll
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!(e.target instanceof Node)) return;
      if (ref.current && !ref.current.contains(e.target) &&
          !(triggerRef.current && triggerRef.current.contains(e.target))) {
        onDismiss();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onDismiss, triggerRef]);

  // Mode badge
  const modeBadge = getModeBadge(result.mode);

  // Nat 1/20 indicator
  const natClass = result.isNat20
    ? "dice-nat20"
    : result.isNat1
      ? "dice-nat1"
      : "";

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className="dice-popover"
      style={{
        position: "fixed",
        left: Math.min(position.x, window.innerWidth - 220),
        top: Math.min(position.y, window.innerHeight - 80),
        zIndex: 9999,
      }}
    >
      <div className="dice-popover-header">
        {result.label && <div className="dice-popover-label">{result.label}</div>}
        {modeBadge}
      </div>
      <div className="dice-popover-result">
        <span className="dice-popover-breakdown">
          <PopoverBreakdown result={result} />
        </span>
        <span className={`dice-popover-total ${natClass}`}>
          {result.mode === "resistance" && result.resistanceTotal !== undefined
            ? result.resistanceTotal
            : result.total}
        </span>
      </div>
      {result.mode === "resistance" && result.resistanceTotal !== undefined && (
        <div className="dice-resist-total">
          {result.total} → {result.resistanceTotal}
        </div>
      )}
      <div className="dice-popover-notation">{result.notation}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getModeBadge(mode: RollResult["mode"]): React.ReactNode {
  switch (mode) {
    case "advantage":
      return <span className="dice-adv-badge">ADV</span>;
    case "disadvantage":
      return <span className="dice-dis-badge">DIS</span>;
    case "critical":
      return <span className="dice-crit-badge">CRIT</span>;
    case "resistance":
      return <span className="dice-resist-badge">RESIST</span>;
    default:
      return null;
  }
}

function PopoverBreakdown({ result }: { result: RollResult }) {
  const { mode, dice, discardedDice, modifier } = result;

  // Advantage/Disadvantage: show both d20 values, discarded one dimmed
  if ((mode === "advantage" || mode === "disadvantage") && discardedDice.length > 0 && dice.length > 0) {
    const kept = dice[0].value;
    const discarded = discardedDice[0].value;
    const modStr = modifier !== 0
      ? ` ${modifier >= 0 ? "+" : "−"} ${Math.abs(modifier)}`
      : "";

    return (
      <>
        [
        {mode === "advantage" ? (
          <>{kept}, <span className="dice-discarded">{discarded}</span></>
        ) : (
          <><span className="dice-discarded">{discarded}</span>, {kept}</>
        )}
        ]{modStr} ={" "}
      </>
    );
  }

  // Standard breakdown
  const diceStr =
    dice.length > 0
      ? `[${dice.map((d) => d.value).join(", ")}]`
      : "";
  const modStr =
    modifier !== 0
      ? ` ${modifier >= 0 ? "+" : "−"} ${Math.abs(modifier)}`
      : "";

  return <>{diceStr}{modStr} = </>;
}
