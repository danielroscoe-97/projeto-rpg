"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, MoreVertical, Swords, FileText, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { captureError } from "@/lib/errors/capture";
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const PLACEHOLDER_ICONS = [
  "/art/icons/shield.png",
  "/art/icons/chibi-knight.png",
  "/art/icons/chibi-mage.png",
  "/art/icons/chibi-archer.png",
  "/art/icons/chibi-priest.png",
];

function getPlaceholderIcon(index: number) {
  return PLACEHOLDER_ICONS[index % PLACEHOLDER_ICONS.length];
}

export function CampaignManager({ initialCampaigns, userId }: Props) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const router = useRouter();
  const [campaigns, setCampaigns] =
    useState<CampaignWithCount[]>(initialCampaigns);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CampaignWithCount | null>(null);

  const supabase = createClient();

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    const name = newName.trim();
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
      const { data, error: dbError } = await supabase
        .from("campaigns")
        .insert({ owner_id: userId, name })
        .select("id, name, created_at")
        .single();

      if (dbError || !data) {
        captureError(dbError, { component: "CampaignManager", action: "create", category: "database" });
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
      setDeleteTarget(null);
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
        <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border">
          <Input
            placeholder={t("campaigns_name_label")}
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setFieldError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className={`bg-background border-border text-foreground placeholder:text-muted-foreground/60 flex-1${fieldError ? " field-error" : ""}`}
            aria-invalid={fieldError || undefined}
            maxLength={50}
            autoFocus
          />
          <Button
            size="sm"
            variant="gold"
            disabled={!newName.trim() || isLoading}
            onClick={handleCreate}
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
          <Button
            variant="gold"
            className="mt-2 min-h-[44px]"
            onClick={() => {
              setShowCreate(true);
              setEditingId(null);
              setEditName("");
              setError(null);
            }}
          >
            {t("campaigns_new")}
          </Button>
        </div>
      )}

      {/* Campaign Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((campaign, index) => (
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
                <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-gold/40 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] h-full">
                  {/* Image placeholder */}
                  <div className="h-28 bg-gradient-to-br from-surface-secondary to-surface-deep flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,168,83,0.06)_0%,transparent_70%)]" />
                    <Image
                      src={getPlaceholderIcon(index)}
                      alt=""
                      width={48}
                      height={48}
                      className="pixel-art opacity-25 group-hover:opacity-40 transition-opacity duration-[250ms]"
                      aria-hidden="true"
                      unoptimized
                    />
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground truncate group-hover:text-gold transition-colors duration-[250ms]">
                      {campaign.name}
                    </h3>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {campaign.player_count}{" "}
                      {campaign.player_count !== 1 ? t("campaigns_players_plural") : t("campaigns_players_singular")}
                    </p>

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
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(campaign.id);
                              setEditName(campaign.name);
                              setShowCreate(false);
                              setNewName("");
                              setError(null);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            {tc("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400 focus:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(campaign);
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              {t("campaigns_delete")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("campaigns_delete_confirm")}{" "}
              <span className="text-foreground font-medium">
                {deleteTarget?.name}
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
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("campaigns_delete_button")}
                </>
              ) : (
                t("campaigns_delete_button")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
