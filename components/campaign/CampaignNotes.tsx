"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MentionLookupEntry } from "@/components/ui/EntityMentionEditor";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { captureError } from "@/lib/errors/capture";
import { requestXpGrant } from "@/lib/xp/request-xp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Trash2, ChevronDown, ChevronRight, Lock, Eye, Users, Settings2,
  FileText, BookOpen, MapPin, UserCircle, Scroll, EyeOff, Lightbulb,
} from "lucide-react";
import type { NoteType } from "@/lib/types/mind-map";

const NOTE_TYPE_CONFIG: Array<{
  key: NoteType;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeColor: string;
  dotColor: string;
}> = [
  { key: "general", icon: FileText, color: "text-muted-foreground/60 border-white/[0.04]", activeColor: "text-blue-400 border-blue-400 bg-blue-400/10", dotColor: "bg-blue-400" },
  { key: "lore", icon: BookOpen, color: "text-muted-foreground/60 border-white/[0.04]", activeColor: "text-indigo-400 border-indigo-400 bg-indigo-400/10", dotColor: "bg-indigo-400" },
  { key: "location", icon: MapPin, color: "text-muted-foreground/60 border-white/[0.04]", activeColor: "text-green-400 border-green-400 bg-green-400/10", dotColor: "bg-green-400" },
  { key: "npc", icon: UserCircle, color: "text-muted-foreground/60 border-white/[0.04]", activeColor: "text-purple-400 border-purple-400 bg-purple-400/10", dotColor: "bg-purple-400" },
  { key: "session_recap", icon: Scroll, color: "text-muted-foreground/60 border-white/[0.04]", activeColor: "text-orange-400 border-orange-400 bg-orange-400/10", dotColor: "bg-orange-400" },
  { key: "secret", icon: EyeOff, color: "text-muted-foreground/60 border-white/[0.04]", activeColor: "text-gray-400 border-gray-500 bg-gray-500/10", dotColor: "bg-gray-400" },
  { key: "plot_hook", icon: Lightbulb, color: "text-muted-foreground/60 border-white/[0.04]", activeColor: "text-yellow-400 border-yellow-400 bg-yellow-400/10", dotColor: "bg-yellow-400" },
];
import { NotesListSkeleton } from "@/components/ui/skeletons/NotesListSkeleton";
import { NotesFolderTree } from "./NotesFolderTree";
import { NoteCard } from "./NoteCard";
import { NpcTagSelector } from "./NpcTagSelector";
import { EntityMentionEditor, MentionChipRenderer, type MentionLookupMap } from "@/components/ui/EntityMentionEditor";
import {
  stripMentionsToPlainText,
  extractMentionRefs,
  type MentionEntityType,
} from "@/lib/utils/mention-parser";
import { EntityTagSelector } from "./EntityTagSelector";
import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  moveNoteToFolder,
  toggleNoteShared,
} from "@/lib/supabase/campaign-notes";
import {
  getCampaignNoteNpcLinks,
  linkNoteToNpc,
  unlinkNoteFromNpc,
} from "@/lib/supabase/note-npc-links";
import { getNpcs } from "@/lib/supabase/campaign-npcs";
import {
  upsertEntityLink,
  unlinkEntities,
  listCampaignEdges,
  listEntityLinks,
  syncTextMentions,
} from "@/lib/supabase/entity-links";
import {
  selectCounterpartyIds,
  findEdgeId,
  type EntityLink,
  type EntityType,
} from "@/lib/types/entity-links";
import { useCampaignLocations } from "@/lib/hooks/use-campaign-locations";
import { useCampaignFactions } from "@/lib/hooks/use-campaign-factions";
import { useCampaignQuests } from "@/lib/hooks/use-campaign-quests";
import { useEntityUnlinkUndo } from "@/lib/hooks/use-entity-unlink-undo";
import type { CampaignNote, CampaignNoteFolder } from "@/lib/types/database";
import type { NoteNpcLink } from "@/lib/types/note-npc-links";
import type { CampaignNpc } from "@/lib/types/campaign-npcs";

interface CampaignNotesProps {
  campaignId: string;
  isOwner?: boolean;
}

type SaveStatus = "idle" | "saving" | "saved";

