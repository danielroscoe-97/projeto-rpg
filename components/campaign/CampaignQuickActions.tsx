"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Users, Swords, FileText } from "lucide-react";
import { InvitePlayerDialog } from "@/components/campaign/InvitePlayerDialog";

interface CampaignQuickActionsProps {
  campaignId: string;
}

export function CampaignQuickActions({ campaignId }: CampaignQuickActionsProps) {
  const t = useTranslations("campaign");
  const [inviteOpen, setInviteOpen] = useState(false);

  // D3: reset dialog state if navigating to a different campaign without unmounting
  useEffect(() => { setInviteOpen(false); }, [campaignId]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 pt-3 border-t border-border/60">
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background/50 hover:bg-background hover:border-amber-500/50 transition-colors min-h-[44px]"
        >
          <Users className="w-3.5 h-3.5 text-amber-400" />
          {t("quick_action_invite")}
        </button>

        <button
          type="button"
          onClick={() => scrollTo("section_encounters")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background/50 hover:bg-background hover:border-amber-500/50 transition-colors min-h-[44px]"
        >
          <Swords className="w-3.5 h-3.5 text-amber-400" />
          {t("quick_action_encounter")}
        </button>

        <button
          type="button"
          onClick={() => scrollTo("section_notes")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background/50 hover:bg-background hover:border-amber-500/50 transition-colors min-h-[44px]"
        >
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          {t("quick_action_note")}
        </button>
      </div>

      {/* Invite dialog in controlled mode — no internal trigger rendered */}
      <InvitePlayerDialog
        campaignId={campaignId}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
    </>
  );
}
