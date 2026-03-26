"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { roll, type RollResult } from "@/lib/dice/roll";

// ---------------------------------------------------------------------------
// ClickableRoll — an inline button that rolls dice on click and shows a
// popover with the result breakdown. Designed to sit inside stat block text
// exactly like 5e.tools' clickable dice notations.
// ---------------------------------------------------------------------------

// Global event to dismiss all other popovers when a new roll occurs
const DISMISS_EVENT = "dice-roll-dismiss";

export interface ClickableRollProps {
  /** Dice notation, e.g. "1d20+7", "2d6+5" */
  notation: string;
  /** Contextual label shown in the popover, e.g. "Tentacle (attack)" */
  label?: string;
  /** Override the visible text (defaults to notation) */
  children?: React.ReactNode;
}

export function ClickableRoll({ notation, label = "", children }: ClickableRollProps) {
  const [result, setResult] = useState<RollResult | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instanceId = useRef(Math.random().toString(36).slice(2));

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
      const r = roll(notation, label);

      // Guard: don't show popover for invalid/empty results
      if (r.dice.length === 0 && r.modifier === 0) return;

      // Dismiss all other popovers
      window.dispatchEvent(
        new CustomEvent(DISMISS_EVENT, { detail: instanceId.current }),
      );

      setResult(r);

      // Position popover near the click
      const rect = e.currentTarget.getBoundingClientRect();
      setPopoverPos({ x: rect.left, y: rect.bottom + 6 });
    },
    [notation, label],
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
        title={`Roll ${notation}`}
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

  // Build breakdown string: "[4, 3] + 5 = 12"
  const diceStr =
    result.dice.length > 0
      ? `[${result.dice.map((d) => d.value).join(", ")}]`
      : "";
  const modStr =
    result.modifier !== 0
      ? ` ${result.modifier >= 0 ? "+" : "−"} ${Math.abs(result.modifier)}`
      : "";
  const breakdown = `${diceStr}${modStr} = `;

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
      {result.label && <div className="dice-popover-label">{result.label}</div>}
      <div className="dice-popover-result">
        <span className="dice-popover-breakdown">{breakdown}</span>
        <span className={`dice-popover-total ${natClass}`}>{result.total}</span>
      </div>
      <div className="dice-popover-notation">{result.notation}</div>
    </div>
  );
}
