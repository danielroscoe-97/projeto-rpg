"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acceptInviteAction } from "@/app/invite/actions";

interface InviteAcceptClientProps {
  inviteId: string;
  campaignId: string;
  campaignName: string;
  dmName: string;
  userId: string;
  token: string;
}

export function InviteAcceptClient({
  inviteId,
  campaignId,
  campaignName,
  dmName,
  userId,
  token,
}: InviteAcceptClientProps) {
  const t = useTranslations("campaign");
  const tc = useTranslations("player");
  const router = useRouter();
  const [name, setName] = useState("");
  const [hp, setHp] = useState("");
  const [ac, setAc] = useState("");
  const [spellSaveDc, setSpellSaveDc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
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

      toast.success(t("invite_accepted"));
      router.push("/app/dashboard");
    } catch (err) {
      toast.error(t("invite_error"));
      Sentry.captureException(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, hp, ac, spellSaveDc, campaignId, inviteId, t, router]);

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
          Crie seu personagem para entrar na campanha
        </p>
      </div>

      {/* Character creation form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <Button
          type="submit"
          variant="gold"
          className="w-full min-h-[44px]"
          disabled={isSubmitting || !name.trim()}
        >
          {isSubmitting ? "..." : "Criar Personagem e Entrar"}
        </Button>
      </form>
    </div>
  );
}
