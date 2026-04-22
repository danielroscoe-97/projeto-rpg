"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics/track";
import { captureError } from "@/lib/errors/capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Clock, AlertCircle, Copy, RefreshCw } from "lucide-react";

interface InvitePlayerDialogProps {
  campaignId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * DM-side invite UI.
 *
 * 2026-04-21: the Email tab was removed together with the `campaign_invites`
 * table (migration 179). See `docs/diagnostic-campaign-invites-zero-accept.md`
 * for the deprecation rationale (0% accept over 30 days, 193× behind the
 * Link flow). The Join-Link tab is now the only path — players enter the
 * campaign via the `/join-campaign/[code]` route backed by `session_tokens`.
 */
export function InvitePlayerDialog({ campaignId, open: controlledOpen, onOpenChange }: InvitePlayerDialogProps) {
  const t = useTranslations("campaign");
  const tc = useTranslations("common");
  const [_open, _setOpen] = useState(false);
  const open = controlledOpen ?? _open;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) _setOpen(next);
    onOpenChange?.(next);
  };

  // ----- Via Link state -----
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkActive, setLinkActive] = useState(true);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const [confirmRenew, setConfirmRenew] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const buildLink = (code: string) =>
    `${window.location.origin}/join-campaign/${code}`;

  const loadJoinLink = useCallback(async () => {
    setLinkLoading(true);
    setLinkError(false);
    try {
      const res = await fetch(`/api/campaign/${campaignId}/join-link`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(`HTTP ${res.status}: ${body.error ?? "unknown"}`);
      }
      const { data } = await res.json();
      setLinkCode(data.code);
      setLinkActive(data.is_active);
      setExpiresAt(data.expires_at ?? null);
    } catch (err) {
      console.error("[InvitePlayerDialog] loadJoinLink failed:", err);
      setLinkError(true);
      captureError(err, { component: "InvitePlayerDialog", action: "loadJoinLink", category: "network", extra: { campaignId } });
    } finally {
      setLinkLoading(false);
    }
  }, [campaignId]);

  // Load join link on dialog open
  useEffect(() => {
    if (open && !linkCode) loadJoinLink();
  }, [open, linkCode, loadJoinLink]);

  const handleCopy = useCallback(async () => {
    if (!linkCode) return;
    try {
      await navigator.clipboard.writeText(buildLink(linkCode));
      trackEvent("share:link_copied");
      toast.success(t("invite_link_copied"));
    } catch {
      toast.error(t("invite_copy_error"));
    }
  }, [linkCode, t]);

  const handleToggleActive = useCallback(async (active: boolean) => {
    setLinkActive(active);
    try {
      await fetch(`/api/campaign/${campaignId}/join-link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: active }),
      });
    } catch (err) {
      setLinkActive(!active); // revert
      captureError(err, { component: "InvitePlayerDialog", action: "toggleLink", category: "network" });
    }
  }, [campaignId]);

  const handleRenew = useCallback(async () => {
    if (!confirmRenew) {
      setConfirmRenew(true);
      return;
    }
    setConfirmRenew(false);
    try {
      const res = await fetch(`/api/campaign/${campaignId}/join-link`, { method: "POST" });
      if (res.ok) {
        const { data } = await res.json();
        setLinkCode(data.code);
        setLinkActive(true);
        setExpiresAt(data.expires_at ?? null);
        toast.success(t("invite_link_renewed"));
      }
    } catch (err) {
      captureError(err, { component: "InvitePlayerDialog", action: "renewLink", category: "network" });
    }
  }, [campaignId, confirmRenew, t]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); }}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            {t("invite_button")}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("invite_title")}</DialogTitle>
        </DialogHeader>

        {/* Via Link — the only path since 2026-04-21 (email flow removed). */}
        <div className="mt-2 space-y-4 flex-none">
          {linkLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("invite_generating")}</p>
          ) : linkError ? (
            <div className="text-center py-4 space-y-3">
              <AlertCircle className="w-5 h-5 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{t("invite_error_generate")}</p>
              <Button type="button" variant="outline" size="sm" onClick={loadJoinLink} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                {t("invite_retry")}
              </Button>
            </div>
          ) : linkCode != null ? (
            <>
              {/* URL display + copy */}
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={buildLink(linkCode)}
                  className="flex-1 text-xs bg-surface-tertiary border-white/[0.15] text-foreground"
                />
                <Button type="button" variant="outline" size="icon" onClick={handleCopy} title={t("invite_copy_title")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              {/* Expiration info */}
              {expiresAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {(() => {
                    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
                    if (days <= 0) return t("invite_link_expired");
                    if (days === 1) return t("invite_link_expires_tomorrow");
                    return t("invite_link_expires_in", { days });
                  })()}
                </p>
              )}

              {/* Active toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("invite_disable_link")}</span>
                <Switch checked={linkActive} onCheckedChange={handleToggleActive} />
              </div>

              {/* Renew */}
              {!confirmRenew ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground w-full"
                  onClick={handleRenew}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t("invite_renew_link")}
                </Button>
              ) : (
                <div className="rounded-lg border border-white/[0.04] p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t("invite_renew_warning")}
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="destructive" size="sm" className="flex-1" onClick={handleRenew}>
                      {tc("confirm")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={() => setConfirmRenew(false)}>
                      {tc("cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">{t("invite_generating")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
