"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export interface CampaignWithCount {
  id: string;
  name: string;
  created_at: string;
  player_count: number;
}

interface Props {
  initialCampaigns: CampaignWithCount[];
  userId: string;
}

export function CampaignManager({ initialCampaigns, userId }: Props) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [campaigns, setCampaigns] =
    useState<CampaignWithCount[]>(initialCampaigns);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    if (name.length > 50) {
      setError(t("campaigns_name_max"));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("campaigns")
        .insert({ owner_id: userId, name })
        .select("id, name, created_at")
        .single();

      if (dbError || !data) {
        console.error("Campaign create error:", dbError);
        throw new Error(dbError?.message ?? t("campaigns_create_error"));
      }

      setCampaigns((prev) => [
        {
          id: data.id,
          name: data.name,
          created_at: data.created_at,
          player_count: 0,
        },
        ...prev,
      ]);
      setNewName("");
      setShowCreate(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("campaigns_create_error")
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Update ─────────────────────────────────────────────────────────────────

  const handleUpdate = async () => {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) return;
    if (name.length > 50) {
      setError(t("campaigns_name_max"));
      return;
    }
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

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (campaignId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId)
        .eq("owner_id", userId);

      if (dbError)
        throw new Error(t("campaigns_delete_error"));

      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("campaigns_delete_error")
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
        {!showCreate && (
          <Button
            size="sm"
            variant="gold"
            disabled={isLoading}
            onClick={() => {
              setShowCreate(true);
              setEditingId(null);
              setEditName("");
              setError(null);
            }}
          >
            {t("campaigns_new")}
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="flex items-center gap-2 p-3 bg-card rounded-lg">
          <Input
            placeholder={t("campaigns_name_label")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="bg-background border-border text-foreground placeholder:text-muted-foreground/60 flex-1"
            maxLength={50}
            autoFocus
          />
          <Button
            size="sm"
            variant="gold"
            disabled={!newName.trim() || isLoading}
            onClick={handleCreate}
          >
            {tc("save")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowCreate(false);
              setNewName("");
              setError(null);
            }}
          >
            {tc("cancel")}
          </Button>
        </div>
      )}

      {/* Empty state */}
      {campaigns.length === 0 && !showCreate && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Image src="/art/icons/pet-cat.png" alt="" width={64} height={64} className="pixel-art opacity-40 float-gentle" aria-hidden="true" unoptimized />
          <p className="text-muted-foreground text-sm">{t("campaigns_empty")}</p>
        </div>
      )}

      {/* Campaign List */}
      <div className="space-y-2">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-card rounded-lg p-4">
            {editingId === campaign.id ? (
              /* Edit row */
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                  className="bg-background border-border text-foreground flex-1"
                  maxLength={50}
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="gold"
                  disabled={!editName.trim() || isLoading}
                  onClick={handleUpdate}
                >
                  {tc("save")}
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
            ) : (
              /* Normal row */
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground font-medium">{campaign.name}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {campaign.player_count}{" "}
                    {campaign.player_count !== 1 ? t("campaigns_players_plural") : t("campaigns_players_singular")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/app/campaigns/${campaign.id}`}
                    aria-label={`Manage players for ${campaign.name}`}
                    className="text-gold text-xs hover:underline"
                  >
                    {t("campaigns_manage_players")}
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 px-2"
                    onClick={() => {
                      setEditingId(campaign.id);
                      setEditName(campaign.name);
                      setShowCreate(false);
                      setNewName("");
                      setError(null);
                    }}
                  >
                    {tc("edit")}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 text-xs h-7 px-2"
                        onClick={() => setError(null)}
                      >
                        {tc("delete")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground">
                          {t("campaigns_delete")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                          {t("campaigns_delete_confirm")}{" "}
                          <span className="text-foreground font-medium">
                            {campaign.name}
                          </span>
                          {t("campaigns_delete_confirm_suffix")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border text-muted-foreground hover:text-foreground bg-transparent hover:bg-white/[0.1]">
                          {tc("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700 text-foreground"
                          disabled={isLoading}
                          onClick={() => handleDelete(campaign.id)}
                        >
                          {t("campaigns_delete_button")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
