"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WizardStepIdentity } from "./WizardStepIdentity";
import { WizardStepStats } from "./WizardStepStats";
import { WizardStepPreview } from "./WizardStepPreview";

export interface WizardCharacterData {
  name: string;
  characterClass: string | null;
  race: string | null;
  level: number;
  maxHp: number | null;
  ac: number | null;
  spellSaveDc: number | null;
}

const INITIAL_DATA: WizardCharacterData = {
  name: "",
  characterClass: null,
  race: null,
  level: 1,
  maxHp: null,
  ac: null,
  spellSaveDc: null,
};

/** Classes that use spellcasting and need Spell Save DC */
const CASTER_CLASSES = new Set([
  "bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard",
]);

interface CharacterWizardProps {
  /** Campaign ID if creating within a campaign context */
  campaignId?: string | null;
  /** Campaign name for display */
  campaignName?: string;
  /** Callback after character is created successfully. Receives the data to persist. */
  onComplete: (data: WizardCharacterData) => Promise<void>;
  /** Callback to close/cancel the wizard */
  onCancel: () => void;
}

type Step = 1 | 2 | 3;

export function CharacterWizard({
  campaignName,
  onComplete,
  onCancel,
}: CharacterWizardProps) {
  const t = useTranslations("character_wizard");
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<WizardCharacterData>(INITIAL_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState(false);

  const isCaster = data.characterClass ? CASTER_CLASSES.has(data.characterClass) : false;

  const updateData = useCallback((updates: Partial<WizardCharacterData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const goNext = useCallback(() => {
    if (step === 1) {
      if (!data.name.trim()) {
        setNameError(true);
        return;
      }
      setNameError(false);
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  }, [step, data.name]);

  const goBack = useCallback(() => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }, [step]);

  const handleSubmit = useCallback(async () => {
    if (!data.name.trim()) return;
    setSubmitting(true);
    try {
      await onComplete(data);
    } catch {
      toast.error(t("error_creating"));
      setSubmitting(false);
    }
  }, [data, onComplete, t]);

  const skipStats = useCallback(() => {
    setStep(3);
  }, []);

  return (
    <div className="flex flex-col h-full max-h-[85vh] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              aria-label={t("back")}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-5" />
          )}
          <div className="text-center flex-1">
            <p className="text-[10px] text-amber-400/60 uppercase tracking-widest font-medium">
              {campaignName || t("standalone")}
            </p>
          </div>
          <div className="w-5" />
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 justify-center">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${
                s === step
                  ? "w-8 bg-amber-400"
                  : s < step
                    ? "w-4 bg-amber-400/50"
                    : "w-4 bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <WizardStepIdentity
                data={data}
                onChange={updateData}
                nameError={nameError}
                onClearNameError={() => setNameError(false)}
              />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <WizardStepStats
                data={data}
                onChange={updateData}
                isCaster={isCaster}
              />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <WizardStepPreview data={data} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer actions */}
      <div className="px-5 pb-5 pt-3 border-t border-border">
        {step === 1 && (
          <Button
            variant="gold"
            className="w-full min-h-[48px] text-base font-semibold"
            onClick={goNext}
          >
            {t("next")}
            <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
        {step === 2 && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1 min-h-[48px] text-muted-foreground"
              onClick={skipStats}
            >
              {t("skip_for_now")}
            </Button>
            <Button
              variant="gold"
              className="flex-1 min-h-[48px] text-base font-semibold"
              onClick={goNext}
            >
              {t("next")}
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        )}
        {step === 3 && (
          <Button
            variant="gold"
            className="w-full min-h-[48px] text-base font-semibold"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                {t("creating")}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {t("create_character")}
              </span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
