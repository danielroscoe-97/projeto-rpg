"use client";

/**
 * BecomeDmWizard — Epic 04 Story 04-F (Player-as-DM Upsell, Área 3).
 *
 * 5-step guided flow that:
 *   1. Welcomes and explains what role-flip means (no persistence yet).
 *   2. Lets the user pick a starter campaign template OR start blank.
 *   3. Collects campaign name + party level (blank mode only — template
 *      mode skips since the template owns those values).
 *   4. Privacy opt-in (`share_past_companions`) + final CTA. Submit
 *      calls `roleFlipAndCreateCampaign` which flips role to 'both',
 *      creates the campaign, and emits server-side analytics.
 *   5. Success card — primary launches DM tour by redirecting to
 *      `/app/dashboard` (tour auto-starts there when
 *      `user_onboarding.dm_tour_completed` is false).
 *
 * D9 broadcast: after the server action returns ok, we broadcast
 * `role_updated` on `user:{userId}` so other open tabs re-read the new
 * role without a refresh. Broadcast is best-effort and non-blocking.
 *
 * Resilient Reconnection (CLAUDE.md): the wizard does NOT touch
 * `session_token_id` at any point. Role flip propagates purely through
 * `users.role` + the `role_updated` broadcast; `session_tokens` are
 * untouched. Test 10 asserts this invariant; see tests for the
 * wizard.
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";
import { useRoleStore } from "@/lib/stores/role-store";
import { broadcastRoleUpdated } from "@/lib/realtime/user-broadcast";
import { roleFlipAndCreateCampaign } from "@/lib/upsell/role-flip-and-create";
import type { CampaignTemplateSummary } from "@/lib/upsell/templates";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type WizardMode = "template" | "blank";

type WizardStep = 1 | 2 | 3 | 4 | 5;

type WizardState = {
  step: WizardStep;
  mode: WizardMode | null;
  selectedTemplate: CampaignTemplateSummary | null;
  campaignName: string;
  partyLevel: number;
  sharePastCompanions: boolean;
  submitting: boolean;
  error:
    | {
        code: string;
        message?: string;
        missingMonsters?: Array<{
          encounter_id: string;
          missing_slugs: string[];
        }>;
      }
    | null;
  result: { campaignId: string; joinCode: string } | null;
};

type WizardAction =
  | { type: "advance" }
  | { type: "back" }
  | { type: "set_mode"; mode: WizardMode; template?: CampaignTemplateSummary }
  | { type: "set_name"; value: string }
  | { type: "set_party_level"; value: number }
  | { type: "toggle_share_past"; value: boolean }
  | { type: "submit_start" }
  | {
      type: "submit_ok";
      campaignId: string;
      joinCode: string;
    }
  | { type: "submit_fail"; error: WizardState["error"] };

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "advance": {
      if (state.step === 5) return state;
      // Skip step 3 when a template is chosen (template supplies name + level).
      if (state.step === 2 && state.mode === "template") {
        return { ...state, step: 4 };
      }
      return { ...state, step: (state.step + 1) as WizardStep };
    }
    case "back": {
      if (state.step === 1) return state;
      // Mirror the step-3 skip on the way back.
      if (state.step === 4 && state.mode === "template") {
        return { ...state, step: 2 };
      }
      return { ...state, step: (state.step - 1) as WizardStep };
    }
    case "set_mode":
      return {
        ...state,
        mode: action.mode,
        selectedTemplate: action.template ?? null,
        campaignName:
          action.template?.name ?? state.campaignName,
        partyLevel:
          action.template?.target_party_level ?? state.partyLevel,
      };
    case "set_name":
      return { ...state, campaignName: action.value };
    case "set_party_level":
      return { ...state, partyLevel: action.value };
    case "toggle_share_past":
      return { ...state, sharePastCompanions: action.value };
    case "submit_start":
      return { ...state, submitting: true, error: null };
    case "submit_ok":
      return {
        ...state,
        submitting: false,
        error: null,
        result: { campaignId: action.campaignId, joinCode: action.joinCode },
        step: 5,
      };
    case "submit_fail":
      return { ...state, submitting: false, error: action.error };
    default:
      return state;
  }
}

const INITIAL_STATE: WizardState = {
  step: 1,
  mode: null,
  selectedTemplate: null,
  campaignName: "",
  partyLevel: 1,
  sharePastCompanions: true,
  submitting: false,
  error: null,
  result: null,
};

export type BecomeDmWizardProps = {
  userId: string;
  templates: CampaignTemplateSummary[];
};

export function BecomeDmWizard({ userId, templates }: BecomeDmWizardProps) {
  const t = useTranslations("dmUpsell");
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackEvent("dm_upsell:wizard_started", {});
  }, []);

  const handleSubmit = useCallback(async () => {
    if (state.submitting) return;
    dispatch({ type: "submit_start" });

    const input =
      state.mode === "template" && state.selectedTemplate
        ? ({
            mode: "template" as const,
            templateId: state.selectedTemplate.id,
            sharePastCompanions: state.sharePastCompanions,
          } as const)
        : ({
            mode: "blank" as const,
            campaignName: state.campaignName,
            partyLevel: state.partyLevel,
            sharePastCompanions: state.sharePastCompanions,
          } as const);

    const result = await roleFlipAndCreateCampaign(input);
    if (!result.ok) {
      dispatch({
        type: "submit_fail",
        error: {
          code: result.code,
          message: result.message,
          missingMonsters:
            result.code === "missing_monsters"
              ? result.missingMonsters
              : undefined,
        },
      });
      trackEvent("dm_upsell:wizard_failed", {
        code: result.code,
        step: state.step,
      });
      return;
    }

    // Update local role store optimistically so any already-open
    // component on THIS tab reacts immediately (without waiting for a
    // round-trip via the broadcast listener).
    try {
      useRoleStore.setState({ role: "both", activeView: "dm" });
    } catch {
      /* store not initialized — next loadRole will resolve */
    }

    // D9 broadcast to OTHER tabs of the same user.
    void broadcastRoleUpdated(userId, { from: result.prevRole, to: "both" });

    dispatch({
      type: "submit_ok",
      campaignId: result.campaignId,
      joinCode: result.joinCode,
    });
  }, [
    state.mode,
    state.selectedTemplate,
    state.campaignName,
    state.partyLevel,
    state.sharePastCompanions,
    state.submitting,
    state.step,
    userId,
  ]);

  const handleStartTour = useCallback(() => {
    trackEvent("dm_upsell:tour_start_clicked", {});
    router.push("/app/dashboard");
  }, [router]);

  const handleSkipTour = useCallback(() => {
    trackEvent("dm_upsell:tour_start_skipped", {});
    if (state.result) {
      router.push(`/app/campaigns/${state.result.campaignId}`);
    } else {
      router.push("/app/dashboard");
    }
  }, [router, state.result]);

  // ── Step-specific validation ──
  const canAdvanceFromStep2 = state.mode !== null;
  const canAdvanceFromStep3 =
    state.campaignName.trim().length > 0 &&
    state.campaignName.trim().length <= 50 &&
    state.partyLevel >= 1 &&
    state.partyLevel <= 20;

  return (
    <Card
      role="region"
      aria-labelledby="become-dm-wizard-title"
      data-testid="upsell.become-dm-wizard"
      className="mx-auto my-6 w-full max-w-2xl sm:my-10"
    >
      <CardHeader className="space-y-2 p-6">
        <p
          className="text-xs uppercase tracking-wide text-muted-foreground"
          data-testid="wizard-step-indicator"
        >
          {t("wizard_step_indicator", { current: state.step, total: 5 })}
        </p>
        <CardTitle id="become-dm-wizard-title" className="text-xl text-gold">
          {t("wizard_title")}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 p-6 pt-0">
        {state.step === 1 && <Step1 t={t} />}
        {state.step === 2 && (
          <Step2
            t={t}
            templates={templates}
            selectedTemplateId={state.selectedTemplate?.id ?? null}
            onPickTemplate={(tmpl) =>
              dispatch({ type: "set_mode", mode: "template", template: tmpl })
            }
            onPickBlank={() => dispatch({ type: "set_mode", mode: "blank" })}
          />
        )}
        {state.step === 3 && (
          <Step3
            t={t}
            name={state.campaignName}
            partyLevel={state.partyLevel}
            onChangeName={(v) => dispatch({ type: "set_name", value: v })}
            onChangeLevel={(v) =>
              dispatch({ type: "set_party_level", value: v })
            }
          />
        )}
        {state.step === 4 && (
          <Step4
            t={t}
            sharePastCompanions={state.sharePastCompanions}
            onToggleShare={(v) =>
              dispatch({ type: "toggle_share_past", value: v })
            }
            error={state.error}
            submitting={state.submitting}
          />
        )}
        {state.step === 5 && state.result && (
          <Step5 t={t} campaignName={state.campaignName || state.selectedTemplate?.name || ""} />
        )}
      </CardContent>

      <CardFooter className="flex justify-between gap-2 p-6 pt-0">
        {state.step > 1 && state.step < 5 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="wizard-back"
            onClick={() => dispatch({ type: "back" })}
            disabled={state.submitting}
          >
            {/* Back is intentionally generic — same copy across all steps */}
            ←
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          {state.step === 1 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-testid="wizard-maybe-later"
                onClick={() => router.push("/app/dashboard")}
              >
                {t("wizard_step1_secondary")}
              </Button>
              <Button
                type="button"
                variant="gold"
                size="sm"
                data-testid="wizard-step1-primary"
                onClick={() => dispatch({ type: "advance" })}
              >
                {t("wizard_step1_primary")}
              </Button>
            </>
          )}
          {state.step === 2 && (
            <Button
              type="button"
              variant="gold"
              size="sm"
              data-testid="wizard-step2-primary"
              onClick={() => dispatch({ type: "advance" })}
              disabled={!canAdvanceFromStep2}
            >
              →
            </Button>
          )}
          {state.step === 3 && (
            <Button
              type="button"
              variant="gold"
              size="sm"
              data-testid="wizard-step3-primary"
              onClick={() => dispatch({ type: "advance" })}
              disabled={!canAdvanceFromStep3}
            >
              →
            </Button>
          )}
          {state.step === 4 && (
            <Button
              type="button"
              variant="gold"
              size="sm"
              data-testid="wizard-step4-primary"
              onClick={handleSubmit}
              disabled={state.submitting}
            >
              {t("wizard_step4_primary")}
            </Button>
          )}
          {state.step === 5 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-testid="wizard-step5-skip-tour"
                onClick={handleSkipTour}
              >
                {t("wizard_step5_tour_skip")}
              </Button>
              <Button
                type="button"
                variant="gold"
                size="sm"
                data-testid="wizard-step5-primary"
                onClick={handleStartTour}
              >
                {t("wizard_step5_tour_primary")}
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step subcomponents. Kept in the same file to avoid premature extraction;
// none is reused elsewhere. Story 04-G expands Step 2's template picker into
// a richer gallery with detail modals.
// ─────────────────────────────────────────────────────────────────────────────

type Translator = ReturnType<typeof useTranslations>;

function Step1({ t }: { t: Translator }) {
  return (
    <>
      <CardDescription className="text-base">
        {t("wizard_step1_heading")}
      </CardDescription>
      <p className="text-sm text-muted-foreground" data-testid="wizard-step1-body">
        {t.rich("wizard_step1_body", {
          strong: (chunks) => (
            <strong className="text-gold">{chunks}</strong>
          ),
        })}
      </p>
    </>
  );
}

function Step2({
  t,
  templates,
  selectedTemplateId,
  onPickTemplate,
  onPickBlank,
}: {
  t: Translator;
  templates: CampaignTemplateSummary[];
  selectedTemplateId: string | null;
  onPickTemplate: (tmpl: CampaignTemplateSummary) => void;
  onPickBlank: () => void;
}) {
  return (
    <>
      <CardDescription className="text-base">
        {t("wizard_step2_heading")}
      </CardDescription>
      <p className="text-sm text-muted-foreground">{t("wizard_step2_body")}</p>
      <div
        role="radiogroup"
        aria-label={t("wizard_step2_heading")}
        className="grid gap-3"
        data-testid="wizard-template-picker"
      >
        {templates.map((tmpl) => {
          const selected = selectedTemplateId === tmpl.id;
          return (
            <button
              key={tmpl.id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`wizard-template-${tmpl.id}`}
              onClick={() => onPickTemplate(tmpl)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                selected
                  ? "border-gold/60 bg-gold/[0.06]"
                  : "border-white/[0.08] hover:border-gold/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{tmpl.name}</span>
                <span className="text-xs text-muted-foreground">
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
                {t("templates_card_encounters", { count: tmpl.encounter_count })}
              </p>
            </button>
          );
        })}
      </div>
      <div className="mt-3 border-t border-white/[0.06] pt-3 text-sm">
        <p className="text-muted-foreground">{t("wizard_step2_empty_hint")}</p>
        <button
          type="button"
          onClick={onPickBlank}
          data-testid="wizard-blank-mode"
          className="mt-1 text-gold underline-offset-4 hover:underline"
        >
          {t("wizard_step2_empty_cta")}
        </button>
      </div>
    </>
  );
}

function Step3({
  t,
  name,
  partyLevel,
  onChangeName,
  onChangeLevel,
}: {
  t: Translator;
  name: string;
  partyLevel: number;
  onChangeName: (v: string) => void;
  onChangeLevel: (v: number) => void;
}) {
  return (
    <>
      <CardDescription className="text-base">
        {t("wizard_step3_heading")}
      </CardDescription>
      <p className="text-sm text-muted-foreground">{t("wizard_step3_body")}</p>
      <label className="block space-y-1">
        <span className="text-sm font-medium">
          {t("wizard_step3_name_label")}
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          data-testid="wizard-step3-name"
          className="w-full rounded-md border border-white/[0.1] bg-surface-secondary px-3 py-2 text-sm focus:border-gold/60 focus:outline-none"
          placeholder={t("wizard_step3_name_placeholder")}
          maxLength={50}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">
          {t("wizard_step3_party_level_label")}
        </span>
        <input
          type="number"
          value={partyLevel}
          min={1}
          max={20}
          onChange={(e) => onChangeLevel(Number(e.target.value) || 1)}
          data-testid="wizard-step3-level"
          className="w-24 rounded-md border border-white/[0.1] bg-surface-secondary px-3 py-2 text-sm focus:border-gold/60 focus:outline-none"
        />
        <span className="block text-xs text-muted-foreground">
          {t("wizard_step3_party_level_hint")}
        </span>
      </label>
    </>
  );
}

function Step4({
  t,
  sharePastCompanions,
  onToggleShare,
  error,
  submitting,
}: {
  t: Translator;
  sharePastCompanions: boolean;
  onToggleShare: (v: boolean) => void;
  error: WizardState["error"];
  submitting: boolean;
}) {
  return (
    <>
      <CardDescription className="text-base">
        {t("wizard_step4_heading")}
      </CardDescription>
      <p className="text-sm text-muted-foreground">
        {t.rich("wizard_step4_body", {
          strong: (chunks) => <strong className="text-gold">{chunks}</strong>,
        })}
      </p>
      <div className="rounded-lg border border-white/[0.08] p-4">
        <p className="text-sm font-medium">
          {t("wizard_step4_privacy_title")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("wizard_step4_privacy_body")}
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sharePastCompanions}
            onChange={(e) => onToggleShare(e.target.checked)}
            data-testid="wizard-share-past-toggle"
          />
          <span>{t("wizard_step4_privacy_toggle")}</span>
        </label>
      </div>
      {error && (
        <div
          role="alert"
          data-testid="wizard-error"
          className="rounded-md border border-red-500/40 bg-red-500/[0.05] p-3 text-sm text-red-400"
        >
          {error.code === "missing_monsters" ? (
            <>
              <p className="font-semibold">
                {t("wizard_error_missing_monsters_title")}
              </p>
              <p className="mt-1">{t("wizard_error_missing_monsters_body")}</p>
            </>
          ) : error.code === "role_flip_failed" ||
            error.code === "clone_failed_no_rollback" ? (
            <p>{t("wizard_error_role_flip_failed")}</p>
          ) : (
            <p>{t("wizard_error_template_clone_failed")}</p>
          )}
        </div>
      )}
      {submitting && (
        <p
          className="text-sm text-muted-foreground"
          data-testid="wizard-step4-loading"
        >
          {t("templates_detail_clone_loading")}
        </p>
      )}
    </>
  );
}

function Step5({ t, campaignName }: { t: Translator; campaignName: string }) {
  return (
    <>
      <CardDescription className="text-base">
        {t("wizard_step5_heading")}
      </CardDescription>
      <p className="text-sm text-muted-foreground" data-testid="wizard-step5-body">
        {t.rich("wizard_step5_body", {
          campaignName,
          strong: (chunks) => (
            <strong className="text-gold">{chunks}</strong>
          ),
        })}
      </p>
    </>
  );
}
