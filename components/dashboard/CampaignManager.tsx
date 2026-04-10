"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, MoreVertical, Swords, FileText, Pencil, Trash2, Archive, RotateCcw, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CampaignCreationWizard } from "@/components/campaign/CampaignCreationWizard";
import { CampaignArchiveDialog } from "@/components/campaign/CampaignArchiveDialog";
import { CampaignHealthBadge } from "@/components/campaign/CampaignHealthBadge";
import { calculateCampaignHealth } from "@/lib/utils/campaign-health";

export interface CampaignWithCount {
  id: string;
  name: string;
  created_at: string;
  player_count: number;
  session_count?: number;
  encounter_count?: number;
  note_count?: number;
  npc_count?: number;
  last_session_date?: string | null;
  is_archived?: boolean;
}

interface Props {
  initialCampaigns: CampaignWithCount[];
  userId: string;
}

const CAMPAIGN_COVERS = [
  "/art/campaigns/epic-1.jpg",
  "/art/campaigns/epic-2.jpg",
  "/art/campaigns/epic-3.jpg",
  "/art/campaigns/epic-4.jpg",
  "/art/campaigns/epic-6.jpg",
];

function getCampaignCover(index: number) {
  return CAMPAIGN_COVERS[index % CAMPAIGN_COVERS.length];
}

