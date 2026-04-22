"use client";

/**
 * InvitePastCompanions — Epic 04 Story 04-H (Player-as-DM Upsell, Área 5).
 *
 * Collapsible section mounted INSIDE `InvitePlayerDialog` that lists the
 * DM's past table-mates (via `get_past_companions()` — migration 169,
 * shipped Sprint 1) and offers a "Copy personalized message" button per
 * companion. The message contains the campaign's join-link + a greeting
 * by the companion's display name, ready to paste into WhatsApp or
 * Discord where D&D groups actually organize.
 *
 * Why this shape (changed from the original Sprint 1 spec):
 *   - The original spec called for a bulk email-invite endpoint backed
 *     by `campaign_invites`. Both the table and the endpoint were
 *     DROPPED in migration 180 (2026-04-21) after a 30-day diagnostic
 *     showed 0% accept rate on 9 sent emails — vs. 507 `player:joined`
 *     events through the join-link flow in the same window (193× gap).
 *   - Full rationale: `docs/diagnostic-campaign-invites-zero-accept.md`.
 *   - This component preserves the VIRAL LOOP intent of the Epic
 *     (new DM → reach out to people they already played with) but
 *     routes it through the channel users already use — manual share.
 *
 * Data flow:
 *   1. First expand → call `getPastCompanions()` server action.
 *   2. Cache result until dialog closes.
 *   3. Copy button → navigator.clipboard.writeText(message) with
 *      fallback toast.
 *
 * Privacy (D8): companions who set `users.share_past_companions=false`
 * are already filtered inside `get_past_companions()` (migration 173
 * INNER JOIN). No per-card filter needed here.
 *
 * Analytics:
 *   - `dm_upsell:past_companions_loaded` (once, on first expand)
 *   - `dm_upsell:past_companion_link_copied` per copy click, with
 *     post-clipboard success/failure flag so we can spot iOS Safari
 *     issues without PII in the payload.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Copy, Users } from "lucide-react";
import { trackEvent } from "@/lib/analytics/track";
import { getPastCompanions, type PastCompanion } from "@/lib/upsell/past-companions";
import { copyToClipboard } from "@/lib/util/clipboard";
import { Button } from "@/components/ui/button";

export type InvitePastCompanionsProps = {
  campaignId: string;
  campaignName: string;
  /** The shareable join link (built from linkCode inside the parent
   *  InvitePlayerDialog). Passed as prop so the copy-message composer
   *  doesn't need its own fetch or window reference. */
  inviteLink: string;
};

