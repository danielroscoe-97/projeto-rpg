"use client";

import { useState } from "react";
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
    return "Max HP must be an integer ≥ 1.";
  const ac = Number(form.ac);
  if (!form.ac || isNaN(ac) || !Number.isInteger(ac) || ac < 1)
    return "AC must be an integer ≥ 1.";
  if (form.spell_save_dc !== "") {
    const dc = Number(form.spell_save_dc);
    if (isNaN(dc) || !Number.isInteger(dc) || dc < 1)
      return "Spell save DC must be an integer ≥ 1.";
  }
  return null;
}

function isSaveDisabled(form: PlayerCharacterForm): boolean {
  if (!form.name.trim()) return true;
  const hp = Number(form.max_hp);
  if (!form.max_hp || isNaN(hp) || !Number.isInteger(hp) || hp < 1) return true;
  const ac = Number(form.ac);
  if (!form.ac || isNaN(ac) || !Number.isInteger(ac) || ac < 1) return true;
  return false;
}

export function PlayerCharacterManager({ initialCharacters, campaignId }: Props) {
  const [characters, setCharacters] = useState<PlayerCharacter[]>(initialCharacters);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<PlayerCharacterForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PlayerCharacterForm>(EMPTY_FORM);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // ── Add ────────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    const validationError = validateForm(addForm);
    if (validationError) {
      setError(validationError);
      return;
    }
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
      return;
    }
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
      // Sync current_hp when: character is at full health (keep in sync), or current_hp exceeds new max (clamp)
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Player Characters</h2>
        {!showAdd && (
          <Button
            size="sm"
            className="bg-[#e94560] hover:bg-[#c73652] text-white min-h-[44px]"
            onClick={() => {
              setShowAdd(true);
              setError(null);
            }}
          >
            + Add Player
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
      {showAdd && (
        <div className="p-4 bg-[#16213e] rounded-lg border border-white/10 space-y-3">
          <p className="text-sm font-medium text-white">New Player Character</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="add-name" className="text-white text-xs">
                Character name *
              </Label>
              <Input
                id="add-name"
                placeholder="e.g. Thorin"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-max-hp" className="text-white text-xs">
                Max HP *
              </Label>
              <Input
                id="add-max-hp"
                type="number"
                min={1}
                placeholder="e.g. 45"
                value={addForm.max_hp}
                onChange={(e) => setAddForm((f) => ({ ...f, max_hp: e.target.value }))}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-ac" className="text-white text-xs">
                AC *
              </Label>
              <Input
                id="add-ac"
                type="number"
                min={1}
                placeholder="e.g. 16"
                value={addForm.ac}
                onChange={(e) => setAddForm((f) => ({ ...f, ac: e.target.value }))}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-8 text-sm"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="add-spell-dc" className="text-white text-xs">
                Spell save DC <span className="text-white/40">(optional)</span>
              </Label>
              <Input
                id="add-spell-dc"
                type="number"
                min={1}
                placeholder="—"
                value={addForm.spell_save_dc}
                onChange={(e) => setAddForm((f) => ({ ...f, spell_save_dc: e.target.value }))}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="text-white/50 hover:text-white min-h-[44px]"
              onClick={() => {
                setShowAdd(false);
                setAddForm(EMPTY_FORM);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#e94560] hover:bg-[#c73652] text-white min-h-[44px]"
              disabled={isSaveDisabled(addForm) || isLoading}
              onClick={handleAdd}
            >
              {isLoading ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Character List */}
      {characters.length === 0 && !showAdd && (
        <p className="text-white/40 text-sm text-center py-8">
          No player characters yet. Add your first player above.
        </p>
      )}

      {characters.length > 0 && (
        <div>
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-4 pb-2 text-white/50 text-xs uppercase tracking-wider">
            <span>Name</span>
            <span className="w-14 text-right">Max HP</span>
            <span className="w-14 text-right">Cur HP</span>
            <span className="w-10 text-right">AC</span>
            <span className="w-14 text-right">Spell DC</span>
            <span className="w-20" />
          </div>

          <div className="space-y-2">
            {characters.map((character) => {
              if (editingId === character.id) {
                return (
                  <div
                    key={character.id}
                    className="p-4 bg-[#16213e] rounded-lg border border-white/10 space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label htmlFor={`edit-name-${character.id}`} className="text-white text-xs">
                          Character name *
                        </Label>
                        <Input
                          id={`edit-name-${character.id}`}
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="bg-white/5 border-white/20 text-white h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`edit-hp-${character.id}`} className="text-white text-xs">
                          Max HP *
                        </Label>
                        <Input
                          id={`edit-hp-${character.id}`}
                          type="number"
                          min={1}
                          value={editForm.max_hp}
                          onChange={(e) => setEditForm((f) => ({ ...f, max_hp: e.target.value }))}
                          className="bg-white/5 border-white/20 text-white h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`edit-ac-${character.id}`} className="text-white text-xs">
                          AC *
                        </Label>
                        <Input
                          id={`edit-ac-${character.id}`}
                          type="number"
                          min={1}
                          value={editForm.ac}
                          onChange={(e) => setEditForm((f) => ({ ...f, ac: e.target.value }))}
                          className="bg-white/5 border-white/20 text-white h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label htmlFor={`edit-dc-${character.id}`} className="text-white text-xs">
                          Spell save DC <span className="text-white/40">(optional)</span>
                        </Label>
                        <Input
                          id={`edit-dc-${character.id}`}
                          type="number"
                          min={1}
                          placeholder="—"
                          value={editForm.spell_save_dc}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, spell_save_dc: e.target.value }))
                          }
                          className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white/50 hover:text-white min-h-[44px]"
                        onClick={() => {
                          setEditingId(null);
                          setEditForm(EMPTY_FORM);
                          setError(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#e94560] hover:bg-[#c73652] text-white"
                        disabled={isSaveDisabled(editForm) || isLoading}
                        onClick={handleEdit}
                      >
                        {isLoading ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>
                );
              }

              if (removeTargetId === character.id) {
                return (
                  <div
                    key={character.id}
                    className="flex items-center gap-3 p-4 bg-[#16213e] rounded-lg border border-white/10"
                  >
                    <p className="text-white/70 text-sm flex-1">
                      Remove{" "}
                      <span className="text-white font-medium">{character.name}</span>
                      ? This cannot be undone.
                    </p>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isLoading}
                      onClick={handleRemove}
                    >
                      {isLoading ? "Removing…" : "Confirm"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white/50 hover:text-white"
                      onClick={() => setRemoveTargetId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                );
              }

              return (
                <div
                  key={character.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-center px-4 py-3 bg-[#16213e] rounded-lg"
                >
                  <span className="text-white font-medium truncate">{character.name}</span>
                  <span className="w-14 text-right text-white/70 text-sm">{character.max_hp}</span>
                  <span className="w-14 text-right text-white/70 text-sm">{character.current_hp}</span>
                  <span className="w-10 text-right text-white/70 text-sm">{character.ac}</span>
                  <span className="w-14 text-right text-white/70 text-sm">
                    {character.spell_save_dc ?? "—"}
                  </span>
                  <div className="w-20 flex items-center gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white/50 hover:text-white text-xs px-2 min-h-[44px]"
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
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 text-xs px-2 min-h-[44px]"
                      onClick={() => {
                        setRemoveTargetId(character.id);
                        setError(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
