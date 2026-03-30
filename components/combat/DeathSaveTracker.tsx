"use client";

import { useTranslations } from "next-intl";

interface DeathSaveTrackerProps {
  successes: number;
  failures: number;
  onAddSuccess: () => void;
  onAddFailure: () => void;
  /** When true, show only indicators without action buttons */
  readOnly?: boolean;
}

export function DeathSaveTracker({ successes, failures, onAddSuccess, onAddFailure, readOnly = false }: DeathSaveTrackerProps) {
  const t = useTranslations("combat");
  const isStabilized = successes >= 3;
  const isDead = failures >= 3;

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
                onClick={onAddSuccess}
                disabled={successes >= 3}
                className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[24px]"
                data-testid="death-save-success-btn"
              >
                ✅ {t("death_saves_success")}
              </button>
            )}
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={`s-${i}`}
                  className={`w-3 h-3 rounded-full border ${
                    i < successes
                      ? "bg-emerald-400 border-emerald-400"
                      : "bg-transparent border-muted-foreground/30"
                  }`}
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
                onClick={onAddFailure}
                disabled={failures >= 3}
                className="px-2 py-0.5 text-xs font-medium rounded bg-red-900/30 text-red-300 hover:bg-red-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[24px]"
                data-testid="death-save-failure-btn"
              >
                ❌ {t("death_saves_failure")}
              </button>
            )}
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={`f-${i}`}
                  className={`w-3 h-3 rounded-full border ${
                    i < failures
                      ? "bg-red-400 border-red-400"
                      : "bg-transparent border-muted-foreground/30"
                  }`}
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
