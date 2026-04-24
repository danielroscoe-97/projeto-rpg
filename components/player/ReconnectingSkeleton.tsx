/**
 * ReconnectingSkeleton — non-blocking loading view shown while the player's
 * connection to the DM channel is re-establishing.
 *
 * Non-negotiable rules (CLAUDE.md Resilient Reconnection Rule):
 *   - NEVER a blank/white screen
 *   - NEVER a registration form (player already registered; re-registering
 *     would create duplicate combatants and break narrative)
 *   - NEVER notify the DM or other players (silent reconnection preserves
 *     DM narrative control — see decision in tech spec §3.6)
 *
 * The caller renders this after a 500ms debounce in the `reconnecting` or
 * `degraded` state — avoids flash when retries succeed in <300ms.
 *
 * See: _bmad-output/estabilidade-combate/stories/CR-03-client-event-resume.md
 */
"use client";

import { useTranslations } from "next-intl";

export function ReconnectingSkeleton() {
  const t = useTranslations("player");
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      data-testid="reconnecting-skeleton"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="inline-block h-3 w-3 rounded-full bg-gold/70 animate-pulse" />
          <p className="mt-2 text-sm text-muted-foreground">
            {t("reconnecting_label")}
          </p>
        </div>
        <div className="space-y-3" aria-hidden="true">
          <div className="h-8 bg-gold/10 rounded animate-pulse" />
          <div className="h-24 bg-muted/20 rounded animate-pulse" />
          <div className="h-24 bg-muted/20 rounded animate-pulse" />
          <div className="h-16 bg-muted/20 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
