"use client";

/**
 * QuickSwitcher — global command palette for the Campaign HQ (Onda 6b).
 *
 * Activation:
 *   - Ctrl+K (Windows/Linux) / Cmd+K (macOS) anywhere inside a campaign.
 *   - Ignored when focus is already inside an input / textarea / contentEditable
 *     so DMs typing inside NotesEditor / NPC form fields keep the key combo.
 *   - Esc closes. Click-away via dialog overlay closes.
 *
 * Search:
 *   - Debounced 120 ms. Unified fuzzy substring over NPC name, Location name,
 *     Faction name, Note title, Quest title.
 *   - Data source is the existing campaign-scoped client hooks — no new RPC
 *     to avoid adding latency paths. Lookups are O(n) in memory, which is
 *     fine up to ~2k combined entries (comfortably covers DM campaigns).
 *   - Results grouped by type, header + count per group.
 *   - Keyboard: ArrowUp/ArrowDown navigate, Enter opens, Esc closes.
 *
 * Navigation:
 *   - On pick, routes to `?section=mindmap&focus={type}-{id}` so the map
 *     opens with the entity highlighted. Reuses the Onda 6a focus mode.
 *   - Session-scoped "recent" list persists up to 8 picks per campaign under
 *     `pocketdm:quick-switcher-recent:{campaignId}` via localStorage.
 *
 * Auth + RLS: renders only for DM owners on the Campaign HQ, so data is
 * already scoped by the list hooks. No guest/anon path.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Users, MapPin, Flag, FileText, Scroll, X } from "lucide-react";
import { useCampaignNpcs } from "@/lib/hooks/use-campaign-npcs";
import { useCampaignLocations } from "@/lib/hooks/use-campaign-locations";
import { useCampaignFactions } from "@/lib/hooks/use-campaign-factions";
import { useCampaignQuests } from "@/lib/hooks/use-campaign-quests";
import { useCampaignNotesIndex } from "@/lib/hooks/useCampaignNotesIndex";

type ResultType = "npc" | "location" | "faction" | "note" | "quest";

interface SearchResult {
  id: string;
  type: ResultType;
  label: string;
  /** Optional subtitle (e.g., breadcrumb or badge text). */
  subtitle?: string;
}

const RESULT_ICONS: Record<ResultType, React.ComponentType<{ className?: string }>> = {
  npc: Users,
  location: MapPin,
  faction: Flag,
  note: FileText,
  quest: Scroll,
};

const RESULT_COLORS: Record<ResultType, string> = {
  npc: "text-amber-300",
  location: "text-emerald-300",
  faction: "text-violet-300",
  note: "text-slate-300",
  quest: "text-yellow-300",
};

const DISPLAY_ORDER: ResultType[] = [
  "npc",
  "location",
  "faction",
  "note",
  "quest",
];

const RECENT_STORAGE_PREFIX = "pocketdm:quick-switcher-recent";
const RECENT_LIMIT = 8;
const DEBOUNCE_MS = 120;

interface QuickSwitcherProps {
  campaignId: string;
  /** When true, initial mount attaches the Ctrl+K keyboard shortcut. */
  enableShortcut?: boolean;
}

