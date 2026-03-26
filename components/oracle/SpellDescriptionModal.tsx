"use client";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { SpellCard } from "@/components/oracle/SpellCard";
import type { SrdSpell } from "@/lib/srd/srd-loader";

interface SpellDescriptionModalProps {
  spell: SrdSpell | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPin?: () => void;
}

export function SpellDescriptionModal({
  spell,
  open,
  onOpenChange,
  onPin,
}: SpellDescriptionModalProps) {
  if (!spell) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[85vh] overflow-y-auto !bg-[#1a1a1e] !border-white/[0.08] !p-0"
        aria-describedby="spell-description"
        data-testid="spell-modal"
      >
        <SpellCard
          spell={spell}
          variant="inline"
          onPin={onPin}
        />
      </DialogContent>
    </Dialog>
  );
}
