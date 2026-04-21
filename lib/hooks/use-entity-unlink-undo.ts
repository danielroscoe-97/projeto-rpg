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
 *   - Undo is best-effort independent: per-item onUndo callbacks run in a loop
 *     and a throwing callback does not block others. Not a transactional undo.
 *   - Page unload attempts to flush pending commits via pagehide AND
 *     visibilitychange (mobile Safari fallback). Browsers may cancel
 *     in-flight fetches on unload, so persistence is not guaranteed — the
 *     5s TTL is tuned so most commits land before unload in practice.
 *   - Re-scheduling the same edgeId is idempotent (last restore-fn wins).
 *   - Undo clicked after flush has started is ignored (no silent re-commit).
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
  onUndo: () => void | Promise<void>;
  /**
   * Optional extra write to perform at TTL, AFTER unlinkEntities(edgeId)
   * resolves. Used by callers that still dual-write to legacy tables
   * (e.g. note_npc_links) so both deletions land atomically from the
   * user's perspective: nothing is committed until the undo window closes,
   * and undo restores the pre-schedule UI without any round-trip.
   *
   * If the extra write throws, the failure is captured and reported via
   * the errorSingle/errorBatch toast, mirroring edge-delete failure UX.
   * The caller's onUndo is NOT invoked — the edge is already gone from
   * the DB, so rolling back the UI would create a desync with reality.
   *
   * Last-wins on re-schedule: if `schedule()` is called twice with the
   * same `edgeId`, both `onUndo` AND `onCommit` from the earlier call are
   * silently replaced by the later one. Callers that need different
   * commit side-effects for the same edge must not re-schedule; they
   * should flushNow() first or pick a different key.
   */
  onCommit?: () => void | Promise<void>;
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
  // try/finally so an unexpected throw downstream (toast.error, batch indexing,
  // callback re-entry) can't leave flushInFlight stuck true — that would
  // permanently block future undo-click handling and future flushes.
  try {
  const batch = Array.from(pending.values());
  pending.clear();
  toast.dismiss(BATCH_TOAST_ID);

  const results = await Promise.allSettled(
    batch.map((p) => unlinkEntities(p.edgeId)),
  );

  // Self-healing: for any commit failure, invoke the caller's onUndo so the
  // chip is restored in local UI state. Otherwise the chip would stay hidden
  // until the next reload (DB still has the edge, so reload resurrects it).
  const failedIndices: number[] = [];
  const edgeSucceededIndices: number[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      failedIndices.push(i);
      try {
        void batch[i]!.onUndo();
      } catch (err) {
        console.error(
          "[use-entity-unlink-undo] restore-on-failure callback threw:",
          err,
        );
      }
    } else {
      edgeSucceededIndices.push(i);
    }
  });

  // Run dual-write onCommit callbacks only for edges that actually deleted.
  // Running sequentially (not allSettled) keeps ordering predictable for the
  // caller; failures are logged and surfaced but don't retry. See the JSDoc
  // on PendingUnlink.onCommit for the "no rollback" invariant.
  const commitFailures: number[] = [];
  for (const i of edgeSucceededIndices) {
    const item = batch[i]!;
    if (!item.onCommit) continue;
    try {
      await item.onCommit();
    } catch (err) {
      commitFailures.push(i);
      console.error(
        "[use-entity-unlink-undo] onCommit callback threw:",
        err,
      );
    }
  }

  const totalFailed = failedIndices.length + commitFailures.length;
  if (totalFailed > 0 && currentStrings) {
    toast.error(
      totalFailed === 1
        ? currentStrings.errorSingle
        : currentStrings.errorBatch(totalFailed),
    );
  }
  } finally {
    flushInFlight = false;
  }
}

async function undoAll(): Promise<void> {
  // Guard against late undo clicks that fire after the TTL flush already
  // started committing. Without this guard the user click appears to succeed
  // (chip never restored, but no error shown) while the server delete
  // proceeds — silent data loss.
  if (flushInFlight) {
    console.warn(
      "[use-entity-unlink-undo] undo clicked after flush started; ignoring",
    );
    return;
  }
  clearTimer();
  const batch = Array.from(pending.values());
  pending.clear();
  toast.dismiss(BATCH_TOAST_ID);
  for (const item of batch) {
    try {
      await item.onUndo();
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
    // Best-effort commit on unload. Browsers may cancel in-flight fetches
    // without keepalive, so persistence here is not guaranteed. Mobile
    // Safari back/forward-cache is particularly unreliable on pagehide;
    // visibilitychange → "hidden" fires more consistently, so we listen
    // to both and de-duplicate via an empty-pending short-circuit.
    const flushOnHide = () => {
      if (pending.size === 0) return;
      const batch = Array.from(pending.values());
      pending.clear();
      clearTimer();
      toast.dismiss(BATCH_TOAST_ID);
      batch.forEach((p) => {
        unlinkEntities(p.edgeId)
          .then(() => p.onCommit?.())
          .catch(() => {
            // Best-effort — the page is leaving. Cannot surface error via
            // toast, but if the page comes back (visibilitychange hidden→
            // visible, BFCache restore) the local UI would be desynced
            // with the chip hidden and the edge still on the server. Mirror
            // flush()'s self-heal: call onUndo so the chip reappears and
            // the next real action reconciles with server state.
            try {
              void p.onUndo();
            } catch {
              // If onUndo also throws there's nothing left to do — the
              // unmount path runs best-effort without a surface to report.
            }
          });
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushOnHide();
    };
    window.addEventListener("pagehide", flushOnHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flushOnHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
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
