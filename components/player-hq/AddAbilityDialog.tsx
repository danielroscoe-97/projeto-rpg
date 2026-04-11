"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CharacterAbility, CharacterAbilityInsert } from "@/lib/types/database";
import { searchSrdAbilities, type SrdAbility } from "@/lib/data/srd-abilities";

const RESET_OPTIONS = [
  { value: "long_rest", labelKey: "reset_long_rest" },
  { value: "short_rest", labelKey: "reset_short_rest" },
  { value: "dawn", labelKey: "reset_dawn" },
  { value: "manual", labelKey: "reset_manual" },
] as const;

const TYPE_OPTIONS = [
  { value: "class_feature", labelKey: "type_class_feature" },
  { value: "racial_trait", labelKey: "type_racial_trait" },
  { value: "feat", labelKey: "type_feat" },
  { value: "subclass_feature", labelKey: "type_subclass_feature" },
  { value: "manual", labelKey: "type_manual" },
] as const;

interface AddAbilityDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (
    input: Omit<CharacterAbilityInsert, "player_character_id" | "display_order">
  ) => Promise<{ data: CharacterAbility | null; error: unknown }>;
  editing?: CharacterAbility;
  onDelete?: () => Promise<void>;
  characterClass?: string | null;
  characterRace?: string | null;
}

export function AddAbilityDialog({
  open,
  onClose,
  onAdd,
  editing,
  onDelete,
  characterClass,
  characterRace,
}: AddAbilityDialogProps) {
  const t = useTranslations("player_hq.abilities");

  const [name, setName] = useState(editing?.name ?? "");
  const [namePt, setNamePt] = useState(editing?.name_pt ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [descriptionPt, setDescriptionPt] = useState(editing?.description_pt ?? "");
  const [abilityType, setAbilityType] = useState<CharacterAbility["ability_type"]>(
    editing?.ability_type ?? "manual"
  );
  const [maxUses, setMaxUses] = useState(String(editing?.max_uses ?? ""));
  const [resetType, setResetType] = useState<CharacterAbility["reset_type"]>(
    editing?.reset_type ?? null
  );
  const [saving, setSaving] = useState(false);
  const [srdResults, setSrdResults] = useState<SrdAbility[]>([]);
  const [showSrd, setShowSrd] = useState(false);
  const [srdRef, setSrdRef] = useState(editing?.srd_ref ?? null);
  const [source, setSource] = useState<"srd" | "manual">(editing?.source ?? "manual");
  const [sourceClass, setSourceClass] = useState(editing?.source_class ?? null);
  const [sourceRace, setSourceRace] = useState(editing?.source_race ?? null);
  const [levelAcquired, setLevelAcquired] = useState(String(editing?.level_acquired ?? ""));

  const hasUses = maxUses.trim() !== "" && parseInt(maxUses, 10) > 0;

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.length >= 1 && !editing) {
      const results = searchSrdAbilities(value, {
        characterClass,
        characterRace,
        limit: 10,
      });
      setSrdResults(results);
      setShowSrd(results.length > 0);
    } else {
      setShowSrd(false);
    }
  };

  const selectSrdAbility = (ability: SrdAbility) => {
    setName(ability.name);
    setNamePt(ability.name_pt);
    setDescription(ability.description);
    setDescriptionPt(ability.description_pt);
    setAbilityType(ability.ability_type);
    setSourceClass(ability.source_class);
    setSourceRace(ability.source_race);
    setLevelAcquired(String(ability.level_acquired ?? ""));
    setSrdRef(ability.srd_ref);
    setSource("srd");

    if (ability.max_uses != null) {
      setMaxUses(String(ability.max_uses));
    } else {
      setMaxUses("");
    }
    setResetType(ability.reset_type);
    setShowSrd(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const parsedMax = parseInt(maxUses, 10);
      const finalMaxUses = Number.isNaN(parsedMax) || parsedMax <= 0 ? null : parsedMax;

      await onAdd({
        name: name.trim(),
        name_pt: namePt.trim() || null,
        description: description.trim() || null,
        description_pt: descriptionPt.trim() || null,
        ability_type: abilityType,
        source_class: sourceClass,
        source_race: sourceRace,
        level_acquired: levelAcquired ? parseInt(levelAcquired, 10) || null : null,
        max_uses: finalMaxUses,
        current_uses: 0,
        reset_type: finalMaxUses ? (resetType ?? "long_rest") : null,
        srd_ref: srdRef,
        source,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("edit_ability") : t("add_ability")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name with SRD autocomplete */}
          <div className="space-y-1.5 relative">
            <Label htmlFor="ability-name">{t("ability_name")}</Label>
            <Input
              id="ability-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => {
                if (name.length >= 1 && srdResults.length > 0) setShowSrd(true);
              }}
              onBlur={() => setTimeout(() => setShowSrd(false), 200)}
              placeholder={t("ability_name_placeholder")}
              autoFocus
              autoComplete="off"
            />
            {/* SRD dropdown */}
            {showSrd && srdResults.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-[240px] overflow-y-auto bg-popover border border-border rounded-md shadow-lg">
                {srdResults.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSrdAbility(r);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors border-b border-border/30 last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">{r.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        SRD
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.source_class || r.source_race || "Feat"} ·{" "}
                      {r.description.slice(0, 80)}
                      {r.description.length > 80 ? "..." : ""}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ability type */}
          <div className="space-y-1.5">
            <Label>{t("ability_type")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAbilityType(opt.value)}
                  className={`px-2.5 py-1.5 text-xs rounded-md border transition-all ${
                    abilityType === opt.value
                      ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                      : "border-border text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Description (collapsible for manual) */}
          {source === "manual" && (
            <div className="space-y-1.5">
              <Label htmlFor="ability-desc">{t("description")}</Label>
              <textarea
                id="ability-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("description_placeholder")}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
          )}

          {/* Uses (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="ability-uses">
              {t("max_uses")}{" "}
              <span className="text-muted-foreground font-normal">
                ({t("optional_passive")})
              </span>
            </Label>
            <Input
              id="ability-uses"
              type="number"
              min={0}
              max={999}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder={t("passive_no_uses")}
            />
          </div>

          {/* Reset type (only if has uses) */}
          {hasUses && (
            <div className="space-y-1.5">
              <Label>{t("reset_type")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {RESET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setResetType(opt.value)}
                    className={`px-3 py-2 text-xs rounded-md border transition-all ${
                      resetType === opt.value
                        ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                        : "border-border text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {editing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onDelete}
                className="mr-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="ml-auto"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant="gold"
              disabled={!name.trim() || saving}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editing ? t("save") : t("add")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
