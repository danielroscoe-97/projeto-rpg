"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlayerCharacter } from "@/lib/types/database";
import type { Database } from "@/lib/types/database";

type PlayerCharacterUpdate = Database["public"]["Tables"]["player_characters"]["Update"];

interface PlayerCharacterForm {
  name: string;
  max_hp: string;
  ac: string;
  spell_save_dc: string;
}

const EMPTY_FORM: PlayerCharacterForm = { name: "", max_hp: "", ac: "", spell_save_dc: "" };

interface Props {
  initialCharacters: PlayerCharacter[];
  campaignId: string;
  campaignName: string;
}

function validateForm(form: PlayerCharacterForm): string | null {
  if (!form.name.trim()) return "Character name is required.";
  const hp = Number(form.max_hp);
  if (!form.max_hp || isNaN(hp) || !Number.isInteger(hp) || hp < 1)
    return "Max HP must be an integer >= 1.";
  const ac = Number(form.ac);
  if (!form.ac || isNaN(ac) || !Number.isInteger(ac) || ac < 1)
    return "AC must be an integer >= 1.";
  if (form.spell_save_dc !== "") {
    const dc = Number(form.spell_save_dc);
    if (isNaN(dc) || !Number.isInteger(dc) || dc < 1)
      return "Spell save DC must be an integer >= 1.";
  }
  return null;
}

function getFieldErrors(form: PlayerCharacterForm, prefix: string): Set<string> {
  const errors = new Set<string>();
  if (!form.name.trim()) errors.add(`${prefix}-name`);
  const hp = Number(form.max_hp);
  if (!form.max_hp || isNaN(hp) || !Number.isInteger(hp) || hp < 1) errors.add(`${prefix}-hp`);
  const ac = Number(form.ac);
  if (!form.ac || isNaN(ac) || !Number.isInteger(ac) || ac < 1) errors.add(`${prefix}-ac`);
  if (form.spell_save_dc !== "") {
    const dc = Number(form.spell_save_dc);
    if (isNaN(dc) || !Number.isInteger(dc) || dc < 1) errors.add(`${prefix}-dc`);
  }
  return errors;
}

function isSaveDisabled(form: PlayerCharacterForm): boolean {
  if (!form.name.trim()) return true;
  const hp = Number(form.max_hp);
  if (!form.max_hp || isNaN(hp) || !Number.isInteger(hp) || hp < 1) return true;
  const ac = Number(form.ac);
  if (!form.ac || isNaN(ac) || !Number.isInteger(ac) || ac < 1) return true;
  return false;
}

function StatBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 bg-background rounded-md border border-border min-w-[56px]">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">{label}</span>
      <span className="text-foreground font-semibold text-sm">{value}</span>
    </div>
  );
}

