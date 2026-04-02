"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { captureError } from "@/lib/errors/capture";

interface SharedNote {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

interface PlayerSharedNotesProps {
  campaignId: string;
}

export function PlayerSharedNotes({ campaignId }: PlayerSharedNotesProps) {
  const t = useTranslations("player");
  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("campaign_notes")
      .select("id, title, content, updated_at")
      .eq("campaign_id", campaignId)
      .eq("is_shared", true)
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          captureError(error, {
            component: "PlayerSharedNotes",
            action: "fetch",
            category: "network",
          });
        } else {
          setNotes(data ?? []);
        }
        setLoading(false);
      });
  }, [campaignId]);

  if (loading) {
    return (
      <p className="text-muted-foreground text-xs px-1">{t("notes_loading")}</p>
    );
  }

  if (notes.length === 0) {
    return (
      <p className="text-muted-foreground text-xs px-1">{t("notes_none")}</p>
    );
  }

  return (
    <ul className="space-y-2">
      {notes.map((note) => (
        <li
          key={note.id}
          className="rounded-lg border border-border bg-surface-tertiary px-3 py-2.5 space-y-1"
        >
          {note.title && (
            <p className="text-sm font-medium text-foreground">{note.title}</p>
          )}
          {note.content && (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {note.content}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
