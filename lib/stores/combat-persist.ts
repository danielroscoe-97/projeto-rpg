import type { EncounterState } from "@/lib/types/combat";

// Migration: read old key on first access, copy to new key, delete old
const LEGACY_STORAGE_KEY = "taverna_combat_backup";
const STORAGE_KEY = "pocketdm_combat_backup";

function migrateStorageKey(): void {
  try {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, legacy);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch { /* ignore */ }
}

// Run migration eagerly on module load (client only)
if (typeof window !== "undefined") migrateStorageKey();

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
