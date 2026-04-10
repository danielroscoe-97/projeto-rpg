"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, CalendarDays, FileText, ScrollText } from "lucide-react";
import { createSession, startSession } from "@/lib/supabase/campaign-sessions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Types ──────────────────────────────────────────────────────────────────

interface SessionPlannerProps {
  campaignId: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionCreated?: (sessionId: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function SessionPlanner({
  campaignId,
  userId,
  open,
  onOpenChange,
  onSessionCreated,
}: SessionPlannerProps) {
  const t = useTranslations("sessionPlanner");
  const router = useRouter();

  const [name, setName] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [description, setDescription] = useState("");
  const [prepNotes, setPrepNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  // ── Reset form when dialog opens ────────────────────────────────────────

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setName("");
      setScheduledFor("");
      setDescription("");
      setPrepNotes("");
      setSaving(false);
      setStarting(false);
    }
    onOpenChange(nextOpen);
  }

  // ── Create session (shared logic) ───────────────────────────────────────

  async function handleCreate(startNow: boolean) {
    const loading = startNow ? setStarting : setSaving;
    loading(true);

    try {
      const sessionName = name.trim() || t("default_name");

      const result = await createSession(campaignId, userId, {
        name: sessionName,
        description: description.trim() || null,
        scheduled_for: scheduledFor || null,
        prep_notes: prepNotes.trim() || null,
        status: startNow ? "active" : "planned",
        is_active: startNow,
      });

      if (!result) {
        toast.error(t("error_create"));
        loading(false);
        return;
      }

      if (startNow) {
        await startSession(result.sessionId);
      }

      toast.success(startNow ? t("success_started") : t("success_planned"));
      onOpenChange(false);
      onSessionCreated?.(result.sessionId);

      if (startNow) {
        router.push(`/app/session/${result.sessionId}`);
      }
    } catch {
      toast.error(t("error_create"));
    } finally {
      loading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const isLoading = saving || starting;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-sm:max-w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Session Name */}
          <div className="space-y-1.5">
            <Label htmlFor="session-name" className="text-sm text-foreground">
              {t("name_label")}
            </Label>
            <Input
              id="session-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 100))}
              placeholder={t("name_placeholder")}
              maxLength={100}
              disabled={isLoading}
              className="bg-background border-border text-foreground min-h-[44px]"
            />
          </div>

          {/* Scheduled Date */}
          <div className="space-y-1.5">
            <Label
              htmlFor="session-date"
              className="text-sm text-foreground flex items-center gap-1.5"
            >
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
              {t("date_label")}
              <span className="text-xs text-muted-foreground font-normal">
                ({t("optional")})
              </span>
            </Label>
            <Input
              id="session-date"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              disabled={isLoading}
              className="bg-background border-border text-foreground min-h-[44px]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label
              htmlFor="session-description"
              className="text-sm text-foreground flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              {t("description_label")}
              <span className="text-xs text-muted-foreground font-normal">
                ({t("optional")})
              </span>
            </Label>
            <Textarea
              id="session-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              maxLength={200}
              placeholder={t("description_placeholder")}
              disabled={isLoading}
              className="bg-background border-border text-foreground min-h-[80px] resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/200
            </p>
          </div>

          {/* Prep Notes (DM-only) */}
          <div className="space-y-1.5">
            <Label
              htmlFor="session-prep"
              className="text-sm text-foreground flex items-center gap-1.5"
            >
              <ScrollText className="w-3.5 h-3.5 text-muted-foreground" />
              {t("prep_label")}
              <span className="text-xs text-muted-foreground font-normal">
                ({t("optional")})
              </span>
            </Label>
            <Textarea
              id="session-prep"
              value={prepNotes}
              onChange={(e) => setPrepNotes(e.target.value.slice(0, 5000))}
              maxLength={5000}
              placeholder={t("prep_placeholder")}
              disabled={isLoading}
              className="bg-background border-border text-foreground min-h-[120px] resize-y font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground text-right">
              {prepNotes.length}/5000
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => handleCreate(false)}
              disabled={isLoading}
              className="min-h-[44px] border-border text-foreground hover:bg-white/[0.06]"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {t("save_planned")}
            </Button>

            <Button
              onClick={() => handleCreate(true)}
              disabled={isLoading}
              className="min-h-[44px] bg-amber-600 hover:bg-amber-700 text-foreground"
            >
              {starting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {t("start_now")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
