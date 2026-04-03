"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Swords, UserPlus, Plus, Globe, Map } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NpcForm } from "@/components/campaign/NpcForm";
import { createNpc } from "@/lib/supabase/campaign-npcs";
import type { CampaignNpcInsert } from "@/lib/types/campaign-npcs";

interface Campaign {
  id: string;
  name: string;
  player_count: number;
}

interface QuickActionsTranslations {
  quick_actions: string;
  new_combat: string;
  create_npc: string;
  invite_player: string;
  npc_dialog_title: string;
  npc_global_title: string;
  npc_global_desc: string;
  npc_for_campaign: string;
  npc_created_success: string;
  invite_dialog_title: string;
  no_campaigns_yet: string;
  no_campaigns_create: string;
  campaigns_players_plural: string;
}

interface QuickActionsProps {
  translations: QuickActionsTranslations;
  campaigns: Campaign[];
}

const actionCardClass =
  "flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 transition-all duration-200 group text-left w-full";

export function QuickActions({ translations: t, campaigns }: QuickActionsProps) {
  const router = useRouter();
  const [npcDialogOpen, setNpcDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [npcFormOpen, setNpcFormOpen] = useState(false);
  const [npcFormKey, setNpcFormKey] = useState(0);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );

  // NPC: pick global
  const handleNpcGlobal = useCallback(() => {
    setSelectedCampaignId(null);
    setNpcFormKey((k) => k + 1);
    setNpcDialogOpen(false);
    setNpcFormOpen(true);
  }, []);

  // NPC: pick campaign
  const handleNpcCampaign = useCallback((campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setNpcFormKey((k) => k + 1);
    setNpcDialogOpen(false);
    setNpcFormOpen(true);
  }, []);

  // NPC: save
  const handleNpcSave = useCallback(async (data: CampaignNpcInsert) => {
    await createNpc(data);
  }, []);

  // Invite: pick campaign → navigate to campaign page
  const handleInviteCampaign = useCallback(
    (campaignId: string) => {
      setInviteDialogOpen(false);
      router.push(`/app/campaigns/${campaignId}`);
    },
    [router],
  );

  return (
    <div className="space-y-3" data-tour-id="dash-quick-actions">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {t.quick_actions}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Novo Combate — stays as Link */}
        <Link
          href="/app/session/new"
          data-testid="quick-action-new_combat"
          className={`${actionCardClass} hover:border-amber-400/30`}
        >
          <Swords
            className="w-5 h-5 text-amber-400 shrink-0"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
            {t.new_combat}
          </span>
        </Link>

        {/* Criar NPC — opens scope dialog */}
        <button
          type="button"
          onClick={() => setNpcDialogOpen(true)}
          data-testid="quick-action-create_npc"
          className={`${actionCardClass} hover:border-blue-400/30 cursor-pointer`}
        >
          <Plus
            className="w-5 h-5 text-blue-400 shrink-0"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
            {t.create_npc}
          </span>
        </button>

        {/* Convidar Jogador — opens campaign picker */}
        <button
          type="button"
          onClick={() => {
            if (campaigns.length === 1) {
              // Single campaign: go directly
              router.push(`/app/campaigns/${campaigns[0].id}`);
            } else {
              setInviteDialogOpen(true);
            }
          }}
          data-testid="quick-action-invite_player"
          className={`${actionCardClass} hover:border-emerald-400/30 cursor-pointer`}
        >
          <UserPlus
            className="w-5 h-5 text-emerald-400 shrink-0"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
            {t.invite_player}
          </span>
        </button>
      </div>

      {/* ── NPC Scope Dialog ──────────────────────────────────── */}
      <Dialog open={npcDialogOpen} onOpenChange={setNpcDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.npc_dialog_title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {/* Global NPC */}
            <button
              type="button"
              onClick={handleNpcGlobal}
              className="flex items-center gap-3 w-full rounded-lg border border-border bg-card px-4 py-3 text-left hover:border-blue-400/40 transition-colors group"
              data-testid="npc-scope-global"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-400/10 shrink-0">
                <Globe className="w-4 h-4 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {t.npc_global_title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.npc_global_desc}
                </p>
              </div>
            </button>

            {/* Campaign NPCs */}
            {campaigns.length > 0 && (
              <div className="pt-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {t.npc_for_campaign}
                </p>
                <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
                  {campaigns.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleNpcCampaign(c.id)}
                      className="flex items-center gap-3 w-full rounded-lg border border-border bg-card px-4 py-2.5 text-left hover:border-amber-400/40 transition-colors"
                      data-testid={`npc-scope-campaign-${c.id}`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/10 shrink-0">
                        <Map className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {c.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.player_count} {t.campaigns_players_plural}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Invite Campaign Picker Dialog ─────────────────────── */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.invite_dialog_title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {campaigns.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  {t.no_campaigns_yet}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {t.no_campaigns_create}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {campaigns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleInviteCampaign(c.id)}
                    className="flex items-center gap-3 w-full rounded-lg border border-border bg-card px-4 py-3 text-left hover:border-emerald-400/40 transition-colors"
                    data-testid={`invite-campaign-${c.id}`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/10 shrink-0">
                      <Map className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {c.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.player_count} {t.campaigns_players_plural}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── NPC Form ──────────────────────────────────────────── */}
      <NpcForm
        key={`${selectedCampaignId ?? "global"}-${npcFormKey}`}
        open={npcFormOpen}
        onOpenChange={setNpcFormOpen}
        campaignId={selectedCampaignId}
        onSave={handleNpcSave}
      />
    </div>
  );
}
