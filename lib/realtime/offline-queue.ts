import { openDB, type IDBPDatabase } from "idb";
import type { RealtimeEvent } from "@/lib/types/realtime";

// ── Types ───────────────────────────────────────────────────────────────────────

export interface QueuedAction {
  id: string;
  sessionId: string;
  event: RealtimeEvent;
  timestamp: number;
  /** Idempotency key — prevents duplicate replay of the same logical action */
  idempotencyKey?: string;
}

export type SyncStatus = "online" | "offline" | "syncing" | "error";

// ── Constants ──────────────────────────────────────────────────────────────────
/** Max queued actions before oldest are evicted (prevents unbounded storage growth) */
const MAX_QUEUE_SIZE = 500;

// ── IndexedDB for queue persistence ──────────────────────────────────────────

const DB_NAME = "offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "actions";

let _db: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!_db) {
    _db = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      },
    });
  }
  return _db;
}

// ── Queue operations ────────────────────────────────────────────────────────────

let _memoryQueue: QueuedAction[] = [];
let _idCounter = 0;

/** Generate an idempotency key for an event — same logical action produces same key.
 *  Uses event type + target ID + relevant value to identify duplicates. */
function generateIdempotencyKey(event: RealtimeEvent): string {
  const base = event.type;
  if ("combatant_id" in event) {
    const cid = (event as { combatant_id: string }).combatant_id;
    // D2: For HP updates, include a monotonic counter instead of final HP value.
    // Using HP value causes false dedup when damage→heal→same damage produces identical keys.
    if (event.type === "combat:hp_update") {
      return `${base}:${cid}:${++_idCounter}`;
    }
    // For condition changes, include the conditions array to distinguish toggles
    if (event.type === "combat:condition_change" && "conditions" in event) {
      const conditions = (event as { conditions: string[] }).conditions;
      return `${base}:${cid}:${JSON.stringify(conditions)}`;
    }
    return `${base}:${cid}`;
  }
  if (event.type === "combat:turn_advance") {
    return `${base}:${(event as { current_turn_index: number }).current_turn_index}:${(event as { round_number: number }).round_number}`;
  }
  if (event.type === "session:state_sync") {
    return `${base}:${(event as { round_number: number }).round_number}:${(event as { current_turn_index: number }).current_turn_index}`;
  }
  return `${base}:${Date.now()}`;
}

export async function enqueueAction(
  sessionId: string,
  event: RealtimeEvent
): Promise<void> {
  const idempotencyKey = generateIdempotencyKey(event);

  // Dedup: skip if an action with the same idempotency key already exists
  const existing = _memoryQueue.find(
    (a) => a.sessionId === sessionId && a.idempotencyKey === idempotencyKey
  );
  if (existing) return;

  const action: QueuedAction = {
    id: `${Date.now()}-${++_idCounter}`,
    sessionId,
    event,
    timestamp: Date.now(),
    idempotencyKey,
  };

  _memoryQueue.push(action);

  // Cap: evict oldest actions if queue exceeds max size
  if (_memoryQueue.length > MAX_QUEUE_SIZE) {
    const evicted = _memoryQueue.splice(0, _memoryQueue.length - MAX_QUEUE_SIZE);
    // Best-effort: also remove evicted from IndexedDB
    try {
      const db = await getDb();
      await Promise.all(evicted.map((a) => db.delete(STORE_NAME, a.id)));
    } catch { /* best-effort */ }
  }

  // Persist to IndexedDB (survives refresh)
  try {
    const db = await getDb();
    await db.put(STORE_NAME, action);
  } catch {
    // IndexedDB unavailable — memory queue is fallback
  }
}

export async function getQueuedActions(
  sessionId?: string
): Promise<QueuedAction[]> {
  try {
    const db = await getDb();
    const all: QueuedAction[] = await db.getAll(STORE_NAME);
    if (sessionId) return all.filter((a) => a.sessionId === sessionId);
    return all;
  } catch {
    return sessionId
      ? _memoryQueue.filter((a) => a.sessionId === sessionId)
      : [..._memoryQueue];
  }
}

export async function getQueueSize(): Promise<number> {
  try {
    const db = await getDb();
    const count = await db.count(STORE_NAME);
    return count || _memoryQueue.length;
  } catch {
    return _memoryQueue.length;
  }
}

export async function clearQueue(sessionId?: string): Promise<void> {
  if (sessionId) {
    _memoryQueue = _memoryQueue.filter((a) => a.sessionId !== sessionId);
  } else {
    _memoryQueue = [];
  }

  try {
    const db = await getDb();
    if (sessionId) {
      const all: QueuedAction[] = await db.getAll(STORE_NAME);
      await Promise.all(
        all
          .filter((a) => a.sessionId === sessionId)
          .map((a) => db.delete(STORE_NAME, a.id))
      );
    } else {
      await db.clear(STORE_NAME);
    }
  } catch {
    // Best-effort cleanup
  }
}

async function removeAction(id: string): Promise<void> {
  _memoryQueue = _memoryQueue.filter((a) => a.id !== id);
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, id);
  } catch {
    // Best-effort
  }
}

// ── Replay (reconnection) ──────────────────────────────────────────────────────

export type BroadcastFn = (
  sessionId: string,
  event: RealtimeEvent
) => Promise<void>;

export interface ReplayResult {
  total: number;
  succeeded: number;
  failed: number;
}

export async function replayQueue(
  sessionId: string,
  broadcastFn: BroadcastFn
): Promise<ReplayResult> {
  const actions = await getQueuedActions(sessionId);
  const result: ReplayResult = { total: actions.length, succeeded: 0, failed: 0 };

  // Replay in chronological order
  const sorted = actions.sort((a, b) => a.timestamp - b.timestamp);

  // Dedup during replay: track seen idempotency keys to skip duplicates
  // (can happen if IndexedDB and memory queue had overlapping entries)
  const seenKeys = new Set<string>();

  for (const action of sorted) {
    // Skip duplicates by idempotency key
    if (action.idempotencyKey && seenKeys.has(action.idempotencyKey)) {
      await removeAction(action.id);
      result.succeeded++;
      continue;
    }
    if (action.idempotencyKey) seenKeys.add(action.idempotencyKey);

    try {
      await broadcastFn(action.sessionId, action.event);
      await removeAction(action.id);
      result.succeeded++;
    } catch {
      result.failed++;
      // Continue replaying — a transient failure on one event shouldn't lose the rest.
      // The final state_sync from DM will reconcile any gaps.
    }
  }

  return result;
}

// ── Online/offline detection ────────────────────────────────────────────────────

type StatusListener = (status: SyncStatus) => void;

const _listeners: Set<StatusListener> = new Set();
let _currentStatus: SyncStatus = typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline";

export function getSyncStatus(): SyncStatus {
  return _currentStatus;
}

export function setSyncStatus(status: SyncStatus): void {
  if (status === _currentStatus) return;
  _currentStatus = status;
  _listeners.forEach((fn) => fn(status));
}

export function onSyncStatusChange(fn: StatusListener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

// Initialize browser online/offline listeners
if (typeof window !== "undefined") {
  window.addEventListener("online", () => setSyncStatus("online"));
  window.addEventListener("offline", () => setSyncStatus("offline"));
}
