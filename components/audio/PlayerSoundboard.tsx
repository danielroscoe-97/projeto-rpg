"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { getPlayerSfxPresets } from "@/lib/utils/audio-presets";
import { useFavoritesStore } from "@/lib/stores/favorites-store";
import { AudioFavoritesBar } from "@/components/audio/AudioFavoritesBar";
import type { AudioPreset, PlayerAudioFile } from "@/lib/types/audio";
import type { RealtimeChannel } from "@supabase/supabase-js";

const COOLDOWN_MS = 2000;

const PLAYER_TABS = [
  { key: "attacks", icon: "⚔️", categories: ["attack", "defense"] },
  { key: "magic", icon: "✨", categories: ["magic"] },
  { key: "epic", icon: "🎭", categories: ["dramatic", "monster"] },
  { key: "world", icon: "🚪", categories: ["interaction"] },
] as const;

type TabKey = (typeof PLAYER_TABS)[number]["key"];

interface PlayerSoundboardProps {
  isPlayerTurn: boolean;
  playerName: string;
  channelRef: React.RefObject<RealtimeChannel | null>;
  customAudioFiles: PlayerAudioFile[];
  /** Signed URLs for custom audio files (id → url) */
  customAudioUrls?: Record<string, string>;
  /** Whether custom audio URLs are still being generated */
  isLoadingAudio?: boolean;
}

