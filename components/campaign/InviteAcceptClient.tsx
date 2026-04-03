"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { User, CheckCircle2 } from "lucide-react";
import { captureError } from "@/lib/errors/capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acceptInviteAction } from "@/app/invite/actions";

interface ExistingCharacter {
  id: string;
  name: string;
  race: string | null;
  class: string | null;
  level: number | null;
  max_hp: number;
  ac: number;
  token_url: string | null;
}

interface InviteAcceptClientProps {
  inviteId: string;
  campaignId: string;
  campaignName: string;
  dmName: string;
  userId: string;
  token: string;
  existingCharacters: ExistingCharacter[];
}

export function InviteAcceptClient({
  inviteId,
  campaignId,
  campaignName,
  dmName,
  userId: _userId,
  token,
  existingCharacters,
}: InviteAcceptClientProps) {
  const t = useTranslations("campaign");
  const tc = useTranslations("player");
  const router = useRouter();

  // If player has existing characters, start in pick mode; otherwise go straight to form
  const [mode, setMode] = useState<"pick" | "create">(
    existingCharacters.length > 0 ? "pick" : "create"
  );
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [hp, setHp] = useState("");
  const [ac, setAc] = useState("");
  const [spellSaveDc, setSpellSaveDc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "pick" && !selectedCharId) return;
    if (mode === "create" && !name.trim()) return;

    setIsSubmitting(true);
    try {
      if (mode === "pick") {
        await acceptInviteAction({
          inviteId,
          campaignId,
          token,
          existingCharacterId: selectedCharId!,
        });
      } else {
        await acceptInviteAction({
          inviteId,
          campaignId,
          token,
          name: name.trim(),
          maxHp: parseInt(hp) || 10,
          currentHp: parseInt(hp) || 10,
          ac: parseInt(ac) || 10,
          spellSaveDc: spellSaveDc ? parseInt(spellSaveDc) : null,
        });
      }

      toast.success(t("invite_accepted"));
      router.push("/app/dashboard");
    } catch (err) {
      toast.error(t("invite_error"));
      captureError(err, { component: "InviteAcceptClient", action: "acceptInvite", category: "network" });
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, selectedCharId, name, hp, ac, spellSaveDc, campaignId, inviteId, token, t, router]);

  const inputClass =
    "bg-surface-tertiary border-white/[0.15] text-foreground placeholder:text-muted-foreground/40 min-h-[44px] rounded-lg";

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div className="text-center">
        <h2 className="font-display text-2xl text-foreground tracking-wide mb-2">
          {t("invite_welcome", { campaignName, dmName })}
        </h2>
        <p className="text-muted-foreground text-sm">
          {mode === "pick"
            ? "Escolha um personagem para entrar na campanha"
            : "Crie seu personagem para entrar na campanha"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Existing character picker */}
        {existingCharacters.length > 0 && mode === "pick" && (
          <div className="space-y-2">
            {existingCharacters.map((char) => {
              const subtitle = [char.race, char.class].filter(Boolean).join(" ");
              const isSelected = selectedCharId === char.id;
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => setSelectedCharId(char.id)}
                  className={[
                    "w-full p-3 rounded-lg border text-left transition-colors flex items-center gap-3",
                    isSelected
                      ? "border-gold/60 bg-gold/5"
                      : "border-white/[0.15] bg-surface-tertiary hover:border-white/30",
                  ].join(" ")}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {char.token_url ? (
                      <img
                        src={char.token_url}
                        alt={char.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/40"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">{char.name}</p>
                    {(subtitle || char.level) && (
                      <p className="text-muted-foreground text-xs truncate">
                        {[subtitle, char.level ? `Nível ${char.level}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  {/* Stats */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    {char.max_hp > 0 && (
                      <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                        HP {char.max_hp}
                      </span>
                    )}
                    {char.ac > 0 && (
                      <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                        AC {char.ac}
                      </span>
                    )}
                  </div>
                  {/* Selected indicator */}
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-gold flex-shrink-0" />
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => { setMode("create"); setSelectedCharId(null); }}
              className="w-full p-3 rounded-lg border border-dashed border-white/20 text-muted-foreground text-sm hover:border-white/40 hover:text-foreground transition-colors"
            >
              + Criar personagem novo
            </button>
          </div>
        )}

        {/* New character form */}
        {mode === "create" && (
          <>
            {existingCharacters.length > 0 && (
              <button
                type="button"
                onClick={() => setMode("pick")}
                className="text-xs text-gold/70 hover:text-gold transition-colors"
              >
                ← Usar personagem existente
              </button>
            )}

            <div className="space-y-1.5">
              <label htmlFor="char-name" className="text-xs text-gold/80 uppercase tracking-widest font-medium">
                {tc("lobby_name_label")}
              </label>
              <Input
                id="char-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tc("lobby_name_placeholder")}
                required
                className={inputClass}
                data-testid="invite-char-name"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="char-hp" className="text-xs text-gold/80 uppercase tracking-widest font-medium">
                  HP
                </label>
                <Input
                  id="char-hp"
                  type="number"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  placeholder="45"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="char-ac" className="text-xs text-gold/80 uppercase tracking-widest font-medium">
                  AC
                </label>
                <Input
                  id="char-ac"
                  type="number"
                  value={ac}
                  onChange={(e) => setAc(e.target.value)}
                  placeholder="16"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="char-dc" className="text-xs text-gold/80 uppercase tracking-widest font-medium">
                  DC
                </label>
                <Input
                  id="char-dc"
                  type="number"
                  value={spellSaveDc}
                  onChange={(e) => setSpellSaveDc(e.target.value)}
                  placeholder="15"
                  className={inputClass}
                />
              </div>
            </div>
          </>
        )}

        <Button
          type="submit"
          variant="gold"
          className="w-full min-h-[44px]"
          disabled={
            isSubmitting ||
            (mode === "pick" && !selectedCharId) ||
            (mode === "create" && !name.trim())
          }
        >
          {isSubmitting
            ? "..."
            : mode === "pick"
            ? "Entrar com este personagem"
            : t("create_character_and_join")}
        </Button>
      </form>
    </div>
  );
}
