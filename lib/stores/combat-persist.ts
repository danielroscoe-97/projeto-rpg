import type { EncounterState } from "@/lib/types/combat";

const STORAGE_KEY = "taverna_combat_backup";

/** Persist combat state to localStorage for crash/offline recovery. */
export function saveCombatBackup(state: EncounterState): void {
  try {
    const snapshot = {
      encounter_id: state.encounter_id,
      session_id: state.session_id,
      encounter_name: state.encounter_name,
      combatants: state.combatants,
      round_number: state.round_number,
      current_turn_index: state.current_turn_index,
      is_active: state.is_active,
      saved_at: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage may be full or unavailable — ignore silently
  }
}

/** Load combat backup from localStorage. Returns null if no backup or expired (>4h). */
export function loadCombatBackup(): (EncounterState & { saved_at: number }) | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Expire backups older than 4 hours
    if (Date.now() - parsed.saved_at > 4 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Clear the combat backup. */
export function clearCombatBackup(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
