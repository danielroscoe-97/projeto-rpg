"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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

// ── Types ──────────────────────────────────────────────────────────────────

type CampaignType = "long_campaign" | "oneshot" | "dungeon_crawl";
type SaveStatus = "idle" | "saving" | "saved" | "error";

interface CampaignSettingsProps {
  campaignId: string;
  campaignName: string;
  isOwner: boolean;
}

type ExpiryOption = "7" | "30" | "90" | "never";

interface SettingsData {
  name: string;
  description: string;
  theme: CampaignType;
  party_level: number;
  game_system: string;
  max_players: number;
  join_expiry: ExpiryOption;
}

const DEFAULT_SETTINGS: SettingsData = {
  name: "",
  description: "",
  theme: "long_campaign",
  party_level: 1,
  game_system: "5e",
  max_players: 10,
  join_expiry: "30",
};

const CAMPAIGN_TYPES: CampaignType[] = ["long_campaign", "oneshot", "dungeon_crawl"];

// ── Component ──────────────────────────────────────────────────────────────

export function CampaignSettings({
  campaignId,
  campaignName,
  isOwner,
}: CampaignSettingsProps) {
  const router = useRouter();
  const t = useTranslations("campaignSettings");
  const tc = useTranslations("common");
  const supabase = useMemo(() => createClient(), []);

  const [settings, setSettings] = useState<SettingsData>({
    ...DEFAULT_SETTINGS,
    name: campaignName,
  });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedExpiryRef = useRef<ExpiryOption | null>(null);
  const originalRef = useRef<SettingsData | null>(null);

  // ── Load settings on mount ─────────────────────────────────────────────

  useEffect(() => {
    async function loadSettings() {
      try {
        // Fetch campaign base data
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("name, description")
          .eq("id", campaignId)
          .single();

        // Fetch campaign_settings (may not exist for old campaigns)
        const { data: campaignSettings } = await supabase
          .from("campaign_settings")
          .select("theme, party_level, game_system, max_players, join_code_expires_at")
          .eq("campaign_id", campaignId)
          .maybeSingle();

        if (!campaignSettings) {
          // Create default settings for old campaigns
          await supabase.from("campaign_settings").insert({
            campaign_id: campaignId,
            theme: "long_campaign",
            party_level: 1,
            game_system: "5e",
            max_players: 10,
          });
        }

        // Derive expiry option from saved date (approximate to nearest option)
        let expiryOption: ExpiryOption = "30";
        if (campaignSettings?.join_code_expires_at) {
          const daysLeft = Math.round(
            (new Date(campaignSettings.join_code_expires_at).getTime() - Date.now()) / 86400000,
          );
          if (daysLeft <= 10) expiryOption = "7";
          else if (daysLeft <= 60) expiryOption = "30";
          else expiryOption = "90";
        } else {
          expiryOption = "never";
        }

        lastSavedExpiryRef.current = expiryOption;
        const loaded: SettingsData = {
          name: campaign?.name ?? campaignName,
          description: campaign?.description ?? "",
          theme: (campaignSettings?.theme as CampaignType) ?? "long_campaign",
          party_level: campaignSettings?.party_level ?? 1,
          game_system: campaignSettings?.game_system ?? "5e",
          max_players: campaignSettings?.max_players ?? 10,
          join_expiry: expiryOption,
        };
        originalRef.current = loaded;
        setSettings(loaded);
      } catch {
        // Fall back to defaults with campaign name
        setSettings((prev) => ({ ...prev, name: campaignName }));
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  // ── Cleanup timers ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
    };
  }, []);

  // ── Auto-save logic ────────────────────────────────────────────────────

  const saveSettings = useCallback(
    async (data: SettingsData) => {
      setSaveStatus("saving");
      try {
        // Update campaign name + description
        const { error: campaignError } = await supabase
          .from("campaigns")
          .update({ name: data.name, description: data.description })
          .eq("id", campaignId);

        if (campaignError) throw campaignError;

        // Only recompute expiry date when the expiry option actually changed
        const expiryChanged = lastSavedExpiryRef.current !== data.join_expiry;
        const settingsPayload: Record<string, unknown> = {
          campaign_id: campaignId,
          theme: data.theme,
          party_level: data.party_level,
          game_system: data.game_system,
          max_players: data.max_players,
        };

        if (expiryChanged) {
          settingsPayload.join_code_expires_at = data.join_expiry === "never"
            ? null
            : new Date(Date.now() + Number(data.join_expiry) * 86400000).toISOString();
          lastSavedExpiryRef.current = data.join_expiry;
        }

        // Update campaign_settings
        const { error: settingsError } = await supabase
          .from("campaign_settings")
          .upsert(settingsPayload, { onConflict: "campaign_id" });

        if (settingsError) throw settingsError;

        originalRef.current = data;
        setSaveStatus("saved");
        if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
        savedFadeRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
        toast.error(t("save_status_error"));
      }
    },
    [campaignId, supabase, t],
  );

  const handleChange = useCallback(
    (patch: Partial<SettingsData>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        // Skip save if nothing actually changed
        if (originalRef.current && JSON.stringify(next) === JSON.stringify(originalRef.current)) {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          return next;
        }
        // Debounce save
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => saveSettings(next), 800);
        return next;
      });
    },
    [saveSettings],
  );

  // ── Archive handler ────────────────────────────────────────────────────

  async function handleArchive() {
    setIsArchiving(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq("id", campaignId);

      if (error) throw error;

      toast.success(t("archive_success"));
      router.push("/app/dashboard");
      router.refresh();
    } catch {
      toast.error(t("save_status_error"));
      setIsArchiving(false);
    }
  }

  // ── Delete handler ─────────────────────────────────────────────────────

  async function handleDelete() {
    if (deleteConfirmName !== settings.name) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) throw error;

      toast.success(t("delete_success"));
      router.push("/app/dashboard");
      router.refresh();
    } catch {
      toast.error(t("save_status_error"));
      setIsDeleting(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-10 bg-muted rounded" />
        <div className="h-20 bg-muted rounded" />
        <div className="h-10 bg-muted rounded w-1/2" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        <SaveStatusIndicator status={saveStatus} t={t} />
      </div>

      {/* Section: General */}
      <section className="space-y-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t("section_general")}
        </h3>

        {/* Campaign Name */}
        <div className="space-y-1.5">
          <Label htmlFor="campaign-name" className="text-sm text-foreground">
            {t("name_label")}
          </Label>
          <Input
            id="campaign-name"
            value={settings.name}
            onChange={(e) => handleChange({ name: e.target.value.slice(0, 50) })}
            maxLength={50}
            className="bg-background border-border text-foreground min-h-[44px]"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="campaign-description" className="text-sm text-foreground">
            {t("description_label")}
          </Label>
          <Textarea
            id="campaign-description"
            value={settings.description}
            onChange={(e) =>
              handleChange({ description: e.target.value.slice(0, 200) })
            }
            maxLength={200}
            placeholder={t("description_placeholder")}
            className="bg-background border-border text-foreground min-h-[80px] resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">
            {settings.description.length}/200
          </p>
        </div>

        {/* Campaign Type */}
        <div className="space-y-2">
          <Label className="text-sm text-foreground">{t("type_label")}</Label>
          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_TYPES.map((type) => {
              const isActive = settings.theme === type;
              const labelKey =
                type === "long_campaign"
                  ? "type_long"
                  : type === "oneshot"
                    ? "type_oneshot"
                    : "type_crawl";
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleChange({ theme: type })}
                  className={`text-sm px-4 py-2 rounded-lg border transition-colors min-h-[44px] ${
                    isActive
                      ? "border-amber-500 text-amber-400 bg-amber-500/10"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-white/[0.08]"
                  }`}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Party Level */}
        <div className="space-y-1.5">
          <Label htmlFor="party-level" className="text-sm text-foreground">
            {t("level_label")}
          </Label>
          <Input
            id="party-level"
            type="number"
            min={1}
            max={20}
            value={settings.party_level}
            onChange={(e) => {
              const val = Math.max(1, Math.min(20, Number(e.target.value) || 1));
              handleChange({ party_level: val });
            }}
            className="bg-background border-border text-foreground min-h-[44px] w-24"
          />
        </div>

        {/* System */}
        <div className="space-y-1.5">
          <Label htmlFor="campaign-system" className="text-sm text-foreground">
            {t("system_label")}
          </Label>
          <select
            id="campaign-system"
            value={settings.game_system}
            onChange={(e) => handleChange({ game_system: e.target.value })}
            className="flex h-11 min-h-[44px] w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="5e">{t("system_5e")}</option>
          </select>
        </div>
      </section>

      {/* Section: Invites */}
      <section className="space-y-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t("section_invites")}
        </h3>

        {/* Max Players */}
        <div className="space-y-1.5">
          <Label htmlFor="max-players" className="text-sm text-foreground">
            {t("max_players_label")}
          </Label>
          <Input
            id="max-players"
            type="number"
            min={1}
            max={20}
            value={settings.max_players}
            onChange={(e) => {
              const val = Math.max(1, Math.min(20, Number(e.target.value) || 1));
              handleChange({ max_players: val });
            }}
            className="bg-background border-border text-foreground min-h-[44px] w-24"
          />
        </div>

        {/* Join Code Expiration */}
        <div className="space-y-1.5">
          <Label htmlFor="join-expiry" className="text-sm text-foreground">
            {t("expiry_label")}
          </Label>
          <select
            id="join-expiry"
            value={settings.join_expiry}
            onChange={(e) => handleChange({ join_expiry: e.target.value as ExpiryOption })}
            className="flex h-11 min-h-[44px] w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="7">{t("expiry_7d")}</option>
            <option value="30">{t("expiry_30d")}</option>
            <option value="90">{t("expiry_90d")}</option>
            <option value="never">{t("expiry_never")}</option>
          </select>
        </div>
      </section>

      {/* Section: Danger Zone */}
      {isOwner && (
        <section className="space-y-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <h3 className="text-xs font-medium text-red-400 uppercase tracking-wider">
            {t("section_danger")}
          </h3>

          {/* Archive */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t("archive_title")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("archive_desc")}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 min-h-[44px]"
                  disabled={isArchiving}
                >
                  {t("archive_button")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">
                    {t("archive_title")}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    {t("archive_confirm")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    className="bg-white/[0.06] text-foreground border-border hover:bg-white/[0.1]"
                    disabled={isArchiving}
                  >
                    {tc("cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleArchive}
                    className="bg-amber-600 hover:bg-amber-700 text-foreground"
                    disabled={isArchiving}
                  >
                    {isArchiving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t("archive_button")
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Delete */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t("delete_title")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("delete_desc")}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="shrink-0 min-h-[44px]"
                  disabled={isDeleting}
                >
                  {t("delete_button")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">
                    {t("delete_title")}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    {t("delete_desc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="px-6 pb-2">
                  <Label
                    htmlFor="delete-confirm-name"
                    className="text-sm text-muted-foreground"
                  >
                    {t("delete_confirm")}
                  </Label>
                  <Input
                    id="delete-confirm-name"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder={settings.name}
                    className="mt-2 bg-background border-border text-foreground min-h-[44px]"
                  />
                  {deleteConfirmName.length > 0 &&
                    deleteConfirmName !== settings.name && (
                      <p className="text-xs text-red-400 mt-1">
                        {t("delete_name_mismatch")}
                      </p>
                    )}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    className="bg-white/[0.06] text-foreground border-border hover:bg-white/[0.1]"
                    disabled={isDeleting}
                    onClick={() => setDeleteConfirmName("")}
                  >
                    {tc("cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-foreground"
                    disabled={
                      isDeleting || deleteConfirmName !== settings.name
                    }
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t("delete_button")
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Save Status Indicator ────────────────────────────────────────────────

function SaveStatusIndicator({
  status,
  t,
}: {
  status: SaveStatus;
  t: ReturnType<typeof useTranslations>;
}) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {status === "saving" && (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">{t("save_status_saving")}</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400">{t("save_status_saved")}</span>
        </>
      )}
      {status === "error" && (
        <>
          <X className="w-3.5 h-3.5 text-red-400" />
          <span className="text-red-400">{t("save_status_error")}</span>
        </>
      )}
    </div>
  );
}
