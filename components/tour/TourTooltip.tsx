"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { TourProgress } from "./TourProgress";
import { TOUR_STEPS } from "./tour-steps";
import type { TourStepConfig } from "./tour-steps";

interface TourTooltipProps {
  step: TourStepConfig;
  stepIndex: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

type Position = "top" | "bottom" | "left" | "right";

function computePosition(
  targetRect: DOMRect,
  preferred: Position | undefined
): { position: Position; style: React.CSSProperties } {
  const padding = 12;
  const tooltipWidth = Math.min(340, window.innerWidth - 32);
  const isMobile = window.innerWidth < 768;

  const candidates: Position[] = isMobile
    ? ["bottom", "top"]
    : preferred
      ? [preferred, "bottom", "top", "right", "left"]
      : ["bottom", "top", "right", "left"];

  const spaceAbove = targetRect.top;
  const spaceBelow = window.innerHeight - targetRect.bottom;
  const spaceLeft = targetRect.left;
  const spaceRight = window.innerWidth - targetRect.right;

  const minSpace = 120;

  let chosen: Position = candidates[0];
  for (const pos of candidates) {
    if (pos === "top" && spaceAbove >= minSpace) { chosen = pos; break; }
    if (pos === "bottom" && spaceBelow >= minSpace) { chosen = pos; break; }
    if (pos === "left" && spaceLeft >= tooltipWidth + padding) { chosen = pos; break; }
    if (pos === "right" && spaceRight >= tooltipWidth + padding) { chosen = pos; break; }
  }

  const style: React.CSSProperties = { maxWidth: tooltipWidth };

  const centerX = targetRect.left + targetRect.width / 2;
  const safeMargin = 16;

  switch (chosen) {
    case "bottom":
      style.top = Math.min(targetRect.bottom + padding, window.innerHeight - safeMargin - 100);
      style.left = Math.max(safeMargin, Math.min(centerX - tooltipWidth / 2, window.innerWidth - tooltipWidth - safeMargin));
      break;
    case "top":
      style.bottom = window.innerHeight - targetRect.top + padding;
      style.left = Math.max(safeMargin, Math.min(centerX - tooltipWidth / 2, window.innerWidth - tooltipWidth - safeMargin));
      break;
    case "right":
      style.top = Math.max(safeMargin, targetRect.top + targetRect.height / 2 - 60);
      style.left = targetRect.right + padding;
      break;
    case "left":
      style.top = Math.max(safeMargin, targetRect.top + targetRect.height / 2 - 60);
      style.right = window.innerWidth - targetRect.left + padding;
      break;
  }

  return { position: chosen, style };
}

export function TourTooltip({
  step,
  stepIndex,
  targetRect,
  onNext,
  onSkip,
  onComplete,
}: TourTooltipProps) {
  const t = useTranslations("tour");
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;
  const isInteractive = step.type === "interactive";
  const isCompleteStep = step.phase === "complete";

  // Focus trap: focus tooltip on mount
  useEffect(() => {
    const el = tooltipRef.current;
    if (el) {
      const focusable = el.querySelector<HTMLElement>("button, [tabindex], a");
      focusable?.focus();
    }
  }, [stepIndex]);

  // ESC to skip
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onSkip();
      }
    },
    [onSkip]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!targetRect) return null;

  const titleKey = step.titleKey.replace(/^tour\./, "");
  const descKey = step.descriptionKey.replace(/^tour\./, "");
  const hintKey = step.interactiveHint?.replace(/^tour\./, "");

  const { position, style } = computePosition(targetRect, step.position);

  const arrowClass: Record<Position, string> = {
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-card border-l-transparent border-r-transparent border-t-transparent border-[8px]",
    top: "top-full left-1/2 -translate-x-1/2 border-t-card border-l-transparent border-r-transparent border-b-transparent border-[8px]",
    right: "right-full top-1/2 -translate-y-1/2 border-r-card border-t-transparent border-b-transparent border-l-transparent border-[8px]",
    left: "left-full top-1/2 -translate-y-1/2 border-l-card border-t-transparent border-b-transparent border-r-transparent border-[8px]",
  };

  const slideDirection = {
    bottom: { y: -8 },
    top: { y: 8 },
    right: { x: -8 },
    left: { x: 8 },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        ref={tooltipRef}
        role="dialog"
        aria-label={t(titleKey)}
        aria-describedby={`tour-step-desc-${step.id}`}
        aria-live="polite"
        className="fixed z-[10001] bg-card border border-gold/30 rounded-lg shadow-2xl p-4 overflow-y-auto"
        style={{ ...style, pointerEvents: "auto", maxHeight: "calc(100vh - 32px)" }}
        initial={{ opacity: 0, ...slideDirection[position] }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Arrow */}
        <div className={`absolute w-0 h-0 ${arrowClass[position]}`} />

        {/* Content */}
        <div className="space-y-3">
          {/* Phase badge */}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
              step.phase === "setup"
                ? "bg-emerald-900/30 text-emerald-400"
                : step.phase === "combat"
                  ? "bg-red-900/30 text-red-400"
                  : "bg-gold/20 text-gold"
            }`}>
              {t(`phase_${step.phase}`)}
            </span>
          </div>

          <h3 className="text-sm font-semibold text-gold">
            {t(titleKey)}
          </h3>
          <p id={`tour-step-desc-${step.id}`} className="text-sm text-foreground/80 leading-relaxed">
            {t(descKey)}
          </p>

          {isInteractive && hintKey && (
            <p className="text-xs text-gold/70 italic flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold/70 animate-pulse" aria-hidden="true" />
              {t(hintKey)}
            </p>
          )}

          {/* Completion CTA */}
          {isCompleteStep && (
            <Link
              href="/auth/sign-up"
              className="block w-full text-center px-4 py-2.5 bg-gold text-surface-primary text-sm font-semibold rounded-md hover:shadow-gold-glow transition-all duration-200 min-h-[44px]"
            >
              {t("create_account")}
            </Link>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <TourProgress currentStep={stepIndex} />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={isLastStep ? onComplete : onSkip}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors px-2 py-1 min-h-[44px]"
              >
                {isLastStep ? t("finish") : t("skip")}
              </button>

              {!isInteractive && !isCompleteStep && (
                <button
                  type="button"
                  onClick={onNext}
                  className="px-3 py-1.5 bg-gold text-surface-primary text-xs font-semibold rounded-md hover:shadow-gold-glow transition-all duration-200 min-h-[44px]"
                >
                  {t("next")}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
