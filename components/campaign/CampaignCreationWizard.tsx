"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Copy,
  ChevronLeft,
  Scroll,
  Swords,
  Castle,
} from "lucide-react";
import { createCampaignWithSettings, updateCampaignSettings } from "@/lib/supabase/campaign-settings";
import { captureError } from "@/lib/errors/capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ──

interface CampaignCreationWizardProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (campaignId: string) => void;
}

type CampaignType = "long_campaign" | "oneshot" | "dungeon_crawl";

const STEP_COUNT = 3;

// ── Animation variants ──

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

// ── Component ──

export function CampaignCreationWizard({
  userId,
  open,
  onOpenChange,
  onCreated,
}: CampaignCreationWizardProps) {
  const t = useTranslations("campaignWizard");
  const tc = useTranslations("common");
  const router = useRouter();

  // ── State ──
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState(false);

  // Step 2
  const [campaignType, setCampaignType] = useState<CampaignType>("long_campaign");
  const [partyLevel, setPartyLevel] = useState(1);
  const [gameSystem, setGameSystem] = useState("5e");

  // Wizard state
  const [isCreating, setIsCreating] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus name input when sheet opens
  useEffect(() => {
    if (open && step === 1) {
      // Short delay to allow sheet animation to complete
      const timer = setTimeout(() => nameInputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [open, step]);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setStep(1);
        setDirection(1);
        setName("");
        setDescription("");
        setNameError(false);
        setCampaignType("long_campaign");
        setPartyLevel(1);
        setGameSystem("5e");
        setIsCreating(false);
        setCampaignId(null);
        setJoinCode(null);
        setLinkCopied(false);
      }, 300); // wait for close animation
      return () => clearTimeout(timer);
    }
  }, [open]);

  // ── Navigation ──

  const goTo = useCallback((nextStep: number) => {
    setDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
  }, [step]);

  // ── Step 1: Create campaign ──

  const handleStep1Next = useCallback(async () => {
    // Guard: if campaign already created (user went back), just advance
    if (campaignId) {
      goTo(2);
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(true);
      return;
    }
    if (trimmed.length > 50) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setIsCreating(true);

    try {
      const result = await createCampaignWithSettings(
        userId,
        trimmed,
        description.trim() || undefined
      );

      if (!result) {
        toast.error(t("create_error"));
        return;
      }

      setCampaignId(result.campaignId);
      setJoinCode(result.joinCode);
      toast.success(t("created"));
      goTo(2);
    } catch (err) {
      toast.error(t("create_error"));
      captureError(err, {
        component: "CampaignCreationWizard",
        action: "createCampaign",
        category: "database",
      });
    } finally {
      setIsCreating(false);
    }
  }, [name, description, userId, t, goTo, campaignId]);

  // ── Step 2: Update settings ──

  const handleStep2Next = useCallback(async () => {
    if (!campaignId) return;

    try {
      await updateCampaignSettings(campaignId, {
        game_system: gameSystem,
        party_level: partyLevel,
        is_oneshot: campaignType === "oneshot",
        theme: campaignType,
      });
    } catch (err) {
      // Non-blocking: settings update failure shouldn't block wizard
      captureError(err, {
        component: "CampaignCreationWizard",
        action: "updateSettings",
        category: "database",
      });
    }

    goTo(3);
  }, [campaignId, gameSystem, partyLevel, campaignType, goTo]);

  // ── Step 3: Finish ──

  const handleFinish = useCallback(() => {
    if (campaignId) {
      onCreated?.(campaignId);
      onOpenChange(false);
      router.push(`/app/campaigns/${campaignId}`);
    }
  }, [campaignId, onCreated, onOpenChange, router]);

  // ── Copy link ──

  const buildLink = useCallback(
    (code: string) => `${window.location.origin}/join-campaign/${code}`,
    []
  );

  const handleCopyLink = useCallback(() => {
    if (!joinCode) return;
    navigator.clipboard.writeText(buildLink(joinCode));
    setLinkCopied(true);
    toast.success(tc("copied"));
    setTimeout(() => setLinkCopied(false), 2000);
  }, [joinCode, buildLink, tc]);

  // ── Render ──

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0 gap-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-white/[0.04]">
          <SheetTitle className="text-lg font-semibold text-foreground">
            {t("title")}
          </SheetTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mt-2">
            {Array.from({ length: STEP_COUNT }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  i + 1 <= step
                    ? "bg-amber-400"
                    : "bg-white/[0.08]"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("step_indicator", { current: step, total: STEP_COUNT })}
          </p>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="space-y-5"
              >
                <h3 className="text-base font-medium text-foreground">
                  {t("step1_title")}
                </h3>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="campaign-name" className="text-foreground">
                    {t("name_label")}
                  </Label>
                  <Input
                    id="campaign-name"
                    ref={nameInputRef}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameError(false);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleStep1Next()}
                    placeholder={t("name_placeholder")}
                    maxLength={50}
                    className={`bg-background border-border text-foreground placeholder:text-muted-foreground/60 min-h-[44px]${
                      nameError ? " field-error" : ""
                    }`}
                    aria-invalid={nameError || undefined}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {name.length}/50
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="campaign-desc" className="text-foreground">
                    {t("description_label")}{" "}
                    <span className="text-muted-foreground font-normal">
                      ({tc("optional")})
                    </span>
                  </Label>
                  <Textarea
                    id="campaign-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("description_placeholder")}
                    maxLength={200}
                    rows={3}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground/60 min-h-[44px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {description.length}/200
                  </p>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="space-y-5"
              >
                <h3 className="text-base font-medium text-foreground">
                  {t("step2_title")}
                </h3>

                {/* Campaign type */}
                <div className="space-y-3">
                  <Label className="text-foreground">{t("type_label")}</Label>
                  <div className="space-y-2">
                    {([
                      {
                        value: "long_campaign" as CampaignType,
                        label: t("type_long"),
                        desc: t("type_long_desc"),
                        icon: Scroll,
                      },
                      {
                        value: "oneshot" as CampaignType,
                        label: t("type_oneshot"),
                        desc: t("type_oneshot_desc"),
                        icon: Swords,
                      },
                      {
                        value: "dungeon_crawl" as CampaignType,
                        label: t("type_crawl"),
                        desc: t("type_crawl_desc"),
                        icon: Castle,
                      },
                    ]).map((option) => {
                      const Icon = option.icon;
                      const selected = campaignType === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setCampaignType(option.value)}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 text-left min-h-[44px] ${
                            selected
                              ? "border-amber-500/30 bg-amber-500/10"
                              : "border-white/[0.04] bg-card hover:border-white/[0.1]"
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 mt-0.5 shrink-0 ${
                              selected
                                ? "text-amber-400"
                                : "text-muted-foreground"
                            }`}
                          />
                          <div>
                            <p
                              className={`text-sm font-medium ${
                                selected
                                  ? "text-amber-400"
                                  : "text-foreground"
                              }`}
                            >
                              {option.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {option.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Party level */}
                <div className="space-y-2">
                  <Label htmlFor="party-level" className="text-foreground">
                    {t("level_label")}
                  </Label>
                  <Input
                    id="party-level"
                    type="number"
                    min={1}
                    max={20}
                    value={partyLevel}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1 && val <= 20) {
                        setPartyLevel(val);
                      }
                    }}
                    className="bg-background border-border text-foreground min-h-[44px] w-24"
                  />
                </div>

                {/* Game system */}
                <div className="space-y-2">
                  <Label className="text-foreground">{t("system_label")}</Label>
                  <Select value={gameSystem} onValueChange={setGameSystem}>
                    <SelectTrigger className="w-full bg-background border-border text-foreground min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5e">{t("system_5e")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="space-y-5"
              >
                <h3 className="text-base font-medium text-foreground">
                  {t("step3_title")}
                </h3>

                <p className="text-sm text-muted-foreground">
                  {t("invite_desc")}
                </p>

                {/* Join link */}
                {joinCode && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={buildLink(joinCode)}
                        className="flex-1 text-xs bg-card border-white/[0.1] text-foreground"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 min-h-[44px] min-w-[44px]"
                        onClick={handleCopyLink}
                        title={tc("copy")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    {linkCopied && (
                      <p className="text-xs text-emerald-400">{tc("copied")}</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer — sticky bottom actions */}
        <div className="border-t border-white/[0.04] px-6 py-4 flex items-center gap-3 bg-card">
          {step > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 min-h-[44px]"
              onClick={() => goTo(step - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
              {tc("back")}
            </Button>
          )}

          <div className="flex-1" />

          {step === 1 && (
            <Button
              variant="gold"
              className="min-h-[44px]"
              disabled={!name.trim() || isCreating}
              onClick={handleStep1Next}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("creating")}
                </>
              ) : (
                tc("next")
              )}
            </Button>
          )}

          {step === 2 && (
            <>
              <Button
                variant="ghost"
                className="min-h-[44px]"
                onClick={() => goTo(3)}
              >
                {t("skip_step")}
              </Button>
              <Button
                variant="gold"
                className="min-h-[44px]"
                onClick={handleStep2Next}
              >
                {tc("next")}
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button
                variant="ghost"
                className="min-h-[44px] text-muted-foreground"
                onClick={handleFinish}
              >
                {t("skip_invite")}
              </Button>
              <Button
                variant="gold"
                className="min-h-[44px]"
                onClick={handleFinish}
              >
                {t("go_to_campaign")}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
