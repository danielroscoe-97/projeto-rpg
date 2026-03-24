"use client";

import { useState } from "react";
import Link from "next/link";
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
      setError("Campaign name must be 50 characters or fewer.");
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

      if (dbError || !data)
        throw new Error("Failed to create campaign. Please try again.");

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
        err instanceof Error ? err.message : "Failed to create campaign."
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
      setError("Campaign name must be 50 characters or fewer.");
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
        throw new Error("Failed to update campaign. Please try again.");

      setCampaigns((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, name } : c))
      );
      setEditingId(null);
      setEditName("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update campaign."
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
        throw new Error("Failed to delete campaign. Please try again.");

      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete campaign."
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
        <h2 className="text-lg font-semibold text-white">Campaigns</h2>
        {!showCreate && (
          <Button
            size="sm"
            className="bg-[#e94560] hover:bg-[#c73652] text-white"
            disabled={isLoading}
            onClick={() => {
              setShowCreate(true);
              setEditingId(null);
              setEditName("");
              setError(null);
            }}
          >
            + New Campaign
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
        <div className="flex items-center gap-2 p-3 bg-[#16213e] rounded-lg">
          <Input
            placeholder="Campaign name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="bg-[#1a1a2e] border-white/10 text-white placeholder:text-white/30 flex-1"
            maxLength={50}
            autoFocus
          />
          <Button
            size="sm"
            className="bg-[#e94560] hover:bg-[#c73652] text-white"
            disabled={!newName.trim() || isLoading}
            onClick={handleCreate}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white/50 hover:text-white"
            onClick={() => {
              setShowCreate(false);
              setNewName("");
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Empty state */}
      {campaigns.length === 0 && !showCreate && (
        <p className="text-white/40 text-sm text-center py-8">
          No campaigns yet. Create your first campaign above.
        </p>
      )}

      {/* Campaign List */}
      <div className="space-y-2">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-[#16213e] rounded-lg p-4">
            {editingId === campaign.id ? (
              /* Edit row */
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                  className="bg-[#1a1a2e] border-white/10 text-white flex-1"
                  maxLength={50}
                  autoFocus
                />
                <Button
                  size="sm"
                  className="bg-[#e94560] hover:bg-[#c73652] text-white"
                  disabled={!editName.trim() || isLoading}
                  onClick={handleUpdate}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/50 hover:text-white"
                  onClick={() => {
                    setEditingId(null);
                    setEditName("");
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              /* Normal row */
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{campaign.name}</p>
                  <p className="text-white/50 text-xs mt-0.5">
                    {campaign.player_count}{" "}
                    {campaign.player_count !== 1 ? "players" : "player"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/app/campaigns/${campaign.id}`}
                    aria-label={`Manage players for ${campaign.name}`}
                    className="text-[#e94560] text-xs hover:underline"
                  >
                    Manage Players
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white/50 hover:text-white text-xs h-7 px-2"
                    onClick={() => {
                      setEditingId(campaign.id);
                      setEditName(campaign.name);
                      setShowCreate(false);
                      setNewName("");
                      setError(null);
                    }}
                  >
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 text-xs h-7 px-2"
                        onClick={() => setError(null)}
                      >
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#16213e] border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">
                          Delete Campaign
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-white/70">
                          Are you sure you want to delete{" "}
                          <span className="text-white font-medium">
                            {campaign.name}
                          </span>
                          ? This will also remove all player characters.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/20 text-white/70 hover:text-white bg-transparent hover:bg-white/10">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700 text-white"
                          disabled={isLoading}
                          onClick={() => handleDelete(campaign.id)}
                        >
                          Confirm Delete
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
