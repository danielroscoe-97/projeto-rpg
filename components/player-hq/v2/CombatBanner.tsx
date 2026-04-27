"use client";

/**
 * CombatBanner — Wave 3a Story C5.
 *
 * Slim banner that slides in above the RibbonVivo when the player's
 * campaign is in active combat. Shows "Round N · Turno de X · próximo:
 * Y" with a CTA link to `/app/combat/[id]` (or wherever the consumer
 * passes via `combatHref`).
 *
 * Spec: `_bmad-output/party-mode-2026-04-22/03-wireframe-heroi.md` §2
 *       (modo combate ativo wireframe) + §C5 in `09-implementation-plan.md`
 *       + `02-topologia-navegacao.md` §⚔ Modo Combate Auto.
 *
 * Behavior contract:
 *   - Slide-from-top 300ms enter; fade-out 400ms exit per spec §2.
 *   - Uses `role="status" aria-live="polite"` so screen readers announce
 *     turn changes without stealing focus.
 *   - Background `bg-amber-500/10` + border `border-amber-500/30`. We
 *     intentionally avoid `destructive/20` from the original wireframe
 *     pencil sketch — combat is not destructive, it's the action mode.
 *
 * The component is purely presentational: when `active === false` it
 * renders an empty fragment so HeroiTab keeps a stable layout (CLS
 * budget <0.1). The animation lives in the className transitions.
 */

import Link from "next/link";
import { Swords, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

export interface CombatBannerProps {
  active: boolean;
  round?: number | null;
  currentTurnName?: string | null;
  nextTurnName?: string | null;
  combatHref?: string | null;
}

export function CombatBanner({
  active,
  round,
  currentTurnName,
  nextTurnName,
  combatHref,
}: CombatBannerProps) {
  const t = useTranslations("player_hq.combat_auto");

  // No animated exit when not active — the banner just unmounts. The
  // fade-out lives in `animate-out fade-out duration-400` on the wrapper
  // when `active` flips to false, but React would unmount immediately so
  // exit animations require AnimatePresence. For Wave 3a we keep it
  // simple: enter animation only, exit via instant unmount. CombatBanner
  // is a hint banner — instant exit reads as "combat ended cleanly".
  if (!active) return null;

  const roundLabel = round != null ? t("round_label", { round }) : null;
  const currentLabel = currentTurnName ? t("current_turn", { name: currentTurnName }) : null;
  const nextLabel = nextTurnName ? t("next_turn", { name: nextTurnName }) : null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t("banner_aria")}
      data-testid="combat-banner"
      className="flex items-center gap-3 px-4 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm animate-in slide-in-from-top duration-300"
    >
      <Swords className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0 flex-1 text-amber-100">
        {roundLabel && (
          <span className="font-semibold tabular-nums">{roundLabel}</span>
        )}
        {(roundLabel && currentLabel) && (
          <span className="text-amber-300/60" aria-hidden>·</span>
        )}
        {currentLabel && (
          <span data-testid="combat-banner-current">{currentLabel}</span>
        )}
        {(currentLabel && nextLabel) && (
          <span className="text-amber-300/60" aria-hidden>·</span>
        )}
        {nextLabel && (
          <span className="text-amber-200/80" data-testid="combat-banner-next">
            {nextLabel}
          </span>
        )}
      </div>
      {combatHref && (
        <Link
          href={combatHref}
          data-testid="combat-banner-cta"
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors flex-shrink-0"
        >
          <span>{t("enter_combat")}</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
