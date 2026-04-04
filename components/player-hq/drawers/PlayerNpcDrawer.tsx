"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { UserCircle, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DrawerShell } from "./DrawerShell";

interface PlayerNpcDrawerProps {
  npcId: string;
  npcName: string;
  characterId: string;
  campaignId: string;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

type Relationship = "ally" | "enemy" | "neutral" | "unknown";

export function PlayerNpcDrawer({
  npcId,
  npcName,
  characterId,
  campaignId,
  onClose,
  onNavigateTab,
}: PlayerNpcDrawerProps) {
  const t = useTranslations("player_hq.npc_drawer");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("unknown");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Fetch existing note
  useEffect(() => {
    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("player_npc_notes")
        .select("id, relationship, notes")
        .eq("player_character_id", characterId)
        .eq("npc_name", npcName)
        .maybeSingle();

      if (data) {
        setNoteId(data.id);
        setNotes(data.notes ?? "");
        setRelationship((data.relationship as Relationship) ?? "unknown");
      }
      setLoading(false);
    }
    fetch();
  }, [characterId, npcName]);

  // Upsert to avoid race conditions on insert
  const save = (updatedNotes: string, updatedRelationship: Relationship) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (savingRef.current) return;
      savingRef.current = true;
      try {
        const supabase = createClient();
        if (noteId) {
          await supabase
            .from("player_npc_notes")
            .update({ notes: updatedNotes, relationship: updatedRelationship })
            .eq("id", noteId);
        } else {
          const { data } = await supabase
            .from("player_npc_notes")
            .upsert(
              {
                player_character_id: characterId,
                campaign_id: campaignId,
                npc_name: npcName,
                notes: updatedNotes,
                relationship: updatedRelationship,
              },
              { onConflict: "player_character_id,npc_name" }
            )
            .select("id")
            .single();
          if (data) setNoteId(data.id);
        }
      } finally {
        savingRef.current = false;
      }
    }, 800);
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    save(val, relationship);
  };

  const handleRelationshipChange = (val: Relationship) => {
    setRelationship(val);
    save(notes, val);
  };

  const relationships: Array<{ value: Relationship; label: string; color: string }> = [
    { value: "ally", label: t("rel_ally"), color: "border-emerald-400 bg-emerald-400/20 text-emerald-300" },
    { value: "neutral", label: t("rel_neutral"), color: "border-gray-400 bg-gray-400/20 text-gray-300" },
    { value: "enemy", label: t("rel_enemy"), color: "border-red-400 bg-red-400/20 text-red-300" },
    { value: "unknown", label: t("rel_unknown"), color: "border-purple-400 bg-purple-400/20 text-purple-300" },
  ];

  return (
    <DrawerShell
      title={npcName}
      icon={<UserCircle className="w-5 h-5" />}
      iconColor="text-purple-400"
      onClose={onClose}
    >
      {loading ? (
        <div className="h-20 bg-white/5 rounded animate-pulse" />
      ) : (
        <>
          {/* Relationship selector */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-2 block">
              {t("relationship")}
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {relationships.map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRelationshipChange(value)}
                  className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${
                    relationship === value ? color : "border-border text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-2 block">
              {t("your_notes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder={t("notes_placeholder")}
              className="w-full min-h-[120px] bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            />
          </div>

          {/* Quick access */}
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => { onClose(); onNavigateTab("notes"); }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-xs w-full"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t("view_in_journal")}
            </button>
          )}
        </>
      )}
    </DrawerShell>
  );
}
