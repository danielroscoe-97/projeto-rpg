"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="mt-8 p-6 bg-[#16213e] rounded-lg border border-red-900/30">
      <h2 className="text-white font-semibold mb-2">Danger Zone</h2>
      <p className="text-white/50 text-sm mb-4">
        Permanently delete your account and all associated data. This cannot be
        undone.
      </p>
      {error && (
        <p className="text-red-400 text-sm mb-4" role="alert">
          {error}
        </p>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Account"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-[#16213e] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This will permanently delete your account and all your campaigns,
              player characters, encounters, combatants, and session history.{" "}
              <strong className="text-white">This cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-white/10 text-white border-white/10 hover:bg-white/20"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Yes, delete everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
