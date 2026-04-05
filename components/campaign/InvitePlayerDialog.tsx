"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { captureError } from "@/lib/errors/capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, X, Clock, Check, AlertCircle, Copy, RefreshCw, Link as LinkIcon } from "lucide-react";

interface Invite {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired";
  created_at: string;
  expires_at: string;
}

interface InvitePlayerDialogProps {
  campaignId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5 text-amber-400" />,
  accepted: <Check className="w-3.5 h-3.5 text-green-400" />,
  expired: <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />,
};

export function InvitePlayerDialog({ campaignId, open: controlledOpen, onOpenChange }: InvitePlayerDialogProps) {
  const t = useTranslations("campaign");
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

  // ----- Via Email state -----
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);

  const buildLink = (code: string) =>
    `${window.location.origin}/join-campaign/${code}`;

  const loadJoinLink = useCallback(async () => {
    setLinkLoading(true);
    setLinkError(false);
    try {
      const res = await fetch(`/api/campaign/${campaignId}/join-link`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = await res.json();
      setLinkCode(data.code);
      setLinkActive(data.is_active);
    } catch (err) {
      setLinkError(true);
      captureError(err, { component: "InvitePlayerDialog", action: "loadJoinLink", category: "network" });
    } finally {
      setLinkLoading(false);
    }
  }, [campaignId]);

  // Load join link on dialog open (default tab is "link")
  useEffect(() => {
    if (open && !linkCode) loadJoinLink();
  }, [open, linkCode, loadJoinLink]);

  const handleCopy = useCallback(() => {
    if (!linkCode) return;
    navigator.clipboard.writeText(buildLink(linkCode));
    toast.success("Link copiado!");
  }, [linkCode]);

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
        toast.success("Link renovado!");
      }
    } catch (err) {
      captureError(err, { component: "InvitePlayerDialog", action: "renewLink", category: "network" });
    }
  }, [campaignId, confirmRenew]);

  // Load existing email invites when dialog opens
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
        captureError(err, { component: "InvitePlayerDialog", action: "loadInvites", category: "network" });
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

      if (body.data) {
        setInvites((prev) => [body.data, ...prev]);
      }
    } catch (err) {
      toast.error(t("invite_error"));
      captureError(err, { component: "InvitePlayerDialog", action: "sendInvite", category: "network" });
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
      captureError(err, { component: "InvitePlayerDialog", action: "cancelInvite", category: "network" });
    }
  }, [campaignId, t]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setEmail(""); }}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Mail className="w-4 h-4" />
            {t("invite_button")}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("invite_title")}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="link" onValueChange={(v) => { if (v === "link" && !linkCode) loadJoinLink(); }}>
          <TabsList className="w-full">
            <TabsTrigger value="link" className="flex-1 gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" />
              Via Link
            </TabsTrigger>
            <TabsTrigger value="email" className="flex-1 gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Via E-mail
            </TabsTrigger>
          </TabsList>

          {/* ── Via Link ── */}
          <TabsContent value="link" className="mt-4 space-y-4 flex-none">
            {linkLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Gerando link...</p>
            ) : linkError ? (
              <div className="text-center py-4 space-y-3">
                <AlertCircle className="w-5 h-5 text-destructive mx-auto" />
                <p className="text-sm text-muted-foreground">Não foi possível gerar o link de convite.</p>
                <Button type="button" variant="outline" size="sm" onClick={loadJoinLink} className="gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tentar novamente
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
                  <Button type="button" variant="outline" size="icon" onClick={handleCopy} title="Copiar link">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Desativar Link</span>
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
                    Renovar Link
                  </Button>
                ) : (
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Jogadores com o link antigo precisarão do novo link para entrar.
                    </p>
                    <div className="flex gap-2">
                      <Button type="button" variant="destructive" size="sm" className="flex-1" onClick={handleRenew}>
                        Confirmar
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={() => setConfirmRenew(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Gerando link...</p>
            )}
          </TabsContent>

          {/* ── Via E-mail ── */}
          <TabsContent value="email" className="mt-4 space-y-4 flex-none">
            <p className="text-sm text-muted-foreground">
              {t("invite_email_description")}
            </p>
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

            {invites.length > 0 && (
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
