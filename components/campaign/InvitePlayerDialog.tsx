"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, X, Clock, Check, AlertCircle } from "lucide-react";

interface Invite {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired";
  created_at: string;
  expires_at: string;
}

interface InvitePlayerDialogProps {
  campaignId: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5 text-amber-400" />,
  accepted: <Check className="w-3.5 h-3.5 text-green-400" />,
  expired: <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />,
};

export function InvitePlayerDialog({ campaignId }: InvitePlayerDialogProps) {
  const t = useTranslations("campaign");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);

  // Load existing invites when dialog opens
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/campaign/${campaignId}/invites`);
        if (res.ok) {
          const { data } = await res.json();
          setInvites(data ?? []);
        }
      } catch (err) {
        Sentry.captureException(err);
      }
    };
    load();
  }, [open, campaignId]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/campaign/${campaignId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const body = await res.json();

      if (!res.ok) {
        if (body.error === "rate_limit") {
          toast.error(t("invite_limit_reached"));
        } else if (body.error === "duplicate") {
          toast.error(t("invite_already_pending"));
        } else {
          throw new Error(body.message || "Failed");
        }
        return;
      }

      toast.success(t("invite_sent", { email: email.trim() }));
      setEmail("");

      // Add to list
      if (body.data) {
        setInvites((prev) => [body.data, ...prev]);
      }
    } catch (err) {
      toast.error(t("invite_error"));
      Sentry.captureException(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, campaignId, t]);

  const handleCancel = useCallback(async (inviteId: string) => {
    try {
      const res = await fetch(`/api/campaign/${campaignId}/invites?inviteId=${inviteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Cancel failed");
      setInvites((prev) => prev.map((inv) =>
        inv.id === inviteId ? { ...inv, status: "expired" as const } : inv
      ));
    } catch (err) {
      toast.error(t("invite_cancel_error"));
      Sentry.captureException(err);
    }
  }, [campaignId, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Mail className="w-4 h-4" />
          {t("invite_button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("invite_title")}</DialogTitle>
        </DialogHeader>

        {/* Invite form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("invite_email_placeholder")}
            required
            className="flex-1"
            data-testid="invite-email-input"
          />
          <Button type="submit" variant="gold" disabled={isSubmitting}>
            {isSubmitting ? "..." : t("invite_send")}
          </Button>
        </form>

        {/* Invite list */}
        {invites.length > 0 && (
          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
            <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {t("invite_list_title")}
            </h4>
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-2 text-sm py-2 border-b border-border last:border-0"
              >
                {STATUS_ICONS[inv.status]}
                <span className="flex-1 truncate text-foreground">{inv.email}</span>
                <span className="text-xs text-muted-foreground capitalize">{inv.status}</span>
                {inv.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => handleCancel(inv.id)}
                    className="text-muted-foreground hover:text-red-400 transition-colors"
                    aria-label="Cancel invite"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
