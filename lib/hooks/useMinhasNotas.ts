"use client";

/**
 * useMinhasNotas — long-form mini-wiki notes hook (Wave 3c D2 / PRD #24).
 *
 * Distinct from `usePlayerNotes` (mig 063 / `player_journal_entries`), which
 * still owns quick-note CRUD. This hook talks to the new `player_notes` table
 * (mig 187) and exposes a small CRUD + search surface tailored to the
 * "Minhas Notas" sub-tab of Diário.
 *
 * Auto-save contract (matches AC of D2):
 *   - update(id, partial): optimistic; queued; debounce flush after
 *     AUTOSAVE_DEBOUNCE_MS (default 30 000ms — overridable via
 *     NEXT_PUBLIC_AUTOSAVE_DEBOUNCE_MS for the e2e auto-save spec).
 *   - flushPendingSync(): force-write all queued mutations (called from
 *     beforeunload + unmount).
 *
 * Optimistic delete: row removed locally, restored on error (toast).
 *
 * Search: in-memory (no extra round-trip). Matches title (case-insensitive)
 * AND/OR every tag chip; multi-token query splits on whitespace.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface MinhaNota {
  id: string;
  campaign_id: string;
  user_id: string | null;
  session_token_id: string | null;
  title: string | null;
  content_md: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface AddMinhaNotaInput {
  title?: string | null;
  content_md?: string;
  tags?: string[];
}

export type UpdateMinhaNotaInput = Partial<
  Pick<MinhaNota, "title" | "content_md" | "tags">
>;

const FALLBACK_AUTOSAVE_MS = 30_000;

/**
 * Resolve auto-save debounce window. Reads `NEXT_PUBLIC_AUTOSAVE_DEBOUNCE_MS`
 * so the dedicated e2e spec (`player-notes-auto-save.spec.ts`) can collapse
 * the 30 s debounce to ~2 s without monkey-patching the hook.
 */
export function getAutosaveDebounceMs(): number {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_AUTOSAVE_DEBOUNCE_MS
      : undefined;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_AUTOSAVE_MS;
}

/**
 * Pure search helper (also exported for unit tests). Matches notes whose
 * title OR any tag contains every whitespace-separated token of `query`
 * (case-insensitive). Empty query returns the input list unchanged.
 */
export function searchMinhasNotas(
  notas: MinhaNota[],
  query: string,
): MinhaNota[] {
  const q = query.trim().toLowerCase();
  if (!q) return notas;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return notas;

  return notas.filter((n) => {
    const haystackTitle = (n.title ?? "").toLowerCase();
    const haystackTags = n.tags.map((t) => t.toLowerCase());
    return tokens.every(
      (tok) =>
        haystackTitle.includes(tok) ||
        haystackTags.some((tag) => tag.includes(tok)),
    );
  });
}

interface UseMinhasNotasResult {
  notas: MinhaNota[];
  loading: boolean;
  add: (input: AddMinhaNotaInput) => Promise<MinhaNota | null>;
  update: (id: string, updates: UpdateMinhaNotaInput) => void;
  remove: (id: string) => Promise<void>;
  search: (query: string) => MinhaNota[];
  /** Force-flush queued auto-save mutations. Exposed for tests. */
  flushPendingSync: () => void;
}

