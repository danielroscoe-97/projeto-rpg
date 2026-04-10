"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Archive, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CampaignArchiveDialogProps {
  campaignId: string;
  campaignName: string;
  /** Stats to show in warning before permanent delete */
  sessionCount?: number;
  encounterCount?: number;
  noteCount?: number;
  mode: "archive" | "restore" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function CampaignArchiveDialog({
  campaignId,
  campaignName,
  sessionCount = 0,
  encounterCount = 0,
  noteCount = 0,
  mode,
  open,
  onOpenChange,
  onComplete,
}: CampaignArchiveDialogProps) {
  const t = useTranslations("campaignArchive");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const supabase = useMemo(() => createClient(), []);

  async function handleArchive() {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq("id", campaignId);

      if (error) throw error;

      toast.success(t("archive_success"));
      onOpenChange(false);
      onComplete?.();
      router.refresh();
    } catch {
      toast.error(t("error"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRestore() {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ is_archived: false, archived_at: null })
        .eq("id", campaignId);

      if (error) throw error;

      toast.success(t("restore_success"));
      onOpenChange(false);
      onComplete?.();
      router.refresh();
    } catch {
      toast.error(t("error"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (deleteConfirmName !== campaignName) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) throw error;

      toast.success(t("delete_success"));
      onOpenChange(false);
      onComplete?.();
      router.push("/app/dashboard");
      router.refresh();
    } catch {
      toast.error(t("error"));
    } finally {
      setIsLoading(false);
    }
  }

  if (mode === "archive") {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-400" />
              {t("archive_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("archive_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-white/[0.06] text-foreground border-border hover:bg-white/[0.1]"
              disabled={isLoading}
            >
              {tc("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="bg-amber-600 hover:bg-amber-700 text-foreground"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("archive_button")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (mode === "restore") {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              {t("restore_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("restore_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-white/[0.06] text-foreground border-border hover:bg-white/[0.1]"
              disabled={isLoading}
            >
              {tc("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-emerald-600 hover:bg-emerald-700 text-foreground"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("restore_button")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // mode === "delete"
  const hasData = sessionCount > 0 || encounterCount > 0 || noteCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setDeleteConfirmName(""); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            {t("delete_title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {t("delete_desc")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasData && (
          <div className="mx-6 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="text-xs text-red-300">
              {t("delete_warning", {
                sessions: sessionCount,
                encounters: encounterCount,
                notes: noteCount,
              })}
            </p>
          </div>
        )}

        <div className="px-6 pb-2">
          <Label htmlFor="delete-confirm" className="text-sm text-muted-foreground">
            {t("delete_confirm")}
          </Label>
          <Input
            id="delete-confirm"
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
            placeholder={campaignName}
            className="mt-2 bg-background border-border text-foreground min-h-[44px]"
          />
          {deleteConfirmName.length > 0 && deleteConfirmName !== campaignName && (
            <p className="text-xs text-red-400 mt-1">{t("delete_mismatch")}</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            className="bg-white/[0.06] text-foreground border-border hover:bg-white/[0.1]"
            disabled={isLoading}
            onClick={() => setDeleteConfirmName("")}
          >
            {tc("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-foreground"
            disabled={isLoading || deleteConfirmName !== campaignName}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t("delete_button")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