export function PlayerCharacterManager({ initialCharacters, campaignId }: Props) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [characters, setCharacters] = useState<PlayerCharacter[]>(initialCharacters);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<PlayerCharacterForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PlayerCharacterForm>(EMPTY_FORM);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());

  const supabase = createClient();

  // ── DM Notes (debounced auto-save) ──────────────────────────────────────
  const [notesValues, setNotesValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const c of initialCharacters) {
      initial[c.id] = c.dm_notes ?? "";
    }
    return initial;
  });
  const [notesSaveStatus, setNotesSaveStatus] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});
  const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const saveNotes = useCallback(async (charId: string, value: string) => {
    setNotesSaveStatus((prev) => ({ ...prev, [charId]: "saving" }));
    try {
      const { error: dbError } = await supabase
        .from("player_characters")
        .update({ dm_notes: value })
        .eq("id", charId)
        .eq("campaign_id", campaignId);
      if (dbError) throw dbError;
      setNotesSaveStatus((prev) => ({ ...prev, [charId]: "saved" }));
      setCharacters((prev) => prev.map((c) => c.id === charId ? { ...c, dm_notes: value } : c));
      setTimeout(() => {
        setNotesSaveStatus((prev) => prev[charId] === "saved" ? { ...prev, [charId]: "idle" } : prev);
      }, 2000);
    } catch {
      setNotesSaveStatus((prev) => ({ ...prev, [charId]: "error" }));
    }
  }, [supabase, campaignId]);

  const handleNotesChange = useCallback((charId: string, value: string) => {
    if (value.length > 2000) return;
    setNotesValues((prev) => ({ ...prev, [charId]: value }));
    setNotesSaveStatus((prev) => ({ ...prev, [charId]: "idle" }));
    if (notesTimers.current[charId]) clearTimeout(notesTimers.current[charId]);
    notesTimers.current[charId] = setTimeout(() => {
      saveNotes(charId, value);
    }, 800);
  }, [saveNotes]);

  // ── Add ────────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    const validationError = validateForm(addForm);
    if (validationError) {
      setError(validationError);
      setFieldErrors(getFieldErrors(addForm, "add"));
      return;
    }
    setFieldErrors(new Set());
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("player_characters")
        .insert({
          campaign_id: campaignId,
          name: addForm.name.trim(),
          max_hp: Number(addForm.max_hp),
          current_hp: Number(addForm.max_hp),
          ac: Number(addForm.ac),
          spell_save_dc: addForm.spell_save_dc ? Number(addForm.spell_save_dc) : null,
        })
        .select("*")
        .single();

      if (dbError || !data) throw new Error("Failed to add character. Please try again.");

      setCharacters((prev) => [...prev, data]);
      setNotesValues((prev) => ({ ...prev, [data.id]: data.dm_notes ?? "" }));
      setAddForm(EMPTY_FORM);
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add character.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Edit ───────────────────────────────────────────────────────────────────

  const handleEdit = async () => {
    if (!editingId) return;
    const validationError = validateForm(editForm);
    if (validationError) {
      setError(validationError);
      setFieldErrors(getFieldErrors(editForm, `edit-${editingId}`));
      return;
    }
    setFieldErrors(new Set());
    setIsLoading(true);
    setError(null);
    try {
      const character = characters.find((c) => c.id === editingId);
      if (!character) throw new Error("Character not found.");

      const newMaxHp = Number(editForm.max_hp);
      const updatePayload: PlayerCharacterUpdate = {
        name: editForm.name.trim(),
        max_hp: newMaxHp,
        ac: Number(editForm.ac),
        spell_save_dc: editForm.spell_save_dc ? Number(editForm.spell_save_dc) : null,
      };
      if (character.current_hp === character.max_hp || character.current_hp > newMaxHp) {
        updatePayload.current_hp = newMaxHp;
      }

      const { error: dbError } = await supabase
        .from("player_characters")
        .update(updatePayload)
        .eq("id", editingId)
        .eq("campaign_id", campaignId);

      if (dbError) throw new Error("Failed to update character. Please try again.");

      setCharacters((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? {
                ...c,
                name: updatePayload.name ?? c.name,
                max_hp: updatePayload.max_hp ?? c.max_hp,
                current_hp: updatePayload.current_hp ?? c.current_hp,
                ac: updatePayload.ac ?? c.ac,
                spell_save_dc: updatePayload.spell_save_dc !== undefined
                  ? updatePayload.spell_save_dc
                  : c.spell_save_dc,
              }
            : c
        )
      );
      setEditingId(null);
      setEditForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update character.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Remove ─────────────────────────────────────────────────────────────────

  const handleRemove = async () => {
    if (!removeTargetId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from("player_characters")
        .delete()
        .eq("id", removeTargetId)
        .eq("campaign_id", campaignId);

      if (dbError) throw new Error("Failed to remove character. Please try again.");

      setCharacters((prev) => prev.filter((c) => c.id !== removeTargetId));
      setRemoveTargetId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove character.");
      setRemoveTargetId(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Character Form (shared between add and edit) ───────────────────────────

  const renderForm = (
    form: PlayerCharacterForm,
    setForm: React.Dispatch<React.SetStateAction<PlayerCharacterForm>>,
    onSubmit: () => void,
    onCancel: () => void,
    title: string,
    idPrefix: string
  ) => (
    <div className="p-4 bg-card rounded-lg border border-border space-y-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-name`} className="text-foreground text-xs">
            {t("pc_name_label")}
          </Label>
          <Input
            id={`${idPrefix}-name`}
            placeholder={t("pc_name_placeholder")}
            value={form.name}
            onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setFieldErrors((prev) => { const n = new Set(prev); n.delete(`${idPrefix}-name`); return n; }); }}
            className={`bg-background border-border text-foreground placeholder:text-muted-foreground/40${fieldErrors.has(`${idPrefix}-name`) ? " field-error" : ""}`}
            aria-invalid={fieldErrors.has(`${idPrefix}-name`) || undefined}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-hp`} className="text-foreground text-xs">
              {t("pc_hp_label")}
            </Label>
            <Input
              id={`${idPrefix}-hp`}
              type="number"
              min={1}
              placeholder={t("pc_hp_placeholder")}
              value={form.max_hp}
              onChange={(e) => { setForm((f) => ({ ...f, max_hp: e.target.value })); setFieldErrors((prev) => { const n = new Set(prev); n.delete(`${idPrefix}-hp`); return n; }); }}
              className={`bg-background border-border text-foreground placeholder:text-muted-foreground/40${fieldErrors.has(`${idPrefix}-hp`) ? " field-error" : ""}`}
              aria-invalid={fieldErrors.has(`${idPrefix}-hp`) || undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-ac`} className="text-foreground text-xs">
              {t("pc_ac_label")}
            </Label>
            <Input
              id={`${idPrefix}-ac`}
              type="number"
              min={1}
              placeholder={t("pc_ac_placeholder")}
              value={form.ac}
              onChange={(e) => { setForm((f) => ({ ...f, ac: e.target.value })); setFieldErrors((prev) => { const n = new Set(prev); n.delete(`${idPrefix}-ac`); return n; }); }}
              className={`bg-background border-border text-foreground placeholder:text-muted-foreground/40${fieldErrors.has(`${idPrefix}-ac`) ? " field-error" : ""}`}
              aria-invalid={fieldErrors.has(`${idPrefix}-ac`) || undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-dc`} className="text-foreground text-xs">
              {t("pc_spell_dc_label")} <span className="text-muted-foreground/50">({tc("optional")})</span>
            </Label>
            <Input
              id={`${idPrefix}-dc`}
              type="number"
              min={1}
              placeholder={tc("dash")}
              value={form.spell_save_dc}
              onChange={(e) => { setForm((f) => ({ ...f, spell_save_dc: e.target.value })); setFieldErrors((prev) => { const n = new Set(prev); n.delete(`${idPrefix}-dc`); return n; }); }}
              className={`bg-background border-border text-foreground placeholder:text-muted-foreground/40${fieldErrors.has(`${idPrefix}-dc`) ? " field-error" : ""}`}
              aria-invalid={fieldErrors.has(`${idPrefix}-dc`) || undefined}
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground min-h-[44px]"
          onClick={onCancel}
        >
          {tc("cancel")}
        </Button>
        <Button
          size="sm"
          className="bg-gold hover:bg-gold/80 text-foreground min-h-[44px]"
          disabled={isSaveDisabled(form) || isLoading}
          onClick={onSubmit}
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
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t("pc_title")}</h2>
        {!showAdd && (
          <Button
            size="sm"
            className="bg-gold hover:bg-gold/80 text-foreground min-h-[44px]"
            onClick={() => {
              setShowAdd(true);
              setError(null);
            }}
          >
            {t("pc_add")}
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}

      {/* Add Form */}
      {showAdd &&
        renderForm(
          addForm,
          setAddForm,
          handleAdd,
          () => {
            setShowAdd(false);
            setAddForm(EMPTY_FORM);
            setError(null);
          },
          t("pc_new"),
          "add"
        )}

      {/* Empty state */}
      {characters.length === 0 && !showAdd && (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">{t("pc_empty")}</p>
        </div>
      )}

      {/* Character Cards */}
      {characters.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {characters.map((character) => {
            // Edit mode
            if (editingId === character.id) {
              return (
                <div key={character.id} className="sm:col-span-2">
                  {renderForm(
                    editForm,
                    setEditForm,
                    handleEdit,
                    () => {
                      setEditingId(null);
                      setEditForm(EMPTY_FORM);
                      setError(null);
                    },
                    character.name,
                    `edit-${character.id}`
                  )}
                </div>
              );
            }

            // Remove confirmation
            if (removeTargetId === character.id) {
              return (
                <div
                  key={character.id}
                  className="flex items-center gap-3 p-4 bg-card rounded-lg border border-red-500/30 sm:col-span-2"
                >
                  <p className="text-muted-foreground text-sm flex-1">
                    Remove{" "}
                    <span className="text-foreground font-medium">{character.name}</span>
                    {t("pc_remove_confirm_suffix")}
                  </p>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="min-h-[44px]"
                    disabled={isLoading}
                    onClick={handleRemove}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {tc("saving")}
                      </>
                    ) : (
                      tc("confirm")
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground min-h-[44px]"
                    onClick={() => setRemoveTargetId(null)}
                  >
                    {tc("cancel")}
                  </Button>
                </div>
              );
            }

            // Character card
            return (
              <div
                key={character.id}
                className="p-4 bg-card rounded-lg border border-border hover:border-border/80 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-foreground font-medium text-sm truncate pr-2">
                    {character.name}
                  </h3>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground text-xs px-2 h-7"
                      onClick={() => {
                        setEditingId(character.id);
                        setEditForm({
                          name: character.name,
                          max_hp: String(character.max_hp),
                          ac: String(character.ac),
                          spell_save_dc: character.spell_save_dc
                            ? String(character.spell_save_dc)
                            : "",
                        });
                        setError(null);
                      }}
                    >
                      {tc("edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 text-xs px-2 h-7"
                      onClick={() => {
                        setRemoveTargetId(character.id);
                        setError(null);
                      }}
                    >
                      {tc("remove")}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatBadge label={t("pc_col_max_hp")} value={character.max_hp} />
                  <StatBadge label={t("pc_col_cur_hp")} value={character.current_hp} />
                  <StatBadge label={t("pc_col_ac")} value={character.ac} />
                  {character.spell_save_dc && (
                    <StatBadge label={t("pc_col_spell_dc")} value={character.spell_save_dc} />
                  )}
                </div>
                {/* DM Notes */}
                <div className="mt-3 space-y-1">
                  <textarea
                    value={notesValues[character.id] ?? ""}
                    onChange={(e) => handleNotesChange(character.id, e.target.value)}
                    placeholder="Notas sobre este jogador..."
                    maxLength={2000}
                    rows={2}
                    className="w-full bg-transparent border border-border/50 rounded-md px-3 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground/30 resize-y focus:outline-none focus:border-border/80 transition-colors"
                    style={{ fontSize: 16, minHeight: "3.5rem", maxHeight: "9rem" }}
                  />
                  <div className="flex justify-end h-4 mt-0.5">
                    {notesSaveStatus[character.id] === "saving" && (
                      <span className="text-[10px] text-muted-foreground animate-pulse">Salvando...</span>
                    )}
                    {notesSaveStatus[character.id] === "saved" && (
                      <span className="text-[10px] text-emerald-400">Salvo</span>
                    )}
                    {notesSaveStatus[character.id] === "error" && (
                      <span className="text-[10px] text-red-400">Erro ao salvar</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