export function useMinhasNotas(campaignId: string): UseMinhasNotasResult {
  const [notas, setNotas] = useState<MinhaNota[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const pendingRef = useRef<Record<string, UpdateMinhaNotaInput>>({});
  const debounceTimers = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  // Initial fetch — RLS in mig 187 enforces the auth/anon ownership branch.
  useEffect(() => {
    if (!campaignId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("player_notes")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        // Don't toast on initial load — anon-without-token returns 0 rows
        // (RLS), which is a legitimate empty state, not an error.
        if (error.code && error.code !== "PGRST301") {
          toast.error("Failed to load notes");
        }
        setLoading(false);
        return;
      }
      setNotas((data ?? []) as MinhaNota[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId, supabase]);

  // Resolve owner identity for INSERT (auth.uid() OR session_token_id).
  const resolveOwnerColumns = useCallback(async (): Promise<{
    user_id: string | null;
    session_token_id: string | null;
  } | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id ?? null;

    if (!uid) return null;

    // Anon JWT? `is_anonymous` distinguishes anon sign-in from full users.
    // Falls back to looking up an active session_tokens row owned by the uid.
    const isAnon =
      (userData?.user as { is_anonymous?: boolean })?.is_anonymous === true;

    if (isAnon) {
      const { data: tokenRow } = await supabase
        .from("session_tokens")
        .select("id")
        .or(`anon_user_id.eq.${uid},user_id.eq.${uid}`)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!tokenRow) return null;
      return {
        user_id: null,
        session_token_id: (tokenRow as { id: string }).id,
      };
    }

    return { user_id: uid, session_token_id: null };
  }, [supabase]);

  const add = useCallback(
    async (input: AddMinhaNotaInput): Promise<MinhaNota | null> => {
      const owner = await resolveOwnerColumns();
      if (!owner) {
        // Anon without session_token (or signed out) — surface a soft prompt.
        toast.error("Crie conta pra salvar permanentemente");
        return null;
      }

      const payload = {
        campaign_id: campaignId,
        user_id: owner.user_id,
        session_token_id: owner.session_token_id,
        title: input.title ?? null,
        content_md: input.content_md ?? "",
        tags: input.tags ?? [],
      };

      // Optimistic insert with a temp id.
      const tempId = crypto.randomUUID();
      const optimistic: MinhaNota = {
        id: tempId,
        campaign_id: campaignId,
        user_id: owner.user_id,
        session_token_id: owner.session_token_id,
        title: payload.title,
        content_md: payload.content_md,
        tags: payload.tags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setNotas((prev) => [optimistic, ...prev]);

      const { data, error } = await supabase
        .from("player_notes")
        .insert(payload)
        .select()
        .single();

      if (error || !data) {
        setNotas((prev) => prev.filter((n) => n.id !== tempId));
        toast.error("Failed to save note");
        return null;
      }
      const saved = data as MinhaNota;
      setNotas((prev) => prev.map((n) => (n.id === tempId ? saved : n)));
      return saved;
    },
    [campaignId, resolveOwnerColumns, supabase],
  );

  const flush = useCallback(
    async (id: string) => {
      const updates = pendingRef.current[id];
      if (!updates) return;
      delete pendingRef.current[id];
      const { error } = await supabase
        .from("player_notes")
        .update(updates)
        .eq("id", id);
      if (error) toast.error("Failed to save changes");
    },
    [supabase],
  );

  const update = useCallback(
    (id: string, updates: UpdateMinhaNotaInput) => {
      // Optimistic — UI sees the change immediately + debounce server write.
      setNotas((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, ...updates, updated_at: new Date().toISOString() }
            : n,
        ),
      );
      pendingRef.current[id] = { ...pendingRef.current[id], ...updates };

      const debounceMs = getAutosaveDebounceMs();
      if (debounceTimers.current[id]) {
        clearTimeout(debounceTimers.current[id]);
      }
      debounceTimers.current[id] = setTimeout(() => flush(id), debounceMs);
    },
    [flush],
  );

  const remove = useCallback(
    async (id: string) => {
      const backup = notas.find((n) => n.id === id);
      setNotas((prev) => prev.filter((n) => n.id !== id));
      if (debounceTimers.current[id]) {
        clearTimeout(debounceTimers.current[id]);
        delete debounceTimers.current[id];
        delete pendingRef.current[id];
      }
      const { error } = await supabase
        .from("player_notes")
        .delete()
        .eq("id", id);
      if (error && backup) {
        setNotas((prev) => [backup, ...prev]);
        toast.error("Failed to delete note");
      }
    },
    [notas, supabase],
  );

  // Memo wrapper for search so the component can pass it as a deps-stable cb.
  const search = useCallback(
    (query: string) => searchMinhasNotas(notas, query),
    [notas],
  );

  // Synchronous flush of all queued autosaves. Used by beforeunload + unmount.
  const flushPendingSync = useCallback(() => {
    const pending = Object.entries(pendingRef.current);
    if (pending.length === 0) return;
    Object.values(debounceTimers.current).forEach(clearTimeout);
    pending.forEach(([id, updates]) => {
      // Fire-and-forget; errors logged but not toasted (page is unloading).
      supabase
        .from("player_notes")
        .update(updates)
        .eq("id", id)
        .then(({ error }: { error: { message: string } | null }) => {
          if (error) console.error("Minhas Notas flush failed:", error);
        });
    });
    pendingRef.current = {};
    debounceTimers.current = {};
  }, [supabase]);

  useEffect(() => {
    const handler = () => flushPendingSync();
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      flushPendingSync();
    };
  }, [flushPendingSync]);

  // Memoize the API surface (referential stability for downstream memo).
  return useMemo<UseMinhasNotasResult>(
    () => ({
      notas,
      loading,
      add,
      update,
      remove,
      search,
      flushPendingSync,
    }),
    [notas, loading, add, update, remove, search, flushPendingSync],
  );
}
