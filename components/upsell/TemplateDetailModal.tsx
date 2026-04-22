"use client";

/**
 * TemplateDetailModal — Epic 04 Story 04-G (Player-as-DM Upsell, Área 4 UI).
 *
 * Lazy-loads a template's full encounter list via `getTemplateDetails`
 * server action, renders each encounter with its monsters (slugs
 * resolved server-side to display names), and offers a "Use this
 * template" primary CTA that signals the parent gallery to advance
 * the wizard.
 *
 * Why lazy: the gallery card already has name/level/encounter-count
 * from the RSC-prefetched summary. The full encounter JSON (including
 * monsters_payload) is only needed when the user actually opens a
 * preview — loading it per-gallery-render would pull 10-100KB of JSON
 * on every dashboard visit.
 *
 * Missing-monster UX: the server action marks unresolvable slugs with
 * `unresolved: true`. We surface them with a subtle dashed border so
 * users know SRD drift might bite at clone time. The authoritative
 * check still runs inside `clone_campaign_from_template` (F9
 * accumulator); this modal is advisory.
 *
 * a11y: renders as a role="dialog" with aria-labelledby + aria-modal,
 * focus-trapped by the overlay click-out behaviour. Escape key closes.
 */

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getTemplateDetails,
  type TemplateDetails,
} from "@/lib/upsell/template-details";
import { Button } from "@/components/ui/button";

export type TemplateDetailModalProps = {
  templateId: string;
  templateName: string;
  onClose: () => void;
  /** Signals the gallery/wizard to advance with this template chosen. */
  onUse: () => void;
};

type LoadState =
  | { status: "loading" }
  | { status: "ok"; details: TemplateDetails }
  | { status: "error" };

export function TemplateDetailModal({
  templateId,
  templateName,
  onClose,
  onUse,
}: TemplateDetailModalProps) {
  const t = useTranslations("dmUpsell");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const headingId = `template-detail-${templateId}`;

  // Lazy fetch details on mount.
  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void getTemplateDetails(templateId)
      .then((details) => {
        if (!active) return;
        if (!details) {
          setState({ status: "error" });
          return;
        }
        setState({ status: "ok", details });
      })
      .catch(() => {
        if (!active) return;
        setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [templateId]);

  // Close on Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Focus the dialog on mount for screen-reader announcement.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="upsell.template-detail-modal"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-white/[0.1] bg-surface-primary shadow-2xl"
      >
        <div className="border-b border-white/[0.08] p-5">
          <h2
            id={headingId}
            className="text-lg font-semibold text-gold"
          >
            {templateName}
          </h2>
        </div>

        <div className="p-5">
          {state.status === "loading" && (
            <p
              className="text-sm text-muted-foreground"
              data-testid="upsell.template-detail-modal.loading"
            >
              {t("templates_detail_clone_loading")}
            </p>
          )}

          {state.status === "error" && (
            <p
              className="text-sm text-red-400"
              data-testid="upsell.template-detail-modal.error"
            >
              {t("templates_error_generic")}
            </p>
          )}

          {state.status === "ok" && (
            <div className="space-y-5">
              {state.details.description && (
                <p className="text-sm text-muted-foreground">
                  {state.details.description}
                </p>
              )}

              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  {t("templates_detail_encounters_heading")}
                </h3>
                {state.details.encounters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {/* F21 — templates with 0 encounters still render gracefully. */}
                    {t("wizard_step2_empty_hint")}
                  </p>
                ) : (
                  <ol className="space-y-3">
                    {state.details.encounters.map((enc, idx) => (
                      <li
                        key={enc.id}
                        className="rounded-md border border-white/[0.08] p-3"
                        data-testid={`upsell.template-detail.encounter-${idx}`}
                      >
                        <p className="text-sm font-medium">{enc.name}</p>
                        {enc.description && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {enc.description}
                          </p>
                        )}
                        {enc.monsters.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-muted-foreground">
                              {t("templates_detail_monsters_heading")}
                            </p>
                            <ul className="mt-1 flex flex-wrap gap-2">
                              {enc.monsters.map((m) => (
                                <li
                                  key={m.slug}
                                  // Adversarial-review fix: screen readers
                                  // need to know this monster slug didn't
                                  // resolve to a known SRD entry. Visual
                                  // dashed-amber border was insufficient
                                  // for non-sighted users.
                                  aria-label={
                                    m.unresolved
                                      ? `${m.displayName}${m.quantity > 1 ? ` ×${m.quantity}` : ""} — unresolved, verify at clone time`
                                      : undefined
                                  }
                                  className={`rounded-full border px-2 py-0.5 text-xs ${
                                    m.unresolved
                                      ? "border-dashed border-amber-500/40 text-amber-300"
                                      : "border-white/[0.08] text-foreground"
                                  }`}
                                  data-testid={`upsell.template-detail.monster-${m.slug}`}
                                >
                                  {m.displayName}
                                  {m.quantity > 1 ? ` ×${m.quantity}` : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] p-5">
          <button
            type="button"
            onClick={onClose}
            data-testid="upsell.template-detail-modal.back"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("templates_detail_back")}
          </button>
          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={onUse}
            disabled={state.status !== "ok"}
            data-testid="upsell.template-detail-modal.use"
          >
            {t("templates_detail_clone_primary")}
          </Button>
        </div>
      </div>
    </div>
  );
}
