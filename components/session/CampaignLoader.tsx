"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users } from "lucide-react";
import type { PlayerCharacter } from "@/lib/types/database";

interface CampaignWithCount {
  id: string;
  name: string;
  player_count: number;
}

interface Props {
  onLoad: (characters: PlayerCharacter[]) => void;
}

export function CampaignLoader({ onLoad }: Props) {
  const t = useTranslations("session");
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCampaignId, setLoadingCampaignId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    setFetchError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, name, player_characters(count)")
      .order("created_at", { ascending: false });

    if (error) {
      setFetchError(t("load_campaigns_error"));
    } else {
      setCampaigns(
        data?.map((c) => ({
          id: c.id,
          name: c.name,
          player_count:
            (c.player_characters as { count: number }[])[0]?.count ?? 0,
        })) ?? []
      );
    }
    setIsLoading(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      fetchCampaigns();
    } else {
      setLoadingCampaignId(null);
    }
  };

  const handleLoad = async (campaignId: string) => {
    if (loadingCampaignId) return;
    setLoadingCampaignId(campaignId);
    setLoadError(null);
    const supabase = createClient();
    const { data: characters, error } = await supabase
      .from("player_characters")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });

    if (error) {
      setLoadError(t("load_players_error"));
      setLoadingCampaignId(null);
      return;
    }

    if (characters && characters.length > 0) {
      onLoad(characters as PlayerCharacter[]);
      setOpen(false);
    }
    setLoadingCampaignId(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Trigger — wrapped in DialogTrigger so Radix can track focus return on close */}
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground bg-white/[0.06] border border-border rounded-lg hover:bg-white/10 transition-colors min-h-[40px]"
          data-testid="load-campaign-btn"
        >
          <Users className="w-4 h-4" />
          {t("load_campaign")}
        </button>
      </DialogTrigger>

      {/* DialogContent handles: focus trap, Escape key close, aria-modal, scroll lock */}
      <DialogContent
        className="bg-card border border-border max-w-md mx-4"
        data-testid="campaign-loader-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t("load_campaign_title")}</DialogTitle>
        </DialogHeader>

        {fetchError && (
          <p className="text-red-400 text-sm" role="alert">{fetchError}</p>
        )}
        {loadError && (
          <p className="text-red-400 text-sm" role="alert">{loadError}</p>
        )}

        {isLoading ? (
          <p className="text-muted-foreground text-sm" data-testid="campaigns-loading">
            {t("loading_campaigns")}
          </p>
        ) : !fetchError && campaigns.length === 0 ? (
          <p className="text-muted-foreground text-sm" data-testid="no-campaigns-msg">
            {t("no_campaigns")}
          </p>
        ) : (
          <ul className="space-y-2" data-testid="campaign-list">
            {campaigns.map((campaign) => (
              <li
                key={campaign.id}
                className="flex items-center justify-between bg-background border border-white/[0.04] rounded px-4 py-3"
                data-testid={`campaign-row-${campaign.id}`}
              >
                <div>
                  <span className="text-foreground text-sm font-medium">
                    {campaign.name}
                  </span>
                  <span className="text-muted-foreground text-xs ml-2">
                    {campaign.player_count}{" "}
                    {campaign.player_count === 1 ? t("campaign_players_singular") : t("campaign_players_plural")}
                  </span>
                </div>
                {campaign.player_count === 0 ? (
                  <span
                    className="text-muted-foreground text-xs"
                    data-testid={`empty-campaign-msg-${campaign.id}`}
                  >
                    {t("campaign_no_players")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleLoad(campaign.id)}
                    disabled={!!loadingCampaignId}
                    className="text-xs px-3 py-1 text-gold hover:bg-white/[0.04] rounded transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                    aria-label={t("load_into_encounter", { name: campaign.name })}
                    data-testid={`load-campaign-${campaign.id}`}
                  >
                    {loadingCampaignId === campaign.id ? t("load_button_loading") : t("load_button")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
