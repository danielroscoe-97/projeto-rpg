"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { TourProgress } from "./TourProgress";
import type { TourStepConfig } from "./tour-steps";

interface TourTooltipProps {
  step: TourStepConfig;
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
  /** Brief shake animation when an action is blocked */
  shake?: boolean;
  /** Translation namespace — defaults to "tour" */
  translationNamespace?: string;
}

type Position = "top" | "bottom" | "left" | "right";

function computePosition(
  targetRect: DOMRect,
  preferred: Position | undefined
): { position: Position; style: React.CSSProperties } {
  const padding = 12;
  const isMobile = window.innerWidth < 768;
  const tooltipWidth = isMobile ? window.innerWidth - 24 : Math.min(340, window.innerWidth - 32);
  const safeMargin = 16;

  // Bottom-sheet fallback: only when target is too tall (>50% viewport).
  // For small targets near the bottom, the regular top/bottom logic handles it.
  const spaceBelow = window.innerHeight - targetRect.bottom;
  const targetTooTall = targetRect.height > window.innerHeight * 0.5;
  if (targetTooTall) {
    // Use explicit left instead of left:50%+translateX(-50%) because
    // Framer Motion's animate overrides the CSS transform, breaking centering.
    const sheetWidth = Math.min(isMobile ? tooltipWidth : 420, window.innerWidth - safeMargin * 2);
    return {
      position: "bottom",
      style: {
        width: sheetWidth,
        maxWidth: sheetWidth,
        bottom: safeMargin,
        left: (window.innerWidth - sheetWidth) / 2,
        maxHeight: `calc(50vh - ${safeMargin}px)`,
      },
    };
  }

  const candidates: Position[] = isMobile
    ? preferred === "top"
      ? ["top", "bottom"]
      : ["bottom", "top"]
    : preferred
      ? [preferred, "bottom", "top", "right", "left"]
      : ["bottom", "top", "right", "left"];

  const spaceAbove = targetRect.top;
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

  switch (chosen) {
    case "bottom": {
      const top = Math.min(targetRect.bottom + padding, window.innerHeight - safeMargin - 100);
      style.top = top;
      style.left = Math.max(safeMargin, Math.min(centerX - tooltipWidth / 2, window.innerWidth - tooltipWidth - safeMargin));
      style.maxHeight = `${window.innerHeight - top - safeMargin}px`;
      break;
    }
    case "top": {
      const topPadding = isMobile ? 24 : padding;
      const bottomVal = window.innerHeight - targetRect.top + topPadding;
      style.bottom = bottomVal;
      style.left = Math.max(safeMargin, Math.min(centerX - tooltipWidth / 2, window.innerWidth - tooltipWidth - safeMargin));
      style.maxHeight = `${window.innerHeight - bottomVal - safeMargin}px`;
      break;
    }
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

/** Simple confetti burst using CSS-animated spans */
function ConfettiBurst() {
  const colors = ["#d4a843", "#f5d572", "#e8c35a", "#b8922f", "#ffffff", "#ff6b6b", "#4ecdc4"];
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    x: (Math.random() - 0.5) * 300,
    y: -(Math.random() * 200 + 80),
    rotate: Math.random() * 720 - 360,
    delay: Math.random() * 0.3,
    size: Math.random() * 6 + 3,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible" aria-hidden="true">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-sm"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            left: "50%",
            top: "30%",
          }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={{
            opacity: [1, 1, 0],
            x: p.x,
            y: [p.y, p.y + 150],
            rotate: p.rotate,
            scale: [1, 1.2, 0.5],
          }}
          transition={{
            duration: 1.5,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

export function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onBack,
  onSkip,
  onComplete,
  shake,
  translationNamespace = "tour",
}: TourTooltipProps) {
  const t = useTranslations(translationNamespace);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isLastStep = stepIndex === totalSteps - 1;
  const isCompleteStep = step.phase === "complete";
  const isModal = step.modal === true;
  const [showConfetti, setShowConfetti] = useState(false);

  // Trigger confetti on complete step
  useEffect(() => {
    if (isCompleteStep) {
      setShowConfetti(true);
    } else {
      setShowConfetti(false);
    }
  }, [isCompleteStep]);

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

  const nsWithDot = `${translationNamespace}.`;
  const stripNs = (key: string) => key.startsWith(nsWithDot) ? key.slice(nsWithDot.length) : key;
  const titleKey = stripNs(step.titleKey);
  const descKey = stripNs(step.descriptionKey);
  const extraDescKey = step.extraDescriptionKey ? stripNs(step.extraDescriptionKey) : undefined;

  // Fallback: if target element doesn't exist, render as modal
  const renderAsModal = isModal || (!targetRect);

  // Modal steps (or fallback): centered on screen
  if (renderAsModal) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          ref={tooltipRef}
          role="dialog"
          aria-label={t(titleKey)}
          aria-describedby={`tour-step-desc-${step.id}`}
          aria-live="polite"
          data-testid="tour-tooltip"
          className="fixed z-[10001] bg-card border border-gold/30 rounded-xl shadow-2xl p-5 overflow-y-auto"
          style={{
            top: "50%",
            left: "16px",
            right: "16px",
            transform: "translateY(-50%)",
            maxWidth: 380,
            marginInline: "auto",
            maxHeight: "min(400px, calc(100vh - 64px))",
            pointerEvents: "auto",
          }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {showConfetti && <ConfettiBurst />}
          <div className="space-y-3 relative">
            {/* Phase badge */}
            <div className="flex items-center gap-2">
              <span className={`text-[11px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
                step.phase === "setup"
                  ? "bg-emerald-900/30 text-emerald-400"
                  : step.phase === "combat"
                    ? "bg-red-900/30 text-red-400"
                    : "bg-gold/20 text-gold"
              }`}>
                {t(`phase_${step.phase}`)}
              </span>
            </div>

            <h3 className="text-[17px] font-semibold text-gold">
              {t(titleKey)}
            </h3>
            <p id={`tour-step-desc-${step.id}`} className="text-[15px] text-foreground/80 leading-relaxed">
              {t(descKey)}
            </p>
            {extraDescKey && (
              <p className="text-[13px] text-gold leading-relaxed">
                {t(extraDescKey)}
              </p>
            )}

            {/* Completion CTAs */}
            {isCompleteStep && (
              <div className="space-y-2 pt-1">
                {/* Primary: dismiss and create combat */}
                <button
                  type="button"
                  onClick={onComplete}
                  data-testid="tour-got-it"
                  className="block w-full text-center px-4 py-3 bg-gold text-surface-primary text-[15px] font-bold rounded-md hover:shadow-gold-glow transition-all duration-200 min-h-[44px]"
                >
                  {t("got_it_create")}
                </button>
                {/* Secondary: create account */}
                <Link
                  href="/auth/sign-up"
                  className="block w-full text-center px-4 py-2.5 border border-gold/40 text-gold text-[15px] font-semibold rounded-md hover:bg-gold/10 transition-all duration-200 min-h-[44px]"
                >
                  {t("create_account")}
                </Link>
              </div>
            )}

            {/* Footer */}
            <div className="space-y-2 pt-1">
              <TourProgress currentStep={stepIndex} totalSteps={totalSteps} />
              <div className="flex items-center justify-between">
                {!isCompleteStep ? (
                  <button
                    type="button"
                    onClick={onSkip}
                    data-testid="tour-skip"
                    className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors px-1 py-1 min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-muted-foreground/30 rounded"
                  >
                    {t("skip")}
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  {isCompleteStep ? (
                    <button
                      type="button"
                      onClick={onComplete}
                      data-testid="tour-finish"
                      className="text-[13px] text-muted-foreground/60 hover:text-muted-foreground transition-colors px-2 py-1 min-h-[44px]"
                    >
                      {t("finish")}
                    </button>
                  ) : (
                    <>
                      {stepIndex > 0 && (
                        <button
                          type="button"
                          onClick={onBack}
                          data-testid="tour-back"
                          className="px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground border border-border rounded-md transition-all duration-200 min-h-[44px]"
                        >
                          {t("back")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onNext}
                        data-testid="tour-next"
                        className="px-4 py-2 bg-gold text-surface-primary text-[15px] font-semibold rounded-md hover:shadow-gold-glow transition-all duration-200 min-h-[44px]"
                      >
                        {t("next")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Anchored tooltip (non-modal steps)
  const { position, style } = computePosition(targetRect!, step.position);

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
        data-testid="tour-tooltip"
        className="fixed z-[10001] bg-card border border-gold/30 rounded-lg shadow-2xl p-4 overflow-y-auto"
        style={{ ...style, pointerEvents: "auto" }}
        initial={{ opacity: 0, ...slideDirection[position] }}
        animate={shake ? { opacity: 1, x: [0, -6, 6, -4, 4, 0], y: 0 } : { opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: shake ? 0.5 : 0.2, ease: "easeOut" }}
      >
        {/* Arrow */}
        <div className={`absolute w-0 h-0 ${arrowClass[position]}`} />

        {/* Content */}
        <div className="space-y-3">
          {/* Phase badge */}
          <div className="flex items-center gap-2">
            <span className={`text-[11px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
              step.phase === "setup"
                ? "bg-emerald-900/30 text-emerald-400"
                : step.phase === "combat"
                  ? "bg-red-900/30 text-red-400"
                  : "bg-gold/20 text-gold"
            }`}>
              {t(`phase_${step.phase}`)}
            </span>
          </div>

          <h3 className="text-[15px] font-semibold text-gold">
            {t(titleKey)}
          </h3>
          <p id={`tour-step-desc-${step.id}`} className="text-[15px] text-foreground/80 leading-relaxed">
            {t(descKey)}
          </p>
          {extraDescKey && (
            <p className="text-[13px] text-gold leading-relaxed">
              {t(extraDescKey)}
            </p>
          )}

          {/* Footer */}
          <div className="space-y-2 pt-1">
            <TourProgress currentStep={stepIndex} totalSteps={totalSteps} />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onSkip}
                data-testid="tour-skip"
                className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors px-1 py-1 min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-muted-foreground/30 rounded"
              >
                {t("skip")}
              </button>
              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <button
                    type="button"
                    onClick={onBack}
                    data-testid="tour-back"
                    className="px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground border border-border rounded-md transition-all duration-200 min-h-[44px]"
                  >
                    {t("back")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onNext}
                  data-testid="tour-next"
                  className="px-3 py-1.5 bg-gold text-surface-primary text-[13px] font-semibold rounded-md hover:shadow-gold-glow transition-all duration-200 min-h-[44px]"
                >
                  {t("next")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
