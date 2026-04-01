"use client";

import { useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";

interface DeathSaveTrackerProps {
  successes: number;
  failures: number;
  onAddSuccess: () => void;
  onAddFailure: () => void;
  /** When true, show only indicators without action buttons */
  readOnly?: boolean;
  /** When true, use larger touch targets (44px) for mobile player view */
  playerContext?: boolean;
}

export function DeathSaveTracker({ successes, failures, onAddSuccess, onAddFailure, readOnly = false, playerContext = false }: DeathSaveTrackerProps) {
  const t = useTranslations("combat");
  const isStabilized = successes >= 3;
  const isDead = failures >= 3;
  const successAudioRef = useRef<HTMLAudioElement | null>(null);
  const failureAudioRef = useRef<HTMLAudioElement | null>(null);
  // Brief checkmark/X feedback after click
  const [successFlash, setSuccessFlash] = useState(false);
  const [failureFlash, setFailureFlash] = useState(false);
  // Track last known counts to detect new saves for dot bounce
  const prevSuccessesRef = useRef(successes);
  const prevFailuresRef = useRef(failures);
  const [bouncingSuccess, setBouncingSuccess] = useState(-1);
  const [bouncingFailure, setBouncingFailure] = useState(-1);

  // Detect new save for dot bounce animation
  if (successes !== prevSuccessesRef.current) {
    const newDotIndex = successes - 1;
    if (newDotIndex >= 0 && newDotIndex !== bouncingSuccess) {
      setBouncingSuccess(newDotIndex);
      setTimeout(() => setBouncingSuccess(-1), 400);
    }
    prevSuccessesRef.current = successes;
  }
  if (failures !== prevFailuresRef.current) {
    const newDotIndex = failures - 1;
    if (newDotIndex >= 0 && newDotIndex !== bouncingFailure) {
      setBouncingFailure(newDotIndex);
      setTimeout(() => setBouncingFailure(-1), 400);
    }
    prevFailuresRef.current = failures;
  }

  const handleSuccess = useCallback(() => {
    // Local UI feedback sound — not broadcast
    try {
      if (!successAudioRef.current) {
        successAudioRef.current = new Audio("/sounds/sfx/healing.mp3");
        successAudioRef.current.volume = 0.5;
      }
      successAudioRef.current.currentTime = 0;
      successAudioRef.current.play().catch(() => {});
    } catch { /* ignore */ }
    navigator.vibrate?.([100]);
    // Brief checkmark flash
    setSuccessFlash(true);
    setTimeout(() => setSuccessFlash(false), 200);
    onAddSuccess();
  }, [onAddSuccess]);

  const handleFailure = useCallback(() => {
    // Local UI feedback sound — not broadcast
    try {
      if (!failureAudioRef.current) {
        failureAudioRef.current = new Audio("/sounds/sfx/death.mp3");
        failureAudioRef.current.volume = 0.5;
      }
      failureAudioRef.current.currentTime = 0;
      failureAudioRef.current.play().catch(() => {});
    } catch { /* ignore */ }
    navigator.vibrate?.([200, 50, 200]);
    // Brief X flash
    setFailureFlash(true);
    setTimeout(() => setFailureFlash(false), 200);
    onAddFailure();
  }, [onAddFailure]);

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-red-950/20 border border-red-500/20 rounded-md mt-1" data-testid="death-save-tracker">
      <span className="text-xs font-medium text-red-300">☠️ {t("death_saves_title")}:</span>

      {isDead ? (
        <span className="text-xs font-semibold text-red-400" data-testid="death-save-dead">
          💀 {t("death_saves_dead")}
        </span>
      ) : isStabilized ? (
        <span className="text-xs font-semibold text-emerald-400" data-testid="death-save-stabilized">
          ✅ {t("death_saves_stabilized")}
        </span>
      ) : (
        <>
          {/* Successes */}
          <div className="flex items-center gap-1">
            {!readOnly && (
              <button
                type="button"
                onClick={handleSuccess}
                disabled={successes >= 3}
                className={`font-medium rounded bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${playerContext ? "px-4 py-2 text-sm min-h-[44px]" : "px-2 py-0.5 text-xs min-h-[24px]"}`}
                data-testid="death-save-success-btn"
              >
                {successFlash ? "✓" : `✅ ${t("death_saves_success")}`}
              </button>
            )}
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={`s-${i}`}
                  className={`w-3 h-3 rounded-full border transition-transform duration-200 ${
                    i < successes
                      ? "bg-emerald-400 border-emerald-400"
                      : "bg-transparent border-muted-foreground/30"
                  } ${i === bouncingSuccess ? "scale-[1.3]" : ""}`}
                  data-testid={`death-save-success-${i}`}
                />
              ))}
            </div>
          </div>

          <span className="text-muted-foreground/30">|</span>

          {/* Failures */}
          <div className="flex items-center gap-1">
            {!readOnly && (
              <button
                type="button"
                onClick={handleFailure}
                disabled={failures >= 3}
                className={`font-medium rounded bg-red-900/30 text-red-300 hover:bg-red-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${playerContext ? "px-4 py-2 text-sm min-h-[44px]" : "px-2 py-0.5 text-xs min-h-[24px]"}`}
                data-testid="death-save-failure-btn"
              >
                {failureFlash ? "✗" : `❌ ${t("death_saves_failure")}`}
              </button>
            )}
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={`f-${i}`}
                  className={`w-3 h-3 rounded-full border transition-transform duration-200 ${
                    i < failures
                      ? "bg-red-400 border-red-400"
                      : "bg-transparent border-muted-foreground/30"
                  } ${i === bouncingFailure ? "scale-[1.3]" : ""}`}
                  data-testid={`death-save-failure-${i}`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
