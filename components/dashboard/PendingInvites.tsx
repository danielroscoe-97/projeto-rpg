"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Check, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  acceptInviteAction,
  declineInviteAction,
} from "@/lib/actions/invite-actions";
import type { CampaignInviteWithDetails } from "@/lib/types/campaign-membership";

interface PendingInvitesProps {
  initialInvites: CampaignInviteWithDetails[];
  /** When true, renders with prominent gold styling (player with no campaigns) */
  highlighted?: boolean;
  translations: {
    title: string;
    invitedBy: string;
    accept: string;
    decline: string;
    acceptError: string;
    declineError: string;
    acceptedRedirect: string;
  };
}

export function PendingInvites({
  initialInvites,
  highlighted = false,
  translations: t,
}: PendingInvitesProps) {
  const router = useRouter();
  const [invites, setInvites] =
    useState<CampaignInviteWithDetails[]>(initialInvites);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (invites.length === 0) return null;

  const handleAccept = async (invite: CampaignInviteWithDetails) => {
    setProcessingId(invite.id);
    setError(null);

    const result = await acceptInviteAction(invite.token);

    if ("error" in result) {
      setError(t.acceptError);
      setProcessingId(null);
      return;
    }

    // Remove from list and redirect
    setProcessingId(null);
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    startTransition(() => {
      router.push(`/app/campaigns/${result.campaign_id}`);
    });
  };

  const handleDecline = async (invite: CampaignInviteWithDetails) => {
    setProcessingId(invite.id);
    setError(null);

    try {
      await declineInviteAction(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch {
      setError(t.declineError);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-foreground">
          {t.title}{" "}
          <span className="text-amber-400">({invites.length})</span>
        </h2>
      </div>

      {error && (
        <p className="text-red-400 text-xs" role="alert">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {invites.map((invite, i) => {
          const isProcessing = processingId === invite.id;

          return (
            <motion.div
              key={invite.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05, ease: "easeOut" }}
              className={`rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                highlighted
                  ? "bg-gold/[0.06] border border-gold/30"
                  : "bg-card border border-border"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {invite.campaign_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {t.invitedBy} {invite.dm_name || invite.dm_email}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="gold"
                  className="h-8 text-xs gap-1"
                  disabled={isProcessing}
                  onClick={() => handleAccept(invite)}
                >
                  {isProcessing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  {t.accept}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs gap-1 text-muted-foreground hover:text-red-400"
                  disabled={isProcessing}
                  onClick={() => handleDecline(invite)}
                >
                  <X className="w-3 h-3" />
                  {t.decline}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
