"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { completeSession } from "@/lib/supabase/campaign-sessions";

// ── Types ────────────────────────────────────────────────────────────────────

interface SessionRecapDialogProps {
  sessionId: string;
  sessionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const MAX_CHARS = 5000;

// ── Component ────────────────────────────────────────────────────────────────

export function SessionRecapDialog({
  sessionId,
  sessionName,
  open,
  onOpenChange,
  onSaved,
}: SessionRecapDialogProps) {
  const t = useTranslations("sessionHistory");
  const [recap, setRecap] = useState("");
  const [saving, setSaving] = useState(false);

  const remaining = MAX_CHARS - recap.length;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setRecap("");
      setSaving(false);
    }
    onOpenChange(nextOpen);
  };

  const handleComplete = async (withRecap: boolean) => {
    setSaving(true);
    try {
      const success = await completeSession(
        sessionId,
        withRecap ? recap.trim() || undefined : undefined
      );

      if (success) {
        toast.success(t("recap_saved"));
        setRecap("");
        onOpenChange(false);
        onSaved?.();
      } else {
        toast.error(t("recap_error"));
      }
    } catch {
      toast.error(t("recap_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="session-recap-dialog">
        <DialogHeader>
          <DialogTitle>
            {t("recap_title", { name: sessionName })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Textarea */}
          <div className="space-y-2">
            <Textarea
              value={recap}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setRecap(e.target.value);
                }
              }}
              placeholder={t("recap_placeholder")}
              className="min-h-[160px] bg-card border-white/[0.08] text-foreground placeholder:text-muted-foreground resize-y"
              disabled={saving}
              data-testid="session-recap-textarea"
            />
            <p className="text-xs text-muted-foreground text-right tabular-nums">
              {t("recap_chars_remaining", { count: remaining })}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleComplete(false)}
              disabled={saving}
              className="min-h-[44px]"
              data-testid="session-recap-skip"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("recap_skip")
              )}
            </Button>
            <Button
              type="button"
              variant="gold"
              onClick={() => handleComplete(true)}
              disabled={saving || recap.trim().length === 0}
              className="min-h-[44px]"
              data-testid="session-recap-save"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("recap_save")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
