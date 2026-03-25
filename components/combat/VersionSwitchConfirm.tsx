"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RulesetVersion } from "@/lib/types/database";

interface VersionSwitchConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  combatantName: string;
  fromVersion: RulesetVersion;
  toVersion: RulesetVersion;
  currentHp: number;
  newMaxHp?: number;
  onConfirm: () => void;
}

export function VersionSwitchConfirm({
  open,
  onOpenChange,
  combatantName,
  fromVersion,
  toVersion,
  currentHp,
  newMaxHp,
  onConfirm,
}: VersionSwitchConfirmProps) {
  const t = useTranslations("combat");

  const willCapHp = newMaxHp !== undefined && currentHp > newMaxHp;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t("version_confirm_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-foreground">
            {t("version_confirm_body", {
              name: combatantName,
              from: fromVersion,
              to: toVersion,
            })}
          </p>

          <p className="text-muted-foreground text-xs">
            {t("version_confirm_note")}
          </p>

          {willCapHp && (
            <div className="rounded-lg border-l-2 border-amber-400 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
              {t("version_confirm_hp_warning", {
                currentHp,
                newMaxHp: newMaxHp!,
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all min-h-[36px]"
          >
            {t("version_confirm_cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="px-3 py-1.5 text-sm rounded-lg font-medium bg-gold text-surface-primary hover:bg-gold/90 transition-all min-h-[36px]"
          >
            {t("version_confirm_switch")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
