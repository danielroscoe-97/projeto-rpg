"use client";

import { useTranslations, useLocale } from "next-intl";
import { Scroll, Crown } from "lucide-react";
import { useDmInboxNotes } from "@/lib/hooks/useDmInboxNotes";

interface DmNotesInboxProps {
  characterId: string;
}

/**
 * Read-only list of DM private notes addressed to this character
 * (Wave 4 / migration 149).
 *
 * Backed by `useDmInboxNotes` which SELECTs only rows where
 * `visibility = 'dm_private_to_player'` AND `target_character_id = me`.
 * RLS enforces the rest.
 */
export function DmNotesInbox({ characterId }: DmNotesInboxProps) {
  const t = useTranslations("player_hq.notes");
  const locale = useLocale();
  const { notes, loading } = useDmInboxNotes(characterId);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-16 bg-white/5 rounded" />
        <div className="h-16 bg-white/5 rounded" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="py-6 text-center">
        <Scroll className="w-7 h-7 text-amber-400/20 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground/70 italic">
          {t("no_dm_notes")}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {notes.map((note) => {
        const date = new Date(note.updated_at).toLocaleDateString(locale, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        return (
          <li
            key={note.id}
            className="bg-white/5 rounded-lg p-3 space-y-1.5 border border-amber-400/10"
          >
            <div className="flex items-center gap-1.5">
              <Crown className="w-3 h-3 text-amber-400" aria-hidden="true" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-amber-400">
                {t("from_dm_badge")}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground/60">
                {date}
              </span>
            </div>
            {note.title && (
              <p className="text-sm font-medium text-foreground">
                {note.title}
              </p>
            )}
            {note.content && (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {note.content}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