export function PlayerSoundboard({
  isPlayerTurn,
  playerName,
  channelRef,
  customAudioFiles,
  customAudioUrls = {},
  isLoadingAudio = false,
}: PlayerSoundboardProps) {
  const t = useTranslations("audio");
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("attacks");
  const [search, setSearch] = useState("");
  const [cooldownId, setCooldownId] = useState<string | null>(null);
  const lastTriggerRef = useRef<number>(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  const handlePlaySound = useCallback(
    (soundId: string, source: "preset" | "custom", audioUrl?: string) => {
      if (!isPlayerTurn) return;
      const now = Date.now();
      if (now - lastTriggerRef.current < COOLDOWN_MS) return;
      lastTriggerRef.current = now;

      setCooldownId(soundId);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => setCooldownId(null), COOLDOWN_MS);

      channelRef.current?.send({
        type: "broadcast",
        event: "audio:play_sound",
        payload: {
          sound_id: soundId,
          source,
          player_name: playerName,
          audio_url: audioUrl,
        },
      });
    },
    [isPlayerTurn, playerName, channelRef]
  );

  const allPresets = useMemo(() => getPlayerSfxPresets(), []);

  // Group presets by tab
  const presetsByTab = useMemo(() => {
    const map = new Map<TabKey, AudioPreset[]>();
    for (const tab of PLAYER_TABS) {
      map.set(
        tab.key,
        allPresets.filter((p) => (tab.categories as readonly string[]).includes(p.category))
      );
    }
    return map;
  }, [allPresets]);

  // Filter by active tab + search
  const filteredPresets = useMemo(() => {
    const tabPresets = presetsByTab.get(activeTab) ?? [];
    const trimmed = search.trim();
    if (!trimmed) return tabPresets;
    const q = trimmed.toLowerCase();
    return tabPresets.filter((p) => {
      const name = t(p.name_key.replace("audio.", "") as Parameters<typeof t>[0]);
      return name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    });
  }, [activeTab, presetsByTab, search, t]);

  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);

  const handleToggleFavorite = useCallback(
    async (presetId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (isFavorite(presetId)) {
        removeFavorite(presetId);
        toast(t("favorites_removed"), { duration: 1500 });
      } else {
        const added = await addFavorite(presetId, "preset");
        if (added) {
          toast.success(t("favorites_added"), { duration: 1500 });
        } else {
          toast.error(t("favorites_limit"), { duration: 2000 });
        }
      }
    },
    [isFavorite, addFavorite, removeFavorite, t]
  );

  const hasCustomFiles = customAudioFiles.length > 0;
  const customUrlsReady = Object.keys(customAudioUrls).length > 0;
  const isCustomLoading = isLoadingAudio || (hasCustomFiles && !customUrlsReady);

  return (
    <>
      {/* FAB — Floating Action Button */}
      <button
        type="button"
        onClick={() => isPlayerTurn && setIsOpen((v) => !v)}
        disabled={!isPlayerTurn}
        className={`fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all duration-200 ${
          isPlayerTurn
            ? "bg-gold text-black active:scale-95"
            : "bg-gray-700 text-gray-500 opacity-40 cursor-not-allowed"
        }`}
        aria-label={isPlayerTurn ? t("soundboard") : t("disabled_not_turn")}
        title={isPlayerTurn ? t("soundboard") : t("disabled_not_turn")}
        data-testid="soundboard-fab"
      >
        {isOpen ? "✕" : isCustomLoading ? (
          <span className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
        ) : "🔊"}
      </button>
      {!isPlayerTurn && (
        <span
          className="fixed bottom-[5.25rem] right-4 z-40 w-14 text-center text-muted-foreground text-[10px] leading-tight pointer-events-none"
          data-testid="soundboard-turn-lock-label"
        >
          {t("disabled_not_turn_short")}
        </span>
      )}

      {/* Soundboard Drawer */}
      <AnimatePresence>
        {isOpen && isPlayerTurn && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-40 right-4 left-4 z-40 bg-card border border-border rounded-xl shadow-2xl max-w-md mx-auto max-h-[60vh] flex flex-col overflow-hidden"
            data-testid="soundboard-drawer"
          >
            {/* Tabs */}
            <div className="flex border-b border-border shrink-0">
              {PLAYER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setActiveTab(tab.key); setSearch(""); }}
                  className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                    activeTab === tab.key
                      ? "text-gold border-b-2 border-gold bg-white/[0.04]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`tab-${tab.key}`}
                >
                  <span className="text-sm">{tab.icon}</span>
                  <span className="hidden xs:inline">{t(`tab_${tab.key}` as Parameters<typeof t>[0])}</span>
                </button>
              ))}
            </div>

            {/* Favorites Bar */}
            <AudioFavoritesBar
              onPlaySound={handlePlaySound}
              cooldownId={cooldownId}
            />

            {/* Search */}
            <div className="px-3 pt-3 pb-2 shrink-0">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("search_sfx")}
                className="w-full bg-white/[0.06] border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/50"
                data-testid="sfx-search"
              />
            </div>

            {/* Scrollable grid */}
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {/* Presets Grid */}
              {filteredPresets.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {filteredPresets.map((preset) => {
                    const isCooling = cooldownId === preset.id;
                    return (
                      <motion.button
                        key={preset.id}
                        type="button"
                        disabled={isCooling}
                        onClick={() => handlePlaySound(preset.id, "preset")}
                        whileTap={!isCooling ? { scale: 0.9 } : undefined}
                        className={`group/preset relative flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-sm transition-all min-h-[60px] ${
                          isCooling
                            ? "bg-white/[0.03] text-muted-foreground/40 cursor-not-allowed"
                            : "bg-white/[0.06] text-foreground active:bg-white/[0.12] hover:bg-white/[0.08]"
                        }`}
                        data-testid={`preset-btn-${preset.id}`}
                      >
                        {/* Favorite star */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(preset.id, e)}
                          className={`absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-full transition-all ${
                            isFavorite(preset.id)
                              ? "text-gold"
                              : "text-transparent group-hover/preset:text-muted-foreground/40"
                          }`}
                          aria-label={isFavorite(preset.id) ? t("favorites_remove") : t("favorites_add")}
                        >
                          <Star className={`w-3 h-3 ${isFavorite(preset.id) ? "fill-gold" : ""}`} />
                        </button>
                        <span className="text-lg leading-none">{preset.icon}</span>
                        <span className="text-[10px] leading-tight text-center truncate w-full">
                          {t(preset.name_key.replace("audio.", "") as Parameters<typeof t>[0])}
                        </span>
                        {/* Cooldown overlay */}
                        {isCooling && (
                          <div className="absolute inset-0 rounded-lg overflow-hidden">
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gold/30 animate-[shrink_2s_linear_forwards]" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground/50 text-xs text-center py-6">
                  —
                </p>
              )}

              {/* Custom Sounds Section */}
              {hasCustomFiles && (
                <>
                  <h3 className="text-muted-foreground text-xs font-medium mt-4 mb-2 uppercase tracking-wider">
                    {t("my_sounds")}
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {customAudioFiles.map((file) => {
                      const isCooling = cooldownId === file.id;
                      const signedUrl = customAudioUrls[file.id];
                      const isLoading = isCustomLoading && !signedUrl;
                      return (
                        <motion.button
                          key={file.id}
                          type="button"
                          disabled={isCooling || !signedUrl}
                          onClick={() => handlePlaySound(file.id, "custom", signedUrl)}
                          whileTap={!isCooling && signedUrl ? { scale: 0.9 } : undefined}
                          className={`relative flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-sm transition-all min-h-[60px] ${
                            isLoading
                              ? "bg-purple-900/10 animate-pulse"
                              : isCooling
                                ? "bg-white/[0.03] text-muted-foreground/40 cursor-not-allowed"
                                : "bg-purple-900/20 text-foreground active:bg-purple-900/40 hover:bg-purple-900/30"
                          }`}
                          data-testid={`custom-btn-${file.id}`}
                        >
                          {isLoading ? (
                            <>
                              <span className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                              <span className="text-[10px] leading-tight text-center truncate w-full text-muted-foreground/50">
                                {file.file_name.replace(/\.mp3$/i, "")}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-lg leading-none">🎵</span>
                              <span className="text-[10px] leading-tight text-center truncate w-full">
                                {file.file_name.replace(/\.mp3$/i, "")}
                              </span>
                            </>
                          )}
                          {isCooling && (
                            <div className="absolute inset-0 rounded-lg overflow-hidden">
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gold/30 animate-[shrink_2s_linear_forwards]" />
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
