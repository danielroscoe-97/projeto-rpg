"use client";

/**
 * MinhasNotas — long-form mini-wiki sub-tab (Wave 3c D2 / PRD #24).
 *
 * Renders a list of cards (title + tag chips + content preview) plus an
 * inline editor that opens when a card is expanded. CRUD is delegated to
 * `useMinhasNotas` (hook D2); markdown surface comes from `MarkdownEditor`.
 *
 * <!-- parity-intent guest:n/a anon:limited(prompt) auth:full -->
 *
 * Per spec 05-wireframe-diario.md:
 *   §2.2 — list of cards + tag chips, click expands
 *   §4.1 — editor with title + tags + content + auto-save
 *   §7.1 — empty state copy
 *   §8   — anon: shows "Crie conta pra salvar" prompt
 *
 * Anon users without a session_token row still see the empty state + prompt
 * (the hook short-circuits add() with a toast); we surface a persistent
 * banner on top of the list so the message isn't only on user action.
 */

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, Trash2, Tag as TagIcon, Pencil } from "lucide-react";
import { useMinhasNotas, type MinhaNota } from "@/lib/hooks/useMinhasNotas";
import { MarkdownEditor } from "@/components/ui/MarkdownEditor";

interface MinhasNotasProps {
  campaignId: string;
  /**
   * `true` when the player has no auth identity AND no session_token row.
   * Surfaces the upgrade prompt above the list. The hook also short-circuits
   * add() with a toast in this case as a defense-in-depth.
   *
   * TODO(future-wave): unreachable today — the only entry point to this
   * component is `app/app/(with-sidebar)/campaigns/[id]/sheet/page.tsx`,
   * which forces `redirect("/auth/login")` when there is no auth user.
   * Anon players reach combat via `/join/[token]` but never reach the V2
   * Player HQ shell that hosts DiarioTab. This prop + the matching banner
   * are kept as defensive scaffolding so that when a future wave promotes
   * `/join` to surface the V2 shell (see issue #90 P3-2), the RLS-prepared
   * anon flow lights up without further UI churn. Until then, every render
   * receives `isAnonWithoutSession={false}` and the banner stays hidden.
   */
  isAnonWithoutSession?: boolean;
}