export function InvitePastCompanions({
  campaignId,
  campaignName,
  inviteLink,
}: InvitePastCompanionsProps) {
  const t = useTranslations("dmUpsell");

  const [expanded, setExpanded] = useState(false);
  const [companions, setCompanions] = useState<PastCompanion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Adversarial-review fix: state-based gate (was ref-based). Previous
  // hasLoadStartedRef approach stuck at `true` across collapse + re-
  // expand even when the first fetch was cancelled mid-flight (user
  // collapsed before the Supabase RPC resolved), leaving `companions`
  // permanently null and the section hidden forever.
  //
  // New gate: `companions !== null` (success cached) || `loading` (in
  // flight). Neither is a dep (closure values at effect-run time are
  // enough; we only re-enter the effect on `expanded` / `campaignId`
  // flips). The `finally` unconditionally releases `loading` so a
  // mid-flight collapse still unblocks the next expand's retry.
  useEffect(() => {
    if (!expanded) return;
    if (companions !== null) return;
    if (loading) return;

    let active = true;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const rows = await getPastCompanions();
        if (!active) return;
        setCompanions(rows);
        trackEvent("dm_upsell:past_companions_loaded", {
          campaignId,
          count: rows.length,
        });
      } catch {
        if (!active) return;
        setError(true);
      } finally {
        // Always release loading. If the component unmounted mid-fetch
        // React 18 treats setState on unmounted components as silent
        // no-ops; the state update here does NOT race the cleanup.
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [expanded, campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildMessage = useCallback(
    (playerName: string) =>
      t("companions_copy_message_template", {
        playerName,
        campaignName,
        inviteLink,
      }),
    [t, campaignName, inviteLink],
  );

  const handleCopy = useCallback(
    async (companion: PastCompanion) => {
      // Adversarial-review fix: fall back to a neutral "friend" label
      // when `companion_display_name` is null/empty. Previously the
      // copy message said "Hey ! I'm starting…" and the success toast
      // read "...paste it to  wherever…" — double space + awkward
      // grammar. The display card still renders "—" as its visible
      // fallback; the clipboard/toast string takes the softer word.
      const rawName =
        typeof companion.companion_display_name === "string"
          ? companion.companion_display_name.trim()
          : "";
      const name = rawName.length > 0 ? rawName : "friend";
      const message = buildMessage(name);
      const ok = await copyToClipboard(message);
      if (ok) {
        toast.success(
          t("companions_copy_toast_success", { playerName: name }),
        );
      } else {
        toast.error(t("companions_copy_toast_failed"));
      }
      trackEvent("dm_upsell:past_companion_link_copied", {
        campaignId,
        companionUserId: companion.companion_user_id,
        sessionsTogether: companion.sessions_together,
        success: ok,
      });
    },
    [t, campaignId, buildMessage],
  );

  const count = companions?.length ?? 0;

  // Hide entirely if we've loaded and there are zero companions — the
  // section would be just a disabled toggle otherwise. Before first
  // load (companions === null), show the toggle so the user can
  // discover the feature.
  const hideBecauseEmptyAndLoaded = companions !== null && count === 0;

  const buttonLabel = useMemo(() => {
    if (loading) return t("companions_loading");
    if (expanded) return t("companions_hide_button");
    // When not yet loaded we don't know the count — show generic label.
    return companions === null
      ? t("companions_section_heading")
      : t("companions_show_button", { count });
  }, [loading, expanded, companions, count, t]);

  if (hideBecauseEmptyAndLoaded && !expanded) {
    // One-shot silent hide AFTER the user already opened and saw "no
    // teammates yet". Preserve the button if they never expanded, so
    // discovery still happens.
    return null;
  }

  return (
    <div
      className="border-t border-white/[0.06] pt-3"
      data-testid="upsell.invite-past-companions"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full justify-between gap-2 text-muted-foreground hover:text-foreground"
        data-testid="upsell.invite-past-companions.toggle"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="inline-flex items-center gap-2">
          <Users className="w-4 h-4" />
          {buttonLabel}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>

      {expanded && (
        <div
          className="mt-3 space-y-3"
          data-testid="upsell.invite-past-companions.body"
        >
          {loading && (
            <p
              className="text-sm text-muted-foreground"
              data-testid="upsell.invite-past-companions.loading"
            >
              {t("companions_loading")}
            </p>
          )}

          {error && (
            <p
              className="text-sm text-red-400"
              data-testid="upsell.invite-past-companions.error"
            >
              {t("companions_load_failed")}
            </p>
          )}

          {!loading && !error && companions !== null && count === 0 && (
            <div
              className="rounded-md border border-white/[0.08] p-3"
              data-testid="upsell.invite-past-companions.empty"
            >
              <p className="text-sm font-medium">
                {t("companions_empty_title")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("companions_empty_body")}
              </p>
            </div>
          )}

          {!loading && !error && count > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                {t.rich("companions_section_description", {
                  campaignName,
                  strong: (chunks) => (
                    <strong className="text-foreground">{chunks}</strong>
                  ),
                })}
              </p>
              <ul className="space-y-2">
                {companions!.map((c) => {
                  const name = c.companion_display_name ?? "—";
                  return (
                    <li
                      key={c.companion_user_id}
                      className="flex items-center justify-between gap-2 rounded-md border border-white/[0.08] p-3"
                      data-testid={`upsell.invite-past-companions.card-${c.companion_user_id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("companions_card_sessions_together", {
                            count: c.sessions_together,
                          })}
                        </p>
                        {c.last_campaign_name && (
                          <p className="text-xs text-muted-foreground">
                            {t.rich("companions_card_last_campaign", {
                              campaignName: c.last_campaign_name,
                              em: (chunks) => (
                                <em className="italic">{chunks}</em>
                              ),
                            })}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1"
                        data-testid={`upsell.invite-past-companions.card-${c.companion_user_id}.copy`}
                        onClick={() => handleCopy(c)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {t("companions_copy_message_cta")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
