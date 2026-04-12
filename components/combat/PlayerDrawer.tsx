"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { X, Shield, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getHpBarColor, getHpTextColor } from "@/lib/utils/hp-status";
import type { PlayerCharacter } from "@/lib/types/database";

interface PlayerDrawerProps {
  campaignId: string | null;
  open: boolean;
  onClose: () => void;
}


type SaveStatus = "idle" | "saving" | "saved";

function NotesField({
  characterId,
  initialNotes,
  placeholder,
  savingLabel,
  savedLabel,
}: {
  characterId: string;
  initialNotes: string;
  placeholder: string;
  savingLabel: string;
  savedLabel: string;
}) {
  const [value, setValue] = useState(initialNotes);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync if parent re-fetches
  useEffect(() => {
    setValue(initialNotes);
  }, [initialNotes]);

  const save = useCallback(
    async (text: string) => {
      setStatus("saving");
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("player_characters")
          .update({ dm_notes: text })
          .eq("id", characterId);
        if (error) throw error;
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1500);
      } catch {
        setStatus("idle");
      }
    },
    [characterId]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(text), 800);
  };

  // Flush pending save and cleanup timer on unmount
  const valueRef = useRef(value);
  valueRef.current = value;
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // Fire pending save before unmount
        save(valueRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-2">
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={2}
        className="w-full bg-background/50 border border-border rounded-md px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 resize-y focus:outline-none focus:ring-1 focus:ring-gold/40"
      />
      <div className="h-4 mt-0.5">
        {status === "saving" && (
          <span className="text-[10px] text-muted-foreground animate-pulse">
            {savingLabel}
          </span>
        )}
        {status === "saved" && (
          <span className="text-[10px] text-emerald-400">{savedLabel}</span>
        )}
      </div>
    </div>
  );
}

export function PlayerDrawer({ campaignId, open, onClose }: PlayerDrawerProps) {
  const t = useTranslations("combat");
  const [characters, setCharacters] = useState<PlayerCharacter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !campaignId) return;
    let cancelled = false;
    setLoading(true);

    const supabase = createClient();
    supabase
      .from("player_characters")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("name", { ascending: true })
      .then(({ data }: { data: PlayerCharacter[] | null }) => {
        if (!cancelled) {
          setCharacters(data ?? []);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, campaignId]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-[51] transition-opacity duration-200 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-label={t("player_drawer_title")}
        data-testid="player-drawer"
        className={`fixed top-0 right-0 h-full w-full sm:w-[320px] bg-card border-l border-border z-[51] shadow-xl transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            {t("player_drawer_title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            aria-label={t("close_player_drawer")}
            data-testid="player-drawer-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-49px)] px-4 py-3 space-y-4">
          {!campaignId && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("player_drawer_no_campaign")}
            </p>
          )}

          {campaignId && loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
            </div>
          )}

          {campaignId && !loading && characters.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("player_drawer_empty")}
            </p>
          )}

          {characters.map((pc) => {
            const hpPct =
              pc.max_hp > 0
                ? Math.max(0, Math.min(100, (pc.current_hp / pc.max_hp) * 100))
                : 0;

            return (
              <div
                key={pc.id}
                className="bg-white/[0.03] rounded-lg border border-border p-3"
                data-testid={`player-card-${pc.id}`}
              >
                {/* Name */}
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {pc.name}
                </h3>

                {/* HP bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={getHpTextColor(pc.current_hp, pc.max_hp)}>
                      HP
                    </span>
                    <span
                      className={`font-mono ${getHpTextColor(
                        pc.current_hp,
                        pc.max_hp
                      )}`}
                    >
                      {pc.current_hp} / {pc.max_hp}
                    </span>
                  </div>
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getHpBarColor(
                        pc.current_hp,
                        pc.max_hp
                      )}`}
                      style={{ width: `${hpPct}%` }}
                    />
                  </div>
                </div>

                {/* Stat badges */}
                <div className="flex items-center gap-2 mt-2.5">
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-background/50 rounded text-xs border border-border">
                    <Shield className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono text-foreground">{pc.ac}</span>
                  </div>
                  {pc.spell_save_dc != null && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-background/50 rounded text-xs border border-border">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span className="font-mono text-foreground">
                        DC {pc.spell_save_dc}
                      </span>
                    </div>
                  )}
                </div>

                {/* DM Notes */}
                <NotesField
                  characterId={pc.id}
                  initialNotes={pc.dm_notes ?? ""}
                  placeholder={t("player_drawer_notes_placeholder")}
                  savingLabel={t("player_drawer_saving")}
                  savedLabel={t("player_drawer_saved")}
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
