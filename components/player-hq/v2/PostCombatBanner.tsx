"use client";

/**
 * PostCombatBanner — Sprint 2 A6 (Campaign + Player Redesign / Grimório).
 *
 * Canonical spec: `_bmad-output/party-mode-2026-04-22/20-post-combat-screen-spec.md`
 *
 * Responsibilities:
 *   - Full-screen modal shown after `combat:ended`, gated by the V2 flag
 *     via {@link usePostCombatState}. Never renders for Guest (decision
 *     #43) — the caller is expected to short-circuit via `visible` but we
 *     also assert the `mode !== "guest"` invariant defensively.
 *   - NO auto-dismiss: the dialog stays open until the player clicks a
 *     CTA or the close button. ESC + backdrop-click also dismiss.
 *   - Shows post-combat HP / spell slots / conditions / inspiration, plus
 *     optional party state. All tokens come from the existing design
 *     system (no new CSS vars — see `08-design-tokens-delta.md` §1).
 *
 * Naming caveat (spec §"Novos arquivos"): despite the filename the file
 * implements a modal, not a banner. The name is retained to match the
 * planning doc so cross-referenced search links (`_bmad-output/...:333`)
 * stay valid. Sprint 3 may rename the export when HeroiTab wires it up.
 *
 * Integration plan: the caller (Sprint 3 `HeroiTab`) reads
 * `{ visible, snapshot, dismiss }` from `usePostCombatState` and mounts
 * this component when `visible && snapshot`. Sprint 2 ships the surface
 * dormant but importable.
 */

import {
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Swords, X } from "lucide-react";

import type {
  PostCombatCondition,
  PostCombatPartyMember,
  PostCombatSnapshot,
  PostCombatSpellSlotsLevel,
} from "@/lib/hooks/usePostCombatState";
import {
  buildHeroiSheetPath,
  resolvePostCombatRedirect,
  type PostCombatMode,
} from "@/lib/player-hq/post-combat-redirect";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface PostCombatBannerProps {
  snapshot: PostCombatSnapshot;
  /** Access mode. `"guest"` is a defensive tripwire — the hook already
   * filters it out, but we refuse to render too. */
  mode: PostCombatMode;
  /**
   * Whether the current user is the Mestre. Drives visibility of the
   * long-rest / end-session CTAs. Defaults to `false`.
   */
  isMestre?: boolean;
  /** Invoked on close button, ESC, backdrop click, or after CTA navigate. */
  onDismiss: () => void;
  /**
   * Optional recap deep-link override. When provided, the "Ver recap"
   * CTA navigates here; otherwise it falls back to `onViewRecap` or hides.
   */
  recapHref?: string | null;
  /** Programmatic recap handler (used by Anon flows that need to open the
   *  RecapCtaCard instead of navigating). */
  onViewRecap?: () => void;
  /**
   * Programmatic short-rest handler. Disabled when unset — matches the
   * spec's behavior for anon players ("Crie conta pra salvar resto").
   */
  onShortRest?: () => void;
  /** Mestre-only long-rest handler. */
  onLongRest?: () => void;
  /** Mestre-only end-session handler. */
  onEndSession?: () => void;
  /**
   * Optional override for the "Voltar pra ficha" target. Defaults to
   * `resolvePostCombatRedirect({ mode, campaignId })` so the flag-aware
   * branch + Guest lock-in stays centralized.
   */
  heroHref?: string;
  /** Optional data-testid prefix override for e2e. */
  testidPrefix?: string;
}

function formatHpLabel(
  hp: PostCombatSnapshot["hp"],
  tier: PostCombatSnapshot["hpTier"],
): string | null {
  if (!hp) return null;
  const base = `${hp.current}/${hp.max}`;
  return tier ? `${base} · ${tier}` : base;
}

