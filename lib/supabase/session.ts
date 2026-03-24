import { createClient } from "./client";
import type { Combatant } from "@/lib/types/combat";

/** Persists initiative values + order for all combatants, then marks encounter active. */
export async function persistInitiativeAndStartCombat(
  encounterId: string,
  combatants: Combatant[]
): Promise<void> {
  const supabase = createClient();

  // Update each combatant's initiative and order
  await Promise.all(
    combatants.map((c) =>
      supabase
        .from("combatants")
        .update({
          initiative: c.initiative,
          initiative_order: c.initiative_order,
        })
        .eq("id", c.id)
    )
  );

  // Mark encounter as active
  const { error } = await supabase
    .from("encounters")
    .update({ is_active: true })
    .eq("id", encounterId);

  if (error) throw new Error(error.message);
}

/** Persists current_turn_index and round_number after a turn advance. */
export async function persistTurnAdvance(
  encounterId: string,
  currentTurnIndex: number,
  roundNumber: number
): Promise<void> {
  const supabase = createClient();
  const { error, data } = await supabase
    .from("encounters")
    .update({ current_turn_index: currentTurnIndex, round_number: roundNumber })
    .eq("id", encounterId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Encounter not found.");
}
