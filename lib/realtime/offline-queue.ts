import { openDB, type IDBPDatabase } from "idb";
import type { RealtimeEvent } from "@/lib/types/realtime";

// ── Types ───────────────────────────────────────────────────────────────────────

export interface QueuedAction {
  id: string;
  sessionId: string;
  event: RealtimeEvent;
  timestamp: number;
}

export type SyncStatus = "online" | "offline" | "syncing" | "error";

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

export async function enqueueAction(
  sessionId: string,
  event: RealtimeEvent
): Promise<void> {
  const action: QueuedAction = {
    id: `${Date.now()}-${++_idCounter}`,
    sessionId,
    event,
    timestamp: Date.now(),
  };

  _memoryQueue.push(action);

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

export function getQueueSize(): number {
  return _memoryQueue.length;
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

  for (const action of sorted) {
    try {
      await broadcastFn(action.sessionId, action.event);
      await removeAction(action.id);
      result.succeeded++;
    } catch {
      result.failed++;
      // Stop replaying on first failure to avoid state divergence
      break;
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