export function PostCombatBanner({
  snapshot,
  mode,
  isMestre = false,
  onDismiss,
  recapHref,
  onViewRecap,
  onShortRest,
  onLongRest,
  onEndSession,
  heroHref,
  testidPrefix = "post-combat",
}: PostCombatBannerProps) {
  const t = useTranslations("player_hq.post_combat");
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const resolvedHeroHref = useMemo(
    () =>
      heroHref ??
      resolvePostCombatRedirect({ mode, campaignId: snapshot.campaignId }),
    [heroHref, mode, snapshot.campaignId],
  );

  // Defensive tripwire — decision #43 locks Guest out of this surface. If
  // a caller ever mounts us for Guest we bail loudly in dev and silently
  // in prod (returning null). This mirrors the hook's `visible` guard.
  const renderBlocked = mode === "guest";

  useEffect(() => {
    if (renderBlocked) return;
    if (typeof document === "undefined") return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) previouslyFocusedRef.current = active;
    // Autofocus the close button so ESC/Enter are immediately actionable.
    closeButtonRef.current?.focus();
    return () => {
      const prev = previouslyFocusedRef.current;
      if (prev && prev.isConnected) {
        try {
          prev.focus();
        } catch {
          /* focus restoration is best-effort */
        }
      }
    };
  }, [renderBlocked]);

  useEffect(() => {
    if (renderBlocked) return;
    if (typeof document === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss, renderBlocked]);

  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onDismiss();
    },
    [onDismiss],
  );

  const handleShortRest = useCallback(() => {
    if (!onShortRest) return;
    onShortRest();
    onDismiss();
    // Per spec §"Sequence diagram (Auth)": after short-rest → go to hero.
    router.push(buildHeroiSheetPath(snapshot.campaignId));
  }, [onDismiss, onShortRest, router, snapshot.campaignId]);

  const handleViewRecap = useCallback(() => {
    if (onViewRecap) {
      onViewRecap();
      onDismiss();
      return;
    }
    if (recapHref) {
      router.push(recapHref);
      onDismiss();
    }
  }, [onDismiss, onViewRecap, recapHref, router]);

  const handleBackToSheet = useCallback(() => {
    onDismiss();
    router.push(resolvedHeroHref);
  }, [onDismiss, resolvedHeroHref, router]);

  const handleLongRest = useCallback(() => {
    if (!onLongRest) return;
    onLongRest();
    onDismiss();
  }, [onDismiss, onLongRest]);

  const handleEndSession = useCallback(() => {
    if (!onEndSession) return;
    onEndSession();
    onDismiss();
  }, [onDismiss, onEndSession]);

  if (renderBlocked) return null;

  const heroHpLabel = formatHpLabel(snapshot.hp, snapshot.hpTier);
  const heading = t("heading");
  const roundText =
    typeof snapshot.round === "number"
      ? ` · ${t("round_label", { round: snapshot.round })}`
      : "";
  const shortRestDisabled = !onShortRest;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={t("aria_dialog_label")}
      data-testid={`${testidPrefix}.root`}
      onClick={handleBackdropClick}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-gold/40 rounded-xl shadow-2xl"
        data-testid={`${testidPrefix}.panel`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gold/40">
          <h2 className="flex items-center gap-2 text-gold font-semibold text-lg">
            <Swords className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>
              {heading}
              {roundText}
            </span>
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
            aria-label={t("close")}
            data-testid={`${testidPrefix}.close`}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <section className="space-y-3">
            <h3 className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">
              {t("state_heading")}
            </h3>

            {/* You block */}
            <div
              className="rounded-lg border border-border bg-card px-4 py-3 space-y-2"
              data-testid={`${testidPrefix}.you`}
            >
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">
                  {t("you_heading")}
                </span>
                {snapshot.characterName && (
                  <span className="text-sm font-semibold text-foreground">
                    {snapshot.characterName}
                  </span>
                )}
                {snapshot.characterHeadline && (
                  <span className="text-xs text-muted-foreground">
                    · {snapshot.characterHeadline}
                  </span>
                )}
              </div>

              {heroHpLabel && (
                <div className="flex items-center gap-2 text-sm text-foreground tabular-nums">
                  <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">
                    {t("hp_label")}
                  </span>
                  <span data-testid={`${testidPrefix}.hp`}>{heroHpLabel}</span>
                </div>
              )}

              <PostCombatSlots
                slots={snapshot.spellSlots}
                emptyCopy={t("no_slots")}
                headingCopy={t("slots_heading")}
                testidPrefix={testidPrefix}
              />

              <PostCombatConditions
                conditions={snapshot.conditions}
                emptyCopy={t("no_conditions")}
                headingCopy={t("conditions_heading")}
                concBadgeCopy={t("concentration_badge")}
                testidPrefix={testidPrefix}
              />

              {typeof snapshot.inspiration === "number" && (
                <div className="text-xs text-muted-foreground tabular-nums flex items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.08em] font-semibold">
                    {t("inspiration_label")}:
                  </span>
                  <span className="text-foreground">{snapshot.inspiration}</span>
                  {snapshot.inspiration === 0 && (
                    <span>({t("inspiration_spent")})</span>
                  )}
                </div>
              )}
            </div>

            {/* Party block */}
            {snapshot.party && snapshot.party.length > 0 && (
              <div
                className="rounded-lg border border-border bg-card px-4 py-3 space-y-1.5"
                data-testid={`${testidPrefix}.party`}
              >
                <h4 className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">
                  {t("party_heading")}
                </h4>
                <ul className="space-y-1">
                  {snapshot.party.map((member) => (
                    <PostCombatPartyRow key={member.name} member={member} />
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Actions */}
          <section className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">
              {t("actions_heading")}
            </h3>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleShortRest}
                disabled={shortRestDisabled}
                title={
                  shortRestDisabled && mode === "anon"
                    ? t("anon_short_rest_disabled")
                    : undefined
                }
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg border border-gold/60 text-gold hover:bg-gold/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid={`${testidPrefix}.cta.short-rest`}
              >
                {t("cta_short_rest")}
              </button>

              {(recapHref || onViewRecap) && (
                <button
                  type="button"
                  onClick={handleViewRecap}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg border border-gold/60 text-gold hover:bg-gold/10 transition-colors"
                  data-testid={`${testidPrefix}.cta.view-recap`}
                >
                  {t("cta_view_recap")}
                </button>
              )}

              <button
                type="button"
                onClick={handleBackToSheet}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-gold text-background font-semibold hover:bg-gold/90 transition-colors"
                data-testid={`${testidPrefix}.cta.back-to-sheet`}
              >
                {t("cta_back_to_sheet")}
              </button>
            </div>

            {/* Mestre-only actions */}
            {isMestre && (onLongRest || onEndSession) && (
              <div
                className="pt-3 mt-3 border-t border-border space-y-2"
                data-testid={`${testidPrefix}.dm-actions`}
              >
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">
                  {t("dm_only_hint")}
                </p>
                <div className="flex flex-col gap-2">
                  {onLongRest && (
                    <button
                      type="button"
                      onClick={handleLongRest}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors text-sm"
                      data-testid={`${testidPrefix}.cta.long-rest`}
                    >
                      {t("cta_long_rest")}
                    </button>
                  )}
                  {onEndSession && (
                    <button
                      type="button"
                      onClick={handleEndSession}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors text-sm"
                      data-testid={`${testidPrefix}.cta.end-session`}
                    >
                      {t("cta_end_session")}
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function PostCombatSlots({
  slots,
  emptyCopy,
  headingCopy,
  testidPrefix,
}: {
  slots: PostCombatSpellSlotsLevel[] | undefined;
  emptyCopy: string;
  headingCopy: string;
  testidPrefix: string;
}) {
  if (!slots || slots.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        <span className="text-[11px] uppercase tracking-[0.08em] font-semibold not-italic mr-1">
          {headingCopy}:
        </span>
        {emptyCopy}
      </div>
    );
  }
  return (
    <div className="space-y-1" data-testid={`${testidPrefix}.slots`}>
      <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">
        {headingCopy}
      </span>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {slots.map((slot) => (
          <li
            key={slot.level}
            className="text-xs text-foreground tabular-nums flex items-center gap-1"
            data-testid={`${testidPrefix}.slot-${slot.level}`}
          >
            <span className="text-gold font-semibold">{toRoman(slot.level)}</span>
            <span className="text-muted-foreground">
              {slot.current}/{slot.max}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PostCombatConditions({
  conditions,
  emptyCopy,
  headingCopy,
  concBadgeCopy,
  testidPrefix,
}: {
  conditions: PostCombatCondition[] | undefined;
  emptyCopy: string;
  headingCopy: string;
  concBadgeCopy: string;
  testidPrefix: string;
}) {
  if (!conditions || conditions.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        <span className="text-[11px] uppercase tracking-[0.08em] font-semibold not-italic mr-1">
          {headingCopy}:
        </span>
        {emptyCopy}
      </div>
    );
  }
  return (
    <div className="space-y-1" data-testid={`${testidPrefix}.conditions`}>
      <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">
        {headingCopy}
      </span>
      <ul className="flex flex-wrap gap-1.5">
        {conditions.map((c) => (
          <li
            key={c.name}
            className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border border-gold/30 bg-gold/5 text-foreground"
            data-testid={`${testidPrefix}.condition`}
          >
            <span>{c.name}</span>
            {c.durationLabel && (
              <span className="text-muted-foreground">· {c.durationLabel}</span>
            )}
            {c.concentration && (
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.08em] px-1 rounded"
                style={{ color: "var(--concentration, #7DD3FC)" }}
              >
                {concBadgeCopy}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PostCombatPartyRow({ member }: { member: PostCombatPartyMember }) {
  return (
    <li className="flex items-baseline gap-2 text-xs text-foreground">
      <span className="font-semibold">{member.name}</span>
      <span className="text-muted-foreground tabular-nums">{member.hpLabel}</span>
    </li>
  );
}

function toRoman(n: number): string {
  const table: Array<[number, string]> = [
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  let remaining = n;
  for (const [value, symbol] of table) {
    while (remaining >= value) {
      out += symbol;
      remaining -= value;
    }
  }
  return out || String(n);
}
