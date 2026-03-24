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