export function CampaignManager({ initialCampaigns, userId }: Props) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const router = useRouter();
  const [campaigns, setCampaigns] =
    useState<CampaignWithCount[]>(initialCampaigns);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{ campaign: CampaignWithCount; mode: "archive" | "restore" | "delete" } | null>(null);

  const activeCampaigns = campaigns.filter((c) => !c.is_archived);
  const archivedCampaigns = campaigns.filter((c) => c.is_archived);
  const visibleCampaigns = showArchived ? campaigns : activeCampaigns;

  const supabase = createClient();

  // ── Update ─────────────────────────────────────────────────────────────────

  const handleUpdate = async () => {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) {
      setFieldError(true);
      return;
    }
    if (name.length > 50) {
      setError(t("campaigns_name_max"));
      setFieldError(true);
      return;
    }
    setFieldError(false);
    setIsLoading(true);
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from("campaigns")
        .update({ name })
        .eq("id", editingId)
        .eq("owner_id", userId);

      if (dbError)
        throw new Error(t("campaigns_update_error"));

      setCampaigns((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, name } : c))
      );
      setEditingId(null);
      setEditName("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("campaigns_update_error")
      );
    } finally {
      setIsLoading(false);
    }
  };


  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t("campaigns_title")}</h2>
        <div className="flex items-center gap-2">
          {archivedCampaigns.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showArchived ? t("campaigns_hide_archived") : t("campaigns_show_archived", { count: archivedCampaigns.length })}
            </Button>
          )}
          <Button
            size="sm"
            variant="gold"
            disabled={isLoading}
            onClick={() => setWizardOpen(true)}
          >
            {t("campaigns_new")}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}

      {/* Empty state */}
      {visibleCampaigns.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Image src="/art/icons/pet-cat.png" alt="" width={64} height={64} className="pixel-art opacity-40 float-gentle" aria-hidden="true" unoptimized />
          <p className="text-muted-foreground text-sm">
            {archivedCampaigns.length > 0 && !showArchived
              ? t("campaigns_all_archived")
              : t("campaigns_empty")}
          </p>
          {archivedCampaigns.length > 0 && !showArchived ? (
            <Button
              variant="outline"
              className="mt-2 min-h-[44px]"
              onClick={() => setShowArchived(true)}
            >
              {t("campaigns_show_archived", { count: archivedCampaigns.length })}
            </Button>
          ) : (
            <Button
              variant="gold"
              className="mt-2 min-h-[44px]"
              onClick={() => setWizardOpen(true)}
            >
              {t("campaigns_new")}
            </Button>
          )}
        </div>
      )}

      {/* Campaign Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleCampaigns.map((campaign, index) => (
          <div key={campaign.id} className="relative">
            {editingId === campaign.id ? (
              /* Edit form card */
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <Input
                  value={editName}
                  onChange={(e) => { setEditName(e.target.value); setFieldError(false); }}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                  className={`bg-background border-border text-foreground${fieldError ? " field-error" : ""}`}
                  aria-invalid={fieldError || undefined}
                  maxLength={50}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="gold"
                    disabled={!editName.trim() || isLoading}
                    onClick={handleUpdate}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {tc("saving")}
                      </>
                    ) : (
                      tc("save")
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(null);
                      setEditName("");
                      setError(null);
                    }}
                  >
                    {tc("cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              /* Campaign Card */
              <Link
                href={`/app/campaigns/${campaign.id}`}
                className="group block"
              >
                <div className={`bg-card border border-border rounded-xl overflow-hidden hover:border-gold/40 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] h-full ${campaign.is_archived ? "opacity-50" : ""}`}>
                  {/* Campaign cover */}
                  <div className="h-28 relative overflow-hidden">
                    <Image
                      src={getCampaignCover(index)}
                      alt=""
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      aria-hidden="true"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground truncate group-hover:text-gold transition-colors duration-[250ms]">
                      {campaign.name}
                    </h3>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {campaign.player_count}{" "}
                      {Number(campaign.player_count) !== 1 ? t("campaigns_players_plural") : t("campaigns_players_singular")}
                    </p>

                    {/* Campaign Health Badge */}
                    <div className="mt-1">
                      <CampaignHealthBadge
                        health={calculateCampaignHealth({
                          playerCount: campaign.player_count,
                          encounterCount: campaign.encounter_count ?? 0,
                          sessionCount: campaign.session_count ?? 0,
                          noteCount: campaign.note_count ?? 0,
                          npcCount: campaign.npc_count ?? 0,
                          lastSessionDate: campaign.last_session_date ?? null,
                        })}
                        mode="compact"
                      />
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        variant="gold"
                        size="sm"
                        className="h-7 text-xs px-2.5 gap-1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(`/app/campaigns/${campaign.id}`);
                        }}
                      >
                        <Swords className="h-3 w-3" />
                        {t("campaigns_start_combat")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(`/app/campaigns/${campaign.id}?section=notes`);
                        }}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        {t("campaigns_notes")}
                      </Button>

                      {/* Kebab menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(campaign.id);
                              setEditName(campaign.name);
                              setError(null);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            {tc("edit")}
                          </DropdownMenuItem>
                          {campaign.is_archived ? (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setArchiveTarget({ campaign, mode: "restore" });
                              }}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-2" />
                              {t("campaigns_restore")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setArchiveTarget({ campaign, mode: "archive" });
                              }}
                            >
                              <Archive className="h-3.5 w-3.5 mr-2" />
                              {t("campaigns_archive")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-400 focus:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              setArchiveTarget({ campaign, mode: "delete" });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            {tc("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Archive / Restore / Delete Dialog */}
      {archiveTarget && (
        <CampaignArchiveDialog
          campaignId={archiveTarget.campaign.id}
          campaignName={archiveTarget.campaign.name}
          sessionCount={archiveTarget.campaign.session_count}
          encounterCount={archiveTarget.campaign.encounter_count}
          noteCount={archiveTarget.campaign.note_count}
          isArchived={archiveTarget.campaign.is_archived ?? false}
          mode={archiveTarget.mode}
          open={!!archiveTarget}
          onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
          onComplete={() => {
            if (archiveTarget.mode === "delete") {
              setCampaigns((prev) => prev.filter((c) => c.id !== archiveTarget.campaign.id));
            } else if (archiveTarget.mode === "archive") {
              setCampaigns((prev) => prev.map((c) => c.id === archiveTarget.campaign.id ? { ...c, is_archived: true } : c));
            } else {
              setCampaigns((prev) => prev.map((c) => c.id === archiveTarget.campaign.id ? { ...c, is_archived: false } : c));
            }
            setArchiveTarget(null);
          }}
        />
      )}

      {/* Campaign Creation Wizard */}
      <CampaignCreationWizard
        userId={userId}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={(id) => router.push(`/app/campaigns/${id}`)}
      />
    </div>
  );
}
