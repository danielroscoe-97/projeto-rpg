"use client";

/**
 * S5.1 — Polymorph / Wild Shape DM trigger modal.
 *
 * Entirely flag-gated by `ff_polymorph_v1`. Consumers should check the flag
 * via {@link shouldShowPolymorphTrigger} before mounting the trigger button;
 * the modal itself also no-ops when the flag is OFF so it's safe to keep
 * mounted behind conditional triggers.
 *
 * Design constraints (from docs/spec-beta4-features.md S5.1):
 *   - Two variants: `polymorph` (spell) and `wildshape` (druid).
 *   - Form name: required, ≤ 64 chars.
 *   - Form max HP: required, 1-999.
 *   - Form AC: optional, 0-30.
 *   - Apply dispatches to `onApply` with a `PolymorphState` via `createPolymorphState`.
 *   - Radix Dialog provides focus trap + esc-to-close for accessibility.
 *
 * Parity matrix (see CLAUDE.md combat parity rule):
 *   - Guest (GuestCombatClient): DM = host, modal mounted per row.
 *   - Anon / Auth: DM = session owner, modal mounted per row; broadcast
 *     piggy-backs on CombatStateBroadcast state_sync (no new broadcast type).
 */

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isFeatureFlagEnabled } from "@/lib/flags";

export type PolymorphVariant = "polymorph" | "wildshape";

export interface PolymorphModalApplyPayload {
  variant: PolymorphVariant;
  form_name: string;
  form_max_hp: number;
  form_ac?: number;
}

export interface PolymorphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Combatant being transformed — used for the modal title copy. */
  combatantName: string;
  /** Called when DM confirms. Consumer is responsible for wiring to the store. */
  onApply: (payload: PolymorphModalApplyPayload) => void;
}

/**
 * Public helper — whether the DM-trigger should render. Consumers (row /
 * list) call this BEFORE wiring the trigger button so the modal never even
 * shows up when the flag is off.
 */
export function shouldShowPolymorphTrigger(): boolean {
  return isFeatureFlagEnabled("ff_polymorph_v1");
}

const MAX_FORM_NAME_LEN = 64;
const MIN_FORM_HP = 1;
const MAX_FORM_HP = 999;
const MIN_FORM_AC = 0;
const MAX_FORM_AC = 30;

export function PolymorphModal({
  open,
  onOpenChange,
  combatantName,
  onApply,
}: PolymorphModalProps) {
  const t = useTranslations("combat.polymorph");
  const nameInputId = useId();
  const hpInputId = useId();
  const acInputId = useId();

  const [variant, setVariant] = useState<PolymorphVariant>("polymorph");
  const [formName, setFormName] = useState("");
  const [formMaxHp, setFormMaxHp] = useState<string>("");
  const [formAc, setFormAc] = useState<string>("");

  // Flag gate — rendering the trigger is the consumer's responsibility, but we
  // also no-op the Dialog body itself so stale triggers cannot leak UI.
  if (!isFeatureFlagEnabled("ff_polymorph_v1")) {
    return null;
  }

  const parsedHp = parseInt(formMaxHp, 10);
  const parsedAc = formAc === "" ? undefined : parseInt(formAc, 10);
  const trimmedName = formName.trim();
  const nameValid = trimmedName.length > 0 && trimmedName.length <= MAX_FORM_NAME_LEN;
  const hpValid =
    !isNaN(parsedHp) && parsedHp >= MIN_FORM_HP && parsedHp <= MAX_FORM_HP;
  const acValid =
    parsedAc === undefined ||
    (!isNaN(parsedAc) && parsedAc >= MIN_FORM_AC && parsedAc <= MAX_FORM_AC);
  const canApply = nameValid && hpValid && acValid;

  function handleApply() {
    if (!canApply) return;
    onApply({
      variant,
      form_name: trimmedName,
      form_max_hp: parsedHp,
      form_ac: parsedAc,
    });
    // Reset local state so a second open doesn't carry over the prior form.
    setFormName("");
    setFormMaxHp("");
    setFormAc("");
    setVariant("polymorph");
    onOpenChange(false);
  }

  function handleCancel() {
    setFormName("");
    setFormMaxHp("");
    setFormAc("");
    setVariant("polymorph");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="polymorph-modal"
        aria-label={t("modal_title", { name: combatantName })}
      >
        <DialogHeader>
          <DialogTitle>{t("modal_title", { name: combatantName })}</DialogTitle>
          <DialogPrimitive.Description className="sr-only">
            {t("variant_label")}
          </DialogPrimitive.Description>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Variant radios */}
          <fieldset
            className="flex flex-col gap-2"
            aria-label={t("variant_label")}
          >
            <legend className="text-sm text-muted-foreground">
              {t("variant_label")}
            </legend>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px] sm:min-h-[32px]">
                <input
                  type="radio"
                  name="polymorph-variant"
                  value="polymorph"
                  checked={variant === "polymorph"}
                  onChange={() => setVariant("polymorph")}
                  className="text-gold focus:ring-gold/40"
                  data-testid="polymorph-variant-polymorph"
                />
                <span className="text-sm text-foreground">
                  {t("variant_polymorph")}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px] sm:min-h-[32px]">
                <input
                  type="radio"
                  name="polymorph-variant"
                  value="wildshape"
                  checked={variant === "wildshape"}
                  onChange={() => setVariant("wildshape")}
                  className="text-gold focus:ring-gold/40"
                  data-testid="polymorph-variant-wildshape"
                />
                <span className="text-sm text-foreground">
                  {t("variant_wildshape")}
                </span>
              </label>
            </div>
          </fieldset>

          {/* Form name */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor={nameInputId}
              className="text-sm text-muted-foreground"
            >
              {t("form_name_label")}
            </label>
            <input
              id={nameInputId}
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              maxLength={MAX_FORM_NAME_LEN}
              required
              className="w-full bg-card border border-border rounded px-3 py-2 text-foreground text-sm placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px] sm:min-h-[32px]"
              data-testid="polymorph-form-name"
            />
          </div>

          {/* Form max HP */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor={hpInputId}
              className="text-sm text-muted-foreground"
            >
              {t("form_max_hp")}
            </label>
            <input
              id={hpInputId}
              type="number"
              value={formMaxHp}
              onChange={(e) => setFormMaxHp(e.target.value)}
              min={MIN_FORM_HP}
              max={MAX_FORM_HP}
              required
              className="w-full bg-card border border-border rounded px-3 py-2 text-foreground text-sm placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px] sm:min-h-[32px] font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              data-testid="polymorph-form-hp"
            />
          </div>

          {/* Form AC (optional) */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor={acInputId}
              className="text-sm text-muted-foreground"
            >
              AC
            </label>
            <input
              id={acInputId}
              type="number"
              value={formAc}
              onChange={(e) => setFormAc(e.target.value)}
              min={MIN_FORM_AC}
              max={MAX_FORM_AC}
              className="w-full bg-card border border-border rounded px-3 py-2 text-foreground text-sm placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px] sm:min-h-[32px] font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              data-testid="polymorph-form-ac"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-2 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors min-h-[44px] sm:min-h-[32px]"
              data-testid="polymorph-cancel"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!canApply}
              className="px-3 py-2 text-sm rounded-md bg-gold text-surface-primary font-medium hover:bg-gold/90 transition-colors min-h-[44px] sm:min-h-[32px] disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="polymorph-apply"
            >
              {t("apply")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
