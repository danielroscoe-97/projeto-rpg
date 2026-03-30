"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { MemberCard } from "./MemberCard";
import { InvitePlayerDialog } from "./InvitePlayerDialog";
import { getCampaignMembersAction } from "@/lib/actions/invite-actions";
import { captureError } from "@/lib/errors/capture";
import type { CampaignMemberWithUser } from "@/lib/types/campaign-membership";

interface MembersListProps {
  campaignId: string;
  isOwner: boolean;
  initialMembers?: CampaignMemberWithUser[];
}

export function MembersList({
  campaignId,
  isOwner,
  initialMembers,
}: MembersListProps) {
  const t = useTranslations("members");
  const [members, setMembers] = useState<CampaignMemberWithUser[]>(
    initialMembers ?? []
  );
  const [isLoading, setIsLoading] = useState(!initialMembers);

  useEffect(() => {
    if (initialMembers) return;

    let cancelled = false;
    const load = async () => {
      try {
        const data = await getCampaignMembersAction(campaignId);
        if (!cancelled) setMembers(data);
      } catch (err) {
        captureError(err, {
          component: "MembersList",
          action: "loadMembers",
          category: "network",
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [campaignId, initialMembers]);

  const handleRemoved = useCallback((userId: string) => {
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-4 h-20 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8" data-testid="members-empty">
        <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{t("no_members")}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t("invite_first")}
        </p>
        {isOwner && (
          <div className="mt-4">
            <InvitePlayerDialog campaignId={campaignId} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="members-list">
      {/* Header with invite button */}
      {isOwner && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            {members.length}{" "}
            {members.length === 1 ? t("title").toLowerCase().slice(0, -1) : t("title").toLowerCase()}
          </span>
          <InvitePlayerDialog campaignId={campaignId} />
        </div>
      )}

      {/* Members grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            isOwner={isOwner}
            onRemoved={handleRemoved}
          />
        ))}
      </div>
    </div>
  );
}
