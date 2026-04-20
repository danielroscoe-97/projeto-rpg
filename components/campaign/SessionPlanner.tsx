"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, CalendarDays, FileText, ScrollText } from "lucide-react";
import {
  createSession,
  startSession,
  updateSession,
} from "@/lib/supabase/campaign-sessions";
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

export interface SessionPlannerInitialData {
  sessionId: string;
  name: string;
  description: string | null;
  scheduled_for: string | null;
  prep_notes: string | null;
}

interface SessionPlannerProps {
  campaignId: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionCreated?: (sessionId: string) => void;
  /**
   * If present, dialog opens in EDIT mode targeting this session
   * (calls updateSession instead of createSession + hides "Start Now" button).
   */
  initialData?: SessionPlannerInitialData | null;
  /**
   * Called after a successful update (edit mode).
   */
  onSessionUpdated?: (sessionId: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Converts an ISO timestamp like "2026-04-25T14:30:00.000Z" into the
 * `datetime-local` input format "2026-04-25T14:30" using local time.
 * Returns an empty string for null/undefined input.
 */
function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Offset to local, then slice to "YYYY-MM-DDTHH:mm"
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export function SessionPlanner({
  campaignId,
  userId,
  open,
  onOpenChange,
  onSessionCreated,
  initialData,
  onSessionUpdated,
}: SessionPlannerProps) {
  const t = useTranslations("sessionPlanner");
  const router = useRouter();

  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [scheduledFor, setScheduledFor] = useState(
    toDateTimeLocal(initialData?.scheduled_for ?? null),
  );
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [prepNotes, setPrepNotes] = useState(initialData?.prep_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  // Sync internal state when `initialData` changes (e.g., opening a different session).
  useEffect(() => {
    if (initialData) {
      setName(initialData.name ?? "");
      setScheduledFor(toDateTimeLocal(initialData.scheduled_for));
      setDescription(initialData.description ?? "");
      setPrepNotes(initialData.prep_notes ?? "");
    }
  }, [initialData]);

  // ── Reset form when dialog opens ────────────────────────────────────────

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      // Reset to initialData (edit) or empty (create)
      setName(initialData?.name ?? "");
      setScheduledFor(toDateTimeLocal(initialData?.scheduled_for ?? null));
      setDescription(initialData?.description ?? "");
      setPrepNotes(initialData?.prep_notes ?? "");
      setSaving(false);
      setStarting(false);
    }
    onOpenChange(nextOpen);
  }

  // ── Update existing session (edit mode) ──────────────────────────────────

  async function handleUpdate() {
    if (!initialData) return;
    setSaving(true);

    try {
      const sessionName = name.trim() || t("default_name");

      const success = await updateSession(initialData.sessionId, {
        name: sessionName,
        description: description.trim() || null,
        scheduled_for: scheduledFor || null,
        prep_notes: prepNotes.trim() || null,
      });

      if (!success) {
        toast.error(t("error_create"));
        setSaving(false);
        return;
      }

      toast.success(t("success_planned"));
      onOpenChange(false);
      onSessionUpdated?.(initialData.sessionId);
      router.refresh();
    } catch {
      toast.error(t("error_create"));
    } finally {
      setSaving(false);
    }
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
        router.push(`/app/combat/${result.sessionId}`);
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
              placeholder={t("name_placeholder", { number: "?" })}
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
            {isEdit ? (
              <Button
                onClick={handleUpdate}
                disabled={isLoading}
                className="min-h-[44px] bg-amber-600 hover:bg-amber-700 text-foreground"
                data-testid="session-planner-update"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t("save_planned")}
              </Button>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
