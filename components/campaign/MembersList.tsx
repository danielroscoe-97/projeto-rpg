"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { MemberCard } from "./MemberCard";
import { InvitePlayerDialog } from "./InvitePlayerDialog";
import { MembersListSkeleton } from "@/components/ui/skeletons/MembersListSkeleton";
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
    return <MembersListSkeleton count={3} />;
  }

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center" data-testid="members-empty">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center mb-3">
          <Users className="w-6 h-6 text-amber-400/60" />
        </div>
        <p className="text-sm text-muted-foreground">{t("no_members")}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
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
