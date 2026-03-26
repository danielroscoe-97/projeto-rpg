"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
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
        <VisuallyHidden.Root><DialogTitle>{spell.name}</DialogTitle></VisuallyHidden.Root>
        {onPin && (
          <div className="flex justify-end px-4 pt-3 pb-0">
            <button
              type="button"
              onClick={onPin}
              className="px-2 py-1 text-xs rounded font-medium bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[28px]"
              aria-label={`Pin ${spell.name} card`}
              data-testid="spell-modal-pin-btn"
            >
              📌 Pin
            </button>
          </div>
        )}
        <SpellCard spell={spell} variant="inline" />
      </DialogContent>
    </Dialog>
  );
}
