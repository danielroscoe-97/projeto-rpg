"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CharacterForm } from "@/components/character/CharacterForm";
import { CharacterCard } from "@/components/character/CharacterCard";
import { TokenUpload } from "@/components/character/TokenUpload";
import { InvitePlayerDialog } from "@/components/campaign/InvitePlayerDialog";
import { removeMemberAndCharacterAction } from "@/lib/actions/invite-actions";
import { mergePlayersAndMembers } from "@/lib/utils/merge-players-members";
import type { PlayerCharacter } from "@/lib/types/database";
import type { Database } from "@/lib/types/database";
import type { CampaignMemberWithUser } from "@/lib/types/campaign-membership";

type PlayerCharacterUpdate = Database["public"]["Tables"]["player_characters"]["Update"];

interface Props {
  initialCharacters: PlayerCharacter[];
  campaignId: string;
  campaignName: string;
  initialMembers?: CampaignMemberWithUser[];
  isOwner?: boolean;
}

export function PlayerCharacterManager({
  initialCharacters,
  campaignId,
  campaignName,
  initialMembers = [],
  isOwner = false,
}: Props) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [characters, setCharacters] = useState<PlayerCharacter[]>(initialCharacters);
  const [members, setMembers] = useState<CampaignMemberWithUser[]>(initialMembers);
  const [showAdd, setShowAdd] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<PlayerCharacter | null>(null);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [tokenUploadChar, setTokenUploadChar] = useState<PlayerCharacter | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // D7: linked-entry removal dialog state
  const [linkedRemoveTarget, setLinkedRemoveTarget] = useState<{
    userId: string;
    memberName: string;
  } | null>(null);
  const [isRemovingLinked, setIsRemovingLinked] = useState(false);
  const linkedRemoveInflight = useRef(false);

  const supabase = createClient();

  // ── Unified list (derived) ──────────────────────────────────────────────
  const entries = useMemo(
    () => mergePlayersAndMembers(characters, members),
    [characters, members]
  );

  // ── DM Notes (debounced auto-save) ──────────────────────────────────────
  const [notesValues, setNotesValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const c of initialCharacters) {
      initial[c.id] = c.dm_notes ?? "";
    }
    return initial;
  });
  const [notesSaveStatus, setNotesSaveStatus] = useState<
    Record<string, "idle" | "saving" | "saved" | "error">
  >({});
  const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const saveNotes = useCallback(
    async (charId: string, value: string) => {
      setNotesSaveStatus((prev) => ({ ...prev, [charId]: "saving" }));
      try {
        const { error: dbError } = await supabase
          .from("player_characters")
          .update({ dm_notes: value })
          .eq("id", charId)
          .eq("campaign_id", campaignId);
        if (dbError) throw dbError;
        setNotesSaveStatus((prev) => ({ ...prev, [charId]: "saved" }));
        setCharacters((prev) =>
          prev.map((c) => (c.id === charId ? { ...c, dm_notes: value } : c))
        );
        setTimeout(() => {
          setNotesSaveStatus((prev) =>
            prev[charId] === "saved" ? { ...prev, [charId]: "idle" } : prev
          );
        }, 2000);
      } catch {
        setNotesSaveStatus((prev) => ({ ...prev, [charId]: "error" }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [campaignId]
  );

  const handleNotesChange = useCallback(
    (charId: string, value: string) => {
      if (value.length > 2000) return;
      setNotesValues((prev) => ({ ...prev, [charId]: value }));
      setNotesSaveStatus((prev) => ({ ...prev, [charId]: "idle" }));
      if (notesTimers.current[charId]) clearTimeout(notesTimers.current[charId]);
      notesTimers.current[charId] = setTimeout(() => {
        saveNotes(charId, value);
      }, 800);
    },
    [saveNotes]
  );

  // ── Save (Add or Edit via CharacterForm) ─────────────────────────────────

  const handleSaveCharacter = useCallback(
    async (data: {
      name: string;
      race: string | null;
      class: string | null;
      level: number;
      max_hp: number;
      ac: number;
      spell_save_dc: number | null;
      notes: string | null;
      spellSlots: Record<string, { max: number; used: number }>;
    }) => {
      if (editingCharacter) {
        const newMaxHp = data.max_hp;
        const spellSlotsPayload =
          data.spellSlots && Object.values(data.spellSlots).some((v) => v.max > 0)
            ? Object.fromEntries(Object.entries(data.spellSlots).filter(([, v]) => v.max > 0))
            : null;
        const updatePayload: PlayerCharacterUpdate = {
          name: data.name,
          race: data.race,
          class: data.class,
          level: data.level,
          max_hp: newMaxHp,
          ac: data.ac,
          spell_save_dc: data.spell_save_dc,
          notes: data.notes,
          spell_slots: spellSlotsPayload,
        };
        if (
          editingCharacter.current_hp === editingCharacter.max_hp ||
          editingCharacter.current_hp > newMaxHp
        ) {
          updatePayload.current_hp = newMaxHp;
        }

        const { error: dbError } = await supabase
          .from("player_characters")
          .update(updatePayload)
          .eq("id", editingCharacter.id)
          .eq("campaign_id", campaignId);

        if (dbError) throw new Error("Failed to update character. Please try again.");

        setCharacters((prev) =>
          prev.map((c) =>
            c.id === editingCharacter.id
              ? {
                  ...c,
                  name: updatePayload.name ?? c.name,
                  race: updatePayload.race !== undefined ? updatePayload.race : c.race,
                  class: updatePayload.class !== undefined ? updatePayload.class : c.class,
                  level: updatePayload.level !== undefined ? updatePayload.level : c.level,
                  max_hp: updatePayload.max_hp ?? c.max_hp,
                  current_hp: updatePayload.current_hp ?? c.current_hp,
                  ac: updatePayload.ac ?? c.ac,
                  spell_save_dc:
                    updatePayload.spell_save_dc !== undefined
                      ? updatePayload.spell_save_dc
                      : c.spell_save_dc,
                  notes: updatePayload.notes !== undefined ? updatePayload.notes : c.notes,
                  spell_slots:
                    updatePayload.spell_slots !== undefined
                      ? updatePayload.spell_slots
                      : c.spell_slots,
                }
              : c
          )
        );
        setEditingCharacter(null);
      } else {
        const spellSlotsInsert =
          data.spellSlots && Object.values(data.spellSlots).some((v) => v.max > 0)
            ? Object.fromEntries(Object.entries(data.spellSlots).filter(([, v]) => v.max > 0))
            : null;
        const { data: newChar, error: dbError } = await supabase
          .from("player_characters")
          .insert({
            campaign_id: campaignId,
            name: data.name,
            race: data.race,
            class: data.class,
            level: data.level,
            max_hp: data.max_hp,
            current_hp: data.max_hp,
            ac: data.ac,
            spell_save_dc: data.spell_save_dc,
            notes: data.notes,
            spell_slots: spellSlotsInsert,
          })
          .select("*")
          .single();

        if (dbError || !newChar) throw new Error("Failed to add character. Please try again.");

        setCharacters((prev) => [...prev, newChar]);
        setNotesValues((prev) => ({ ...prev, [newChar.id]: newChar.dm_notes ?? "" }));
        setShowAdd(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingCharacter, campaignId]
  );

  // ── Remove character only (character_only entries) ──────────────────────

  const handleRemoveCharacter = async () => {
    if (!removeTargetId) return;
    setIsRemoving(true);
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
      toast.success("Personagem removido.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove character.");
      setRemoveTargetId(null);
    } finally {
      setIsRemoving(false);
    }
  };

  // ── Remove linked entry (D7) ────────────────────────────────────────────

  const handleRemoveLinked = async (alsoRemoveCharacter: boolean) => {
    const target = linkedRemoveTarget;
    if (!target || linkedRemoveInflight.current) return;
    linkedRemoveInflight.current = true;
    setIsRemovingLinked(true);
    try {
      await removeMemberAndCharacterAction(
        campaignId,
        target.userId,
        alsoRemoveCharacter
      );
      setMembers((prev) => prev.filter((m) => m.user_id !== target.userId));
      if (alsoRemoveCharacter) {
        setCharacters((prev) =>
          prev.filter((c) => c.user_id !== target.userId)
        );
      } else {
        // Keep character but unlink it locally so it renders as character_only
        setCharacters((prev) =>
          prev.map((c) =>
            c.user_id === target.userId ? { ...c, user_id: null } : c
          )
        );
      }
      toast.success("Acesso removido com sucesso.");
      setLinkedRemoveTarget(null);
    } catch {
      toast.error("Erro ao remover. Tente novamente.");
    } finally {
      linkedRemoveInflight.current = false;
      setIsRemovingLinked(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold text-foreground">{t("pc_title")}</h2>
        <div className="flex items-center gap-2">
          {isOwner && <InvitePlayerDialog campaignId={campaignId} />}
          <Button
            size="sm"
            className="bg-gold hover:bg-gold/80 text-surface-primary font-semibold min-h-[44px]"
            onClick={() => {
              setShowAdd(true);
              setError(null);
            }}
          >
            {t("pc_add")}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">{t("pc_empty")}</p>
        </div>
      )}

      {/* Unified character list */}
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => {
          if (!entry.character) return null;
          const character = entry.character;

          // Inline remove confirmation (character_only)
          if (removeTargetId === character.id) {
            return (
              <div
                key={entry.key}
                className="flex items-center gap-3 p-4 bg-card rounded-lg border border-red-500/30 sm:col-span-2"
              >
                <p className="text-muted-foreground text-sm flex-1">
                  Remover{" "}
                  <span className="text-foreground font-medium">{character.name}</span>
                  {t("pc_remove_confirm_suffix")}
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  className="min-h-[44px]"
                  disabled={isRemoving}
                  onClick={handleRemoveCharacter}
                >
                  {isRemoving ? (
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

          return (
            <CharacterCard
              key={entry.key}
              character={character}
              onClick={() => setEditingCharacter(character)}
              onUploadToken={() => setTokenUploadChar(character)}
              onDelete={() => {
                if (entry.entryType === "linked" && entry.member) {
                  const memberName =
                    entry.member.display_name ?? entry.member.email?.split("@")[0] ?? "Jogador";
                  setLinkedRemoveTarget({
                    userId: entry.member.user_id,
                    memberName,
                  });
                } else {
                  setRemoveTargetId(character.id);
                  setError(null);
                }
              }}
              member={entry.member ?? null}
              dmNotes={notesValues[character.id] ?? ""}
              onDmNotesChange={(value) => handleNotesChange(character.id, value)}
              notesSaveStatus={notesSaveStatus[character.id] ?? "idle"}
            />
          );
        })}
      </div>

      {/* CharacterForm — Add */}
      <CharacterForm
        open={showAdd}
        onOpenChange={(open) => {
          if (!open) setShowAdd(false);
        }}
        onSave={handleSaveCharacter}
      />

      {/* CharacterForm — Edit */}
      <CharacterForm
        open={!!editingCharacter}
        onOpenChange={(open) => {
          if (!open) setEditingCharacter(null);
        }}
        character={editingCharacter}
        onSave={handleSaveCharacter}
      />

      {/* TokenUpload */}
      {tokenUploadChar && (
        <TokenUpload
          open
          onOpenChange={(open) => {
            if (!open) setTokenUploadChar(null);
          }}
          characterId={tokenUploadChar.id}
          characterName={tokenUploadChar.name}
          currentTokenUrl={tokenUploadChar.token_url ?? null}
          onTokenUpdated={(url) => {
            setCharacters((prev) =>
              prev.map((c) =>
                c.id === tokenUploadChar.id ? { ...c, token_url: url } : c
              )
            );
            setTokenUploadChar(null);
          }}
        />
      )}

      {/* D7: AlertDialog for linked entry removal */}
      <AlertDialog
        open={!!linkedRemoveTarget}
        onOpenChange={(open) => {
          if (!open && !isRemovingLinked) setLinkedRemoveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover jogador</AlertDialogTitle>
            <AlertDialogDescription>
              O que deseja fazer com o acesso de{" "}
              <span className="font-medium text-foreground">
                {linkedRemoveTarget?.memberName}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={isRemovingLinked}>
              {tc("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleRemoveLinked(false)}
              disabled={isRemovingLinked}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isRemovingLinked ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Remover apenas o acesso"
              )}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleRemoveLinked(true)}
              disabled={isRemovingLinked}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRemovingLinked ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Remover acesso e personagem"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
