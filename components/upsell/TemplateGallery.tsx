"use client";

/**
 * TemplateGallery — Epic 04 Story 04-G (Player-as-DM Upsell, Área 4 UI).
 *
 * Renders a grid of campaign template cards with "Preview" and "Use
 * this template" affordances. Shipped as the BecomeDmWizard's Step 2
 * picker (replacing the minimal inline radio list that 04-F landed).
 *
 * Each card shows name, party level, encounter count, and description.
 * The "Preview" button opens <TemplateDetailModal /> which fetches the
 * full template + resolved monster names on demand. "Use this
 * template" closes the modal and invokes the onSelect callback so the
 * wizard can advance to Step 4 with the template picked.
 *
 * Accessibility: cards are radio buttons (role="radio" inside a
 * role="radiogroup"), Preview is a secondary button that opens a
 * modal dialog. Focus returns to the card after modal close.
 *
 * Delegates (unlike a standalone page) — this component does NOT own
 * routing. The parent wizard handles "Use this template → advance".
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { CampaignTemplateSummary } from "@/lib/upsell/templates";
import { TemplateDetailModal } from "./TemplateDetailModal";

export type TemplateGalleryProps = {
  templates: CampaignTemplateSummary[];
  selectedTemplateId: string | null;
  /** Fired when the user confirms a template (either by clicking a card
   *  to just select OR via the modal's primary CTA to use it). The
   *  wizard decides whether to also advance the step. */
  onSelect: (template: CampaignTemplateSummary) => void;
  /** Fired when the user confirms via the modal — signals intent to
   *  advance the wizard, not just to mark as selected. */
  onUseSelected: (template: CampaignTemplateSummary) => void;
};

export function TemplateGallery({
  templates,
  selectedTemplateId,
  onSelect,
  onUseSelected,
}: TemplateGalleryProps) {
  const t = useTranslations("dmUpsell");
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const handleOpenPreview = useCallback(
    (id: string) => {
      setPreviewingId(id);
    },
    [],
  );

  const handleClosePreview = useCallback(() => {
    setPreviewingId(null);
  }, []);

  const previewing =
    previewingId !== null
      ? templates.find((tmpl) => tmpl.id === previewingId) ?? null
      : null;

  const handleConfirmFromModal = useCallback(() => {
    if (previewing) {
      onUseSelected(previewing);
    }
    setPreviewingId(null);
  }, [previewing, onUseSelected]);

  return (
    <>
      <div
        role="radiogroup"
        aria-label={t("templates_gallery_heading")}
        className="grid gap-3"
        data-testid="upsell.template-gallery"
      >
        <div className="mb-1 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            {t("templates_gallery_heading")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("templates_gallery_description")}
          </p>
        </div>

        {templates.length === 0 && (
          <p
            className="rounded-md border border-white/[0.08] p-4 text-sm text-muted-foreground"
            data-testid="upsell.template-gallery.empty"
          >
            {t("wizard_step2_empty_hint")}
          </p>
        )}

        {templates.map((tmpl) => {
          const selected = selectedTemplateId === tmpl.id;
          return (
            <div
              key={tmpl.id}
              data-testid={`upsell.template-card-${tmpl.id}`}
              className={`rounded-lg border p-4 transition-colors ${
                selected
                  ? "border-gold/60 bg-gold/[0.06]"
                  : "border-white/[0.08] hover:border-gold/30"
              }`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(tmpl)}
                className="block w-full text-left"
                data-testid={`upsell.template-card-${tmpl.id}.select`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-foreground">{tmpl.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t("templates_card_party_level", {
                      level: tmpl.target_party_level,
                    })}
                  </span>
                </div>
                {tmpl.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tmpl.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("templates_card_encounters", {
                    count: tmpl.encounter_count,
                  })}
                </p>
              </button>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenPreview(tmpl.id)}
                  data-testid={`upsell.template-card-${tmpl.id}.preview`}
                  className="text-xs text-gold underline-offset-4 hover:underline"
                >
                  {t("templates_card_preview_cta")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {previewing && (
        <TemplateDetailModal
          templateId={previewing.id}
          templateName={previewing.name}
          onClose={handleClosePreview}
          onUse={handleConfirmFromModal}
        />
      )}
    </>
  );
}
