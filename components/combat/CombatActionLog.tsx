"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { X, Swords, Heart, Shield, SkullIcon, ArrowRight, AlertCircle } from "lucide-react";
import { useCombatLogStore, type CombatLogEntry } from "@/lib/stores/combat-log-store";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CombatActionLogProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Entry type → color + icon mapping
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<CombatLogEntry["type"], { color: string; Icon: React.ElementType }> = {
  attack:    { color: "text-orange-400", Icon: Swords },
  damage:    { color: "text-red-400",    Icon: Swords },
  heal:      { color: "text-green-400",  Icon: Heart },
  condition: { color: "text-purple-400", Icon: AlertCircle },
  turn:      { color: "text-gold",       Icon: ArrowRight },
  defeat:    { color: "text-red-500",    Icon: SkullIcon },
  save:      { color: "text-blue-400",   Icon: Shield },
  system:    { color: "text-muted-foreground", Icon: AlertCircle },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CombatActionLog({ open, onClose }: CombatActionLogProps) {
  const t = useTranslations("combat");
  const tc = useTranslations("common");
  const entries = useCombatLogStore((s) => s.entries);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, open]);

  if (!open) return null;

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-card border-l border-border z-50 flex flex-col shadow-2xl"
        role="log"
        aria-label={t("combat_log_title")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{t("combat_log_title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={tc("close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Entries */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {entries.length === 0 && (
            <p className="text-xs text-muted-foreground/60 text-center py-8">
              {t("combat_log_empty")}
            </p>
          )}

          {entries.map((entry, i) => {
            const showRoundSeparator =
              i === 0 || entries[i - 1].round !== entry.round;

            const { color, Icon } = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.system;

            return (
              <div key={entry.id}>
                {/* Round separator */}
                {showRoundSeparator && (
                  <div className="flex items-center gap-2 py-1.5 mt-1">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] font-semibold text-gold uppercase tracking-wide">
                      {t("combat_log_round", { round: entry.round })}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                {/* Log entry */}
                <div className="flex items-start gap-1.5 py-0.5 group">
                  <Icon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${color}`} />
                  <div className="text-[11px] leading-tight">
                    <span className={`font-medium ${color}`}>{entry.actorName}</span>
                    {entry.targetName && (
                      <span className="text-muted-foreground">
                        {" → "}
                        <span className="text-foreground/70">{entry.targetName}</span>
                      </span>
                    )}
                    <span className="text-muted-foreground/80 ml-1">{entry.description}</span>
                    {/* Detail badges */}
                    {entry.details?.damageAmount != null && (
                      <span className="ml-1 text-red-400 font-mono text-[10px]">
                        {entry.details.damageAmount}
                        {entry.details.damageType && ` ${entry.details.damageType}`}
                      </span>
                    )}
                    {entry.details?.damageModifier && entry.details.damageModifier !== "normal" && (
                      <span className="ml-1 text-yellow-400 text-[10px] uppercase">
                        {entry.details.damageModifier}
                      </span>
                    )}
                    {entry.details?.isNat20 && (
                      <span className="ml-1 text-green-400 text-[10px] font-bold">NAT 20</span>
                    )}
                    {entry.details?.isNat1 && (
                      <span className="ml-1 text-red-400 text-[10px] font-bold">NAT 1</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
