"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { getAllPresets } from "@/lib/utils/audio-presets";
import type { PlayerAudioFile } from "@/lib/types/audio";
import type { RealtimeChannel } from "@supabase/supabase-js";

const COOLDOWN_MS = 2000;

interface PlayerSoundboardProps {
  isPlayerTurn: boolean;
  playerName: string;
  channelRef: React.RefObject<RealtimeChannel | null>;
  customAudioFiles: PlayerAudioFile[];
  /** Signed URLs for custom audio files (id → url) */
  customAudioUrls?: Record<string, string>;
}

export function PlayerSoundboard({
  isPlayerTurn,
  playerName,
  channelRef,
  customAudioFiles,
  customAudioUrls = {},
}: PlayerSoundboardProps) {
  const t = useTranslations("audio");
  const [isOpen, setIsOpen] = useState(false);
  const [cooldownId, setCooldownId] = useState<string | null>(null);
  const lastTriggerRef = useRef<number>(0);

  const handlePlaySound = useCallback(
    (soundId: string, source: "preset" | "custom", audioUrl?: string) => {
      if (!isPlayerTurn) return;
      const now = Date.now();
      if (now - lastTriggerRef.current < COOLDOWN_MS) return;
      lastTriggerRef.current = now;

      // Anti-spam cooldown visual
      setCooldownId(soundId);
      setTimeout(() => setCooldownId(null), COOLDOWN_MS);

      // Broadcast via channelRef (player → DM)
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

  const presets = getAllPresets();

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
        {isOpen ? "✕" : "🔊"}
      </button>

      {/* Soundboard Drawer */}
      <AnimatePresence>
        {isOpen && isPlayerTurn && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-40 right-4 left-4 z-40 bg-card border border-border rounded-xl p-4 shadow-2xl max-w-md mx-auto"
            data-testid="soundboard-drawer"
          >
            {/* Presets Section */}
            <h3 className="text-muted-foreground text-xs font-medium mb-2 uppercase tracking-wider">
              {t("presets")}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
              {presets.map((preset) => {
                const isCooling = cooldownId === preset.id;
                return (
                  <motion.button
                    key={preset.id}
                    type="button"
                    disabled={isCooling}
                    onClick={() => handlePlaySound(preset.id, "preset")}
                    whileTap={!isCooling ? { scale: 0.9 } : undefined}
                    className={`relative flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-sm transition-all min-h-[60px] ${
                      isCooling
                        ? "bg-white/[0.03] text-muted-foreground/40 cursor-not-allowed"
                        : "bg-white/[0.06] text-foreground active:bg-white/[0.12] hover:bg-white/[0.08]"
                    }`}
                    data-testid={`preset-btn-${preset.id}`}
                  >
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

            {/* Custom Sounds Section */}
            {customAudioFiles.length > 0 && (
              <>
                <h3 className="text-muted-foreground text-xs font-medium mb-2 uppercase tracking-wider">
                  {t("my_sounds")}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {customAudioFiles.map((file) => {
                    const isCooling = cooldownId === file.id;
                    const signedUrl = customAudioUrls[file.id];
                    return (
                      <motion.button
                        key={file.id}
                        type="button"
                        disabled={isCooling || !signedUrl}
                        onClick={() => handlePlaySound(file.id, "custom", signedUrl)}
                        whileTap={!isCooling ? { scale: 0.9 } : undefined}
                        className={`relative flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-sm transition-all min-h-[60px] ${
                          isCooling
                            ? "bg-white/[0.03] text-muted-foreground/40 cursor-not-allowed"
                            : "bg-purple-900/20 text-foreground active:bg-purple-900/40 hover:bg-purple-900/30"
                        }`}
                        data-testid={`custom-btn-${file.id}`}
                      >
                        <span className="text-lg leading-none">🎵</span>
                        <span className="text-[10px] leading-tight text-center truncate w-full">
                          {file.file_name.replace(/\.mp3$/i, "")}
                        </span>
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
