"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Swords, Heart, Shield, SkullIcon, ArrowRight, AlertCircle } from "lucide-react";
import { useCombatLogStore, type CombatLogEntry } from "@/lib/stores/combat-log-store";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CombatActionLogProps {
  open: boolean;
  onClose: () => void;
  /** Player filter: only show damage/heal entries where this ID is the target */
  playerId?: string;
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

type TabKey = "all" | "damage";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CombatActionLog({ open, onClose, playerId }: CombatActionLogProps) {
  const t = useTranslations("combat");
  const tc = useTranslations("common");
  const entries = useCombatLogStore((s) => s.entries);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [userScrolled, setUserScrolled] = useState(false);
  const [hasNewEntry, setHasNewEntry] = useState(false);
  const prevLenRef = useRef(entries.length);

  // Filter entries based on active tab + player filter
  const displayEntries = entries.filter((e) => {
    if (activeTab === "damage" && e.type !== "damage" && e.type !== "heal") return false;
    if (playerId && activeTab === "damage" && e.details?.targetId !== playerId) return false;
    return true;
  });

  // Track user scroll position
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 30;
    setUserScrolled(!atBottom);
    if (atBottom) setHasNewEntry(false);
  };

  // Auto-scroll to bottom on new entries (unless user scrolled up)
  useEffect(() => {
    if (entries.length > prevLenRef.current) {
      if (!userScrolled && open && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      } else if (userScrolled) {
        setHasNewEntry(true);
      }
    }
    prevLenRef.current = entries.length;
  }, [entries.length, open, userScrolled]);

  // Scroll to bottom when opening or switching tabs
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setUserScrolled(false);
      setHasNewEntry(false);
    }
  }, [open, activeTab]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setUserScrolled(false);
      setHasNewEntry(false);
    }
  };

  if (!open) return null;

  const damageCount = entries.filter((e) => e.type === "damage" || e.type === "heal").length;

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

        {/* Tabs */}
        <div className="flex border-b border-border px-3">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 ${
              activeTab === "all"
                ? "border-gold text-gold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("combat_log_tab_all")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("damage")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "damage"
                ? "border-red-400 text-red-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("combat_log_tab_damage")}
            {damageCount > 0 && (
              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 rounded-full font-mono">
                {damageCount}
              </span>
            )}
          </button>
        </div>

        {/* Entries */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 relative">
          {displayEntries.length === 0 && (
            <p className="text-xs text-muted-foreground/60 text-center py-8">
              {activeTab === "damage" ? t("combat_log_damage_empty") : t("combat_log_empty")}
            </p>
          )}

          {displayEntries.map((entry, i) => {
            const showRoundSeparator =
              i === 0 || displayEntries[i - 1].round !== entry.round;

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
                  <div className="flex-1 text-[11px] leading-tight">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`font-medium ${color}`}>{entry.actorName}</span>
                        {entry.targetName && (
                          <span className="text-muted-foreground">
                            {" → "}
                            <span className="text-foreground/70">{entry.targetName}</span>
                          </span>
                        )}
                      </div>
                      {activeTab === "damage" && (
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                          R{entry.round}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground/80">{entry.description}</span>
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

        {/* "New entry" badge when user has scrolled up */}
        {hasNewEntry && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-gold/90 text-background text-xs font-medium rounded-full shadow-lg hover:bg-gold transition-colors z-10"
          >
            {t("combat_log_new_entry")} ↓
          </button>
        )}
      </div>
    </>
  );
}
