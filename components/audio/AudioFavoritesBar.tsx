"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Star, X } from "lucide-react";
import { useFavoritesStore } from "@/lib/stores/favorites-store";
import { getPresetById } from "@/lib/utils/audio-presets";

interface AudioFavoritesBarProps {
  onPlaySound: (presetId: string, source: "preset" | "custom", url?: string) => void;
  cooldownId?: string | null;
  /** If true, show compact inline variant (DM panel) */
  compact?: boolean;
}

export function AudioFavoritesBar({
  onPlaySound,
  cooldownId,
  compact = false,
}: AudioFavoritesBarProps) {
  const t = useTranslations("audio");
  const favorites = useFavoritesStore((s) => s.favorites);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const hydrated = useFavoritesStore((s) => s.hydrated);

  const handleRemove = useCallback(
    (presetId: string, e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      removeFavorite(presetId);
    },
    [removeFavorite]
  );

  if (!hydrated) return null;

  // Empty state
  if (favorites.length === 0) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 ${compact ? "" : "border-b border-border"}`}>
        <Star className="w-3.5 h-3.5 text-gold/40" />
        <span className="text-[10px] text-muted-foreground/60 italic">
          {t("favorites_empty_hint")}
        </span>
      </div>
    );
  }

  return (
    <div className={`${compact ? "pb-2" : "px-3 py-2 border-b border-border"}`}>
      {!compact && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Star className="w-3 h-3 text-gold fill-gold" />
          <span className="text-[10px] font-medium text-gold/80 uppercase tracking-wider">
            {t("favorites_title")}
          </span>
        </div>
      )}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {favorites.filter((fav) => getPresetById(fav.preset_id)).map((fav) => {
            const preset = getPresetById(fav.preset_id)!;

            const isCooling = cooldownId === fav.preset_id;

            return (
              <motion.button
                key={fav.preset_id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                type="button"
                disabled={isCooling}
                onClick={() => onPlaySound(fav.preset_id, fav.source)}
                className={`group relative flex items-center gap-1.5 shrink-0 rounded-lg text-sm transition-all ${
                  compact
                    ? "px-2 py-1.5 min-h-[36px]"
                    : "px-2.5 py-2 min-h-[40px]"
                } ${
                  isCooling
                    ? "bg-white/[0.03] text-muted-foreground/40 cursor-not-allowed"
                    : "bg-gold/10 border border-gold/20 text-foreground hover:bg-gold/20 active:scale-95"
                }`}
              >
                <span className={compact ? "text-sm leading-none" : "text-base leading-none"}>
                  {preset.icon}
                </span>
                <span className={`${compact ? "text-[9px]" : "text-[10px]"} leading-tight whitespace-nowrap max-w-[80px] truncate`}>
                  {t(preset.name_key.replace("audio.", "") as Parameters<typeof t>[0])}
                </span>

                {/* Remove button — hover on desktop, always visible on touch (pointer:coarse) */}
                <button
                  type="button"
                  onClick={(e) => handleRemove(fav.preset_id, e)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-opacity"
                  aria-label={t("favorites_remove")}
                >
                  <X className="w-2.5 h-2.5" />
                </button>

                {/* Cooldown bar */}
                {isCooling && (
                  <div className="absolute inset-0 rounded-lg overflow-hidden">
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gold/30 animate-[shrink_2s_linear_forwards]" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
