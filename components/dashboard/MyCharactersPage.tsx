"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Users, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { CharacterCard } from "@/components/character/CharacterCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  createStandaloneCharacterAction,
  updateCharacterAction,
  deleteCharacterAction,
} from "@/app/app/dashboard/characters/actions";
import type { PlayerCharacter } from "@/lib/types/database";

interface Campaign {
  id: string;
  name: string;
}

interface CharacterWithCampaign extends PlayerCharacter {
  campaigns: Campaign | null;
}

interface Props {
  initialCharacters: CharacterWithCampaign[];
}

const inputClass =
  "bg-surface-tertiary border-white/[0.15] text-foreground placeholder:text-muted-foreground/40 min-h-[44px] rounded-lg";

interface CharacterFormFields {
  name: string;
  race: string;
  charClass: string;
  level: string;
  hp: string;
  ac: string;
  dc: string;
  str: string;
  dex: string;
  con: string;
  intScore: string;
  wis: string;
  chaScore: string;
  tokenUrl: string;
}

function emptyForm(): CharacterFormFields {
  return { name: "", race: "", charClass: "", level: "", hp: "", ac: "", dc: "", str: "", dex: "", con: "", intScore: "", wis: "", chaScore: "", tokenUrl: "" };
}

function formFromCharacter(char: PlayerCharacter): CharacterFormFields {
  return {
    name: char.name,
    race: char.race ?? "",
    charClass: char.class ?? "",
    level: char.level?.toString() ?? "",
    hp: char.max_hp > 0 ? char.max_hp.toString() : "",
    ac: char.ac > 0 ? char.ac.toString() : "",
    dc: char.spell_save_dc?.toString() ?? "",
    str: char.str?.toString() ?? "",
    dex: char.dex?.toString() ?? "",
    con: char.con?.toString() ?? "",
    intScore: char.int_score?.toString() ?? "",
    wis: char.wis?.toString() ?? "",
    chaScore: char.cha_score?.toString() ?? "",
    tokenUrl: char.token_url ?? "",
  };
}

// ─── Formulário compartilhado ───────────────────────────────────────────────

function CharacterForm({
  fields,
  onChange,
  onSubmit,
  submitLabel,
  submitting,
  footer,
}: {
  fields: CharacterFormFields;
  onChange: (f: CharacterFormFields) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  submitting: boolean;
  footer?: React.ReactNode;
}) {
  const set = (key: keyof CharacterFormFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...fields, [key]: e.target.value });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("player-avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("player-avatars").getPublicUrl(path);
      onChange({ ...fields, tokenUrl: urlData.publicUrl });
    } catch {
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }, [fields, onChange]);

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-16 h-16 rounded-full border-2 border-dashed border-gold/30 hover:border-gold/60 transition-colors flex items-center justify-center overflow-hidden bg-white/[0.04] shrink-0"
        >
          {fields.tokenUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fields.tokenUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Upload className="w-5 h-5 text-muted-foreground/40" />
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{uploading ? "Enviando..." : "Avatar"}</p>
          <p className="text-[10px] text-muted-foreground/50">JPG, PNG ou WebP (max 2MB)</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-gold/80 uppercase tracking-widest font-medium">
          Nome *
        </label>
        <Input value={fields.name} onChange={set("name")} placeholder="Drakar" required className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-gold/80 uppercase tracking-widest font-medium">Raça</label>
          <Input value={fields.race} onChange={set("race")} placeholder="Anão" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-gold/80 uppercase tracking-widest font-medium">Classe</label>
          <Input value={fields.charClass} onChange={set("charClass")} placeholder="Bárbaro" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-gold/80 uppercase tracking-widest font-medium">Nível</label>
          <Input type="number" value={fields.level} onChange={set("level")} placeholder="5" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-gold/80 uppercase tracking-widest font-medium">HP</label>
          <Input type="number" value={fields.hp} onChange={set("hp")} placeholder="45" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-gold/80 uppercase tracking-widest font-medium">AC</label>
          <Input type="number" value={fields.ac} onChange={set("ac")} placeholder="16" className={inputClass} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-gold/80 uppercase tracking-widest font-medium">Spell Save DC</label>
        <Input type="number" value={fields.dc} onChange={set("dc")} placeholder="15" className={inputClass} />
      </div>

      {/* Ability Scores — 6 stats in 2 rows */}
      <div className="space-y-2 pt-1">
        <p className="text-xs text-gold/60 uppercase tracking-widest font-medium">Ability Scores</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">STR</label>
            <Input type="number" value={fields.str} onChange={set("str")} placeholder="10" className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">DEX</label>
            <Input type="number" value={fields.dex} onChange={set("dex")} placeholder="10" className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">CON</label>
            <Input type="number" value={fields.con} onChange={set("con")} placeholder="10" className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">INT</label>
            <Input type="number" value={fields.intScore} onChange={set("intScore")} placeholder="10" className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">WIS</label>
            <Input type="number" value={fields.wis} onChange={set("wis")} placeholder="10" className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">CHA</label>
            <Input type="number" value={fields.chaScore} onChange={set("chaScore")} placeholder="10" className={inputClass} />
          </div>
        </div>
      </div>

      <Button type="submit" variant="gold" className="w-full min-h-[44px]" disabled={submitting || !fields.name.trim()}>
        {submitting ? "..." : submitLabel}
      </Button>

      {footer}
    </form>
  );
}

// ─── Dialog: Criar ──────────────────────────────────────────────────────────

function CreateCharacterDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createStandaloneCharacterAction({
        name: fields.name,
        race: fields.race || null,
        characterClass: fields.charClass || null,
        level: fields.level ? parseInt(fields.level) : null,
        maxHp: fields.hp ? parseInt(fields.hp) : null,
        ac: fields.ac ? parseInt(fields.ac) : null,
        spellSaveDc: fields.dc ? parseInt(fields.dc) : null,
        str: fields.str ? parseInt(fields.str) : null,
        dex: fields.dex ? parseInt(fields.dex) : null,
        con: fields.con ? parseInt(fields.con) : null,
        intScore: fields.intScore ? parseInt(fields.intScore) : null,
        wis: fields.wis ? parseInt(fields.wis) : null,
        chaScore: fields.chaScore ? parseInt(fields.chaScore) : null,
        tokenUrl: fields.tokenUrl || null,
      });
      toast.success("Personagem criado!");
      setOpen(false);
      setFields(emptyForm());
      onCreated();
    } catch {
      toast.error("Erro ao criar personagem.");
    } finally {
      setSubmitting(false);
    }
  }, [fields, onCreated]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gold" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Criar Personagem
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo Personagem</DialogTitle>
        </DialogHeader>
        <CharacterForm
          fields={fields}
          onChange={setFields}
          onSubmit={handleSubmit}
          submitLabel="Criar Personagem"
          submitting={submitting}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: Editar ─────────────────────────────────────────────────────────

function EditCharacterDialog({
  character,
  isStandalone,
  onSaved,
  onDeleted,
}: {
  character: CharacterWithCampaign;
  isStandalone: boolean;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fields, setFields] = useState(formFromCharacter(character));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleOpen = (val: boolean) => {
    setOpen(val);
    if (val) setFields(formFromCharacter(character)); // reset ao abrir
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateCharacterAction(character.id, {
        name: fields.name,
        race: fields.race || null,
        characterClass: fields.charClass || null,
        level: fields.level ? parseInt(fields.level) : null,
        maxHp: fields.hp ? parseInt(fields.hp) : null,
        ac: fields.ac ? parseInt(fields.ac) : null,
        spellSaveDc: fields.dc ? parseInt(fields.dc) : null,
        str: fields.str ? parseInt(fields.str) : null,
        dex: fields.dex ? parseInt(fields.dex) : null,
        con: fields.con ? parseInt(fields.con) : null,
        intScore: fields.intScore ? parseInt(fields.intScore) : null,
        wis: fields.wis ? parseInt(fields.wis) : null,
        chaScore: fields.chaScore ? parseInt(fields.chaScore) : null,
        tokenUrl: fields.tokenUrl || null,
      });
      toast.success("Personagem salvo!");
      setOpen(false);
      onSaved();
    } catch {
      toast.error("Erro ao salvar personagem.");
    } finally {
      setSubmitting(false);
    }
  }, [character.id, fields, onSaved]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteCharacterAction(character.id);
      toast.success("Personagem excluído.");
      setConfirmDelete(false);
      setOpen(false);
      onDeleted();
    } catch {
      toast.error("Erro ao excluir personagem.");
    } finally {
      setDeleting(false);
    }
  }, [character.id, onDeleted]);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          {/* wrapper invisível para tornar o card clicável */}
          <div className="cursor-pointer">
            <CharacterCard character={character} />
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">{character.name}</DialogTitle>
          </DialogHeader>
          <CharacterForm
            fields={fields}
            onChange={setFields}
            onSubmit={handleSubmit}
            submitLabel="Salvar"
            submitting={submitting}
            footer={
              isStandalone ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-2 text-sm text-red-400/70 hover:text-red-400 transition-colors py-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir personagem
                </button>
              ) : null
            }
          />
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {character.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O personagem será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
            >
              {deleting ? "..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export function MyCharactersPage({ initialCharacters }: Props) {
  const t = useTranslations("characters_page");
  const router = useRouter();

  const standalone = initialCharacters.filter((c) => !c.campaigns);

  const grouped = initialCharacters.reduce<
    Record<string, { campaign: Campaign; characters: CharacterWithCampaign[] }>
  >((acc, char) => {
    if (!char.campaigns) return acc;
    const key = char.campaigns.id;
    if (!acc[key]) acc[key] = { campaign: char.campaigns, characters: [] };
    acc[key].characters.push(char);
    return acc;
  }, {});

  const groups = Object.values(grouped);
  const isEmpty = standalone.length === 0 && groups.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Users className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
        <CreateCharacterDialog onCreated={() => router.refresh()} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-heading text-foreground">{t("title")}</h1>
        <CreateCharacterDialog onCreated={() => router.refresh()} />
      </div>

      {standalone.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-heading text-muted-foreground tracking-wide">
            Sem campanha
          </h2>
          <div className="space-y-2">
            {standalone.map((char) => (
              <EditCharacterDialog
                key={char.id}
                character={char}
                isStandalone={true}
                onSaved={() => router.refresh()}
                onDeleted={() => router.refresh()}
              />
            ))}
          </div>
        </section>
      )}

      {groups.map(({ campaign, characters }) => (
        <section key={campaign.id} className="space-y-3">
          <h2 className="text-sm font-heading text-muted-foreground tracking-wide">
            {campaign.name}
          </h2>
          <div className="space-y-2">
            {characters.map((char) => (
              <EditCharacterDialog
                key={char.id}
                character={char}
                isStandalone={false}
                onSaved={() => router.refresh()}
                onDeleted={() => router.refresh()}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
