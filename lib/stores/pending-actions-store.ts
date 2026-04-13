import { create } from "zustand";

// ---------------------------------------------------------------------------
// Pending Actions Store — tracks player combat actions awaiting DM ACK
// ---------------------------------------------------------------------------
// The DM already re-broadcasts the result of every player action:
//   player:hp_action       → DM broadcasts combat:hp_update
//   player:death_save      → DM broadcasts combat:hp_update (with death_saves)
//   player:self_condition_toggle → DM broadcasts combat:condition_change
//   combat:reaction_toggle → DM re-broadcasts combat:reaction_toggle
//
// This store tracks each action until the matching re-broadcast arrives,
// enabling visual feedback (pending → confirmed → unconfirmed → failed).
// ---------------------------------------------------------------------------

export type PendingActionType = "hp" | "death_save" | "condition" | "reaction";
export type PendingActionStatus = "pending" | "confirmed" | "unconfirmed" | "failed";

export interface PendingAction {
  id: string;
  type: PendingActionType;
  combatantId: string;
  timestamp: number;
  status: PendingActionStatus;
  retryCount: number;
  /** Original broadcast payload — used for retry */
  payload: Record<string, unknown>;
  /** Snapshot of relevant state before optimistic update — used for rollback */
  rollbackSnapshot?: Record<string, unknown>;
}

interface PendingActionsState {
  actions: Map<string, PendingAction>;

  /** Register a new pending action. Returns the action ID (pre-generated or auto). */
  addAction: (
    action: Omit<PendingAction, "status" | "retryCount"> & { id?: string }
  ) => string;

  /** Mark an action as confirmed (DM re-broadcast received). */
  confirmAction: (id: string) => void;

  /** Mark an action as unconfirmed (timeout without ACK). */
  markUnconfirmed: (id: string) => void;

  /** Mark an action as failed (retry exhausted). */
  failAction: (id: string) => void;

  /** Increment retryCount and reset status to pending. */
  retryAction: (id: string) => void;

  /** Get the most recent pending/unconfirmed action for a combatant+type. */
  getPendingByType: (
    combatantId: string,
    type: PendingActionType
  ) => PendingAction | undefined;

  /** Get status for a combatant (used for visual feedback props). */
  getCombatantStatus: (combatantId: string) => {
    hp?: PendingActionStatus;
    death_save?: PendingActionStatus;
    condition?: PendingActionStatus;
    reaction?: PendingActionStatus;
  };

  /** Remove confirmed/failed actions older than maxAge ms. */
  cleanup: (maxAgeMs?: number) => void;

  /** Remove all actions (e.g. combat ended). */
  clear: () => void;
}

/** Generate a unique action ID. Exported so callers can pre-generate IDs
 *  and include them in broadcast payloads before registering the action. */
export function generateActionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const usePendingActionsStore = create<PendingActionsState>((set, get) => ({
  actions: new Map(),

  addAction: (action) => {
    const id = action.id ?? generateActionId();
    const pending: PendingAction = { ...action, id, status: "pending", retryCount: 0 };
    set((state) => {
      const next = new Map(state.actions);
      next.set(id, pending);
      return { actions: next };
    });
    return id;
  },

  confirmAction: (id) => {
    set((state) => {
      const action = state.actions.get(id);
      if (!action) return state;
      const next = new Map(state.actions);
      next.set(id, { ...action, status: "confirmed" });
      return { actions: next };
    });
  },

  markUnconfirmed: (id) => {
    set((state) => {
      const action = state.actions.get(id);
      if (!action || action.status !== "pending") return state;
      const next = new Map(state.actions);
      next.set(id, { ...action, status: "unconfirmed" });
      return { actions: next };
    });
  },

  failAction: (id) => {
    set((state) => {
      const action = state.actions.get(id);
      if (!action) return state;
      const next = new Map(state.actions);
      next.set(id, { ...action, status: "failed" });
      return { actions: next };
    });
  },

  retryAction: (id) => {
    set((state) => {
      const action = state.actions.get(id);
      if (!action) return state;
      const next = new Map(state.actions);
      next.set(id, { ...action, status: "pending", retryCount: action.retryCount + 1 });
      return { actions: next };
    });
  },

  getPendingByType: (combatantId, type) => {
    const { actions } = get();
    // Return the most recent pending/unconfirmed action for this combatant+type
    let best: PendingAction | undefined;
    for (const action of actions.values()) {
      if (
        action.combatantId === combatantId &&
        action.type === type &&
        (action.status === "pending" || action.status === "unconfirmed")
      ) {
        if (!best || action.timestamp > best.timestamp) best = action;
      }
    }
    return best;
  },

  getCombatantStatus: (combatantId) => {
    const { actions } = get();
    const result: Record<string, PendingActionStatus> = {};
    // For each type, find the most recent non-idle action
    for (const action of actions.values()) {
      if (action.combatantId !== combatantId) continue;
      const key = action.type;
      const existing = result[key];
      // Priority: pending/unconfirmed > failed > confirmed (most active state wins)
      if (!existing) {
        result[key] = action.status;
      } else if (
        (action.status === "pending" || action.status === "unconfirmed") &&
        existing !== "pending" &&
        existing !== "unconfirmed"
      ) {
        result[key] = action.status;
      }
    }
    return result as {
      hp?: PendingActionStatus;
      death_save?: PendingActionStatus;
      condition?: PendingActionStatus;
      reaction?: PendingActionStatus;
    };
  },

  cleanup: (maxAgeMs = 10_000) => {
    const now = Date.now();
    set((state) => {
      const next = new Map(state.actions);
      let changed = false;
      for (const [id, action] of next) {
        if (
          (action.status === "confirmed" || action.status === "failed") &&
          now - action.timestamp > maxAgeMs
        ) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? { actions: next } : state;
    });
  },

  clear: () => {
    set({ actions: new Map() });
  },
}));
