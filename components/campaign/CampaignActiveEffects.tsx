"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Sparkles,
  Shield,
  Cookie,
  FlaskConical,
  Package,
  X,
  Zap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { PlayerCharacter, ActiveEffect } from "@/lib/types/database";

const TYPE_ICONS: Record<string, typeof Shield> = {
  spell: Shield,
  consumable: Cookie,
  potion: FlaskConical,
  item: Package,
  other: Sparkles,
};

const TYPE_COLORS: Record<string, string> = {
  spell: "text-blue-400",
  consumable: "text-green-400",
  potion: "text-rose-400",
  item: "text-purple-400",
  other: "text-muted-foreground",
};

function formatDuration(minutes: number): string {
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}d`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h`;
  return `${minutes}min`;
}

interface CampaignActiveEffectsProps {
  campaignId: string;
  characters: PlayerCharacter[];
}

export function CampaignActiveEffects({
  campaignId,
  characters,
}: CampaignActiveEffectsProps) {
  const t = useTranslations("campaign.active_effects");
  const [effectsByChar, setEffectsByChar] = useState<Record<string, ActiveEffect[]>>({});
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Stable key derived from character IDs to avoid re-fetching on every render
  const charIdKey = characters.map((c) => c.id).join(",");

  // Fetch all active effects for all characters in this campaign
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const charIds = charIdKey.split(",").filter(Boolean);
      if (charIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("character_active_effects")
        .select("*")
        .in("player_character_id", charIds)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        toast.error("Failed to load active effects");
        setLoading(false);
        return;
      }

      const grouped: Record<string, ActiveEffect[]> = {};
      for (const effect of data ?? []) {
        if (!grouped[effect.player_character_id]) {
          grouped[effect.player_character_id] = [];
        }
        grouped[effect.player_character_id].push(effect);
      }
      setEffectsByChar(grouped);
      setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [charIdKey, supabase]);

  // Dismiss an effect (DM action)
  const dismissEffect = useCallback(
    async (effectId: string, charId: string) => {
      const original = effectsByChar[charId]?.find((e) => e.id === effectId);
      setEffectsByChar((prev) => ({
        ...prev,
        [charId]: (prev[charId] ?? []).filter((e) => e.id !== effectId),
      }));

      const { error } = await supabase
        .from("character_active_effects")
        .update({ is_active: false, dismissed_at: new Date().toISOString() })
        .eq("id", effectId);

      if (error && original) {
        setEffectsByChar((prev) => ({
          ...prev,
          [charId]: [...(prev[charId] ?? []), original],
        }));
        toast.error("Failed to dismiss effect");
      }
    },
    [effectsByChar, supabase]
  );

  // Count total active effects
  const totalEffects = Object.values(effectsByChar).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  // Don't render if no characters or still loading with no data
  if (loading) return null;
  if (totalEffects === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-amber-400">
          {t("title")}
        </h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">
          {totalEffects}
        </span>
      </div>

      {/* Per-character effects */}
      <div className="space-y-2">
        {characters.map((char) => {
          const charEffects = effectsByChar[char.id] ?? [];
          const isCollapsed = collapsed[char.id] ?? false;

          return (
            <div key={char.id} className="space-y-1">
              {/* Character header */}
              <button
                type="button"
                onClick={() =>
                  setCollapsed((prev) => ({ ...prev, [char.id]: !isCollapsed }))
                }
                className="flex items-center gap-2 w-full text-left py-1 hover:bg-white/[0.02] rounded transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                )}
                <span className="text-xs font-medium text-foreground">
                  {char.name}
                </span>
                {char.class && (
                  <span className="text-[10px] text-muted-foreground">
                    {char.class} {char.level ? `L${char.level}` : ""}
                  </span>
                )}
                {charEffects.length > 0 && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {charEffects.length}
                  </span>
                )}
              </button>

              {/* Effect chips */}
              {!isCollapsed && (
                <div className="flex flex-wrap gap-1.5 pl-5">
                  {charEffects.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground/40 italic">
                      {t("no_effects")}
                    </span>
                  ) : (
                    charEffects.map((effect) => {
                      const Icon = TYPE_ICONS[effect.effect_type] ?? Sparkles;
                      const iconColor = TYPE_COLORS[effect.effect_type] ?? "text-muted-foreground";

                      return (
                        <div
                          key={effect.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] group/chip"
                        >
                          <Icon className={`w-3 h-3 ${iconColor}`} />
                          <span className="text-xs text-foreground">{effect.name}</span>

                          {effect.is_concentration && (
                            <Zap className="w-2.5 h-2.5 text-amber-400" />
                          )}

                          {effect.duration_minutes != null && (
                            <span className="text-[10px] text-muted-foreground">
                              ({formatDuration(effect.duration_minutes)})
                            </span>
                          )}

                          {effect.effect_type === "consumable" && effect.quantity > 1 && (
                            <span className="text-[10px] text-green-400 font-medium">
                              x{effect.quantity}
                            </span>
                          )}

                          {/* DM dismiss button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissEffect(effect.id, char.id);
                            }}
                            className="opacity-100 sm:opacity-0 sm:group-hover/chip:opacity-100 transition-opacity ml-0.5 min-w-[28px] min-h-[28px] flex items-center justify-center text-muted-foreground/50 hover:text-red-400"
                            aria-label={`Dismiss ${effect.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
