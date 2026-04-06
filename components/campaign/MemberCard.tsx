"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2, User } from "lucide-react";
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
import { removeCampaignMemberAction } from "@/lib/actions/invite-actions";
import { captureError } from "@/lib/errors/capture";
import type { CampaignMemberWithUser } from "@/lib/types/campaign-membership";

interface MemberCardProps {
  member: CampaignMemberWithUser;
  isOwner: boolean;
  onRemoved?: (userId: string) => void;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function MemberCard({ member, isOwner, onRemoved }: MemberCardProps) {
  const t = useTranslations("members");
  const [isRemoving, setIsRemoving] = useState(false);

  const displayName = member.display_name ?? member.email.split("@")[0];
  const initials = getInitials(member.display_name, member.email);
  const isDm = member.role === "dm";
  const canRemove = isOwner && !isDm;

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await removeCampaignMemberAction(member.campaign_id, member.user_id);
      toast.success(t("removed_success"));
      onRemoved?.(member.user_id);
    } catch (err) {
      toast.error(t("remove_error"));
      captureError(err, {
        component: "MemberCard",
        action: "removeMember",
        category: "network",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div
      className="bg-card border border-border/30 rounded-lg p-4 flex items-start gap-3"
      data-testid={`member-card-${member.user_id}`}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white/10 text-foreground text-sm font-medium"
        aria-hidden="true"
      >
        {initials || <User className="w-4 h-4" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">
            {displayName}
          </span>
          {/* Role badge */}
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isDm
                ? "bg-amber-400/10 text-amber-400"
                : "bg-emerald-400/10 text-emerald-400"
            }`}
            data-testid="role-badge"
          >
            {isDm ? t("role_dm") : t("role_player")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {member.email}
        </p>
        {member.character_name && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className="text-foreground/70">{t("character")}:</span>{" "}
            {member.character_name}
          </p>
        )}
      </div>

      {/* Remove button */}
      {canRemove && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-red-400 h-8 w-8"
              aria-label={t("remove_member")}
              data-testid="remove-member-button"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("remove_member")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("remove_confirm", { name: displayName })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                disabled={isRemoving}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {t("confirm_remove")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
