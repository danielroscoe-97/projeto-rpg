import { createClient } from "./client";
import type { CombatLogEntry } from "@/lib/stores/combat-log-store";

/**
 * Persist combat log entries to the encounters.combat_log JSONB column.
 * Called periodically during combat (each round advance) and on encounter end.
 * Fire-and-forget — errors are logged but never block gameplay.
 */
export async function persistCombatLog(
  encounterId: string,
  entries: CombatLogEntry[],
): Promise<void> {
  if (!encounterId || entries.length === 0) return;

  const supabase = createClient();
  const { error } = await supabase
    .from("encounters")
    .update({ combat_log: entries })
    .eq("id", encounterId);

  if (error) {
    console.error("[combat-log-persist] Failed to persist log:", error.message);
  }
}

/**
 * Load combat log entries from the encounters.combat_log JSONB column.
 * Used when DM reopens a combat session that was started in a previous browser session.
 * Returns empty array if no log exists or on error.
 */
export async function loadCombatLog(
  encounterId: string,
): Promise<CombatLogEntry[]> {
  if (!encounterId) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("encounters")
    .select("combat_log")
    .eq("id", encounterId)
    .single();

  if (error || !data?.combat_log) return [];

  // Validate that it's an array of entries
  if (!Array.isArray(data.combat_log)) return [];

  return data.combat_log as CombatLogEntry[];
}

/**
 * Clear the combat log from the DB (after encounter ends and combat_report is saved).
 */
export async function clearCombatLog(encounterId: string): Promise<void> {
  if (!encounterId) return;

  const supabase = createClient();
  await supabase
    .from("encounters")
    .update({ combat_log: null })
    .eq("id", encounterId);
}
