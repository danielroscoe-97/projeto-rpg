"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CharacterAttributeGrid } from "@/components/player-hq/CharacterAttributeGrid";
import { Pencil } from "lucide-react";
import type { PlayerCharacter } from "@/lib/types/database";

type EditableFields = Pick<
  PlayerCharacter,
  | "name"
  | "race"
  | "class"
  | "level"
  | "subclass"
  | "subrace"
  | "background"
  | "alignment"
  | "max_hp"
  | "ac"
  | "speed"
  | "initiative_bonus"
  | "spell_save_dc"
  | "str"
  | "dex"
  | "con"
  | "int_score"
  | "wis"
  | "cha_score"
  | "notes"
>;

interface CharacterEditSheetProps {
  character: EditableFields;
  onSave: (updates: Partial<PlayerCharacter>) => void;
  translations: {
    edit_character: string;
    identity: string;
    combat_stats: string;
    attributes: string;
    notes: string;
    name: string;
    race: string;
    class: string;
    level: string;
    subclass: string;
    subrace: string;
    background: string;
    alignment: string;
    max_hp: string;
    ac: string;
    speed: string;
    initiative_bonus: string;
    spell_save_dc: string;
    str: string;
    dex: string;
    con: string;
    int: string;
    wis: string;
    cha: string;
    notes_placeholder: string;
  };
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <input
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        step={type === "number" ? 1 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-background/50 border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-gold/50"
      />
    </label>
  );
}

export function CharacterEditSheet({
  character,
  onSave,
  translations: t,
}: CharacterEditSheetProps) {
  const [open, setOpen] = useState(false);

  // Local form state — syncs from character prop only when sheet first opens
  const [form, setForm] = useState(() => toFormState(character));
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) setForm(toFormState(character));
    prevOpenRef.current = open;
  }, [open, character]);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Debounced save on every field change
  const handleChange = (key: keyof typeof form, value: string) => {
    set(key, value);
    const updates = fromFormField(key, value);
    if (updates) onSave(updates);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="p-2 text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={t.edit_character}
        >
          <Pencil className="w-4 h-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t.edit_character}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Identity */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              {t.identity}
            </h3>
            <div className="space-y-2">
              <FieldInput label={t.name} value={form.name} onChange={(v) => handleChange("name", v)} />
              <div className="grid grid-cols-2 gap-2">
                <FieldInput label={t.race} value={form.race} onChange={(v) => handleChange("race", v)} />
                <FieldInput label={t.class} value={form.class} onChange={(v) => handleChange("class", v)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FieldInput label={t.level} value={form.level} onChange={(v) => handleChange("level", v)} type="number" />
                <FieldInput label={t.subclass} value={form.subclass} onChange={(v) => handleChange("subclass", v)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FieldInput label={t.subrace} value={form.subrace} onChange={(v) => handleChange("subrace", v)} />
                <FieldInput label={t.background} value={form.background} onChange={(v) => handleChange("background", v)} />
              </div>
              <FieldInput label={t.alignment} value={form.alignment} onChange={(v) => handleChange("alignment", v)} />
            </div>
          </section>

          {/* Combat Stats */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              {t.combat_stats}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <FieldInput label={t.max_hp} value={form.max_hp} onChange={(v) => handleChange("max_hp", v)} type="number" />
              <FieldInput label={t.ac} value={form.ac} onChange={(v) => handleChange("ac", v)} type="number" />
              <FieldInput label={t.speed} value={form.speed} onChange={(v) => handleChange("speed", v)} type="number" />
              <FieldInput label={t.initiative_bonus} value={form.initiative_bonus} onChange={(v) => handleChange("initiative_bonus", v)} type="number" />
              <FieldInput label={t.spell_save_dc} value={form.spell_save_dc} onChange={(v) => handleChange("spell_save_dc", v)} type="number" />
            </div>
          </section>

          {/* Attributes */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              {t.attributes}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <FieldInput label={t.str} value={form.str} onChange={(v) => handleChange("str", v)} type="number" />
              <FieldInput label={t.dex} value={form.dex} onChange={(v) => handleChange("dex", v)} type="number" />
              <FieldInput label={t.con} value={form.con} onChange={(v) => handleChange("con", v)} type="number" />
              <FieldInput label={t.int} value={form.int_score} onChange={(v) => handleChange("int_score", v)} type="number" />
              <FieldInput label={t.wis} value={form.wis} onChange={(v) => handleChange("wis", v)} type="number" />
              <FieldInput label={t.cha} value={form.cha_score} onChange={(v) => handleChange("cha_score", v)} type="number" />
            </div>
            {/* Read-only modifier preview */}
            <CharacterAttributeGrid
              str={toNum(form.str)}
              dex={toNum(form.dex)}
              con={toNum(form.con)}
              intScore={toNum(form.int_score)}
              wis={toNum(form.wis)}
              chaScore={toNum(form.cha_score)}
            />
          </section>

          {/* Notes */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              {t.notes}
            </h3>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder={t.notes_placeholder}
              rows={4}
              className="w-full bg-background/50 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-gold/50 resize-y"
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  race: string;
  class: string;
  level: string;
  subclass: string;
  subrace: string;
  background: string;
  alignment: string;
  max_hp: string;
  ac: string;
  speed: string;
  initiative_bonus: string;
  spell_save_dc: string;
  str: string;
  dex: string;
  con: string;
  int_score: string;
  wis: string;
  cha_score: string;
  notes: string;
}

function toFormState(c: EditableFields): FormState {
  return {
    name: c.name ?? "",
    race: c.race ?? "",
    class: c.class ?? "",
    level: c.level != null ? String(c.level) : "",
    subclass: c.subclass ?? "",
    subrace: c.subrace ?? "",
    background: c.background ?? "",
    alignment: c.alignment ?? "",
    max_hp: String(c.max_hp),
    ac: String(c.ac),
    speed: c.speed != null ? String(c.speed) : "",
    initiative_bonus: c.initiative_bonus != null ? String(c.initiative_bonus) : "",
    spell_save_dc: c.spell_save_dc != null ? String(c.spell_save_dc) : "",
    str: c.str != null ? String(c.str) : "",
    dex: c.dex != null ? String(c.dex) : "",
    con: c.con != null ? String(c.con) : "",
    int_score: c.int_score != null ? String(c.int_score) : "",
    wis: c.wis != null ? String(c.wis) : "",
    cha_score: c.cha_score != null ? String(c.cha_score) : "",
    notes: c.notes ?? "",
  };
}

function toInt(val: string): number | null {
  if (val === "") return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function toNum(val: string): number | null {
  if (val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

const STRING_FIELDS = new Set(["race", "class", "subclass", "subrace", "background", "alignment", "notes"]);
const NULLABLE_INT_FIELDS = new Set(["level", "speed", "initiative_bonus", "spell_save_dc", "str", "dex", "con", "int_score", "wis", "cha_score"]);
const REQUIRED_NUM_FIELDS = new Set(["max_hp", "ac"]);

function fromFormField(key: string, value: string): Partial<PlayerCharacter> | null {
  // name is non-nullable — dedicated handler, skip save if empty
  if (key === "name") {
    return value.trim() ? { name: value.trim() } : null;
  }
  if (STRING_FIELDS.has(key)) {
    return { [key]: value.trim() || null };
  }
  if (NULLABLE_INT_FIELDS.has(key)) {
    const n = toInt(value);
    return { [key]: n };
  }
  if (REQUIRED_NUM_FIELDS.has(key)) {
    const n = toInt(value);
    return n != null && n >= 0 ? { [key]: n } : null;
  }
  return null;
}