export function QuickSwitcher({
  campaignId,
  enableShortcut = true,
}: QuickSwitcherProps) {
  const t = useTranslations("entity_graph");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Data — empty arrays while loading, which is fine: the empty state takes
  // over and the user can still type to queue a search.
  const { npcs } = useCampaignNpcs(campaignId);
  const { locations } = useCampaignLocations(campaignId);
  const { factions } = useCampaignFactions(campaignId);
  const { quests } = useCampaignQuests(campaignId);
  const { notes } = useCampaignNotesIndex(campaignId);

  // Recent list (localStorage, per campaign). Cap to RECENT_LIMIT.
  const [recent, setRecent] = useState<SearchResult[]>([]);
  const recentKey = useMemo(
    () => `${RECENT_STORAGE_PREFIX}:${campaignId}`,
    [campaignId],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(recentKey);
      if (!raw) {
        setRecent([]);
        return;
      }
      const parsed = JSON.parse(raw) as SearchResult[];
      if (Array.isArray(parsed)) {
        setRecent(parsed.filter(Boolean).slice(0, RECENT_LIMIT));
      }
    } catch {
      setRecent([]);
    }
  }, [recentKey]);

  const pushRecent = useCallback(
    (result: SearchResult) => {
      setRecent((prev) => {
        const next = [
          result,
          ...prev.filter((r) => !(r.id === result.id && r.type === result.type)),
        ].slice(0, RECENT_LIMIT);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(recentKey, JSON.stringify(next));
          } catch {
            // ignore quota / private-mode failures
          }
        }
        return next;
      });
    },
    [recentKey],
  );

  // Debounce the raw query so we don't thrash the filter on every keystroke.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setQuery(rawQuery.trim().toLowerCase());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [rawQuery]);

  // Keyboard shortcut: Ctrl+K / Cmd+K to open, ignoring typing contexts.
  useEffect(() => {
    if (!enableShortcut) return;
    const handler = (e: KeyboardEvent) => {
      const isShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
      if (!isShortcut) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        if (target.isContentEditable) return;
      }
      e.preventDefault();
      setOpen((current) => !current);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enableShortcut]);

  // Focus the input whenever the palette opens. The setTimeout defers past
  // the fade-in animation so the cursor lands reliably.
  useEffect(() => {
    if (!open) {
      setRawQuery("");
      setQuery("");
      setActiveIndex(0);
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  const flatResults = useMemo<SearchResult[]>(() => {
    if (!query) return [];
    const matches = (name: string) => name.toLowerCase().includes(query);
    const out: SearchResult[] = [];
    for (const n of npcs) {
      if (matches(n.name)) out.push({ id: n.id, type: "npc", label: n.name });
    }
    for (const l of locations) {
      if (matches(l.name)) out.push({ id: l.id, type: "location", label: l.name });
    }
    for (const f of factions) {
      if (matches(f.name)) out.push({ id: f.id, type: "faction", label: f.name });
    }
    for (const note of notes) {
      if (matches(note.title)) out.push({ id: note.id, type: "note", label: note.title });
    }
    for (const q of quests) {
      if (matches(q.title)) out.push({ id: q.id, type: "quest", label: q.title });
    }
    return out;
  }, [query, npcs, locations, factions, notes, quests]);

  const displayedResults = query ? flatResults : recent;

  const grouped = useMemo(() => {
    const by = new Map<ResultType, SearchResult[]>();
    for (const r of displayedResults) {
      const bucket = by.get(r.type) ?? [];
      bucket.push(r);
      by.set(r.type, bucket);
    }
    const ordered: Array<{ type: ResultType; items: SearchResult[] }> = [];
    for (const type of DISPLAY_ORDER) {
      const items = by.get(type);
      if (items && items.length > 0) ordered.push({ type, items });
    }
    return ordered;
  }, [displayedResults]);

  const handlePick = useCallback(
    (result: SearchResult) => {
      pushRecent(result);
      setOpen(false);
      router.push(
        `/app/campaigns/${campaignId}?section=mindmap&focus=${result.type}-${result.id}`,
      );
    },
    [campaignId, pushRecent, router],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) =>
          displayedResults.length === 0
            ? 0
            : Math.min(i + 1, displayedResults.length - 1),
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const picked = displayedResults[activeIndex];
        if (picked) handlePick(picked);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    },
    [displayedResults, activeIndex, handlePick],
  );

  // Reset active index on query change so we don't highlight past results.
  useEffect(() => {
    setActiveIndex(0);
  }, [query, recent.length]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("quick_switcher_title")}
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 backdrop-blur-sm pt-24 animate-in fade-in duration-150"
      data-testid="quick-switcher-dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-xl mx-4 rounded-xl border border-amber-400/20 bg-card shadow-[0_10px_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden animate-in slide-in-from-top-2 duration-150">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("quick_switcher_placeholder")}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            data-testid="quick-switcher-input"
            aria-activedescendant={
              displayedResults[activeIndex]
                ? `quick-switcher-option-${displayedResults[activeIndex].type}-${displayedResults[activeIndex].id}`
                : undefined
            }
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t("quick_switcher_esc_hint")}
            data-testid="quick-switcher-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {displayedResults.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              {query ? t("quick_switcher_empty") : t("quick_switcher_recent")}
            </p>
          ) : (
            grouped.map(({ type, items }) => (
              <div key={type} className="mb-1">
                <p className="px-4 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  {t(`quick_switcher_group_${type}` as
                    | "quick_switcher_group_npc"
                    | "quick_switcher_group_location"
                    | "quick_switcher_group_faction"
                    | "quick_switcher_group_note"
                    | "quick_switcher_group_quest")}
                </p>
                <ul role="listbox">
                  {items.map((result) => {
                    const flatIndex = displayedResults.findIndex(
                      (r) => r.id === result.id && r.type === result.type,
                    );
                    const Icon = RESULT_ICONS[result.type];
                    const active = flatIndex === activeIndex;
                    return (
                      <li
                        key={`${result.type}-${result.id}`}
                        role="option"
                        aria-selected={active}
                        id={`quick-switcher-option-${result.type}-${result.id}`}
                      >
                        <button
                          type="button"
                          onClick={() => handlePick(result)}
                          onMouseEnter={() =>
                            flatIndex >= 0 && setActiveIndex(flatIndex)
                          }
                          className={`flex w-full items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                            active
                              ? "bg-amber-400/10 text-amber-300"
                              : "text-foreground hover:bg-white/[0.02]"
                          }`}
                          data-testid={`quick-switcher-result-${result.type}-${result.id}`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${RESULT_COLORS[result.type]}`}
                          />
                          <span className="flex-1 truncate">
                            {result.label || result.id.slice(0, 6)}
                          </span>
                          {result.subtitle && (
                            <span className="text-[11px] text-muted-foreground/60 truncate">
                              {result.subtitle}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.04] bg-surface-tertiary/40 text-[10px] text-muted-foreground/70">
          <span>{t("quick_switcher_shortcut")}</span>
          <span>{t("quick_switcher_esc_hint")}</span>
        </div>
      </div>
    </div>
  );
}
