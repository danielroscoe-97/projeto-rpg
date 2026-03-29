"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useExtendedCompendium } from "@/lib/hooks/use-extended-compendium";
import { useSrdStore } from "@/lib/stores/srd-store";
import { toast } from "sonner";

interface ExternalContentGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExternalContentGate({ open, onOpenChange }: ExternalContentGateProps) {
  const t = useTranslations("import");
  const { activate } = useExtendedCompendium();
  const monsters = useSrdStore((s) => s.monsters);
  const [accepted, setAccepted] = useState(false);

  const nonSrdCount = monsters.filter((m) => m.is_srd === false).length;

  const handleActivate = () => {
    activate();
    onOpenChange(false);
    setAccepted(false);
    toast.success(t("gate_success", { count: nonSrdCount }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("gate_title")}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("gate_disclaimer")}
        </p>

        <label className="flex items-start gap-3 mt-4 cursor-pointer">
          <Checkbox
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
            className="mt-0.5"
          />
          <span className="text-sm text-foreground/90">
            {t("gate_checkbox")}
          </span>
        </label>

        <button
          type="button"
          onClick={handleActivate}
          disabled={!accepted}
          className="mt-4 w-full py-2.5 rounded-md text-sm font-medium transition-all bg-gold text-surface-primary hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("gate_activate")}
        </button>
      </DialogContent>
    </Dialog>
  );
}
