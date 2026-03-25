"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SrdCondition } from "@/lib/srd/srd-loader";

interface ConditionRulesModalProps {
  condition: SrdCondition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConditionRulesModal({
  condition,
  open,
  onOpenChange,
}: ConditionRulesModalProps) {
  if (!condition) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        aria-describedby="condition-description"
        data-testid="condition-modal"
      >
        <DialogHeader>
          <DialogTitle>{condition.name}</DialogTitle>
        </DialogHeader>
        <p
          id="condition-description"
          className="text-sm text-white/90 whitespace-pre-line"
          data-testid="condition-description-text"
        >
          {condition.description}
        </p>
      </DialogContent>
    </Dialog>
  );
}
