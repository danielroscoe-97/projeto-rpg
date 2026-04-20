"use client";

/**
 * Entity Graph — optimistic-deferred unlink with consolidated undo toast.
 *
 * Fase A (docs/PROMPT-sprint-pos-entity-graph.md). Closes AC-3c-04.
 *
 * Strategy: the server is NOT called until a 5s TTL expires. Within the
 * window the removal is a pure UI-side optimistic change, so "undo" is free
 * (no re-insert round-trip). Multiple removals across component instances
 * consolidate into a single toast ("3 vínculos removidos · Desfazer tudo")
 * keyed by a stable Sonner id.
 *
 * Invariants:
 *   - Undo is atomic: either all queued items are restored, or none are.
 *   - Page unload best-effort flushes pending commits via pagehide.
 *   - Re-scheduling the same edgeId is idempotent (last restore-fn wins).
 *
 * Not-in-scope (deferred):
 *   - Ctrl+Z keyboard binding — stretch goal, not required for AC-3c-04.
 *   - Per-origin toast placement (mobile bottom vs desktop top-right) —
 *     handled by the global <Toaster /> config in app/layout.tsx.
 */

import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { unlinkEntities } from "@/lib/supabase/entity-links";

export interface PendingUnlink {
  /** Primary key of the edge row in campaign_mind_map_edges. */
  edgeId: string;
  /** Caller-provided callback to restore the chip/row in local UI state. */
  onUndo: () => void;
}

const BATCH_TTL_MS = 5_000;
const BATCH_TOAST_ID = "entity-unlink-batch";

interface Strings {
  single: string;
  batch: (count: number) => string;
  actionSingle: string;
  actionBatch: string;
  errorSingle: string;
  errorBatch: (count: number) => string;
}

const pending = new Map<string, PendingUnlink>();
let timerHandle: ReturnType<typeof setTimeout> | null = null;
let flushInFlight = false;
let currentStrings: Strings | null = null;

function clearTimer(): void {
  if (timerHandle !== null) {
    clearTimeout(timerHandle);
    timerHandle = null;
  }
}

function renderToast(strings: Strings): void {
  const count = pending.size;
  if (count === 0) {
    toast.dismiss(BATCH_TOAST_ID);
    return;
  }
  const label = count === 1 ? strings.single : strings.batch(count);
  const actionLabel = count === 1 ? strings.actionSingle : strings.actionBatch;
  toast(label, {
    id: BATCH_TOAST_ID,
    duration: BATCH_TTL_MS,
    action: {
      label: actionLabel,
      onClick: () => {
        void undoAll();
      },
    },
  });
}

function scheduleFlush(): void {
  clearTimer();
  timerHandle = setTimeout(() => {
    timerHandle = null;
    void flush();
  }, BATCH_TTL_MS);
}

async function flush(): Promise<void> {
  if (flushInFlight) return;
  if (pending.size === 0) return;
  flushInFlight = true;
  const batch = Array.from(pending.values());
  pending.clear();
  toast.dismiss(BATCH_TOAST_ID);

  const results = await Promise.allSettled(
    batch.map((p) => unlinkEntities(p.edgeId)),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0 && currentStrings) {
    toast.error(
      failed === 1
        ? currentStrings.errorSingle
        : currentStrings.errorBatch(failed),
    );
  }
  flushInFlight = false;
}

async function undoAll(): Promise<void> {
  clearTimer();
  const batch = Array.from(pending.values());
  pending.clear();
  toast.dismiss(BATCH_TOAST_ID);
  for (const item of batch) {
    try {
      item.onUndo();
    } catch (err) {
      console.error("[use-entity-unlink-undo] restore callback failed:", err);
    }
  }
}

/**
 * Schedule an optimistic unlink. Caller has already removed the chip from
 * local state; pass `onUndo` to restore it if the user clicks Desfazer.
 */
export function useEntityUnlinkUndo(strings: Strings) {
  currentStrings = strings;

  useEffect(() => {
    const onPageHide = () => {
      if (pending.size === 0) return;
      const batch = Array.from(pending.values());
      pending.clear();
      clearTimer();
      batch.forEach((p) => {
        unlinkEntities(p.edgeId).catch(() => {
          // Best-effort — the page is leaving. Cannot surface error.
        });
      });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  const schedule = useCallback(
    (item: PendingUnlink): void => {
      pending.set(item.edgeId, item);
      renderToast(strings);
      scheduleFlush();
    },
    [strings],
  );

  const flushNow = useCallback((): Promise<void> => flush(), []);

  return { schedule, flushNow };
}