export function CampaignNotes({ campaignId, isOwner = true }: CampaignNotesProps) {
  const supabase = createClient();
  const t = useTranslations("notes");
  const tLinks = useTranslations("links");
  const tEntity = useTranslations("entity_graph");

  // Stable strings object for the undo hook. useMemo so the hook doesn't
  // re-bind schedule/flushNow on every render (strings are a dep of the
  // useCallback inside the hook).
  const unlinkUndoStrings = useMemo(
    () => ({
      single: tEntity("undo_unlink"),
      batch: (count: number) => tEntity("undo_unlink_batch", { count }),
      actionSingle: tEntity("undo_action_single"),
      actionBatch: tEntity("undo_action_batch"),
      errorSingle: tEntity("undo_commit_failed_single"),
      errorBatch: (count: number) =>
        tEntity("undo_commit_failed_batch", { count }),
    }),
    [tEntity],
  );
  const { schedule: scheduleUnlinkUndo } = useEntityUnlinkUndo(unlinkUndoStrings);
  const router = useRouter();

  // Chip-click → navigate to the entity's list tab with ?<type>Id=<uuid>. The
  // receiving list uses the searchParams identity (not the id string) as the
  // effect key so repeat clicks on the same chip still refocus the card.
  const handleChipNavigate = useCallback(
    (entity: MentionLookupEntry) => {
      const base = `/app/campaigns/${campaignId}`;
      switch (entity.type) {
        case "npc":
          router.push(`${base}?section=npcs&npcId=${entity.id}`);
          return;
        case "location":
          router.push(`${base}?section=locations&locationId=${entity.id}`);
          return;
        case "faction":
          router.push(`${base}?section=factions&factionId=${entity.id}`);
          return;
        case "quest":
          router.push(`${base}?section=quests&questId=${entity.id}`);
          return;
        default: {
          // Exhaustiveness guard: adding a new MentionEntityType without
          // wiring its route here becomes a compile error instead of a
          // silent no-op.
          const _exhaustive: never = entity.type;
          void _exhaustive;
          return;
        }
      }
    },
    [campaignId, router],
  );
  const [notes, setNotes] = useState<CampaignNote[]>([]);
  const [folders, setFolders] = useState<CampaignNoteFolder[]>([]);
  const [npcLinks, setNpcLinks] = useState<NoteNpcLink[]>([]);
  const [campaignNpcs, setCampaignNpcs] = useState<CampaignNpc[]>([]);
  const [campaignEdges, setCampaignEdges] = useState<EntityLink[]>([]);
  const [loading, setLoading] = useState(true);
  const { locations: campaignLocations } = useCampaignLocations(campaignId);
  const { factions: campaignFactions } = useCampaignFactions(campaignId);
  const { quests: campaignQuests } = useCampaignQuests(campaignId);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Hydrate focused-note from the URL (e.g. Campaign HQ's "Iniciar sessão
  // de hoje" CTA routes here with ?section=notes&noteId=<id>). When the
  // note renders, we auto-expand it and scroll it into view.
  const searchParams = useSearchParams();
  const focusedNoteId = searchParams?.get("noteId") ?? null;
  const [dmUserId, setDmUserId] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [playerNotesExpanded, setPlayerNotesExpanded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [optionsOpenIds, setOptionsOpenIds] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch notes and folders on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [notesRes, foldersData, linksData, npcsData, edgesData, authRes] = await Promise.all([
          supabase
            .from("campaign_notes")
            .select("*")
            .eq("campaign_id", campaignId)
            .order("updated_at", { ascending: false }),
          getFolders(campaignId),
          getCampaignNoteNpcLinks(campaignId),
          getNpcs(campaignId),
          listCampaignEdges(campaignId),
          supabase.auth.getUser(),
        ]);

        if (notesRes.error) throw notesRes.error;
        setNotes(notesRes.data ?? []);
        setFolders(foldersData);
        setNpcLinks(linksData);
        setCampaignNpcs(npcsData);
        setCampaignEdges(edgesData);

        const currentUserId = authRes.data.user?.id ?? null;
        setDmUserId(currentUserId);

        // Fetch display names for player notes (notes from non-DM users)
        if (currentUserId && notesRes.data) {
          const playerUserIds = [...new Set(
            notesRes.data
              .filter((n: { user_id: string | null }) => n.user_id !== currentUserId)
              .map((n: { user_id: string | null }) => n.user_id)
              .filter(Boolean)
          )];
          if (playerUserIds.length > 0) {
            const { data: usersData } = await supabase
              .from("users")
              .select("id, display_name")
              .in("id", playerUserIds);
            if (usersData) {
              const nameMap: Record<string, string> = {};
              for (const u of usersData) nameMap[u.id] = u.display_name ?? u.id;
              setPlayerNames(nameMap);
            }
          }
        }
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "fetchData",
          category: "network",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [campaignId, supabase]);

  // Note counts per folder
  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let unfiled = 0;
    for (const note of notes) {
      if (note.folder_id) {
        counts[note.folder_id] = (counts[note.folder_id] ?? 0) + 1;
      } else {
        unfiled++;
      }
    }
    counts["unfiled"] = unfiled;
    return counts;
  }, [notes]);

  // Folder map for quick lookup
  const folderMap = useMemo(() => {
    const map = new Map<string, CampaignNoteFolder>();
    for (const f of folders) map.set(f.id, f);
    return map;
  }, [folders]);

  // Filter notes by selected folder + search query
  const filteredNotes = useMemo(() => {
    let result = selectedFolderId === null
      ? notes
      : notes.filter((n) => n.folder_id === selectedFolderId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((n) =>
        n.title.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [notes, selectedFolderId, searchQuery]);

  // Player notes (notes from non-DM campaign members) — read-only for DM
  const playerNotes = useMemo(() => {
    if (!dmUserId) return [];
    return notes.filter((n) => n.user_id !== dmUserId && !n.is_shared);
  }, [notes, dmUserId]);

  // Links per note for quick lookup
  const linksByNote = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const link of npcLinks) {
      const existing = map.get(link.note_id) ?? [];
      existing.push(link.npc_id);
      map.set(link.note_id, existing);
    }
    return map;
  }, [npcLinks]);

  // NPC map for quick name lookup
  const npcMap = useMemo(() => {
    const map = new Map<string, CampaignNpc>();
    for (const npc of campaignNpcs) map.set(npc.id, npc);
    return map;
  }, [campaignNpcs]);

  // Per-note mention map built from campaign_mind_map_edges. Each note gets
  // the ids of entities it mentions, bucketed by type (Fase 3e). NPCs show
  // up here when the edge exists; legacy note_npc_links is the fallback for
  // pre-mig 153 data and remains in `linksByNote` above.
  //
  // Perf note: this index depends ONLY on `campaignEdges`. Previously it
  // also listed `notes` as a dependency, which caused a full rebuild on
  // every keystroke of a note title (setNotes fires on each character). One
  // pass over edges — O(edges) — instead of O(notes × edges × 4).
  const mentionsByNote = useMemo<
    Map<
      string,
      {
        locations: string[];
        factions: string[];
        quests: string[];
        npcs: string[];
      }
    >
  >(() => {
    const map = new Map<
      string,
      { locations: string[]; factions: string[]; quests: string[]; npcs: string[] }
    >();
    const ensure = (noteId: string) => {
      let bucket = map.get(noteId);
      if (!bucket) {
        bucket = { locations: [], factions: [], quests: [], npcs: [] };
        map.set(noteId, bucket);
      }
      return bucket;
    };
    for (const edge of campaignEdges) {
      if (edge.relationship !== "mentions") continue;
      if (edge.source_type !== "note") continue;
      const bucket = ensure(edge.source_id);
      switch (edge.target_type) {
        case "location":
          bucket.locations.push(edge.target_id);
          break;
        case "faction":
          bucket.factions.push(edge.target_id);
          break;
        case "quest":
          bucket.quests.push(edge.target_id);
          break;
        case "npc":
          bucket.npcs.push(edge.target_id);
          break;
        default:
          // ignore edge types that the UI doesn't render yet.
          break;
      }
    }
    return map;
  }, [campaignEdges]);

  /**
   * Lookup map consumed by MentionChipRenderer + stripMentionsToPlainText
   * to resolve `@[type:uuid]` tokens into readable names. Rebuilt whenever
   * any underlying entity list changes; the map is tiny (one entry per
   * entity) so per-keystroke rebuilds are acceptable.
   */
  const mentionLookup = useMemo<MentionLookupMap>(() => {
    const map = new Map<
      string,
      { type: "npc" | "location" | "faction" | "quest"; id: string; name: string }
    >();
    for (const n of campaignNpcs) {
      map.set(`npc:${n.id}`, { type: "npc", id: n.id, name: n.name });
    }
    for (const l of campaignLocations) {
      map.set(`location:${l.id}`, { type: "location", id: l.id, name: l.name });
    }
    for (const f of campaignFactions) {
      map.set(`faction:${f.id}`, { type: "faction", id: f.id, name: f.name });
    }
    for (const q of campaignQuests) {
      map.set(`quest:${q.id}`, { type: "quest", id: q.id, name: q.title });
    }
    return map;
  }, [campaignNpcs, campaignLocations, campaignFactions, campaignQuests]);

  /**
   * Reconcile the set of `mentions` edges from a note to entities of a
   * given type. Idempotent via upsertEntityLink. Reads fresh edges for the
   * note from Supabase before diffing so rapid sequential edits never diff
   * against stale cached snapshots (the same class of bug as NpcList's
   * syncNpcEdges; see commit BL-2 fix).
   */
  const syncNoteMentions = useCallback(
    async (
      noteId: string,
      entityType: Exclude<EntityType, "note" | "session" | "encounter" | "player" | "bag_item">,
      nextIds: string[],
      /**
       * Optional: IDs of this entity type that are also referenced inline
       * via `@[type:uuid]` tokens in the note body. syncNoteMentions must
       * not delete the edge for a ref that the inline text still implies
       * (and vice versa in syncTextMentions via its preserveRefs param).
       * Without this merge, removing an explicit chip that matches an
       * inline mention would orphan the inline chip on next load.
       */
      preserveIdsFromText: ReadonlyArray<string> = [],
    ) => {
      let freshEdges: EntityLink[] = [];
      try {
        freshEdges = await listEntityLinks(campaignId, {
          type: "note",
          id: noteId,
        });
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: `syncNoteMentions.${entityType}.fetchFresh`,
          category: "network",
        });
        return;
      }

      const current = selectCounterpartyIds(
        freshEdges,
        { type: "note", id: noteId },
        {
          direction: "outgoing",
          counterpartyType: entityType,
          relationship: "mentions",
        },
      );
      const target = new Set(nextIds);
      // Desired set for retention = chip selection ∪ inline-text refs.
      const preserved = new Set<string>(target);
      for (const id of preserveIdsFromText) preserved.add(id);
      const existing = new Set(current);

      const additions: EntityLink[] = [];
      const removedIds: string[] = [];
      const tasks: Array<Promise<"added" | "removed" | void>> = [];

      for (const id of target) {
        if (!existing.has(id)) {
          tasks.push(
            upsertEntityLink(
              campaignId,
              { type: "note", id: noteId },
              { type: entityType, id },
              "mentions",
            ).then((edge) => {
              additions.push(edge);
              return "added" as const;
            }),
          );
        }
      }
      for (const id of existing) {
        if (!preserved.has(id)) {
          const edgeId = findEdgeId(
            freshEdges,
            { type: "note", id: noteId },
            { type: entityType, id },
            "mentions",
          );
          if (edgeId) {
            tasks.push(
              unlinkEntities(edgeId).then(() => {
                removedIds.push(edgeId);
                return "removed" as const;
              }),
            );
          }
        }
      }

      const results = await Promise.allSettled(tasks);
      for (const r of results) {
        if (r.status === "rejected") {
          captureError(r.reason, {
            component: "CampaignNotes",
            action: `syncNoteMentions.${entityType}.task`,
            category: "network",
          });
        }
      }

      // Reflect ONLY the mutations that actually landed. Failed tasks
      // never contributed to `additions` / `removedIds` so the UI stays
      // consistent with the DB even when some writes failed.
      setCampaignEdges((prev) => {
        const kept = prev.filter(
          (e) => !removedIds.includes(e.id) && !additions.some((a) => a.id === e.id),
        );
        return [...kept, ...additions];
      });
    },
    [campaignId],
  );

  const handleLinkNpc = useCallback(
    async (noteId: string, npcId: string) => {
      // Dual-write strategy: write the edge (new source of truth) FIRST. If
      // that succeeds, write the legacy row. If legacy fails, rollback the
      // edge so the two stores never diverge. Optimistic UI state is
      // committed only after both writes land.
      let edge: Awaited<ReturnType<typeof upsertEntityLink>> | null = null;
      try {
        edge = await upsertEntityLink(
          campaignId,
          { type: "note", id: noteId },
          { type: "npc", id: npcId },
          "mentions",
        );
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "linkNpc.edgeWrite",
          category: "network",
        });
        return;
      }

      try {
        const link = await linkNoteToNpc(noteId, npcId);
        setNpcLinks((prev) => [...prev, link]);
        setCampaignEdges((prev) => {
          if (edge && prev.some((e) => e.id === edge.id)) return prev;
          return edge ? [...prev, edge] : prev;
        });
      } catch (err) {
        // Legacy write failed — roll back the edge we just wrote so the two
        // stores stay aligned. Best-effort: if rollback throws, capture and
        // surface both errors so ops can investigate.
        captureError(err, {
          component: "CampaignNotes",
          action: "linkNpc.legacyWrite",
          category: "network",
        });
        if (edge) {
          try {
            await unlinkEntities(edge.id);
          } catch (rollbackErr) {
            captureError(rollbackErr, {
              component: "CampaignNotes",
              action: "linkNpc.rollback",
              category: "network",
            });
          }
        }
      }
    },
    [campaignId],
  );

  const handleUnlinkNpc = useCallback(
    async (noteId: string, npcId: string) => {
      // AC-3c-04: optimistic-deferred unlink with undo toast.
      //
      // Chip disappears immediately, both writes (edge + legacy note_npc_links)
      // are deferred 5s and consolidated into a single toast with Desfazer.
      // If the user clicks undo, we restore the exact rows we captured —
      // zero round-trip. If the TTL expires, the hook commits edge delete;
      // onCommit then deletes the legacy row. Failure surfaces via hook toast.
      //
      // Stale-closure caveat: `edge` and `legacyLink` are captured here by
      // reference. If a realtime subscription or manual re-fetch replaces
      // `campaignEdges`/`npcLinks` during the 5s window (e.g. another tab
      // edits the note and broadcasts), undo will re-insert the snapshot we
      // captured, not the post-mutation row. In practice this is bounded:
      // the undo window is 5s and dedup on `edge.id` prevents duplicates.
      // Accepting the drift for simplicity; the alternative (re-fetch on
      // undo click) would defeat the zero-round-trip guarantee.
      const edge = campaignEdges.find(
        (e) =>
          e.relationship === "mentions" &&
          e.source_type === "note" &&
          e.source_id === noteId &&
          e.target_type === "npc" &&
          e.target_id === npcId,
      );
      const legacyLink = npcLinks.find(
        (l) => l.note_id === noteId && l.npc_id === npcId,
      );

      // Nothing to remove — both stores already agree there's no link.
      if (!edge && !legacyLink) return;

      // Optimistic UI removal (both stores) — mirrored by onUndo.
      if (edge) {
        setCampaignEdges((prev) => prev.filter((e) => e.id !== edge.id));
      }
      if (legacyLink) {
        setNpcLinks((prev) =>
          prev.filter((l) => !(l.note_id === noteId && l.npc_id === npcId)),
        );
      }

      // Edge is the primary source of truth; if missing, delete legacy row
      // directly (no undo window — there's nothing for the hook to commit).
      // This covers pre-migration notes that still only live in note_npc_links.
      if (!edge) {
        if (legacyLink) {
          try {
            await unlinkNoteFromNpc(noteId, npcId);
          } catch (err) {
            // Restore legacy link; no edge to restore.
            setNpcLinks((prev) => [...prev, legacyLink]);
            captureError(err, {
              component: "CampaignNotes",
              action: "unlinkNpc.legacyOnlyDelete",
              category: "network",
            });
          }
        }
        return;
      }

      scheduleUnlinkUndo({
        edgeId: edge.id,
        onUndo: () => {
          setCampaignEdges((prev) =>
            prev.some((e) => e.id === edge.id) ? prev : [...prev, edge],
          );
          if (legacyLink) {
            setNpcLinks((prev) =>
              prev.some(
                (l) => l.note_id === noteId && l.npc_id === npcId,
              )
                ? prev
                : [...prev, legacyLink],
            );
          }
        },
        onCommit: legacyLink
          ? async () => {
              try {
                await unlinkNoteFromNpc(noteId, npcId);
              } catch (err) {
                // Edge is already gone — legacy row sticking around is the
                // safer failure mode (reverse-lookup dedups by note id at
                // next mount). Surface for ops without rolling back UI.
                captureError(err, {
                  component: "CampaignNotes",
                  action: "unlinkNpc.legacyCommit",
                  category: "network",
                });
                throw err;
              }
            }
          : undefined,
      });
    },
    [campaignEdges, npcLinks, scheduleUnlinkUndo],
  );

  // Flush pending saves and cleanup debounce timers on unmount
  const notesRef = useRef(notes);
  notesRef.current = notes;
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.keys(timers).forEach((id) => {
        clearTimeout(timers[id]);
        const note = notesRef.current.find((n) => n.id === id);
        if (note) {
          saveNote(id, { title: note.title, content: note.content });
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-focus a note when the URL carries ?noteId=. Two-phase flow so
  // repeat-clicks on the briefing CTA work even when the URL doesn't
  // change: we key the "handled" state on the searchParams object identity
  // (Next.js gives a fresh instance on every navigation), not on the
  // noteId string alone. Review finding F14.
  const focusedNoteHandledRef = useRef<URLSearchParams | null>(null);
  useEffect(() => {
    if (!focusedNoteId || !searchParams) return;
    if (focusedNoteHandledRef.current === searchParams) return;
    if (!notes.some((n) => n.id === focusedNoteId)) return;
    focusedNoteHandledRef.current = searchParams;
    setExpandedIds((prev) => {
      if (prev.has(focusedNoteId)) return prev;
      const next = new Set(prev);
      next.add(focusedNoteId);
      return next;
    });
    // Double RAF so the scroll targets the EXPANDED layout, not the
    // collapsed row that existed at commit time. First RAF lands after
    // React flushes the setExpandedIds commit; second RAF lands after
    // the browser paints the expanded block at its full height. Review
    // finding F15.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(
          `[data-note-id="${CSS.escape(focusedNoteId)}"]`,
        );
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }, [focusedNoteId, notes, searchParams]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const saveNote = useCallback(
    async (id: string, fields: { title?: string; content?: string; note_type?: string }) => {
      setSaveStatus((prev) => ({ ...prev, [id]: "saving" }));

      try {
        const { error } = await supabase
          .from("campaign_notes")
          .update({ ...fields, updated_at: new Date().toISOString() })
          .eq("id", id);

        if (error) throw error;

        // Reconcile `mentions` edges with inline @[type:uuid] tokens in the
        // note body. Only runs when content was part of this save so unrelated
        // saves (title-only, note_type toggle) don't re-walk the text. Errors
        // are logged but don't block the save completion toast.
        //
        // preserveRefs = explicit chip-selector state for this note, so that
        // removing a chip-only ref isn't double-deleted by this text sync
        // (the symmetric guard lives in syncNoteMentions' preserveIdsFromText
        // param). The two sources are unioned as "desired final edges".
        if (fields.content !== undefined) {
          try {
            const chipState = mentionsByNote.get(id);
            const preserveRefs: Array<{ type: MentionEntityType; id: string }> = [];
            if (chipState) {
              for (const nid of chipState.npcs) preserveRefs.push({ type: "npc", id: nid });
              for (const lid of chipState.locations) preserveRefs.push({ type: "location", id: lid });
              for (const fid of chipState.factions) preserveRefs.push({ type: "faction", id: fid });
              for (const qid of chipState.quests) preserveRefs.push({ type: "quest", id: qid });
            }
            const { added, removedEdgeIds } = await syncTextMentions(
              campaignId,
              { type: "note", id },
              fields.content,
              campaignEdges,
              preserveRefs,
            );
            if (added.length > 0 || removedEdgeIds.length > 0) {
              setCampaignEdges((prev) => {
                const kept = prev.filter(
                  (e) => !removedEdgeIds.includes(e.id) && !added.some((a) => a.id === e.id),
                );
                return [...kept, ...added];
              });
            }
          } catch (syncErr) {
            captureError(syncErr, {
              component: "CampaignNotes",
              action: "saveNote.syncTextMentions",
              category: "network",
            });
          }
        }

        setSaveStatus((prev) => ({ ...prev, [id]: "saved" }));
        setTimeout(() => {
          setSaveStatus((prev) => {
            if (prev[id] === "saved") return { ...prev, [id]: "idle" };
            return prev;
          });
        }, 2000);
      } catch (err) {
        setSaveStatus((prev) => ({ ...prev, [id]: "idle" }));
        captureError(err, {
          component: "CampaignNotes",
          action: "saveNote",
          category: "network",
        });
      }
    },
    [supabase, campaignId, campaignEdges, mentionsByNote],
  );

  const debouncedSave = useCallback(
    (id: string, fields: { title?: string; content?: string; note_type?: string }) => {
      if (debounceTimers.current[id]) {
        clearTimeout(debounceTimers.current[id]);
      }
      debounceTimers.current[id] = setTimeout(() => {
        saveNote(id, fields);
        delete debounceTimers.current[id];
      }, 800);
    },
    [saveNote],
  );

  const handleFieldChange = useCallback(
    (id: string, field: "title" | "content" | "note_type", value: string) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, [field]: value } : n)),
      );
      debouncedSave(id, { [field]: value });
    },
    [debouncedSave],
  );

  const createNote = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("campaign_notes")
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          folder_id: selectedFolderId,
          is_shared: false,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setNotes((prev) => [data, ...prev]);
        setExpandedIds((prev) => new Set(prev).add(data.id));
        // XP: DM created note
        requestXpGrant("dm_note_created", "dm", { note_id: data.id });
      }
    } catch (err) {
      captureError(err, {
        component: "CampaignNotes",
        action: "createNote",
        category: "network",
      });
    }
  }, [campaignId, supabase, selectedFolderId]);

  const deleteNote = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from("campaign_notes")
          .delete()
          .eq("id", id);

        if (error) throw error;
        setNotes((prev) => prev.filter((n) => n.id !== id));
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "deleteNote",
          category: "network",
        });
      } finally {
        setDeleteTarget(null);
      }
    },
    [supabase],
  );

  const handleToggleShared = useCallback(
    async (noteId: string, isShared: boolean) => {
      try {
        await toggleNoteShared(noteId, isShared);
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, is_shared: isShared } : n)),
        );
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "toggleShared",
          category: "network",
        });
      }
    },
    [],
  );

  const handleMoveToFolder = useCallback(
    async (noteId: string, folderId: string | null) => {
      try {
        await moveNoteToFolder(noteId, folderId);
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId ? { ...n, folder_id: folderId } : n,
          ),
        );
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "moveToFolder",
          category: "network",
        });
      }
    },
    [],
  );

  // Folder CRUD handlers
  const handleCreateFolder = useCallback(
    async (name: string, parentId?: string | null) => {
      try {
        const newFolder = await createFolder(campaignId, name, parentId);
        setFolders((prev) => [...prev, newFolder]);
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "createFolder",
          category: "network",
        });
      }
    },
    [campaignId],
  );

  const handleRenameFolder = useCallback(
    async (folderId: string, name: string) => {
      try {
        await updateFolder(folderId, name);
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? { ...f, name } : f)),
        );
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "renameFolder",
          category: "network",
        });
      }
    },
    [],
  );

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      try {
        await deleteFolder(folderId);
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
        // Unfiled notes that were in the deleted folder
        setNotes((prev) =>
          prev.map((n) =>
            n.folder_id === folderId ? { ...n, folder_id: null } : n,
          ),
        );
        if (selectedFolderId === folderId) setSelectedFolderId(null);
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "deleteFolder",
          category: "network",
        });
      }
    },
    [selectedFolderId],
  );

  if (loading) {
    return <NotesListSkeleton count={2} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("title")}
        </h2>
        {isOwner && (
          <Button
            variant="goldOutline"
            size="sm"
            onClick={createNote}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {t("new_note")}
          </Button>
        )}
      </div>

      {/* Search */}
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={t("search_placeholder")}
        className="bg-surface-tertiary border-white/[0.15] text-foreground placeholder:text-muted-foreground/40 min-h-[44px] rounded-lg"
      />

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Sidebar: Folder tree */}
        <div className="w-full sm:w-48 sm:shrink-0 space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
            {t("folders")}
          </h3>
          <NotesFolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            noteCounts={noteCounts}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            isOwner={isOwner}
          />
        </div>

        {/* Main: Notes list */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Empty state */}
          {filteredNotes.length === 0 && (
            <div className="rounded-lg border border-white/[0.04] bg-card p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-amber-400/60" />
              </div>
              <p className="text-muted-foreground text-sm">
                {t("no_notes")}
              </p>
              {isOwner && (
                <>
                  <p className="text-muted-foreground/60 text-xs mt-1">
                    {t("create_first")}
                  </p>
                  <Button
                    variant="goldOutline"
                    size="sm"
                    onClick={createNote}
                    className="mt-4 gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    {t("new_note")}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Note cards */}
          {filteredNotes.map((note) => {
            const isExpanded = expandedIds.has(note.id);
            const status = saveStatus[note.id] ?? "idle";
            const optionsOpen = optionsOpenIds.has(note.id);

            return (
              <div
                key={note.id}
                data-note-id={note.id}
                className="rounded-xl border border-white/[0.04] bg-card shadow-card overflow-hidden transition-all duration-200"
              >
                {/* Collapsed header */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(note.id)}
                  className="flex w-full items-center gap-3 p-4 text-left hover:bg-accent/5 transition-colors min-h-[48px]"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {note.title || t("untitled")}
                      </p>
                      {/* Visibility badge */}
                      {note.is_shared ? (
                        <span className="flex items-center gap-0.5 text-xs text-emerald-400" title={t("shared_hint")}>
                          <Eye className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground/50" title={t("private_hint")}>
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                      {note.note_type && note.note_type !== "general" && (
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            NOTE_TYPE_CONFIG.find((c) => c.key === note.note_type)?.dotColor ?? "bg-blue-400"
                          }`}
                          title={t(`note_type_${note.note_type}`)}
                        />
                      )}
                    </div>
                    {!isExpanded && note.content && (() => {
                      const preview = stripMentionsToPlainText(note.content, mentionLookup);
                      const firstLine = preview.split("\n")[0] ?? "";
                      const truncated = firstLine.slice(0, 80);
                      if (!truncated) return null;
                      return (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {truncated}
                          {firstLine.length > 80 ? "..." : ""}
                        </p>
                      );
                    })()}
                    {/* Linked NPC chips in collapsed view */}
                    {!isExpanded && (linksByNote.get(note.id) ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(linksByNote.get(note.id) ?? []).map((npcId) => {
                          const npc = npcMap.get(npcId);
                          if (!npc) return null;
                          return (
                            <span
                              key={npcId}
                              className="inline-flex items-center bg-purple-400/10 text-purple-400 rounded-full px-2 py-0.5 text-xs"
                            >
                              {npc.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Save indicator */}
                  {status !== "idle" && (
                    <span className={`text-xs shrink-0 transition-colors ${status === "saving" ? "text-amber-400" : "text-emerald-400"}`}>
                      {status === "saving" ? t("saving") : t("saved")}
                    </span>
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <Input
                      value={note.title}
                      onChange={(e) =>
                        handleFieldChange(note.id, "title", e.target.value)
                      }
                      placeholder={t("title_placeholder")}
                      className="font-medium"
                      data-testid={`note-title-${note.id}`}
                    />

                    {/* Note type chips — collapsible to reduce visual noise */}
                    {isOwner && (() => {
                      const isOpen = optionsOpenIds.has(note.id);
                      const activeConfig = NOTE_TYPE_CONFIG.find(({ key }) => key === (note.note_type || "general"));
                      const ActiveIcon = activeConfig?.icon ?? FileText;
                      return (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => setOptionsOpenIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(note.id)) next.delete(note.id); else next.add(note.id);
                              return next;
                            })}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium transition-all ${activeConfig?.activeColor ?? "text-muted-foreground/60 border-white/[0.04]"}`}
                          >
                            <ActiveIcon className="w-3 h-3" />
                            {t(`note_type_${note.note_type || "general"}`)}
                            <Settings2 className="w-2.5 h-2.5 opacity-40" />
                          </button>
                          {isOpen && (
                            <div className="flex flex-wrap gap-1.5">
                              {NOTE_TYPE_CONFIG.map(({ key, icon: TypeIcon, color, activeColor }) => {
                                const isActive = (note.note_type || "general") === key;
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                      handleFieldChange(note.id, "note_type", key);
                                      setOptionsOpenIds((prev) => { const next = new Set(prev); next.delete(note.id); return next; });
                                    }}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium transition-all ${
                                      isActive ? activeColor : color
                                    }`}
                                  >
                                    <TypeIcon className="w-3 h-3" />
                                    {t(`note_type_${key}`)}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <EntityMentionEditor
                      value={note.content}
                      onChange={(next) =>
                        handleFieldChange(note.id, "content", next)
                      }
                      placeholder={t("content_placeholder")}
                      campaignId={campaignId}
                      rows={8}
                      data-testid={`note-content-${note.id}`}
                    />

                    {/* More options toggle */}
                    <button
                      type="button"
                      onClick={() => setOptionsOpenIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(note.id)) next.delete(note.id);
                        else next.add(note.id);
                        return next;
                      })}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1"
                    >
                      <Settings2 className="w-3 h-3" />
                      {optionsOpen ? t("less_options") : t("more_options")}
                      <ChevronDown className={`w-3 h-3 transition-transform ${optionsOpen ? "rotate-180" : ""}`} />
                    </button>

                    {optionsOpen && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* NPC tag selector */}
                        {isOwner && campaignNpcs.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              {tLinks("related_npcs")}
                            </p>
                            <NpcTagSelector
                              availableNpcs={campaignNpcs}
                              linkedNpcIds={linksByNote.get(note.id) ?? []}
                              onLink={(npcId) => handleLinkNpc(note.id, npcId)}
                              onUnlink={(npcId) => handleUnlinkNpc(note.id, npcId)}
                            />
                          </div>
                        )}

                        {/* Location / Faction / Quest selectors — Fase 3e
                            (only for the owner; players cannot mutate edges) */}
                        {isOwner && campaignLocations.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              {t("related_locations")}
                            </p>
                            <EntityTagSelector
                              type="location"
                              availableItems={campaignLocations.map((l) => ({
                                id: l.id,
                                name: l.name,
                              }))}
                              selectedIds={
                                mentionsByNote.get(note.id)?.locations ?? []
                              }
                              onChange={(ids) => {
                                const inline = extractMentionRefs(note.content)
                                  .filter((r) => r.type === "location")
                                  .map((r) => r.id);
                                void syncNoteMentions(note.id, "location", ids, inline);
                              }}
                              testIdPrefix={`note-locations-${note.id}`}
                            />
                          </div>
                        )}

                        {isOwner && campaignFactions.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              {t("related_factions")}
                            </p>
                            <EntityTagSelector
                              type="faction"
                              availableItems={campaignFactions.map((f) => ({
                                id: f.id,
                                name: f.name,
                              }))}
                              selectedIds={
                                mentionsByNote.get(note.id)?.factions ?? []
                              }
                              onChange={(ids) => {
                                const inline = extractMentionRefs(note.content)
                                  .filter((r) => r.type === "faction")
                                  .map((r) => r.id);
                                void syncNoteMentions(note.id, "faction", ids, inline);
                              }}
                              testIdPrefix={`note-factions-${note.id}`}
                            />
                          </div>
                        )}

                        {isOwner && campaignQuests.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              {t("related_quests")}
                            </p>
                            <EntityTagSelector
                              type="quest"
                              availableItems={campaignQuests.map((q) => ({
                                id: q.id,
                                name: q.title,
                              }))}
                              selectedIds={
                                mentionsByNote.get(note.id)?.quests ?? []
                              }
                              onChange={(ids) => {
                                const inline = extractMentionRefs(note.content)
                                  .filter((r) => r.type === "quest")
                                  .map((r) => r.id);
                                void syncNoteMentions(note.id, "quest", ids, inline);
                              }}
                              testIdPrefix={`note-quests-${note.id}`}
                            />
                          </div>
                        )}

                        {/* Linked NPC chips (read-only for non-owners) */}
                        {!isOwner && (linksByNote.get(note.id) ?? []).length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground mr-1">
                              {tLinks("related_npcs")}:
                            </span>
                            {(linksByNote.get(note.id) ?? []).map((npcId) => {
                              const npc = npcMap.get(npcId);
                              if (!npc) return null;
                              return (
                                <span
                                  key={npcId}
                                  className="inline-flex items-center bg-purple-400/10 text-purple-400 rounded-full px-2 py-0.5 text-xs"
                                >
                                  {npc.name}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Controls row */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-4">
                            {/* Shared toggle */}
                            {isOwner && (
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <Switch
                                  checked={note.is_shared}
                                  onCheckedChange={(checked) =>
                                    handleToggleShared(note.id, checked)
                                  }
                                  data-testid={`note-shared-toggle-${note.id}`}
                                />
                                <span className={note.is_shared ? "text-emerald-400" : "text-muted-foreground"}>
                                  {note.is_shared ? t("shared") : t("private")}
                                </span>
                                <span className="text-muted-foreground/50">
                                  {note.is_shared ? t("shared_hint") : t("private_hint")}
                                </span>
                              </label>
                            )}

                            {/* Folder selector */}
                            {isOwner && folders.length > 0 && (
                              <select
                                value={note.folder_id ?? ""}
                                onChange={(e) =>
                                  handleMoveToFolder(
                                    note.id,
                                    e.target.value || null,
                                  )
                                }
                                className="text-xs bg-surface-tertiary border border-input rounded px-2 py-1 text-foreground"
                                data-testid={`note-folder-select-${note.id}`}
                              >
                                <option value="">{t("unfiled")}</option>
                                {folders.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.name}
                                  </option>
                                ))}
                              </select>
                            )}

                            <span className="text-xs text-muted-foreground">
                              {new Date(note.updated_at).toLocaleDateString(
                                undefined,
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>

                          {isOwner && (
                            <Button
                              variant="destructiveSubtle"
                              size="sm"
                              onClick={() => setDeleteTarget(note.id)}
                              className="gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {t("delete_note")}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

        {/* Player Notes section (DM read-only view) — only shown in "All notes" context, not inside a folder */}
        {isOwner && playerNotes.length > 0 && selectedFolderId === null && (
          <div className="mt-4 border-t border-white/[0.04] pt-4">
            <button
              type="button"
              onClick={() => setPlayerNotesExpanded((v) => !v)}
              className="flex w-full items-center gap-2 text-left mb-2"
            >
              {playerNotesExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("player_notes_section")}
              </span>
              <span className="ml-1 text-xs text-muted-foreground/60">({playerNotes.length})</span>
            </button>

            {playerNotesExpanded && (
              <div className="space-y-2 pl-6">
                {playerNotes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-white/[0.04] bg-surface-tertiary px-3 py-2.5 space-y-1"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="inline-flex items-center rounded-full bg-amber-400/10 px-2 py-0.5 text-xs text-amber-400">
                        {t("player_notes_by", { name: playerNames[note.user_id ?? ""] ?? "Player" })}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">
                        {new Date(note.updated_at).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                    {note.content && (
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        <MentionChipRenderer
                          text={note.content}
                          lookup={mentionLookup}
                          onChipClick={handleChipNavigate}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_note")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_note_confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteNote(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete_note")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
