"use client";

import {
  Shield,
  Cookie,
  FlaskConical,
  Package,
  Sparkles,
  Zap,
} from "lucide-react";
import { useActiveEffects } from "@/lib/hooks/useActiveEffects";

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

interface ActiveEffectsBadgesProps {
  characterId: string;
}

export function ActiveEffectsBadges({ characterId }: ActiveEffectsBadgesProps) {
  const { effects, loading } = useActiveEffects(characterId);

  if (loading || effects.length === 0) return null;

  // Concentration first
  const sorted = [...effects].sort((a, b) => {
    if (a.is_concentration && !b.is_concentration) return -1;
    if (!a.is_concentration && b.is_concentration) return 1;
    return 0;
  });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-amber-400" />
        <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
          Active Effects
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {sorted.map((effect) => {
          const Icon = TYPE_ICONS[effect.effect_type] ?? Sparkles;
          const iconColor = TYPE_COLORS[effect.effect_type] ?? "text-muted-foreground";

          return (
            <div
              key={effect.id}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
                effect.is_concentration
                  ? "bg-amber-500/10 border-amber-500/20"
                  : "bg-white/[0.04] border-white/[0.06]"
              }`}
            >
              <Icon className={`w-3 h-3 ${iconColor}`} />
              <span className="text-foreground">{effect.name}</span>

              {effect.is_concentration && (
                <Zap className="w-2.5 h-2.5 text-amber-400" />
              )}

              {effect.duration_minutes != null && (
                <span className="text-[10px] text-muted-foreground">
                  {formatDuration(effect.duration_minutes)}
                </span>
              )}

              {effect.effect_type === "consumable" && effect.quantity > 1 && (
                <span className="text-[10px] text-green-400 font-medium">
                  x{effect.quantity}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
