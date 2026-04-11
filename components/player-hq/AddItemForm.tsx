"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddItemFormProps {
  open: boolean;
  onClose: () => void;
  onAdd: (input: { item_name: string; quantity: number; notes?: string }) => Promise<void>;
}

export function AddItemForm({ open, onClose, onAdd }: AddItemFormProps) {
  const t = useTranslations("player_hq.inventory");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        item_name: name.trim(),
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        notes: notes.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("add_item")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="item-name">{t("item_name")}</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("item_name_placeholder")}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-qty">{t("item_quantity")}</Label>
            <Input
              id="item-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-notes">{t("item_notes")}</Label>
            <Input
              id="item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("item_notes_placeholder")}
            />
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            <Link
              href="/app/compendium?tab=items"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 text-sm text-amber-400/70 hover:text-amber-400 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              {t("browse_srd_items")}
            </Link>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="gold" disabled={!name.trim() || saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {t("add")}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
