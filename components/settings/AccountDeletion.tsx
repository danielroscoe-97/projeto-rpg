"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useRoleStore } from "@/lib/stores/role-store";
import { useSubscriptionStore } from "@/lib/stores/subscription-store";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function AccountDeletion() {
  const router = useRouter();
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const resetRole = useRoleStore((s) => s.reset);
  const resetSubscription = useSubscriptionStore((s) => s.reset);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to delete account");
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      resetRole();
      resetSubscription();
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setIsDeleting(false);
    }
  };

  return (
    <section className="rounded-lg border border-red-900/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-red-900/5 transition-colors min-h-[44px]"
        aria-expanded={expanded}
      >
        <div>
          <h2 className="text-muted-foreground font-medium text-sm">{t("danger_zone")}</h2>
        </div>
        <span className="text-muted-foreground/60 text-xs" aria-hidden="true">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-red-900/20 pt-4">
          <p className="text-muted-foreground text-sm mb-4">
            {t("delete_description")}
          </p>
          {error && (
            <p className="text-red-400 text-sm mb-4" role="alert">
              {error}
            </p>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                {isDeleting ? t("delete_deleting") : t("delete_button")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">
                  {t("delete_confirm_title")}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  {t("delete_confirm_description")}{" "}
                  <strong className="text-foreground">{t("delete_confirm_warning")}</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  className="bg-white/[0.06] text-foreground border-border hover:bg-white/[0.1]"
                  disabled={isDeleting}
                >
                  {tc("cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-foreground"
                  disabled={isDeleting}
                >
                  {isDeleting ? t("delete_deleting") : t("delete_confirm_button")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </section>
  );
}
