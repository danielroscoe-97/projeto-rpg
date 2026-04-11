"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lock, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExternalContentGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the user successfully accepts the agreement */
  onAccepted?: () => void;
}

export function ExternalContentGate({ open, onOpenChange, onAccepted }: ExternalContentGateProps) {
  const t = useTranslations("import");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Reset state when dialog closes (P2: prevents stale done/accepted on reopen)
  useEffect(() => {
    if (!open) { setAccepted(false); setDone(false); }
  }, [open]);

  async function handleActivate() {
    if (!accepted || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/content/agree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.status === 409) {
        // Already agreed — treat as success
        setDone(true);
        onAccepted?.();
        onOpenChange(false);
        return;
      }
      if (!res.ok) {
        toast.error(t("gate_error"));
        return;
      }
      setDone(true);
      toast.success(t("gate_success", { count: "" }));
      onAccepted?.();
      onOpenChange(false);
    } catch {
      toast.error(t("gate_error"));
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      setAccepted(false);
      setDone(false);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("gate_title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-gold/10 p-3">
              {done ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              ) : (
                <Lock className="h-6 w-6 text-gold" />
              )}
            </div>
          </div>

          {/* Disclaimer text */}
          <p className="text-xs text-muted-foreground leading-relaxed bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
            {t("gate_disclaimer")}
          </p>

          {/* Checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              disabled={loading || done}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-gold focus:ring-gold/50 accent-gold"
            />
            <span className="text-sm text-foreground">
              {t("gate_checkbox")}
            </span>
          </label>

          {/* Activate button */}
          <button
            type="button"
            onClick={handleActivate}
            disabled={!accepted || loading || done}
            className="w-full py-2.5 rounded-md text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gold text-white hover:bg-gold/90"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              t("gate_activate")
            )}
          </button>

          {/* Close / dismiss */}
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="w-full py-2 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("gate_close")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
