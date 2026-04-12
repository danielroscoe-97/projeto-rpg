"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActiveEffectInsert, EffectType } from "@/lib/types/database";

const EFFECT_TYPES: Array<{ value: EffectType; labelKey: string }> = [
  { value: "spell", labelKey: "type_spell" },
  { value: "consumable", labelKey: "type_consumable" },
  { value: "potion", labelKey: "type_potion" },
  { value: "item", labelKey: "type_item" },
  { value: "other", labelKey: "type_other" },
];

const DURATION_PRESETS = [
  { label: "1min", minutes: 1 },
  { label: "10min", minutes: 10 },
  { label: "1h", minutes: 60 },
  { label: "8h", minutes: 480 },
  { label: "24h", minutes: 1440 },
];

interface AddActiveEffectDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (input: Omit<ActiveEffectInsert, "player_character_id">) => Promise<{
    data: unknown;
    error: unknown;
  }>;
  concentrationConflict?: string | null;
  onDismissConcentration?: () => Promise<void>;
}

export function AddActiveEffectDialog({
  open,
  onClose,
  onAdd,
  concentrationConflict,
  onDismissConcentration,
}: AddActiveEffectDialogProps) {
  const t = useTranslations("player_hq.active_effects");
  const [name, setName] = useState("");
  const [effectType, setEffectType] = useState<EffectType>("spell");
  const [spellLevel, setSpellLevel] = useState("");
  const [isConcentration, setIsConcentration] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [untilDispelled, setUntilDispelled] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showConcentrationWarning, setShowConcentrationWarning] = useState(false);

  const isSpell = effectType === "spell";
  const isConsumable = effectType === "consumable";

  const reset = () => {
    setName("");
    setEffectType("spell");
    setSpellLevel("");
    setIsConcentration(false);
    setDurationMinutes("");
    setUntilDispelled(false);
    setQuantity("1");
    setSource("");
    setNotes("");
    setShowConcentrationWarning(false);
  };

  const doAdd = async () => {
    setSaving(true);
    try {
      const input: Omit<ActiveEffectInsert, "player_character_id"> = {
        name: name.trim(),
        effect_type: effectType,
        spell_level: isSpell && spellLevel ? parseInt(spellLevel, 10) : null,
        is_concentration: isSpell ? isConcentration : false,
        duration_minutes: untilDispelled ? null : (durationMinutes ? parseInt(durationMinutes, 10) : null),
        quantity: isConsumable ? Math.max(1, parseInt(quantity, 10) || 1) : 1,
        source: source.trim() || null,
        notes: notes.trim() || null,
      };
      const { error } = await onAdd(input);
      if (!error) {
        reset();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Concentration conflict check
    if (isConcentration && concentrationConflict) {
      setShowConcentrationWarning(true);
      return;
    }

    await doAdd();
  };

  const handleConfirmConcentration = async () => {
    if (onDismissConcentration) {
      await onDismissConcentration();
    }
    setShowConcentrationWarning(false);
    await doAdd();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t("add")}</DialogTitle>
        </DialogHeader>

        {showConcentrationWarning ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              {t("concentration_warning", { name: concentrationConflict ?? "" })}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowConcentrationWarning(false)}>
                {t("cancel")}
              </Button>
              <Button variant="gold" onClick={handleConfirmConcentration}>
                {t("confirm")}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="effect-name">{t("name")}</Label>
              <Input
                id="effect-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aid, Goodberries, Potion of Healing..."
                autoFocus
                autoComplete="off"
              />
            </div>

            {/* Effect type */}
            <div className="space-y-1.5">
              <Label>{t("type")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {EFFECT_TYPES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEffectType(opt.value)}
                    className={`px-2.5 py-1.5 text-xs rounded-md border transition-all ${
                      effectType === opt.value
                        ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                        : "border-border text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Spell-specific: level + concentration */}
            {isSpell && (
              <div className="flex items-center gap-4">
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="spell-level">{t("spell_level")}</Label>
                  <Input
                    id="spell-level"
                    type="number"
                    min={0}
                    max={9}
                    value={spellLevel}
                    onChange={(e) => setSpellLevel(e.target.value)}
                    placeholder="0-9"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-5">
                  <input
                    type="checkbox"
                    checked={isConcentration}
                    onChange={(e) => setIsConcentration(e.target.checked)}
                    className="rounded border-border bg-transparent text-amber-500 focus:ring-amber-500/30"
                  />
                  <span className="text-xs text-muted-foreground">{t("concentration")}</span>
                </label>
              </div>
            )}

            {/* Duration */}
            <div className="space-y-1.5">
              <Label>{t("duration")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => { setDurationMinutes(String(preset.minutes)); setUntilDispelled(false); }}
                    className={`px-2.5 py-1.5 text-xs rounded-md border transition-all ${
                      !untilDispelled && durationMinutes === String(preset.minutes)
                        ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                        : "border-border text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setUntilDispelled(true); setDurationMinutes(""); }}
                  className={`px-2.5 py-1.5 text-xs rounded-md border transition-all ${
                    untilDispelled
                      ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                      : "border-border text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {t("until_dispelled")}
                </button>
              </div>
              {/* Custom duration input */}
              {!untilDispelled && !DURATION_PRESETS.some((p) => String(p.minutes) === durationMinutes) && (
                <Input
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder={t("duration_custom_placeholder")}
                  className="mt-1.5"
                />
              )}
            </div>

            {/* Consumable: quantity */}
            {isConsumable && (
              <div className="space-y-1.5">
                <Label htmlFor="effect-quantity">{t("quantity_label")}</Label>
                <Input
                  id="effect-quantity"
                  type="number"
                  min={1}
                  max={999}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            )}

            {/* Source */}
            <div className="space-y-1.5">
              <Label htmlFor="effect-source">{t("source")}</Label>
              <Input
                id="effect-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Cleric L5, Potion, DM..."
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="effect-notes">{t("notes")}</Label>
              <Input
                id="effect-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notes_placeholder")}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => { reset(); onClose(); }} className="ml-auto">
                {t("cancel")}
              </Button>
              <Button type="submit" variant="gold" disabled={!name.trim() || saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {t("add")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
