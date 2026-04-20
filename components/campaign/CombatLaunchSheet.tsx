"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics/track";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Swords, Zap, Send, Package, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchEncounterPresets } from "@/lib/supabase/encounter-presets";
import type { EncounterPreset } from "@/lib/types/encounter-preset";

interface CombatLaunchSheetProps {
  campaignId: string;
  campaignName: string;
  playerEmails?: string[];
  activeSessionId?: string | null;
  /** If there's a planned session, show "Start Session" as primary option */
  plannedSessionName?: string | null;
  plannedSessionId?: string | null;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CombatLaunchSheet({
  campaignId,
  campaignName,
  playerEmails = [],
  activeSessionId,
  plannedSessionName,
  plannedSessionId,
  children,
  open: controlledOpen,
  onOpenChange,
}: CombatLaunchSheetProps) {
  const t = useTranslations("campaign_combat");
  const router = useRouter();
  const [_open, _setOpen] = useState(false);
  const open = controlledOpen ?? _open;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) _setOpen(next);
    onOpenChange?.(next);
  };
  const [view, setView] = useState<"menu" | "new_combat" | "send_link" | "load_preset">("menu");
  const [autoInitiative, setAutoInitiative] = useState(false);
  const [notifyPlayers, setNotifyPlayers] = useState(true);
  const [copied, setCopied] = useState(false);
  // Preset picker state
  const [presets, setPresets] = useState<EncounterPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const presetsFetched = useRef(false);

  const handleNewCombat = () => {
    const params = new URLSearchParams({ campaign: campaignId });
    if (autoInitiative) params.set("initiative", "auto");
    if (notifyPlayers && playerEmails.length > 0) params.set("notify", "true");
    router.push(`/app/combat/new?${params.toString()}`);
    setOpen(false);
  };

  const handleQuickCombat = () => {
    router.push(`/app/combat/new?campaign=${campaignId}&quick=true`);
    setOpen(false);
  };

  const handleOpenPresets = async () => {
    setView("load_preset");
    if (!presetsFetched.current) {
      setPresetsLoading(true);
      try {
        const data = await fetchEncounterPresets(campaignId);
        setPresets(data);
        presetsFetched.current = true;
      } catch {
        // Silent fail — empty list will be shown
      } finally {
        setPresetsLoading(false);
      }
    }
  };

  const handlePickPreset = (presetId: string) => {
    router.push(`/app/combat/new?campaign=${campaignId}&preset=${presetId}`);
    setOpen(false);
  };

  const handleCopyLink = async () => {
    if (!activeSessionId) return;
    const url = `${window.location.origin}/app/combat/${activeSessionId}`;
    await navigator.clipboard.writeText(url);
    trackEvent("share:link_copied");
    setCopied(true);
    toast.success(t("link_copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const resetView = () => {
    setView("menu");
    setCopied(false);
    // Reset preset cache so re-opening fetches fresh data
    presetsFetched.current = false;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetView();
      }}
    >
      {controlledOpen === undefined && children && (
        <DialogTrigger asChild>{children}</DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md max-sm:fixed max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:top-auto max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-w-none">
        <DialogHeader>
          <DialogTitle>
            {view === "menu" && t("title")}
            {view === "new_combat" && t("new_combat")}
            {view === "send_link" && t("send_link")}
            {view === "load_preset" && t("load_preset")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{campaignName}</p>
        </DialogHeader>

        {/* Menu principal */}
        {view === "menu" && (
          <div className="grid gap-2">
            {/* Start Planned Session — primary option when available */}
            {plannedSessionId && plannedSessionName && (
              <button
                type="button"
                onClick={() => {
                  router.push(`/app/combat/new?campaign=${campaignId}&session=${plannedSessionId}`);
                  setOpen(false);
                }}
                className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left min-h-[56px]"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-400/15">
                  <Swords className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-300">{t("start_session_combat", { name: plannedSessionName })}</p>
                  <p className="text-xs text-muted-foreground">{t("start_session_combat_desc")}</p>
                </div>
              </button>
            )}

            {/* Novo Combate */}
            <button
              type="button"
              onClick={() => setView("new_combat")}
              className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.08] hover:bg-white/[0.04] transition-colors text-left min-h-[56px]"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-400/10">
                <Swords className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t("new_combat")}</p>
                <p className="text-xs text-muted-foreground">{t("new_combat_desc")}</p>
              </div>
            </button>

            {/* Enviar Link — só se tem sessão ativa */}
            {activeSessionId && (
              <button
                type="button"
                onClick={() => setView("send_link")}
                className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.08] hover:bg-white/[0.04] transition-colors text-left min-h-[56px]"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-400/10">
                  <Send className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{t("send_link")}</p>
                  <p className="text-xs text-muted-foreground">{t("send_link_desc")}</p>
                </div>
              </button>
            )}

            {/* Carregar Preset de Combate */}
            <button
              type="button"
              onClick={handleOpenPresets}
              className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.08] hover:bg-white/[0.04] transition-colors text-left min-h-[56px]"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-400/10">
                <Package className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t("load_preset")}</p>
                <p className="text-xs text-muted-foreground">{t("load_preset_desc")}</p>
              </div>
            </button>

            {/* Combate Rápido */}
            <button
              type="button"
              onClick={handleQuickCombat}
              className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.08] hover:bg-white/[0.04] transition-colors text-left min-h-[56px]"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-400/10">
                <Zap className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t("quick_combat")}</p>
                <p className="text-xs text-muted-foreground">{t("quick_combat_desc")}</p>
              </div>
            </button>
          </div>
        )}

        {/* Sub-view: Novo Combate */}
        {view === "new_combat" && (
          <div className="space-y-4">
            <div className="space-y-3">
              {/* Toggle: Iniciativa automática */}
              <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-white/[0.08] cursor-pointer hover:bg-white/[0.03] transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("auto_initiative")}</p>
                  <p className="text-xs text-muted-foreground">{t("auto_initiative_desc")}</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoInitiative}
                  onChange={(e) => setAutoInitiative(e.target.checked)}
                  className="w-4 h-4 rounded border-white/[0.04] accent-gold"
                />
              </label>

              {/* Toggle: Notificar jogadores */}
              {playerEmails.length > 0 && (
                <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-white/[0.08] cursor-pointer hover:bg-white/[0.03] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("notify_players")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("notify_players_desc", { count: playerEmails.length })}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyPlayers}
                    onChange={(e) => setNotifyPlayers(e.target.checked)}
                    className="w-4 h-4 rounded border-white/[0.04] accent-gold"
                  />
                </label>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView("menu")}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all min-h-[44px]"
              >
                {t("back")}
              </button>
              <button
                type="button"
                onClick={handleNewCombat}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-gold text-surface-primary hover:brightness-110 transition-all min-h-[44px]"
              >
                {t("start_combat")}
              </button>
            </div>
          </div>
        )}

        {/* Sub-view: Enviar Link */}
        {view === "send_link" && activeSessionId && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <p className="text-xs text-muted-foreground mb-1">{t("session_link")}</p>
              <p className="text-sm text-foreground font-mono break-all">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/app/combat/${activeSessionId}`
                  : `/app/combat/${activeSessionId}`}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView("menu")}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all min-h-[44px]"
              >
                {t("back")}
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-gold text-surface-primary hover:brightness-110 transition-all min-h-[44px]"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t("copied") : t("copy_link")}
              </button>
            </div>
          </div>
        )}

        {/* Sub-view: Load Preset */}
        {view === "load_preset" && (
          <div className="space-y-4">
            {presetsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : presets.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">{t("no_presets")}</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                {presets.map((preset) => {
                  const creaturePreview = preset.creatures
                    .map((c) => `${c.quantity}x ${c.name}`)
                    .join(", ");
                  const diffBadge: Record<string, string> = {
                    easy: "text-green-400 border-green-700",
                    medium: "text-yellow-400 border-yellow-700",
                    hard: "text-orange-400 border-orange-700",
                    deadly: "text-red-400 border-red-700",
                  };
                  return (
                    <li key={preset.id}>
                      <button
                        type="button"
                        onClick={() => handlePickPreset(preset.id)}
                        className="w-full text-left bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-foreground truncate">{preset.name}</span>
                          {preset.difficulty && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase shrink-0 ${diffBadge[preset.difficulty] ?? "text-gray-400 border-gray-700"}`}>
                              {preset.difficulty}
                            </span>
                          )}
                        </div>
                        {creaturePreview && (
                          <p className="text-xs text-muted-foreground truncate">{creaturePreview}</p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              type="button"
              onClick={() => setView("menu")}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-lg border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all min-h-[44px]"
            >
              {t("back")}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
