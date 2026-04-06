"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link2, Copy, Check, X, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { captureError } from "@/lib/errors/capture";

interface PendingInvite {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired";
  invite_link?: string;
}

interface InviteMemberProps {
  campaignId: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5 text-amber-400" />,
  accepted: <Check className="w-3.5 h-3.5 text-green-400" />,
  expired: <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />,
};

export function InviteMember({ campaignId }: InviteMemberProps) {
  const t = useTranslations("members");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Base invite URL
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  // Load pending invites when dialog opens
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
        captureError(err, {
          component: "InviteMember",
          action: "loadInvites",
          category: "network",
        });
      }
    };
    load();
  }, [open, campaignId]);

  const handleCopyLink = useCallback(
    async (link: string) => {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success(t("link_copied"));
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = setTimeout(() => {
          copiedTimerRef.current = null;
          setCopied(false);
        }, 3000);
      } catch {
        // Clipboard may be blocked
      }
    },
    [t]
  );

  const handleRevoke = useCallback(
    async (inviteId: string) => {
      try {
        const res = await fetch(
          `/api/campaign/${campaignId}/invites?inviteId=${inviteId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Revoke failed");
        setInvites((prev) =>
          prev.map((inv) =>
            inv.id === inviteId
              ? { ...inv, status: "expired" as const }
              : inv
          )
        );
      } catch (err) {
        captureError(err, {
          component: "InviteMember",
          action: "revokeInvite",
          category: "network",
        });
      }
    },
    [campaignId]
  );

  const pendingInvites = invites.filter((inv) => inv.status === "pending");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          data-testid="invite-member-trigger"
        >
          <Link2 className="w-4 h-4" />
          {t("invite_link")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("invite_link")}</DialogTitle>
        </DialogHeader>

        {/* Campaign invite link */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("invite_first")}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={`${baseUrl}/auth/sign-up?campaign=${campaignId}`}
              className="bg-background border border-white/[0.04] rounded-md px-3 py-2 text-foreground text-xs font-mono w-full truncate"
              data-testid="invite-link-input"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                handleCopyLink(
                  `${baseUrl}/auth/sign-up?campaign=${campaignId}`
                )
              }
              className="shrink-0 gap-1"
              data-testid="copy-link-button"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? t("link_copied") : t("copy_link")}
            </Button>
          </div>
        </div>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <div className="mt-4 space-y-2" data-testid="pending-invites-list">
            <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {t("pending_invites")} ({pendingInvites.length})
            </h4>
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-2 text-sm py-2 border-b border-white/[0.04] last:border-0"
              >
                {STATUS_ICONS[inv.status]}
                <span className="flex-1 truncate text-foreground">
                  {inv.email}
                </span>
                <button
                  type="button"
                  onClick={() => handleRevoke(inv.id)}
                  className="text-muted-foreground hover:text-red-400 transition-colors text-xs"
                  data-testid={`revoke-invite-${inv.id}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
