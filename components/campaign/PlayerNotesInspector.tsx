"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Crown,
  FileText,
  Plus,
  Scroll,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDmPlayerNotes } from "@/lib/hooks/useDmPlayerNotes";
import { DmPrivateNoteForm, type PlayerTarget } from "./DmPrivateNoteForm";
import type { CampaignNote, JournalEntry } from "@/lib/types/database";

/**
 * DM-side inspector: reads notes that players opted-in to share with the DM
 * (`player_journal_entries.visibility = 'shared_with_dm'`) plus DM-authored
 * private notes addressed to each player
 * (`campaign_notes.visibility = 'dm_private_to_player'`).
 *
 * Read-only over `player_journal_entries` (authored by the player). The DM
 * can only create new `dm_private_to_player` notes from here; never edit the
 * player's own journal entries. Wave 4 / migration 149, spec §5.
 */

const ALL_PLAYERS = "__all__" as const;
type FilterValue = typeof ALL_PLAYERS | string;

interface PlayerNotesInspectorProps {
  campaignId: string;
  dmUserId: string;
  players: PlayerTarget[];
}

export function PlayerNotesInspector({
  campaignId,
  dmUserId,
  players,
}: PlayerNotesInspectorProps) {
  const t = useTranslations("campaign.players");
  const locale = useLocale();
  const { groups, loading, reload } = useDmPlayerNotes(campaignId);

  const [filter, setFilter] = useState<FilterValue>(ALL_PLAYERS);
  const [openFormFor, setOpenFormFor] = useState<string | null>(null);
  const [expandedChars, setExpandedChars] = useState<Record<string, boolean>>(
    {},
  );

  // Sort groups: those with content first, then alphabetically.
  const sortedGroups = useMemo(() => {
    const withContent = groups.filter(
      (g) => g.sharedEntries.length > 0 || g.dmPrivateNotes.length > 0,
    );
    const withoutContent = groups.filter(
      (g) => g.sharedEntries.length === 0 && g.dmPrivateNotes.length === 0,
    );
    const byName = (a: { playerCharacterName: string }, b: { playerCharacterName: string }) =>
      a.playerCharacterName.localeCompare(b.playerCharacterName, locale);
    return [...withContent.sort(byName), ...withoutContent.sort(byName)];
  }, [groups, locale]);

  const visibleGroups = useMemo(() => {
    if (filter === ALL_PLAYERS) return sortedGroups;
    return sortedGroups.filter((g) => g.playerCharacterId === filter);
  }, [sortedGroups, filter]);

  const totalSharedCount = useMemo(
    () => groups.reduce((sum, g) => sum + g.sharedEntries.length, 0),
    [groups],
  );
  const totalPrivateCount = useMemo(
    () => groups.reduce((sum, g) => sum + g.dmPrivateNotes.length, 0),
    [groups],
  );

  const toggleExpand = (characterId: string) => {
    setExpandedChars((prev) => ({
      ...prev,
      [characterId]: !(prev[characterId] ?? true),
    }));
  };

  const isExpanded = (characterId: string) =>
    expandedChars[characterId] ?? true;

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-10 bg-white/5 rounded" />
        <div className="h-24 bg-white/5 rounded" />
        <div className="h-24 bg-white/5 rounded" />
      </div>
    );
  }

  // ── Empty state (no players in campaign) ───────────────────────────────
  if (players.length === 0) {
    return (
      <div className="py-10 text-center">
        <Users className="w-8 h-8 text-amber-400/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground italic">
          {t("notes_no_players")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filter + summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Scroll className="w-4 h-4 text-amber-400" aria-hidden="true" />
            {t("notes_title")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("notes_summary", {
              shared: totalSharedCount,
              sent: totalPrivateCount,
            })}
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="player-notes-filter"
            className="text-xs text-muted-foreground"
          >
            {t("notes_filter_label")}
          </label>
          <select
            id="player-notes-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterValue)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          >
            <option value={ALL_PLAYERS}>{t("notes_filter_all")}</option>
            {players.map((p) => (
              <option key={p.character_id} value={p.character_id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty — no shared or private notes at all */}
      {totalSharedCount === 0 && totalPrivateCount === 0 && (
        <div className="py-6 text-center rounded-lg border border-dashed border-white/[0.04] bg-white/[0.02]">
          <FileText className="w-7 h-7 text-amber-400/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/80 italic">
            {t("notes_empty")}
          </p>
        </div>
      )}

      {/* Groups */}
      <ul className="space-y-3">
        {visibleGroups.map((group) => {
          const charId = group.playerCharacterId;
          const hasShared = group.sharedEntries.length > 0;
          const hasPrivate = group.dmPrivateNotes.length > 0;
          const showEmpty = !hasShared && !hasPrivate;
          const expanded = isExpanded(charId);

          return (
            <li
              key={charId}
              className="rounded-lg border border-white/[0.04] bg-white/[0.02] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleExpand(charId)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {expanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm font-medium text-foreground truncate">
                    {group.playerCharacterName}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[11px] text-muted-foreground">
                  {hasShared && (
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {group.sharedEntries.length}
                    </span>
                  )}
                  {hasPrivate && (
                    <span className="inline-flex items-center gap-1 text-amber-400/80">
                      <Crown className="w-3 h-3" />
                      {group.dmPrivateNotes.length}
                    </span>
                  )}
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Shared entries (read-only) */}
                  {hasShared && (
                    <section>
                      <h4 className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1.5">
                        {t("notes_shared_by_player")}
                      </h4>
                      <ul className="space-y-2">
                        {group.sharedEntries.map((entry) => (
                          <SharedEntryCard
                            key={entry.id}
                            entry={entry}
                            locale={locale}
                          />
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* DM private notes sent */}
                  {hasPrivate && (
                    <section>
                      <h4 className="text-[10px] uppercase tracking-wide text-amber-400/70 mb-1.5 flex items-center gap-1">
                        <Crown className="w-3 h-3" aria-hidden="true" />
                        {t("notes_sent_by_dm")}
                      </h4>
                      <ul className="space-y-2">
                        {group.dmPrivateNotes.map((note) => (
                          <DmPrivateNoteCard
                            key={note.id}
                            note={note}
                            locale={locale}
                          />
                        ))}
                      </ul>
                    </section>
                  )}

                  {showEmpty && (
                    <p className="text-xs italic text-muted-foreground/60">
                      {t("notes_group_empty")}
                    </p>
                  )}

                  {/* Inline DM → player private note form */}
                  {openFormFor === charId ? (
                    <DmPrivateNoteForm
                      campaignId={campaignId}
                      dmUserId={dmUserId}
                      players={players}
                      defaultTargetCharacterId={charId}
                      onCancel={() => setOpenFormFor(null)}
                      onSaved={() => {
                        setOpenFormFor(null);
                        reload();
                      }}
                    />
                  ) : (
                    <div className="pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="goldOutline"
                        onClick={() => setOpenFormFor(charId)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {t("dm_private_note_cta", {
                          playerName: group.playerCharacterName,
                        })}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Cards ──────────────────────────────────────────────────────────────────

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SharedEntryCard({
  entry,
  locale,
}: {
  entry: JournalEntry;
  locale: string;
}) {
  const t = useTranslations("campaign.players");
  const typeIcon =
    entry.type === "lore"
      ? Scroll
      : entry.type === "journal"
        ? BookOpen
        : FileText;
  const Icon = typeIcon;
  return (
    <li className="rounded-md border border-white/[0.04] bg-black/20 p-3 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon
          className="w-3 h-3 text-muted-foreground/70"
          aria-hidden="true"
        />
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
          {t(`notes_entry_type_${entry.type}`)}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground/60">
          {formatDate(entry.updated_at, locale)}
        </span>
      </div>
      {entry.title && (
        <p className="text-sm font-medium text-foreground">{entry.title}</p>
      )}
      {entry.content && (
        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
          {entry.content}
        </p>
      )}
    </li>
  );
}

function DmPrivateNoteCard({
  note,
  locale,
}: {
  note: CampaignNote;
  locale: string;
}) {
  const t = useTranslations("campaign.players");
  return (
    <li className="rounded-md border border-amber-400/15 bg-amber-400/[0.04] p-3 space-y-1">
      <div className="flex items-center gap-1.5">
        <Crown className="w-3 h-3 text-amber-400" aria-hidden="true" />
        <span className="text-[10px] uppercase tracking-wide text-amber-400">
          {t("notes_sent_badge")}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground/60">
          {formatDate(note.updated_at, locale)}
        </span>
      </div>
      {note.title && (
        <p className="text-sm font-medium text-foreground">{note.title}</p>
      )}
      {note.content && (
        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
          {note.content}
        </p>
      )}
    </li>
  );
}
