"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ClipboardPaste, Check, AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseStatBlock } from "@/lib/parser/stat-block-parser";
import type { ParsedStatBlock } from "@/lib/parser/stat-block-parser";
import { toast } from "sonner";

// ── Editable field ─────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  highlight,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-md border px-2 py-1.5 text-sm bg-background ${
          highlight ? "border-orange-500 ring-1 ring-orange-500/50" : "border-input"
        }`}
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export function StatBlockImporter({
  onImported,
}: {
  onImported?: (monster: ParsedStatBlock) => void;
}) {
  const t = useTranslations("homebrew");
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedStatBlock | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"paste" | "preview">("paste");

  const handleParse = useCallback(() => {
    if (!rawText.trim()) return;
    const result = parseStatBlock(rawText);
    setParsed(result);
    setStep("preview");
  }, [rawText]);

  const handleBack = useCallback(() => {
    setStep("paste");
    setParsed(null);
  }, []);

  const updateField = useCallback(
    (field: keyof ParsedStatBlock, value: unknown) => {
      if (!parsed) return;
      setParsed({ ...parsed, [field]: value });
    },
    [parsed]
  );

  const handleSave = useCallback(async () => {
    if (!parsed) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t("login_required"));
        return;
      }

      const monsterData = {
        name: parsed.name,
        cr: parsed.challenge_rating,
        type: parsed.type,
        size: parsed.size,
        hit_points: parsed.hit_points,
        armor_class: parsed.armor_class,
        ac_type: parsed.ac_type,
        hp_formula: parsed.hp_formula,
        str: parsed.str,
        dex: parsed.dex,
        con: parsed.con,
        int: parsed.int,
        wis: parsed.wis,
        cha: parsed.cha,
        speed: parsed.speed,
        saving_throws: parsed.saving_throws,
        skills: parsed.skills,
        damage_vulnerabilities: parsed.damage_vulnerabilities,
        damage_resistances: parsed.damage_resistances,
        damage_immunities: parsed.damage_immunities,
        condition_immunities: parsed.condition_immunities,
        senses: parsed.senses,
        languages: parsed.languages,
        xp: parsed.xp,
        special_abilities: parsed.special_abilities,
        actions: parsed.actions,
        legendary_actions: parsed.legendary_actions,
        reactions: parsed.reactions,
        lair_actions: parsed.lair_actions,
        regional_effects: parsed.regional_effects,
        alignment: parsed.alignment,
        source_type: "homebrew_imported",
      };

      const { error } = await supabase.from("homebrew_monsters").insert({
        user_id: user.id,
        name: parsed.name,
        data: monsterData,
        ruleset_version: "2014",
      });

      if (error) throw error;

      toast.success(t("import_success", { name: parsed.name }));
      onImported?.(parsed);
      setStep("paste");
      setRawText("");
      setParsed(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("import_error")
      );
    } finally {
      setSaving(false);
    }
  }, [parsed, onImported, t]);

  // ── Step 1: Paste ──────────────────────────────────────────────
  if (step === "paste") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardPaste className="h-4 w-4" />
          <span>{t("paste_stat_block")}</span>
        </div>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={t("paste_placeholder")}
          rows={12}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono resize-y min-h-[200px]"
          autoFocus
        />
        <button
          onClick={handleParse}
          disabled={!rawText.trim()}
          className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t("parse_button")}
        </button>
      </div>
    );
  }

  // ── Step 2: Preview + Edit ─────────────────────────────────────
  if (!parsed) return null;

  const missingFields: string[] = [];
  if (!parsed.name) missingFields.push("Name");
  if (parsed.armor_class == null) missingFields.push("AC");
  if (parsed.hit_points == null) missingFields.push("HP");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{parsed.name || t("unnamed")}</h3>
        <button
          onClick={handleBack}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {t("back_to_paste")}
        </button>
      </div>

      {/* Warnings */}
      {missingFields.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-orange-500/10 border border-orange-500/30 px-3 py-2 text-sm text-orange-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {t("missing_fields")}: {missingFields.join(", ")}
          </span>
        </div>
      )}

      {/* Editable fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field
            label={t("name")}
            value={parsed.name}
            onChange={(v) => updateField("name", v)}
            highlight={!parsed.name}
          />
        </div>
        <Field
          label="AC"
          value={String(parsed.armor_class || "")}
          onChange={(v) => updateField("armor_class", parseInt(v) || 0)}
          type="number"
          highlight={!parsed.armor_class}
        />
        <Field
          label="HP"
          value={String(parsed.hit_points || "")}
          onChange={(v) => updateField("hit_points", parseInt(v) || 0)}
          type="number"
          highlight={!parsed.hit_points}
        />
        <Field
          label={t("monster_size")}
          value={parsed.size}
          onChange={(v) => updateField("size", v)}
        />
        <Field
          label={t("monster_type")}
          value={parsed.type}
          onChange={(v) => updateField("type", v)}
        />
        <Field
          label="CR"
          value={parsed.challenge_rating}
          onChange={(v) => updateField("challenge_rating", v)}
        />
        <Field
          label="XP"
          value={String(parsed.xp || "")}
          onChange={(v) => updateField("xp", parseInt(v) || null)}
          type="number"
        />
      </div>

      {/* Ability scores */}
      <div className="grid grid-cols-6 gap-2">
        {(["str", "dex", "con", "int", "wis", "cha"] as const).map((stat) => (
          <div key={stat} className="text-center">
            <label className="text-xs text-muted-foreground uppercase">
              {stat}
            </label>
            <input
              type="number"
              value={parsed[stat]}
              onChange={(e) => updateField(stat, parseInt(e.target.value) || 10)}
              className="w-full rounded-md border border-input px-1 py-1 text-sm text-center bg-background"
            />
          </div>
        ))}
      </div>

      {/* Actions preview */}
      {parsed.actions && parsed.actions.length > 0 && (
        <div className="text-sm space-y-1">
          <h4 className="font-semibold text-muted-foreground">Actions ({parsed.actions.length})</h4>
          {parsed.actions.map((a, i) => (
            <p key={i} className="text-xs text-muted-foreground truncate">
              <strong>{a.name}</strong> — {a.desc.slice(0, 80)}...
            </p>
          ))}
        </div>
      )}

      {/* Notes (unparsed text) */}
      {parsed.notes && (
        <div className="text-sm space-y-1">
          <h4 className="font-semibold text-orange-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t("unparsed_text")}
          </h4>
          <pre className="text-xs text-muted-foreground bg-muted/30 p-2 rounded overflow-x-auto whitespace-pre-wrap">
            {parsed.notes}
          </pre>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !parsed.name}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {t("save_homebrew")}
        </button>
      </div>
    </div>
  );
}
