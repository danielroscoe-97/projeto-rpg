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
import { SRD_RACES } from "@/lib/data/races";
import { SRD_CLASSES } from "@/lib/data/classes";
import type { PlayerCharacter } from "@/lib/types/database";

interface CharacterFormData {
  name: string;
  race: string;
  characterClass: string;
  level: string;
  max_hp: string;
  ac: string;
  notes: string;
}

const EMPTY_FORM: CharacterFormData = {
  name: "",
  race: "",
  characterClass: "",
  level: "1",
  max_hp: "",
  ac: "",
  notes: "",
};

function formFromCharacter(character: PlayerCharacter): CharacterFormData {
  return {
    name: character.name,
    race: character.race ?? "",
    characterClass: character.class ?? "",
    level: character.level ? String(character.level) : "1",
    max_hp: String(character.max_hp),
    ac: String(character.ac),
    notes: character.notes ?? "",
  };
}

interface CharacterFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character?: PlayerCharacter | null;
  onSave: (data: {
    name: string;
    race: string | null;
    class: string | null;
    level: number;
    max_hp: number;
    ac: number;
    notes: string | null;
  }) => Promise<void>;
}

// Deduplicate races/classes by name for display (show source as suffix)
function getUniqueRaces() {
  const seen = new Set<string>();
  return SRD_RACES.filter((r) => {
    if (seen.has(r.name)) return false;
    seen.add(r.name);
    return true;
  });
}

function getUniqueClasses() {
  const seen = new Set<string>();
  return SRD_CLASSES.filter((c) => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });
}

export function CharacterForm({
  open,
  onOpenChange,
  character,
  onSave,
}: CharacterFormProps) {
  const t = useTranslations("character");
  const tc = useTranslations("common");
  const isEdit = !!character;

  const [form, setForm] = useState<CharacterFormData>(
    character ? formFromCharacter(character) : EMPTY_FORM
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uniqueRaces = getUniqueRaces();
  const uniqueClasses = getUniqueClasses();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setForm(character ? formFromCharacter(character) : EMPTY_FORM);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    const level = Number(form.level) || 1;
    if (level < 1 || level > 20) {
      setError("Level must be between 1 and 20");
      return;
    }
    const maxHp = Number(form.max_hp);
    if (form.max_hp && (isNaN(maxHp) || maxHp < 1)) {
      setError("HP must be >= 1");
      return;
    }
    const ac = Number(form.ac);
    if (form.ac && (isNaN(ac) || ac < 1)) {
      setError("AC must be >= 1");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave({
        name: form.name.trim(),
        race: form.race || null,
        class: form.characterClass || null,
        level,
        max_hp: maxHp || 10,
        ac: ac || 10,
        notes: form.notes.trim() || null,
      });
      handleOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save character"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("edit") : t("create")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4" data-testid="character-form">
          {error && (
            <p className="text-red-400 text-sm" role="alert">
              {error}
            </p>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="char-name" className="text-foreground text-xs">
              {t("name")} *
            </Label>
            <Input
              id="char-name"
              data-testid="char-name"
              placeholder={t("name")}
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              className="bg-background border-border text-foreground"
            />
          </div>

          {/* Race + Class */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="char-race" className="text-foreground text-xs">
                {t("race")}
              </Label>
              <select
                id="char-race"
                data-testid="char-race"
                value={form.race}
                onChange={(e) =>
                  setForm((f) => ({ ...f, race: e.target.value }))
                }
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">{t("select_race")}</option>
                {uniqueRaces.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="char-class" className="text-foreground text-xs">
                {t("class")}
              </Label>
              <select
                id="char-class"
                data-testid="char-class"
                value={form.characterClass}
                onChange={(e) =>
                  setForm((f) => ({ ...f, characterClass: e.target.value }))
                }
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">{t("select_class")}</option>
                {uniqueClasses.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Level + HP + AC */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="char-level" className="text-foreground text-xs">
                {t("level")}
              </Label>
              <Input
                id="char-level"
                data-testid="char-level"
                type="number"
                min={1}
                max={20}
                value={form.level}
                onChange={(e) =>
                  setForm((f) => ({ ...f, level: e.target.value }))
                }
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="char-hp" className="text-foreground text-xs">
                {t("hp")} <span className="text-muted-foreground/50">({tc("optional")})</span>
              </Label>
              <Input
                id="char-hp"
                data-testid="char-hp"
                type="number"
                min={1}
                placeholder="10"
                value={form.max_hp}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_hp: e.target.value }))
                }
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="char-ac" className="text-foreground text-xs">
                {t("ac")} <span className="text-muted-foreground/50">({tc("optional")})</span>
              </Label>
              <Input
                id="char-ac"
                data-testid="char-ac"
                type="number"
                min={1}
                placeholder="10"
                value={form.ac}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ac: e.target.value }))
                }
                className="bg-background border-border text-foreground"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="char-notes" className="text-foreground text-xs">
              {t("notes")} <span className="text-muted-foreground/50">({tc("optional")})</span>
            </Label>
            <textarea
              id="char-notes"
              data-testid="char-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder={t("notes")}
              maxLength={2000}
              rows={3}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 resize-y focus:outline-none focus:ring-1 focus:ring-ring"
              style={{ fontSize: 16, minHeight: "4rem", maxHeight: "10rem" }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground min-h-[44px]"
              onClick={() => handleOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button
              size="sm"
              data-testid="char-submit"
              className="bg-gold hover:bg-gold/80 text-foreground min-h-[44px]"
              disabled={!form.name.trim() || isLoading}
              onClick={handleSubmit}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tc("saving")}
                </>
              ) : (
                tc("save")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
