"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lock } from "lucide-react";

interface ExternalContentGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExternalContentGate({ open, onOpenChange }: ExternalContentGateProps) {
  const t = useTranslations("import");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("gate_title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="rounded-full bg-gold/10 p-3">
            <Lock className="h-6 w-6 text-gold" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("gate_beta_only")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-2 w-full py-2.5 rounded-md text-sm font-medium transition-all bg-muted text-foreground hover:bg-muted/80"
        >
          {t("gate_close")}
        </button>
      </DialogContent>
    </Dialog>
  );
}