export function MinhasNotas({
  campaignId,
  isAnonWithoutSession = false,
}: MinhasNotasProps) {
  const t = useTranslations("player_hq.minhas_notas");
  const { notas, loading, add, update, remove, search } =
    useMinhasNotas(campaignId);

  const [query, setQuery] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Aggregate the universe of tags for the chip filter.
  const allTags = useMemo(() => {
    const set = new Set<string>();
    notas.forEach((n) => n.tags.forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [notas]);

  // Apply text + tag filter (text first via search() helper, then tag).
  const visibleNotas = useMemo(() => {
    let filtered = search(query);
    if (activeTagFilter) {
      filtered = filtered.filter((n) => n.tags.includes(activeTagFilter));
    }
    return filtered;
  }, [search, query, activeTagFilter]);

  const handleNew = async () => {
    setCreating(true);
    const created = await add({
      title: t("default_new_title"),
      content_md: "",
      tags: [],
    });
    setCreating(false);
    if (created) setExpandedId(created.id);
  };

  return (
    <div className="space-y-3" data-testid="minhas-notas-root">
      {isAnonWithoutSession && (
        <div
          className="rounded-lg border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-xs text-amber-300"
          data-testid="minhas-notas-anon-prompt"
          role="note"
        >
          {t("anon_prompt")}
        </div>
      )}

      {/* Top bar — search + new */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search_placeholder")}
            aria-label={t("search_aria")}
            data-testid="minhas-notas-search"
            className="w-full pl-7 pr-2 py-1.5 text-sm bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
          />
        </div>
        <button
          type="button"
          onClick={handleNew}
          disabled={creating}
          data-testid="minhas-notas-new"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/30 hover:bg-amber-400/20 transition-colors disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          {t("new_note")}
        </button>
      </div>

      {/* Tag filter chips (only when there's at least one tag) */}
      {allTags.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-1.5"
          data-testid="minhas-notas-tag-filter"
        >
          <button
            type="button"
            onClick={() => setActiveTagFilter(null)}
            data-testid="minhas-notas-tag-all"
            className={`px-2 py-0.5 rounded-full border text-[11px] transition-colors ${
              activeTagFilter === null
                ? "border-amber-400/60 text-amber-300 bg-amber-400/10"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("tag_all")}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() =>
                setActiveTagFilter((cur) => (cur === tag ? null : tag))
              }
              data-testid={`minhas-notas-tag-${tag}`}
              className={`px-2 py-0.5 rounded-full border text-[11px] transition-colors ${
                activeTagFilter === tag
                  ? "border-amber-400/60 text-amber-300 bg-amber-400/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Body — loading skeleton, empty state, or list */}
      {loading ? (
        <div
          className="space-y-2 animate-pulse"
          data-testid="minhas-notas-loading"
        >
          <div className="h-16 bg-white/5 rounded" />
          <div className="h-16 bg-white/5 rounded" />
        </div>
      ) : visibleNotas.length === 0 ? (
        <EmptyState
          empty={notas.length === 0}
          query={query}
          onNew={handleNew}
          t={t}
        />
      ) : (
        <ul
          className="space-y-2"
          data-testid="minhas-notas-list"
        >
          {visibleNotas.map((nota) => (
            <li key={nota.id}>
              <NotaCard
                nota={nota}
                expanded={expandedId === nota.id}
                onToggle={() =>
                  setExpandedId((cur) => (cur === nota.id ? null : nota.id))
                }
                onUpdate={(updates) => update(nota.id, updates)}
                onDelete={() => {
                  void remove(nota.id);
                  if (expandedId === nota.id) setExpandedId(null);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({
  empty,
  query,
  onNew,
  t,
}: {
  empty: boolean;
  query: string;
  onNew: () => void;
  t: ReturnType<typeof useTranslations<"player_hq.minhas_notas">>;
}) {
  if (!empty) {
    return (
      <div
        className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center"
        data-testid="minhas-notas-empty-search"
      >
        <p className="text-sm text-muted-foreground/80">
          {t("empty_search", { query })}
        </p>
      </div>
    );
  }
  return (
    <div
      className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center space-y-3"
      data-testid="minhas-notas-empty"
    >
      <Pencil className="w-7 h-7 text-amber-400/30 mx-auto" aria-hidden />
      <p className="text-sm text-muted-foreground/80">{t("empty_title")}</p>
      <button
        type="button"
        onClick={onNew}
        data-testid="minhas-notas-empty-new"
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/30 hover:bg-amber-400/20 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" aria-hidden />
        {t("new_note")}
      </button>
    </div>
  );
}

interface NotaCardProps {
  nota: MinhaNota;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: {
    title?: string;
    content_md?: string;
    tags?: string[];
  }) => void;
  onDelete: () => void;
}

function NotaCard({
  nota,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
}: NotaCardProps) {
  const t = useTranslations("player_hq.minhas_notas");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;
    if (nota.tags.includes(tag)) {
      setTagInput("");
      return;
    }
    onUpdate({ tags: [...nota.tags, tag] });
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    onUpdate({ tags: nota.tags.filter((t) => t !== tag) });
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 5000);
      return;
    }
    onDelete();
  };

  const previewContent = nota.content_md.trim()
    ? nota.content_md.split("\n")[0].slice(0, 80)
    : t("preview_empty");

  return (
    <div
      className="bg-white/5 rounded-lg border border-transparent hover:border-border/60 transition-colors overflow-hidden"
      data-testid={`minhas-notas-card-${nota.id}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-3 flex items-start gap-2"
        aria-expanded={expanded}
        data-testid={`minhas-notas-card-header-${nota.id}`}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground truncate">
            {nota.title?.trim() || t("untitled")}
          </p>
          {nota.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {nota.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400/10 text-[10px] text-amber-300/90"
                >
                  <TagIcon className="w-2.5 h-2.5" aria-hidden />#{tag}
                </span>
              ))}
            </div>
          )}
          {!expanded && (
            <p className="text-xs text-muted-foreground truncate">
              {previewContent}
            </p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/30">
          {/* Title */}
          <div>
            <label
              htmlFor={`nota-title-${nota.id}`}
              className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium"
            >
              {t("title_label")}
            </label>
            <input
              id={`nota-title-${nota.id}`}
              type="text"
              value={nota.title ?? ""}
              onChange={(e) => onUpdate({ title: e.target.value })}
              data-testid={`minhas-notas-title-${nota.id}`}
              placeholder={t("title_placeholder")}
              className="w-full mt-1 px-2 py-1.5 bg-card border border-border rounded text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
            />
          </div>

          {/* Tags inline editor */}
          <div>
            <label
              htmlFor={`nota-tag-input-${nota.id}`}
              className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium"
            >
              {t("tags_label")}
            </label>
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {nota.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-400/10 text-[11px] text-amber-300/90"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={t("remove_tag", { tag })}
                    data-testid={`minhas-notas-tag-remove-${nota.id}-${tag}`}
                    className="hover:text-amber-200"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                id={`nota-tag-input-${nota.id}`}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                onBlur={handleAddTag}
                placeholder={t("tag_placeholder")}
                aria-label={t("add_tag_aria")}
                data-testid={`minhas-notas-tag-input-${nota.id}`}
                className="flex-1 min-w-[80px] px-1.5 py-0.5 bg-transparent border-b border-border/40 text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-400/40"
              />
            </div>
          </div>

          {/* Markdown content */}
          <div>
            <label
              className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium"
            >
              {t("content_label")}
            </label>
            <div className="mt-1">
              <MarkdownEditor
                value={nota.content_md}
                onChange={(next) => onUpdate({ content_md: next })}
                placeholder={t("content_placeholder")}
                ariaLabel={t("content_aria")}
                testId={`minhas-notas-editor-${nota.id}`}
                minHeight={180}
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleDelete}
              data-testid={`minhas-notas-delete-${nota.id}`}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                confirmDelete
                  ? "text-red-300 bg-red-500/10 animate-pulse"
                  : "text-muted-foreground hover:text-red-300 hover:bg-red-500/10"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden />
              {confirmDelete ? t("confirm_delete") : t("delete")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
