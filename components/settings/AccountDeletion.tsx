"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
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
      router.push("/");
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
    <div className="mt-8 p-6 bg-card rounded-lg border border-red-900/30">
      <h2 className="text-foreground font-semibold mb-2">{t("danger_zone")}</h2>
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
          <Button variant="destructive" disabled={isDeleting}>
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
  );
}
