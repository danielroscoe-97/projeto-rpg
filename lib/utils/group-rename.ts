/**
 * A.7 — Group rename logic extracted as a pure function.
 * Detects whether a display_name change should propagate to all group members
 * or remain an individual rename.
 */

interface GroupRenameCombatant {
  id: string;
  monster_group_id: string | null;
  group_order: number | null;
}

export type GroupRenameResult =
  | { type: "group_rename"; updates: Map<string, { display_name: string }> }
  | { type: "individual_rename"; id: string; display_name: string };

/**
 * Determines whether a display_name change is a group rename or individual rename.
 *
 * Group rename detection: if the trailing number in the new name matches the
 * member's 1-indexed position in the sorted group, all members get renamed
 * with the new base + sequential numbers.
 *
 * Uses position in the sorted array (not raw group_order) to avoid issues
 * with null group_order or gaps from removed members.
 */
export function applyGroupRename(
  combatants: GroupRenameCombatant[],
  targetId: string,
  newDisplayName: string
): GroupRenameResult {
  // Empty/null name is always an individual rename — no group propagation
  if (!newDisplayName) {
    return { type: "individual_rename", id: targetId, display_name: newDisplayName };
  }

  const combatant = combatants.find((c) => c.id === targetId);
  if (!combatant?.monster_group_id) {
    return { type: "individual_rename", id: targetId, display_name: newDisplayName };
  }

  // Stable sort: use index as tiebreaker so order is deterministic when group_order values are equal
  const groupMembers = combatants
    .filter((c) => c.monster_group_id === combatant.monster_group_id)
    .sort((a, b) => {
      const diff = (a.group_order ?? 0) - (b.group_order ?? 0);
      return diff !== 0 ? diff : combatants.indexOf(a) - combatants.indexOf(b);
    });

  // Detect intent: trailing number matching this member's 1-indexed position in the sorted group
  const trailingMatch = newDisplayName.match(/\s+(\d+)$/);
  const memberIndex = groupMembers.findIndex((m) => m.id === targetId);
  const expectedNumber = memberIndex + 1;

  const isGroupRename = trailingMatch
    ? Number(trailingMatch[1]) === expectedNumber
    : false;

  if (isGroupRename) {
    const newBase = newDisplayName.replace(/\s+\d+$/, "");
    const updates = new Map<string, { display_name: string }>();
    groupMembers.forEach((m, idx) => {
      updates.set(m.id, { display_name: `${newBase} ${idx + 1}` });
    });
    return { type: "group_rename", updates };
  }

  return { type: "individual_rename", id: targetId, display_name: newDisplayName };
}
