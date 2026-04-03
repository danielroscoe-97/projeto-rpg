"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Swords, UserPlus, Plus, Globe, ChevronRight } from "lucide-react";
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
  cover_image_url?: string | null;
}

interface QuickActionsTranslations {
  quick_actions: string;
  new_combat: string;
  create_npc: string;
  invite_player: string;
  npc_dialog_title: string;
  npc_global_title: string;
  npc_global_desc: string;
  npc_global_badge: string;
  npc_for_campaign: string;
  npc_created_success: string;
  invite_dialog_title: string;
  no_campaigns_yet: string;
  no_campaigns_create: string;
  no_campaigns_cta: string;
  campaigns_players_plural: string;
  campaigns_players_singular: string;
}

interface QuickActionsProps {
  translations: QuickActionsTranslations;
  campaigns: Campaign[];
}

// ── Avatar com inicial + cor determinística ────────────────────────────────

const AVATAR_COLORS = [
  "bg-amber-400/20 text-amber-300",
  "bg-emerald-400/20 text-emerald-300",
  "bg-blue-400/20 text-blue-300",
  "bg-purple-400/20 text-purple-300",
  "bg-rose-400/20 text-rose-300",
  "bg-cyan-400/20 text-cyan-300",
];

function getCampaignColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function CampaignAvatar({ name, imageUrl, size = "md" }: { name: string; imageUrl?: string | null; size?: "sm" | "md" }) {
  const colorClass = getCampaignColor(name);
  const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        className={`rounded-full object-cover shrink-0 ${dim}`}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold shrink-0 ${dim} ${colorClass}`}
      aria-hidden="true"
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

const actionCardClass =
  "flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 transition-all duration-200 group text-left w-full";

const campaignCardClass =
  "flex items-center gap-3 w-full rounded-lg border border-border bg-card px-4 text-left transition-all duration-150 hover:bg-white/[0.03] hover:shadow-sm";

// ── Component ─────────────────────────────────────────────────────────────

export function QuickActions({ translations: t, campaigns }: QuickActionsProps) {
  const router = useRouter();
  const [npcDialogOpen, setNpcDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [npcFormOpen, setNpcFormOpen] = useState(false);
  const [npcFormKey, setNpcFormKey] = useState(0);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const handleNpcGlobal = useCallback(() => {
    setSelectedCampaignId(null);
    setNpcFormKey((k) => k + 1);
    setNpcDialogOpen(false);
    setNpcFormOpen(true);
  }, []);

  const handleNpcCampaign = useCallback((campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setNpcFormKey((k) => k + 1);
    setNpcDialogOpen(false);
    setNpcFormOpen(true);
  }, []);

  const handleNpcSave = useCallback(async (data: CampaignNpcInsert) => {
    await createNpc(data);
  }, []);

  const handleInviteCampaign = useCallback(
    (campaignId: string) => {
      setInviteDialogOpen(false);
      router.push(`/app/campaigns/${campaignId}`);
    },
    [router],
  );

  const playerLabel = (count: number) =>
    count === 1 ? `1 ${t.campaigns_players_singular}` : `${count} ${t.campaigns_players_plural}`;

  return (
    <div className="space-y-3" data-tour-id="dash-quick-actions">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {t.quick_actions}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {/* Novo Combate */}
        <Link
          href="/app/session/new"
          data-testid="quick-action-new_combat"
          className={`${actionCardClass} hover:border-amber-400/30 hover:bg-white/[0.02]`}
        >
          <Swords className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
            {t.new_combat}
          </span>
        </Link>

        {/* Criar NPC */}
        <button
          type="button"
          onClick={() => setNpcDialogOpen(true)}
          data-testid="quick-action-create_npc"
          className={`${actionCardClass} hover:border-blue-400/30 hover:bg-white/[0.02] cursor-pointer`}
        >
          <Plus className="w-5 h-5 text-blue-400 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
            {t.create_npc}
          </span>
        </button>

        {/* Convidar Jogador */}
        <button
          type="button"
          onClick={() => {
            if (campaigns.length === 1) {
              router.push(`/app/campaigns/${campaigns[0].id}`);
            } else {
              setInviteDialogOpen(true);
            }
          }}
          data-testid="quick-action-invite_player"
          className={`${actionCardClass} hover:border-emerald-400/30 hover:bg-white/[0.02] cursor-pointer`}
        >
          <UserPlus className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
            {t.invite_player}
          </span>
        </button>
      </div>

      {/* ── NPC Scope Dialog ──────────────────────────────────────────────── */}
      <Dialog open={npcDialogOpen} onOpenChange={setNpcDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.npc_dialog_title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            {/* Global NPC — destaque especial */}
            <button
              type="button"
              onClick={handleNpcGlobal}
              className="flex items-center gap-3 w-full rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3.5 text-left transition-all duration-150 hover:border-amber-400/50 hover:bg-amber-400/10 hover:shadow-sm group"
              data-testid="npc-scope-global"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/15 shrink-0">
                <Globe className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {t.npc_global_title}
                  </p>
                  <span className="inline-flex items-center rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-400 ring-1 ring-amber-400/20">
                    {t.npc_global_badge}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.npc_global_desc}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-amber-400/60 transition-colors shrink-0" />
            </button>

            {/* Separador */}
            {campaigns.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1 shrink-0">
                    {t.npc_for_campaign}
                  </p>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="space-y-1.5 max-h-[220px] overflow-y-auto -mx-1 px-1">
                  {campaigns.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleNpcCampaign(c.id)}
                      className={`${campaignCardClass} py-2.5 hover:border-amber-400/30 group`}
                      data-testid={`npc-scope-campaign-${c.id}`}
                    >
                      <CampaignAvatar name={c.name} imageUrl={c.cover_image_url} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{playerLabel(c.player_count)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-amber-400/60 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Invite Campaign Picker Dialog ─────────────────────────────────── */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.invite_dialog_title}</DialogTitle>
          </DialogHeader>

          <div className="pt-1">
            {campaigns.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-10 h-10 rounded-full bg-emerald-400/10 flex items-center justify-center mb-3">
                  <UserPlus className="w-5 h-5 text-emerald-400/60" />
                </div>
                <p className="text-sm font-medium text-foreground">{t.no_campaigns_yet}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.no_campaigns_create}</p>
                <Link
                  href="/app/onboarding"
                  className="inline-flex items-center gap-1 mt-4 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  onClick={() => setInviteDialogOpen(false)}
                >
                  {t.no_campaigns_cta} <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto -mx-1 px-1">
                {campaigns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleInviteCampaign(c.id)}
                    className={`${campaignCardClass} py-3 hover:border-emerald-400/30 group`}
                    data-testid={`invite-campaign-${c.id}`}
                  >
                    <CampaignAvatar name={c.name} imageUrl={c.cover_image_url} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{playerLabel(c.player_count)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-emerald-400/60 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── NPC Form ──────────────────────────────────────────────────────── */}
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
